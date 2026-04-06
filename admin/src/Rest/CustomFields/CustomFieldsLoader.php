<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class CustomFieldsLoader
 *
 * Main orchestrator for custom fields across all WordPress contexts.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class CustomFieldsLoader {

	/**
	 * Custom fields JSON filename.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const JSON_FILENAME = 'flexify-dashboard-custom-fields.json';

	/**
	 * Repository instance.
	 *
	 * @since 2.0.0
	 * @var FieldGroupRepository
	 */
	private $repository;


	/**
	 * Location rule evaluator instance.
	 *
	 * @since 2.0.0
	 * @var LocationRuleEvaluator
	 */
	private $evaluator;


	/**
	 * Initialized context managers.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $managers = array();


	/**
	 * Singleton instance.
	 *
	 * @since 2.0.0
	 * @var self|null
	 */
	private static $instance = null;


	/**
	 * Get singleton instance.
	 *
	 * @since 2.0.0
	 * @return self
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function __construct() {
		$this->repository = new FieldGroupRepository( $this->get_json_file_path() );
		$this->evaluator  = new LocationRuleEvaluator();
	}


	/**
	 * Initialize all custom fields functionality.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {
		if ( ! $this->repository->has_active_groups() ) {
			return;
		}

		$this->register_post_hooks();
		$this->register_taxonomy_hooks();
		$this->register_user_hooks();
		$this->register_comment_hooks();
		$this->register_attachment_hooks();

		add_action( 'admin_footer', array( $this, 'maybe_load_scripts' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_block_editor_assets' ) );
	}


	/**
	 * Register post hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function register_post_hooks() {
		if ( ! $this->has_context_field_groups( 'post' ) ) {
			return;
		}

		$this->managers['post'] = new MetaBoxManager( $this->repository, $this->evaluator );

		add_action( 'add_meta_boxes', array( $this->managers['post'], 'register_meta_boxes' ) );
		add_action( 'save_post', array( $this, 'save_post_fields' ) );
	}


	/**
	 * Register taxonomy hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function register_taxonomy_hooks() {
		if ( ! $this->has_context_field_groups( 'taxonomy' ) ) {
			return;
		}

		$this->managers['taxonomy'] = new TaxonomyMetaBoxManager( $this->repository, $this->evaluator );
		$this->managers['taxonomy']->register_taxonomy_hooks();
	}


	/**
	 * Register user hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function register_user_hooks() {
		if ( ! $this->has_context_field_groups( 'user' ) ) {
			return;
		}

		$this->managers['user'] = new UserMetaBoxManager( $this->repository, $this->evaluator );
		$this->managers['user']->register_hooks();
	}


	/**
	 * Register comment hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function register_comment_hooks() {
		if ( ! $this->has_context_field_groups( 'comment' ) ) {
			return;
		}

		$this->managers['comment'] = new CommentMetaBoxManager( $this->repository, $this->evaluator );
		$this->managers['comment']->register_hooks();
	}


	/**
	 * Register attachment hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function register_attachment_hooks() {
		if ( ! $this->has_context_field_groups( 'attachment' ) ) {
			return;
		}

		$this->managers['attachment'] = new AttachmentMetaBoxManager( $this->repository, $this->evaluator );
		$this->managers['attachment']->register_hooks();
	}


	/**
	 * Check if any field groups target a specific context.
	 *
	 * @since 2.0.0
	 * @param string $context Context to check.
	 * @return bool
	 */
	private function has_context_field_groups( $context ) {
		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			return false;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_active_group( $group ) ) {
				continue;
			}

			$location = isset( $group['location'] ) && is_array( $group['location'] ) ? $group['location'] : array();

			if ( LocationRuleEvaluator::has_context_rules( $location, $context ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Save post custom fields.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public function save_post_fields( $post_id ) {
		$post_id = absint( $post_id );

		if ( empty( $post_id ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$custom_fields = isset( $_POST['flexify_dashboard_cf'] ) && is_array( $_POST['flexify_dashboard_cf'] )
			? wp_unslash( $_POST['flexify_dashboard_cf'] )
			: array();

		if ( empty( $custom_fields ) ) {
			return;
		}

		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			return;
		}

		$post = get_post( $post_id );

		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_active_group( $group ) ) {
				continue;
			}

			if ( ! $this->group_matches_post( $group, $post ) ) {
				continue;
			}

			if ( ! $this->is_valid_post_group_nonce( $group ) ) {
				continue;
			}

			$this->save_group_post_fields( $post_id, $group, $custom_fields );
		}
	}


	/**
	 * Maybe load scripts in admin footer.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function maybe_load_scripts() {
		$screen = get_current_screen();

		if ( ! $screen ) {
			return;
		}

		$should_load = false;

		if ( in_array( $screen->base, array( 'post', 'post-new' ), true ) ) {
			if ( function_exists( 'use_block_editor_for_post_type' ) && ! empty( $screen->post_type ) && use_block_editor_for_post_type( $screen->post_type ) ) {
				return;
			}

			$should_load = isset( $this->managers['post'] );
		}

		if ( in_array( $screen->base, array( 'edit-tags', 'term' ), true ) ) {
			$should_load = isset( $this->managers['taxonomy'] );
		}

		if ( in_array( $screen->base, array( 'user-edit', 'profile', 'user-new' ), true ) ) {
			$should_load = isset( $this->managers['user'] );
		}

		if ( 'comment' === $screen->base ) {
			$should_load = isset( $this->managers['comment'] );
		}

		if ( 'attachment' === $screen->base || ( 'post' === $screen->base && isset( $screen->post_type ) && 'attachment' === $screen->post_type ) ) {
			$should_load = isset( $this->managers['attachment'] );
		}

		if ( $should_load ) {
			CustomFieldsScriptLoader::load_assets();
		}
	}


	/**
	 * Enqueue block editor assets.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function enqueue_block_editor_assets() {
		if ( ! $this->repository->has_active_groups() ) {
			return;
		}

		if ( isset( $this->managers['post'] ) ) {
			CustomFieldsScriptLoader::load_assets();
		}
	}


	/**
	 * Get repository instance.
	 *
	 * @since 2.0.0
	 * @return FieldGroupRepository
	 */
	public function get_repository() {
		return $this->repository;
	}


	/**
	 * Get evaluator instance.
	 *
	 * @since 2.0.0
	 * @return LocationRuleEvaluator
	 */
	public function get_evaluator() {
		return $this->evaluator;
	}


	/**
	 * Get a specific manager.
	 *
	 * @since 2.0.0
	 * @param string $context Context key.
	 * @return object|null
	 */
	public function get_manager( $context ) {
		return isset( $this->managers[ $context ] ) ? $this->managers[ $context ] : null;
	}


	/**
	 * Get JSON file path.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_json_file_path() {
		return WP_CONTENT_DIR . '/' . self::JSON_FILENAME;
	}


	/**
	 * Check if a field group is valid and active.
	 *
	 * @since 2.0.0
	 * @param mixed $group Field group data.
	 * @return bool
	 */
	private function is_valid_active_group( $group ) {
		if ( ! is_array( $group ) ) {
			return false;
		}

		if ( empty( $group['active'] ) ) {
			return false;
		}

		if ( empty( $group['location'] ) || ! is_array( $group['location'] ) ) {
			return false;
		}

		return true;
	}


	/**
	 * Check whether a field group matches a post.
	 *
	 * @since 2.0.0
	 * @param array    $group Field group data.
	 * @param \WP_Post $post Post object.
	 * @return bool
	 */
	private function group_matches_post( $group, $post ) {
		$location = isset( $group['location'] ) && is_array( $group['location'] ) ? $group['location'] : array();

		if ( empty( $location ) ) {
			return false;
		}

		if ( is_object( $this->evaluator ) && method_exists( $this->evaluator, 'should_show_for_post' ) ) {
			return (bool) $this->evaluator->should_show_for_post( $location, $post );
		}

		return (bool) LocationRuleEvaluator::should_show_for_post( $location, $post );
	}


	/**
	 * Validate post field group nonce.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @return bool
	 */
	private function is_valid_post_group_nonce( $group ) {
		if ( empty( $group['id'] ) ) {
			return false;
		}

		$nonce_name  = 'flexify_dashboard_cf_nonce_' . $group['id'];
		$nonce_value = isset( $_POST[ $nonce_name ] )
			? sanitize_text_field( wp_unslash( $_POST[ $nonce_name ] ) )
			: '';

		if ( empty( $nonce_value ) ) {
			return false;
		}

		return wp_verify_nonce( $nonce_value, 'flexify_dashboard_custom_fields_' . $group['id'] );
	}


	/**
	 * Save all fields for a specific post field group.
	 *
	 * @since 2.0.0
	 * @param int   $post_id Post ID.
	 * @param array $group Field group data.
	 * @param array $custom_fields Submitted custom fields.
	 * @return void
	 */
	private function save_group_post_fields( $post_id, $group, $custom_fields ) {
		$fields = isset( $group['fields'] ) && is_array( $group['fields'] ) ? $group['fields'] : array();

		foreach ( $fields as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$field_name = $field['name'];

			if ( isset( $custom_fields[ $field_name ] ) ) {
				$value = FieldValueSanitizer::sanitize( $custom_fields[ $field_name ], $field );
				update_post_meta( $post_id, $field_name, $value );
				continue;
			}

			if ( isset( $field['type'] ) && 'true_false' === $field['type'] ) {
				update_post_meta( $post_id, $field_name, '0' );
			}
		}
	}
}