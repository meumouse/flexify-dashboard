<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class AdminNotices
 *
 * Handles persistent admin notices via custom post type and REST API meta fields.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class AdminNotices {

	/**
	 * Notice post type slug.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const POST_TYPE = 'flexify_dash_notice';

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Admin page slug.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const PAGE_SLUG = 'flexify-dashboard-admin-notices';


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
		add_action( 'init', array( __CLASS__, 'register_meta_fields' ) );
		add_action( 'admin_menu', array( __CLASS__, 'admin_notices_settings_page' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_endpoints' ) );
	}


	/**
	 * Register the admin notices custom post type.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_post_type() {
		$labels = array(
			'name' => _x( 'Admin Notices', 'post type general name', 'flexify-dashboard' ),
			'singular_name' => _x( 'Admin Notice', 'post type singular name', 'flexify-dashboard' ),
			'menu_name' => _x( 'Admin Notices', 'admin menu', 'flexify-dashboard' ),
			'add_new' => _x( 'Add New', 'notice', 'flexify-dashboard' ),
			'add_new_item' => __( 'Add New Admin Notice', 'flexify-dashboard' ),
			'edit_item' => __( 'Edit Admin Notice', 'flexify-dashboard' ),
			'view_item' => __( 'View Admin Notice', 'flexify-dashboard' ),
			'all_items' => __( 'All Admin Notices', 'flexify-dashboard' ),
			'search_items' => __( 'Search Admin Notices', 'flexify-dashboard' ),
			'not_found' => __( 'No Admin Notices found.', 'flexify-dashboard' ),
		);

		$args = array(
			'labels' => $labels,
			'description' => __( 'Persistent admin notices for Flexify Dashboard.', 'flexify-dashboard' ),
			'public' => false,
			'publicly_queryable' => false,
			'show_ui' => false,
			'show_in_menu' => false,
			'query_var' => false,
			'has_archive' => false,
			'hierarchical' => false,
			'supports' => array( 'title', 'editor', 'custom-fields' ),
			'show_in_rest' => true,
			'rest_base' => 'flexify-dashboard-notices',
		);

		register_post_type( self::POST_TYPE, $args );
	}


	/**
	 * Register meta fields for the notice post type.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_meta_fields() {
		register_post_meta( self::POST_TYPE, 'notice_type', array(
			'single' => true,
			'default' => 'info',
			'show_in_rest' => true,
			'sanitize_callback' => 'sanitize_text_field',
			'auth_callback' => array( __CLASS__, 'can_access_notice_meta' ),
		) );

		register_post_meta( self::POST_TYPE, 'roles', array(
			'type' => 'array',
			'single' => true,
			'default' => array(),
			'show_in_rest' => array(
				'schema' => array(
					'type' => 'array',
					'items' => array(
						'type' => 'object',
						'properties' => array(
							'id' => array(
								'type' => 'string',
							),
							'value' => array(
								'type' => 'string',
							),
							'type' => array(
								'type' => 'string',
							),
						),
					),
				),
			),
			'sanitize_callback' => array( __CLASS__, 'sanitize_roles' ),
			'auth_callback' => array( __CLASS__, 'can_access_notice_meta' ),
		) );

		register_post_meta( self::POST_TYPE, 'dismissible', array(
			'type' => 'boolean',
			'single' => true,
			'default' => true,
			'show_in_rest' => true,
			'sanitize_callback' => 'rest_sanitize_boolean',
			'auth_callback' => array( __CLASS__, 'can_access_notice_meta' ),
		) );

		register_post_meta( self::POST_TYPE, 'seen_by', array(
			'type' => 'array',
			'single' => true,
			'default' => array(),
			'show_in_rest' => array(
				'schema' => array(
					'type' => 'array',
					'items' => array(
						'type' => 'integer',
					),
				),
			),
			'sanitize_callback' => array( __CLASS__, 'sanitize_seen_by' ),
			'auth_callback' => array( __CLASS__, 'can_access_notice_meta' ),
		) );
	}


	/**
	 * Check whether the current user can access notice meta fields.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function can_access_notice_meta() {
		return is_user_logged_in();
	}


	/**
	 * Sanitize the roles array.
	 *
	 * @since 2.0.0
	 * @param mixed $value Roles value.
	 * @return array
	 */
	public static function sanitize_roles( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized = array();

		foreach ( $value as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$sanitized[] = array(
				'id' => isset( $item['id'] ) ? sanitize_text_field( $item['id'] ) : '',
				'value' => isset( $item['value'] ) ? sanitize_text_field( $item['value'] ) : '',
				'type' => isset( $item['type'] ) ? sanitize_text_field( $item['type'] ) : '',
			);
		}

		return $sanitized;
	}


	/**
	 * Sanitize the seen_by array.
	 *
	 * @since 2.0.0
	 * @param mixed $value Seen by value.
	 * @return array
	 */
	public static function sanitize_seen_by( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		return array_values( array_filter( array_map( 'absint', $value ) ) );
	}


	/**
	 * Add the admin notices settings page to the plugin menu.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function admin_notices_settings_page() {
		$menu_name = __( 'Admin Notices', 'flexify-dashboard' );
		$hook_suffix = add_submenu_page(
			'flexify-dashboard-settings',
			$menu_name,
			$menu_name,
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_admin_notices_app' )
		);

		if ( empty( $hook_suffix ) ) {
			return;
		}

		add_action( "admin_head_{$hook_suffix}", array( __CLASS__, 'load_styles' ) );
		add_action( "admin_head_{$hook_suffix}", array( __CLASS__, 'load_scripts' ) );
	}


	/**
	 * Enqueue admin notices styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_styles() {
		$plugin_url = plugins_url( 'flexify-dashboard/' );
		$style_url = $plugin_url . 'app/dist/assets/styles/admin-notices.css';

		wp_enqueue_style( 'flexify-dashboard-admin-notices', $style_url, array(), FLEXIFY_DASHBOARD_VERSION );
	}


	/**
	 * Print admin notices scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_scripts() {
		$plugin_url = plugins_url( 'flexify-dashboard/' );
		$script_name = Scripts::get_base_script_path( 'AdminNotices.js' );
		$script_args = array(
			'id' => 'fd-admin-notices-script',
			'src' => $plugin_url . 'app/dist/' . $script_name,
			'type' => 'module',
		);

		wp_print_script_tag( $script_args );
	}


	/**
	 * Render the Vue app container for the admin notices page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function render_admin_notices_app() {
		echo '<div id="flexify-dashboard-admin-notices-app"></div>';
	}


	/**
	 * Register custom REST endpoints for admin notices.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_rest_endpoints() {
		register_rest_route( self::REST_NAMESPACE, '/notices/seen', array(
			'methods' => 'POST',
			'callback' => array( __CLASS__, 'mark_notice_seen' ),
			'permission_callback' => array( __CLASS__, 'check_seen_notice_permissions' ),
			'args' => array(
				'notice_id' => array(
					'required' => true,
					'sanitize_callback' => 'absint',
					'validate_callback' => array( __CLASS__, 'validate_notice_id' ),
					'description' => __( 'ID of the notice to mark as seen', 'flexify-dashboard' ),
				),
			),
		) );
	}


	/**
	 * Check permissions for marking a notice as seen.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request REST request object.
	 * @return bool|\WP_Error
	 */
	public static function check_seen_notice_permissions( $request ) {
		return RestPermissionChecker::check_login_only( $request );
	}


	/**
	 * Validate the notice ID parameter.
	 *
	 * @since 2.0.0
	 * @param mixed            $value Notice ID.
	 * @param \WP_REST_Request $request REST request object.
	 * @param string           $param Parameter name.
	 * @return bool
	 */
	public static function validate_notice_id( $value, $request, $param ) {
		unset( $request, $param );

		return absint( $value ) > 0;
	}


	/**
	 * Mark a notice as seen by the current user.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function mark_notice_seen( $request ) {
		$notice_id = absint( $request->get_param( 'notice_id' ) );
		$user_id = get_current_user_id();

		if ( ! $notice_id || ! $user_id ) {
			return new \WP_Error(
				'invalid_data',
				__( 'Invalid notice or user.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( self::POST_TYPE !== get_post_type( $notice_id ) ) {
			return new \WP_Error(
				'invalid_notice',
				__( 'Invalid notice or user.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$seen_by = get_post_meta( $notice_id, 'seen_by', true );
		$seen_by = is_array( $seen_by ) ? self::sanitize_seen_by( $seen_by ) : array();

		if ( ! in_array( $user_id, $seen_by, true ) ) {
			$seen_by[] = $user_id;
			$seen_by = self::sanitize_seen_by( $seen_by );

			update_post_meta( $notice_id, 'seen_by', $seen_by );
		}

		return rest_ensure_response( array(
			'success' => true,
			'seen_by' => $seen_by,
		) );
	}
}