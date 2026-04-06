<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class WooCommerceCustomer
 *
 * Adds a simple REST API endpoint to check if WooCommerce is installed and active.
 * Frontend will fetch customer data directly from WooCommerce REST API.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class WooCommerceCustomer {
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
	private $base = 'woocommerce-active';


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
				'callback'            => array( $this, 'check_woocommerce_active' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}


	/**
	 * Check if the user has permission to access the endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return bool|\WP_Error
	 */
	public function check_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'edit_users' );
	}


	/**
	 * Check if WooCommerce is installed and active.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_woocommerce_active() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return false;
		}

		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		return is_plugin_active( 'woocommerce/woocommerce.php' );
	}


	/**
	 * Check if WooCommerce is active.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function check_woocommerce_active( WP_REST_Request $request ) {
		$is_active = $this->is_woocommerce_active();

		return new WP_REST_Response(
			array(
				'success'            => true,
				'woocommerce_active' => $is_active,
			),
			200
		);
	}
}