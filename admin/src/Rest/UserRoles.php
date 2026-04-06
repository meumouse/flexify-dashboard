<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class UserRoles
 *
 * Adds a custom REST API endpoint to fetch all available user roles in WordPress.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class UserRoles {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * REST route base.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_BASE = 'user-roles';

	/**
	 * Initialize the class and set up REST API routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register the REST API routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE,
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_user_roles' ),
				'permission_callback' => array( $this, 'get_user_roles_permissions_check' ),
			)
		);
	}


	/**
	 * Check if the user has permission to access the endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The request object.
	 * @return bool|WP_Error
	 */
	public function get_user_roles_permissions_check( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get all available user roles.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response
	 */
	public function get_user_roles( WP_REST_Request $request ) {
		$wp_roles = wp_roles();
		$roles    = array();

		if ( empty( $wp_roles->roles ) || ! is_array( $wp_roles->roles ) ) {
			return new WP_REST_Response( $roles, 200 );
		}

		foreach ( $wp_roles->roles as $role_slug => $role_info ) {
			$roles[] = array(
				'value' => $role_slug,
				'label' => isset( $role_info['name'] ) ? translate_user_role( $role_info['name'] ) : $role_slug,
			);
		}

		return new WP_REST_Response( $roles, 200 );
	}
}