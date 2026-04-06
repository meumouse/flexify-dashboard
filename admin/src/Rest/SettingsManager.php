<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Options\GlobalOptions;
use MeuMouse\Flexify_Dashboard\Options\Settings;

use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class SettingsManager
 *
 * Handle REST endpoints for plugin settings management.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class SettingsManager {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Initialize hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_custom_endpoints' ) );
	}


	/**
	 * Register custom REST endpoints.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_custom_endpoints() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/settings/reset',
			array(
				'methods' => 'POST',
				'callback' => array( __CLASS__, 'reset_settings' ),
				'permission_callback' => function( $request ) {
					return RestPermissionChecker::check_permissions( $request, 'manage_options' );
				},
			)
		);
	}


	/**
	 * Reset plugin settings to default values.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response
	 */
	public static function reset_settings( WP_REST_Request $request ) {
		$default_settings = GlobalOptions::get_default_settings();

		update_option( 'flexify_dashboard_settings', $default_settings );
		Settings::clear_cache();

		return new WP_REST_Response(
			array(
				'success' => true,
				'settings' => $default_settings,
				'message' => __( 'Settings reset to defaults.', 'flexify-dashboard' ),
			),
			200
		);
	}
}