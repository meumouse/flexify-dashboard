<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;

defined('ABSPATH') || exit;

/**
 * Class RestPermissionChecker
 *
 * Utility class for checking REST API permissions with support for:
 * - Local requests: Nonce verification (CSRF protection)
 * - Remote requests: Basic Auth with application password validation
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class RestPermissionChecker {
	/**
	 * Authorization header prefix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const BASIC_AUTH_PREFIX = 'Basic ';

	/**
	 * Default capability required for protected endpoints.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DEFAULT_CAPABILITY = 'manage_options';

	/**
	 * Check if the request is coming from the same domain.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool
	 */
	private static function is_local_request( WP_REST_Request $request ) {
		$origin      = $request->get_header( 'Origin' );
		$referer     = $request->get_header( 'Referer' );
		$auth_header = $request->get_header( 'Authorization' );
		$site_host   = wp_parse_url( home_url(), PHP_URL_HOST );

		if ( empty( $site_host ) ) {
			return true;
		}

		if ( self::matches_site_host( $origin, $site_host ) ) {
			return true;
		}

		if ( self::matches_site_host( $referer, $site_host ) ) {
			return true;
		}

		if ( self::has_basic_auth_header( $auth_header ) ) {
			return false;
		}

		return true;
	}


	/**
	 * Check whether a given URL matches the current site host.
	 *
	 * @since 2.0.0
	 * @param string $url Source URL.
	 * @param string $site_host Current site host.
	 * @return bool
	 */
	private static function matches_site_host( $url, $site_host ) {
		if ( empty( $url ) || empty( $site_host ) ) {
			return false;
		}

		$url_host = wp_parse_url( $url, PHP_URL_HOST );

		return ! empty( $url_host ) && $url_host === $site_host;
	}


	/**
	 * Check whether the request contains a Basic Auth header.
	 *
	 * @since 2.0.0
	 * @param string $auth_header Authorization header value.
	 * @return bool
	 */
	private static function has_basic_auth_header( $auth_header ) {
		return ! empty( $auth_header ) && strpos( $auth_header, self::BASIC_AUTH_PREFIX ) === 0;
	}


	/**
	 * Validate Basic Auth credentials.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	private static function validate_basic_auth( WP_REST_Request $request ) {
		$auth_header = $request->get_header( 'Authorization' );

		if ( ! self::has_basic_auth_header( $auth_header ) ) {
			return self::get_authentication_error();
		}

		$credentials = self::parse_basic_auth_credentials( $auth_header );

		if ( is_wp_error( $credentials ) ) {
			return $credentials;
		}

		$username = $credentials['username'];
		$password = $credentials['password'];
		$user     = get_user_by( 'login', $username );

		if ( ! $user ) {
			return self::get_authentication_error();
		}

		$authenticated_user = wp_authenticate( $username, $password );

		if ( ! is_wp_error( $authenticated_user ) ) {
			wp_set_current_user( $authenticated_user->ID );

			return true;
		}

		if ( self::validate_application_password( $user->ID, $password ) ) {
			wp_set_current_user( $user->ID );

			return true;
		}

		return self::get_authentication_error();
	}


	/**
	 * Parse credentials from the Basic Auth header.
	 *
	 * @since 2.0.0
	 * @param string $auth_header Authorization header value.
	 * @return array|WP_Error
	 */
	private static function parse_basic_auth_credentials( $auth_header ) {
		$encoded_credentials = substr( $auth_header, strlen( self::BASIC_AUTH_PREFIX ) );
		$decoded_credentials = base64_decode( $encoded_credentials, true );

		if ( false === $decoded_credentials || strpos( $decoded_credentials, ':' ) === false ) {
			return self::get_authentication_error();
		}

		list( $username, $password ) = explode( ':', $decoded_credentials, 2 );

		$username = sanitize_user( $username );
		$password = (string) $password;

		if ( empty( $username ) || '' === $password ) {
			return self::get_authentication_error();
		}

		return array(
			'username' => $username,
			'password' => $password,
		);
	}


	/**
	 * Validate a WordPress application password.
	 *
	 * @since 2.0.0
	 * @param int    $user_id User ID.
	 * @param string $password Raw password.
	 * @return bool
	 */
	private static function validate_application_password( $user_id, $password ) {
		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			return false;
		}

		$app_passwords = \WP_Application_Passwords::get_user_application_passwords( $user_id );

		if ( empty( $app_passwords ) || ! is_array( $app_passwords ) ) {
			return false;
		}

		foreach ( $app_passwords as $app_password ) {
			if ( empty( $app_password['password'] ) ) {
				continue;
			}

			if ( wp_check_password( $password, $app_password['password'] ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Verify nonce for local requests.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	private static function verify_nonce( WP_REST_Request $request ) {
		$nonce = $request->get_header( 'X-WP-Nonce' );

		if ( empty( $nonce ) ) {
			$nonce = $request->get_param( '_wpnonce' );
		}

		if ( empty( $nonce ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'Missing security token. Please refresh the page and try again.', 'flexify-dashboard' ),
				array( 'status' => 403 )
			);
		}

		if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'Invalid security token. Please refresh the page and try again.', 'flexify-dashboard' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}


	/**
	 * Main permission check method.
	 *
	 * Checks user capabilities and validates authentication based on request origin:
	 * - Local requests: Requires nonce verification
	 * - Remote requests: Requires Basic Auth with application password
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @param string|array    $required_capability Required capability or list of capabilities.
	 * @param bool            $require_login Whether login is required.
	 * @return bool|WP_Error
	 */
	public static function check_permissions( WP_REST_Request $request, $required_capability = self::DEFAULT_CAPABILITY, $require_login = true ) {
		if ( $require_login && ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to access this endpoint.', 'flexify-dashboard' ),
				array( 'status' => 401 )
			);
		}

		if ( self::is_local_request( $request ) ) {
			$nonce_check = self::verify_nonce( $request );

			if ( is_wp_error( $nonce_check ) ) {
				return $nonce_check;
			}
		} else {
			$auth_check = self::validate_basic_auth( $request );

			if ( is_wp_error( $auth_check ) ) {
				return $auth_check;
			}
		}

		$capability_check = self::validate_capabilities( $required_capability );

		if ( is_wp_error( $capability_check ) ) {
			return $capability_check;
		}

		return true;
	}


	/**
	 * Validate required user capabilities.
	 *
	 * @since 2.0.0
	 * @param string|array $required_capability Required capability or list of capabilities.
	 * @return bool|WP_Error
	 */
	private static function validate_capabilities( $required_capability ) {
		if ( empty( $required_capability ) ) {
			return true;
		}

		$capabilities = is_array( $required_capability ) ? $required_capability : array( $required_capability );

		foreach ( $capabilities as $capability ) {
			if ( ! current_user_can( $capability ) ) {
				return new WP_Error(
					'rest_forbidden',
					sprintf(
						/* translators: %s: required capability */
						__( 'You do not have permission to perform this action. Required capability: %s', 'flexify-dashboard' ),
						$capability
					),
					array( 'status' => 403 )
				);
			}
		}

		return true;
	}


	/**
	 * Simplified permission check for endpoints that only require login.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public static function check_login_only( WP_REST_Request $request ) {
		return self::check_permissions( $request, '', true );
	}


	/**
	 * Permission check for public endpoints.
	 *
	 * Still validates nonce or Basic Auth when the user is already authenticated.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public static function check_public( WP_REST_Request $request ) {
		if ( is_user_logged_in() ) {
			return self::check_permissions( $request, '', false );
		}

		return true;
	}


	/**
	 * Get a standardized authentication error.
	 *
	 * @since 2.0.0
	 * @return WP_Error
	 */
	private static function get_authentication_error() {
		return new WP_Error(
			'rest_forbidden',
			__( 'Invalid authentication credentials.', 'flexify-dashboard' ),
			array( 'status' => 401 )
		);
	}
}