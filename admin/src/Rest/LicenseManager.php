<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\License\LicenseService;
use MeuMouse\Flexify_Dashboard\Options\Settings;

use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * REST endpoints for license management.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class LicenseManager {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Register hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}


	/**
	 * Register REST routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/license/activate',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'activate_license' ),
				'permission_callback' => function( $request ) {
					return RestPermissionChecker::check_permissions( $request, 'manage_options' );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/license/validate',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'validate_license' ),
				'permission_callback' => function( $request ) {
					return RestPermissionChecker::check_permissions( $request, 'manage_options' );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/license/deactivate',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'deactivate_license' ),
				'permission_callback' => function( $request ) {
					return RestPermissionChecker::check_permissions( $request, 'manage_options' );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/license/status',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_license_status' ),
				'permission_callback' => function( $request ) {
					return RestPermissionChecker::check_permissions( $request, 'manage_options' );
				},
			)
		);
	}


	/**
	 * Activate license endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function activate_license( WP_REST_Request $request ) {
		$license_key = trim( (string) $request->get_param( 'license_key' ) );
		$result = LicenseService::activate( $license_key );

		if ( ! empty( $result['success'] ) ) {
			self::sync_license_settings( $license_key );
		}

		return new WP_REST_Response( $result, ! empty( $result['success'] ) ? 200 : 400 );
	}


	/**
	 * Validate license endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function validate_license( WP_REST_Request $request ) {
		$license_key = trim( (string) $request->get_param( 'license_key' ) );
		$force = rest_sanitize_boolean( $request->get_param( 'force' ) );
		$result = LicenseService::validate( $license_key, $force );

		if ( ! empty( $result['success'] ) && ! empty( $result['data']['license_key'] ) ) {
			self::sync_license_settings( $result['data']['license_key'] );
		}

		return new WP_REST_Response( $result, ! empty( $result['success'] ) ? 200 : 400 );
	}


	/**
	 * Deactivate license endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function deactivate_license( WP_REST_Request $request ) {
		$result = LicenseService::deactivate();
		self::sync_license_settings( '' );

		return new WP_REST_Response( $result, 200 );
	}


	/**
	 * License status endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function get_license_status( WP_REST_Request $request ) {
		$result = LicenseService::get_status();

		if ( empty( $result['success'] ) ) {
			$stored_key = trim( (string) Settings::get_setting( 'license_key', '' ) );

			if ( '' !== $stored_key ) {
				$result = LicenseService::validate( $stored_key, false );
			}
		}

		return new WP_REST_Response( $result, 200 );
	}


	/**
	 * Keep the settings option aligned with the canonical license state.
	 *
	 * @since 2.0.0
	 * @param string $license_key License key.
	 * @return void
	 */
	private static function sync_license_settings( $license_key ) {
		$settings = get_option( 'flexify_dashboard_settings', array() );

		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		$settings['license_key'] = (string) $license_key;
		$settings['instance_id'] = '';

		update_option( 'flexify_dashboard_settings', $settings );
		Settings::clear_cache();
	}
}
