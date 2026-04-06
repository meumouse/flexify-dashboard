<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class OptionPageSaver
 *
 * Handles saving option page field values to wp_options.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class OptionPageSaver {

	/**
	 * Custom fields JSON file path.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $json_file_path;

	/**
	 * Field group repository instance.
	 *
	 * @since 2.0.0
	 * @var FieldGroupRepository
	 */
	private $field_group_repository;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 */
	public function __construct() {
		$this->json_file_path = WP_CONTENT_DIR . '/flexify-dashboard-custom-fields.json';
		$this->field_group_repository = new FieldGroupRepository( $this->json_file_path );
	}


	/**
	 * Initialize hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {
		add_action( 'admin_init', array( $this, 'handle_save' ) );
	}


	/**
	 * Handle option page form submission.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_save() {
		if ( ! $this->is_option_page_request() ) {
			return;
		}

		$page_slug = isset( $_POST['flexify_dashboard_option_page_slug'] )
			? sanitize_key( wp_unslash( $_POST['flexify_dashboard_option_page_slug'] ) )
			: '';

		$nonce = isset( $_POST['flexify_dashboard_option_page_nonce'] )
			? sanitize_text_field( wp_unslash( $_POST['flexify_dashboard_option_page_nonce'] ) )
			: '';

		if ( empty( $page_slug ) || empty( $nonce ) ) {
			return;
		}

		if ( ! wp_verify_nonce( $nonce, 'flexify_dashboard_option_page_' . $page_slug ) ) {
			wp_die( esc_html__( 'Security check failed.', 'flexify-dashboard' ) );
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to save these options.', 'flexify-dashboard' ) );
		}

		$field_groups = $this->get_field_groups_for_page( $page_slug );

		if ( empty( $field_groups ) ) {
			return;
		}

		$custom_fields = isset( $_POST['flexify_dashboard_cf'] ) && is_array( $_POST['flexify_dashboard_cf'] )
			? wp_unslash( $_POST['flexify_dashboard_cf'] )
			: array();

		$option_key       = $this->get_option_key( $page_slug );
		$existing_options = get_option( $option_key, array() );
		$new_options      = $this->build_option_values( $field_groups, $custom_fields );

		if ( ! is_array( $existing_options ) ) {
			$existing_options = array();
		}

		update_option( $option_key, array_merge( $existing_options, $new_options ) );

		wp_safe_redirect( $this->get_redirect_url( $page_slug ) );
		exit;
	}


	/**
	 * Check if the current request is an option page save request.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_option_page_request() {
		return isset( $_POST['flexify_dashboard_option_page_nonce'], $_POST['flexify_dashboard_option_page_slug'] );
	}


	/**
	 * Get field groups that should display on this option page.
	 *
	 * @since 2.0.0
	 * @param string $page_slug Option page slug.
	 * @return array
	 */
	private function get_field_groups_for_page( $page_slug ) {
		$all_groups      = $this->field_group_repository->get_active_groups();
		$matching_groups = array();

		if ( ! is_array( $all_groups ) || empty( $all_groups ) ) {
			return $matching_groups;
		}

		foreach ( $all_groups as $group ) {
			if ( ! is_array( $group ) || empty( $group['id'] ) ) {
				continue;
			}

			if ( $this->should_show_for_option_page( $group, $page_slug ) ) {
				$matching_groups[] = $group;
			}
		}

		return $matching_groups;
	}


	/**
	 * Check if a field group should be shown for the given option page.
	 *
	 * @since 2.0.0
	 * @param array  $group Field group configuration.
	 * @param string $page_slug Option page slug.
	 * @return bool
	 */
	private function should_show_for_option_page( $group, $page_slug ) {
		$location = isset( $group['location'] ) && is_array( $group['location'] )
			? $group['location']
			: array();

		if ( empty( $location ) ) {
			return false;
		}

		return LocationRuleEvaluator::should_show_for_option_page( $location, $page_slug );
	}


	/**
	 * Build sanitized option values for all field groups.
	 *
	 * @since 2.0.0
	 * @param array $field_groups Field groups.
	 * @param array $custom_fields Submitted field values.
	 * @return array
	 */
	private function build_option_values( $field_groups, $custom_fields ) {
		$new_options = array();

		foreach ( $field_groups as $group ) {
			$fields = isset( $group['fields'] ) && is_array( $group['fields'] )
				? $group['fields']
				: array();

			foreach ( $fields as $field ) {
				$field_name = isset( $field['name'] ) ? $field['name'] : '';

				if ( empty( $field_name ) ) {
					continue;
				}

				if ( array_key_exists( $field_name, $custom_fields ) ) {
					$new_options[ $field_name ] = FieldValueSanitizer::sanitize( $custom_fields[ $field_name ], $field );
					continue;
				}

				$new_options[ $field_name ] = $this->get_empty_value( $field );
			}
		}

		return $new_options;
	}


	/**
	 * Get the empty value for a field type.
	 *
	 * @since 2.0.0
	 * @param array $field Field configuration.
	 * @return mixed
	 */
	private function get_empty_value( $field ) {
		$type        = isset( $field['type'] ) ? $field['type'] : 'text';
		$is_multiple = ! empty( $field['multiple'] );

		switch ( $type ) {
			case 'true_false':
			case 'checkbox':
				return '0';

			case 'repeater':
			case 'relationship':
			case 'group':
				return array();

			case 'image':
			case 'file':
			case 'gallery':
			case 'link':
			case 'google_map':
				return $is_multiple ? array() : null;

			default:
				return '';
		}
	}


	/**
	 * Get the option key for an option page.
	 *
	 * @since 2.0.0
	 * @param string $page_slug Option page slug.
	 * @return string
	 */
	private function get_option_key( $page_slug ) {
		return 'flexify_dashboard_options_' . sanitize_key( $page_slug );
	}


	/**
	 * Get the redirect URL after saving.
	 *
	 * @since 2.0.0
	 * @param string $page_slug Option page slug.
	 * @return string
	 */
	private function get_redirect_url( $page_slug ) {
		return add_query_arg(
			array(
				'page' => 'flexify-dashboard-options-' . $page_slug,
				'settings-updated' => 'true',
			),
			admin_url( 'admin.php' )
		);
	}
}