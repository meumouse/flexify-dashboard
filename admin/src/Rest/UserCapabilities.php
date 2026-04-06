<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class UserCapabilities
 *
 * Adds a custom REST API endpoint to fetch the current user's capabilities.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class UserCapabilities {
	/**
	 * REST API namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $namespace = 'flexify-dashboard/v1';

	/**
	 * REST API base route.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $base = 'user-capabilities';


	/**
	 * Register hooks.
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
		register_rest_route(
			$this->namespace,
			'/' . $this->base,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_user_capabilities' ),
				'permission_callback' => array( $this, 'get_user_capabilities_permissions_check' ),
			)
		);
	}


	/**
	 * Check if the user has permission to access the endpoint.
	 *
	 * Only authenticated users can view their own capabilities.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return bool|\WP_Error
	 */
	public function get_user_capabilities_permissions_check( WP_REST_Request $request ) {
		return RestPermissionChecker::check_login_only( $request );
	}


	/**
	 * Get the current user's capabilities.
	 *
	 * Returns only the capabilities map for the authenticated user.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_user_capabilities( WP_REST_Request $request ) {
		$current_user = wp_get_current_user();
		$allcaps = array();

		if ( isset( $current_user->allcaps ) && is_array( $current_user->allcaps ) ) {
			$allcaps = $current_user->allcaps;
		}

		return new WP_REST_Response(
			array(
				'allcaps' => $allcaps,
			),
			200
		);
	}
}