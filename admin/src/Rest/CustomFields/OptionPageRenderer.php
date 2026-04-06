<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class OptionPageRenderer
 *
 * Handles rendering option pages with their associated field groups.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class OptionPageRenderer {

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
		$this->json_file_path         = WP_CONTENT_DIR . '/flexify-dashboard-custom-fields.json';
		$this->field_group_repository = new FieldGroupRepository( $this->json_file_path );
	}


	/**
	 * Render the option page.
	 *
	 * @since 2.0.0
	 * @param array $page Option page configuration.
	 * @return void
	 */
	public function render( $page ) {
		if ( ! is_array( $page ) || empty( $page['slug'] ) || empty( $page['title'] ) ) {
			return;
		}

		$field_groups = $this->get_field_groups_for_page( $page['slug'] );

		echo '<div class="wrap flexify-dashboard-option-page-wrap">';
		echo '<h1>' . esc_html( $page['title'] ) . '</h1>';

		if ( ! empty( $page['description'] ) ) {
			echo '<p class="description">' . esc_html( $page['description'] ) . '</p>';
		}

		if ( empty( $field_groups ) ) {
			$this->render_empty_state();
			echo '</div>';
			return;
		}

		echo '<form method="post" id="flexify-dashboard-option-page-form">';

		wp_nonce_field( 'flexify_dashboard_option_page_' . $page['slug'], 'flexify_dashboard_option_page_nonce' );

		printf(
			'<input type="hidden" name="flexify_dashboard_option_page_slug" value="%s">',
			esc_attr( $page['slug'] )
		);

		foreach ( $field_groups as $group ) {
			$this->render_field_group( $group, $page['slug'] );
		}

		echo '<p class="submit">';
		submit_button( __( 'Save Changes', 'flexify-dashboard' ), 'primary', 'submit', false );
		echo '</p>';

		echo '</form>';
		echo '</div>';

		$this->enqueue_option_page_styles();
	}


	/**
	 * Get field groups that should display on this option page.
	 *
	 * @since 2.0.0
	 * @param string $page_slug Option page slug.
	 * @return array
	 */
	private function get_field_groups_for_page( $page_slug ) {
		$all_groups       = $this->field_group_repository->get_active_groups();
		$matching_groups  = array();

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

		usort( $matching_groups, array( $this, 'sort_groups_by_menu_order' ) );

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
	 * Render a single field group.
	 *
	 * @since 2.0.0
	 * @param array  $group Field group configuration.
	 * @param string $page_slug Option page slug.
	 * @return void
	 */
	private function render_field_group( $group, $page_slug ) {
		$fields = isset( $group['fields'] ) && is_array( $group['fields'] )
			? $group['fields']
			: array();

		if ( empty( $fields ) ) {
			return;
		}

		$saved_values   = $this->get_group_saved_values( $fields, $page_slug );
		$vue_group_data = FieldValueSanitizer::prepare_vue_group_data( $group );
		$style          = isset( $group['style'] ) ? sanitize_key( $group['style'] ) : 'default';

		if ( 'seamless' === $style ) {
			$this->render_vue_container( $vue_group_data, $saved_values, $page_slug );
			return;
		}

		echo '<div class="postbox flexify-dashboard-option-page-postbox">';
		echo '<div class="postbox-header"><h2 class="hndle">' . esc_html( $group['title'] ) . '</h2></div>';
		echo '<div class="inside">';

		if ( ! empty( $group['description'] ) ) {
			echo '<p class="description" style="margin-bottom: 15px;">' . esc_html( $group['description'] ) . '</p>';
		}

		$this->render_vue_container( $vue_group_data, $saved_values, $page_slug );

		echo '</div>';
		echo '</div>';
	}


	/**
	 * Render the Vue application container.
	 *
	 * @since 2.0.0
	 * @param array  $vue_group_data Vue group data.
	 * @param array  $saved_values Saved field values.
	 * @param string $page_slug Option page slug.
	 * @return void
	 */
	private function render_vue_container( $vue_group_data, $saved_values, $page_slug ) {
		printf(
			'<div class="flexify-dashboard-custom-fields-app flexify-dashboard-option-page-fields" data-field-group="%s" data-saved-values="%s" data-page-slug="%s" data-context="option"></div>',
			esc_attr( wp_json_encode( $vue_group_data ) ),
			esc_attr( wp_json_encode( $saved_values ) ),
			esc_attr( $page_slug )
		);
	}


	/**
	 * Get saved values for a field group.
	 *
	 * @since 2.0.0
	 * @param array  $fields Field definitions.
	 * @param string $page_slug Option page slug.
	 * @return array
	 */
	private function get_group_saved_values( $fields, $page_slug ) {
		$saved_values  = array();
		$option_key    = $this->get_option_key( $page_slug );
		$saved_options = get_option( $option_key, array() );

		if ( ! is_array( $saved_options ) ) {
			$saved_options = array();
		}

		foreach ( $fields as $field ) {
			$field_name = isset( $field['name'] ) ? $field['name'] : '';

			if ( empty( $field_name ) ) {
				continue;
			}

			$saved_values[ $field_name ] = isset( $saved_options[ $field_name ] ) ? $saved_options[ $field_name ] : '';
		}

		return $saved_values;
	}


	/**
	 * Render the empty state notice.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function render_empty_state() {
		echo '<div class="notice notice-info"><p>';
		echo esc_html__( 'No field groups are assigned to this option page. Create a field group and set its location to this option page.', 'flexify-dashboard' );
		echo '</p></div>';
	}


	/**
	 * Enqueue option page specific styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function enqueue_option_page_styles() {
		?>
		<style>
			.flexify-dashboard-option-page-wrap {
				max-width: 1200px;
			}

			.flexify-dashboard-option-page-wrap .postbox {
				margin-bottom: 20px;
			}

			.flexify-dashboard-option-page-wrap .postbox-header {
				padding: 10px 15px;
				border-bottom: 1px solid #c3c4c7;
			}

			.flexify-dashboard-option-page-wrap .postbox-header h2 {
				margin: 0;
				font-size: 14px;
				font-weight: 600;
			}

			.flexify-dashboard-option-page-wrap .inside {
				padding: 15px;
			}

			.flexify-dashboard-option-page-wrap .submit {
				padding: 10px 0;
				margin-top: 20px;
				border-top: 1px solid #c3c4c7;
			}

			.flexify-dashboard-option-page-fields {
				min-height: 50px;
			}
		</style>
		<?php
	}


	/**
	 * Sort field groups by menu order.
	 *
	 * @since 2.0.0
	 * @param array $group_a First group.
	 * @param array $group_b Second group.
	 * @return int
	 */
	private function sort_groups_by_menu_order( $group_a, $group_b ) {
		$order_a = isset( $group_a['menu_order'] ) ? absint( $group_a['menu_order'] ) : 0;
		$order_b = isset( $group_b['menu_order'] ) ? absint( $group_b['menu_order'] ) : 0;

		if ( $order_a === $order_b ) {
			return 0;
		}

		return ( $order_a < $order_b ) ? -1 : 1;
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
	 * Get saved option value.
	 *
	 * @since 2.0.0
	 * @param string $page_slug Option page slug.
	 * @param string $field_name Field name.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	public static function get_option_value( $page_slug, $field_name, $default = null ) {
		$option_key = 'flexify_dashboard_options_' . sanitize_key( $page_slug );
		$options    = get_option( $option_key, array() );

		if ( ! is_array( $options ) ) {
			return $default;
		}

		return isset( $options[ $field_name ] ) ? $options[ $field_name ] : $default;
	}


	/**
	 * Get all option values for a page.
	 *
	 * @since 2.0.0
	 * @param string $page_slug Option page slug.
	 * @return array
	 */
	public static function get_all_option_values( $page_slug ) {
		$option_key = 'flexify_dashboard_options_' . sanitize_key( $page_slug );
		$options    = get_option( $option_key, array() );

		return is_array( $options ) ? $options : array();
	}
}