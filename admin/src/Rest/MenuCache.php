<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class MenuCache
 *
 * Handles menu cache key management and rotation.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class MenuCache {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Option name used to store the menu cache key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CACHE_KEY_OPTION = 'flexify_dashboard_menu_cache_key';


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
			self::REST_NAMESPACE,
			'/menu-cache/key',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_cache_key' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/menu-cache/rotate',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'rotate_cache_key' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}


	/**
	 * Check whether the current user can access the endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return bool|WP_Error
	 */
	public function check_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get the current menu cache key.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response
	 */
	public function get_cache_key( WP_REST_Request $request ) {
		unset( $request );

		return new WP_REST_Response(
			array(
				'cache_key' => self::get_or_create_cache_key(),
			),
			200
		);
	}


	/**
	 * Rotate the menu cache key to invalidate client-side caches.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response
	 */
	public function rotate_cache_key( WP_REST_Request $request ) {
		unset( $request );

		$new_cache_key = self::generate_cache_key();

		update_option( self::CACHE_KEY_OPTION, $new_cache_key );

		return new WP_REST_Response(
			array(
				'success' => true,
				'cache_key' => $new_cache_key,
				'message' => __( 'Menu cache key rotated successfully. All client caches have been invalidated.', 'flexify-dashboard' ),
			),
			200
		);
	}


	/**
	 * Get the current cache key or create a new one when missing.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public static function get_or_create_cache_key() {
		$cache_key = get_option( self::CACHE_KEY_OPTION, '' );

		if ( empty( $cache_key ) || ! is_string( $cache_key ) ) {
			$cache_key = self::generate_cache_key();

			update_option( self::CACHE_KEY_OPTION, $cache_key );
		}

		return $cache_key;
	}


	/**
	 * Generate a new cache key.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function generate_cache_key() {
		return wp_generate_password( 32, false );
	}
}