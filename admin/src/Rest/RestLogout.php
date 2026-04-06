<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class RestLogout
 *
 * Registers the REST API logout endpoint.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class RestLogout {
	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Route base.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_ROUTE = '/logout';

	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register REST API routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route( self::REST_NAMESPACE, self::REST_ROUTE, array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'custom_logout_callback' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
		) );
	}


	/**
	 * Check whether the current request has permission to logout.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return bool
	 */
	public static function check_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_login_only( $request );
	}


	/**
	 * Handle custom logout request.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response
	 */
	public static function custom_logout_callback( WP_REST_Request $request ) {
		wp_logout();
		wp_clear_auth_cookie();

		return new WP_REST_Response( array(
			'success' => true,
			'message' => __( 'Logged out successfully', 'flexify-dashboard' ),
		), 200 );
	}
}