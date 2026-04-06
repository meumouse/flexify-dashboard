<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class CommentMetaBoxManager
 *
 * Handle custom field rendering and saving on comment edit screens.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class CommentMetaBoxManager {

	/**
	 * Custom fields form wrapper class.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const APP_CONTAINER_CLASS = 'flexify-dashboard-custom-fields-app flexify-dashboard-comment-fields';

	/**
	 * Comment context slug.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const COMMENT_CONTEXT = 'comment';

	/**
	 * Meta box ID prefix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const META_BOX_PREFIX = 'flexify_dashboard_comment_';

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
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @param FieldGroupRepository  $repository Repository instance.
	 * @param LocationRuleEvaluator $evaluator Evaluator instance.
	 * @return void
	 */
	public function __construct( FieldGroupRepository $repository, LocationRuleEvaluator $evaluator ) {
		$this->repository = $repository;
		$this->evaluator  = $evaluator;
	}


	/**
	 * Register comment hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_hooks() {
		add_action( 'add_meta_boxes_comment', array( $this, 'add_comment_meta_box' ) );
		add_action( 'edit_comment', array( $this, 'save_comment_fields' ) );
	}


	/**
	 * Add meta boxes to the comment edit screen.
	 *
	 * @since 2.0.0
	 * @param \WP_Comment $comment Comment object.
	 * @return void
	 */
	public function add_comment_meta_box( $comment ) {
		$field_groups = $this->get_field_groups_for_comment( $comment );

		if ( empty( $field_groups ) ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			add_meta_box(
				self::META_BOX_PREFIX . $group['id'],
				$group['title'],
				array( $this, 'render_comment_fields' ),
				self::COMMENT_CONTEXT,
				'normal',
				'high',
				array(
					'group' => $group,
				)
			);
		}
	}


	/**
	 * Render comment fields meta box.
	 *
	 * @since 2.0.0
	 * @param \WP_Comment $comment Comment object.
	 * @param array       $args Meta box arguments.
	 * @return void
	 */
	public function render_comment_fields( $comment, $args ) {
		$group = isset( $args['args']['group'] ) && is_array( $args['args']['group'] ) ? $args['args']['group'] : array();

		if ( empty( $group ) ) {
			return;
		}

		wp_nonce_field(
			'flexify_dashboard_comment_fields_' . $group['id'],
			'flexify_dashboard_comment_nonce_' . $group['id']
		);

		echo $this->get_comment_app_markup( $group, $comment->comment_ID ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}


	/**
	 * Save custom fields for a comment.
	 *
	 * @since 2.0.0
	 * @param int $comment_id Comment ID.
	 * @return void
	 */
	public function save_comment_fields( $comment_id ) {
		$comment_id = absint( $comment_id );

		if ( empty( $comment_id ) || ! current_user_can( 'edit_comment', $comment_id ) ) {
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

		$comment = get_comment( $comment_id );

		if ( ! $comment instanceof \WP_Comment ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			if ( ! $this->group_matches_comment( $group, $comment ) ) {
				continue;
			}

			if ( ! $this->is_valid_group_nonce( $group ) ) {
				continue;
			}

			$this->save_group_fields( $comment_id, $group, $custom_fields );
		}
	}


	/**
	 * Get field groups for a comment.
	 *
	 * @since 2.0.0
	 * @param \WP_Comment $comment Comment object.
	 * @return array
	 */
	private function get_field_groups_for_comment( $comment ) {
		$field_groups    = $this->repository->read();
		$matching_groups = array();

		if ( ! is_array( $field_groups ) ) {
			return $matching_groups;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			if ( ! $this->group_matches_comment( $group, $comment ) ) {
				continue;
			}

			$matching_groups[] = $group;
		}

		return $matching_groups;
	}


	/**
	 * Check if a field group is valid and active.
	 *
	 * @since 2.0.0
	 * @param mixed $group Field group data.
	 * @return bool
	 */
	private function is_valid_field_group( $group ) {
		if ( ! is_array( $group ) ) {
			return false;
		}

		if ( empty( $group['active'] ) ) {
			return false;
		}

		if ( empty( $group['id'] ) || empty( $group['title'] ) ) {
			return false;
		}

		if ( empty( $group['location'] ) || ! is_array( $group['location'] ) ) {
			return false;
		}

		return true;
	}


	/**
	 * Check whether a field group should be shown for a comment.
	 *
	 * @since 2.0.0
	 * @param array       $group Field group data.
	 * @param \WP_Comment $comment Comment object.
	 * @return bool
	 */
	private function group_matches_comment( $group, $comment ) {
		if ( ! isset( $group['location'] ) || ! is_array( $group['location'] ) ) {
			return false;
		}

		if ( is_object( $this->evaluator ) && method_exists( $this->evaluator, 'should_show_for_comment' ) ) {
			return (bool) $this->evaluator->should_show_for_comment( $group['location'], $comment );
		}

		return (bool) LocationRuleEvaluator::should_show_for_comment( $group['location'], $comment );
	}


	/**
	 * Validate the nonce for a field group save request.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @return bool
	 */
	private function is_valid_group_nonce( $group ) {
		$nonce_name  = 'flexify_dashboard_comment_nonce_' . $group['id'];
		$nonce_value = isset( $_POST[ $nonce_name ] )
			? sanitize_text_field( wp_unslash( $_POST[ $nonce_name ] ) )
			: '';

		if ( empty( $nonce_value ) ) {
			return false;
		}

		return wp_verify_nonce( $nonce_value, 'flexify_dashboard_comment_fields_' . $group['id'] );
	}


	/**
	 * Build the Vue app markup for a comment field group.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @param int   $comment_id Comment ID.
	 * @return string
	 */
	private function get_comment_app_markup( $group, $comment_id ) {
		$vue_group_data = FieldValueSanitizer::prepare_vue_group_data( $group );
		$saved_values   = $this->get_saved_values( $group, $comment_id );

		return sprintf(
			'<div class="%1$s" data-field-group="%2$s" data-saved-values="%3$s" data-comment-id="%4$d" data-context="%5$s"></div>',
			esc_attr( self::APP_CONTAINER_CLASS ),
			esc_attr( wp_json_encode( $vue_group_data ) ),
			esc_attr( wp_json_encode( $saved_values ) ),
			absint( $comment_id ),
			esc_attr( self::COMMENT_CONTEXT )
		);
	}


	/**
	 * Get saved values for a field group.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @param int   $comment_id Comment ID.
	 * @return array
	 */
	private function get_saved_values( $group, $comment_id ) {
		$saved_values = array();
		$fields       = isset( $group['fields'] ) && is_array( $group['fields'] ) ? $group['fields'] : array();

		foreach ( $fields as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$saved_values[ $field['name'] ] = get_comment_meta( $comment_id, $field['name'], true );
		}

		return $saved_values;
	}


	/**
	 * Save all fields for a specific group.
	 *
	 * @since 2.0.0
	 * @param int   $comment_id Comment ID.
	 * @param array $group Field group data.
	 * @param array $custom_fields Submitted custom fields.
	 * @return void
	 */
	private function save_group_fields( $comment_id, $group, $custom_fields ) {
		$fields = isset( $group['fields'] ) && is_array( $group['fields'] ) ? $group['fields'] : array();

		foreach ( $fields as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$field_name = $field['name'];

			if ( isset( $custom_fields[ $field_name ] ) ) {
				$value = FieldValueSanitizer::sanitize( $custom_fields[ $field_name ], $field );
				update_comment_meta( $comment_id, $field_name, $value );
				continue;
			}

			if ( isset( $field['type'] ) && 'true_false' === $field['type'] ) {
				update_comment_meta( $comment_id, $field_name, '0' );
			}
		}
	}
}