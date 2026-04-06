<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class GoogleAnalyticsOAuth
 *
 * Handles Google Analytics Service Account authentication and related REST API endpoints.
 * Uses Service Account JSON key for simpler authentication without OAuth consent flow.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class GoogleAnalyticsOAuth {
	/**
	 * Google Analytics Admin API URL for listing properties.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const GA_ADMIN_API_URL = 'https://analyticsadmin.googleapis.com/v1beta';

	/**
	 * Google OAuth token URL.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

	/**
	 * Access token transient key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const ACCESS_TOKEN_TRANSIENT = 'flexify_dashboard_ga_access_token';

	/**
	 * Settings option key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const SETTINGS_OPTION = 'flexify_dashboard_settings';

	/**
	 * Service account setting key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const SERVICE_ACCOUNT_SETTING = 'google_analytics_service_account';

	/**
	 * Property setting key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const PROPERTY_ID_SETTING = 'google_analytics_property_id';

	/**
	 * Token lifetime in seconds.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private const TOKEN_CACHE_TTL = 3000;

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
		register_rest_route( 'flexify-dashboard/v1', '/google-analytics/credentials', array(
			'methods' => 'POST',
			'callback' => array( $this, 'save_credentials' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'service_account_json' => array(
					'required' => true,
					'type' => 'string',
				),
			),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/google-analytics/disconnect', array(
			'methods' => 'POST',
			'callback' => array( $this, 'disconnect' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/google-analytics/properties', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_properties' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/google-analytics/status', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_status' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/google-analytics/property', array(
			'methods' => 'POST',
			'callback' => array( $this, 'save_property' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'property_id' => array(
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/google-analytics/validate', array(
			'methods' => 'POST',
			'callback' => array( $this, 'validate_credentials' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'service_account_json' => array(
					'required' => true,
					'type' => 'string',
				),
			),
		) );
	}


	/**
	 * Check if user has admin permissions.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The REST request.
	 * @return bool|WP_Error
	 */
	public function check_admin_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Validate service account credentials without saving.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function validate_credentials( WP_REST_Request $request ) {
		$json = (string) $request->get_param( 'service_account_json' );
		$credentials = $this->parse_and_validate_credentials( $json );

		if ( is_wp_error( $credentials ) ) {
			return $credentials;
		}

		$access_token = $this->get_access_token_from_credentials( $credentials );

		if ( empty( $access_token ) ) {
			return new WP_Error(
				'auth_failed',
				__( 'Failed to authenticate with Google. Please check your service account key.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return new WP_REST_Response( array(
			'success' => true,
			'message' => __( 'Credentials are valid', 'flexify-dashboard' ),
			'client_email' => $credentials['client_email'],
			'project_id' => $credentials['project_id'],
		), 200 );
	}


	/**
	 * Save service account credentials.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function save_credentials( WP_REST_Request $request ) {
		$json = (string) $request->get_param( 'service_account_json' );
		$credentials = $this->parse_and_validate_credentials( $json );

		if ( is_wp_error( $credentials ) ) {
			return $credentials;
		}

		$access_token = $this->get_access_token_from_credentials( $credentials );

		if ( empty( $access_token ) ) {
			return new WP_Error(
				'auth_failed',
				__( 'Failed to authenticate with Google. Please check your service account key.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$this->update_settings( array(
			self::SERVICE_ACCOUNT_SETTING => $this->encrypt_token( $json ),
		) );

		delete_transient( self::ACCESS_TOKEN_TRANSIENT );

		return new WP_REST_Response( array(
			'success' => true,
			'message' => __( 'Service account credentials saved successfully', 'flexify-dashboard' ),
			'client_email' => $credentials['client_email'],
		), 200 );
	}


	/**
	 * Disconnect Google Analytics.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response
	 */
	public function disconnect( WP_REST_Request $request ) {
		$this->update_settings( array(
			self::SERVICE_ACCOUNT_SETTING => '',
			self::PROPERTY_ID_SETTING => '',
		) );

		delete_transient( self::ACCESS_TOKEN_TRANSIENT );
		$this->clear_ga_cache();

		return new WP_REST_Response( array(
			'success' => true,
			'message' => __( 'Google Analytics disconnected', 'flexify-dashboard' ),
		), 200 );
	}


	/**
	 * Get available GA4 properties.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_properties( WP_REST_Request $request ) {
		$access_token = $this->get_access_token();

		if ( empty( $access_token ) ) {
			return new WP_Error(
				'not_connected',
				__( 'Not connected to Google Analytics', 'flexify-dashboard' ),
				array( 'status' => 401 )
			);
		}

		$response = wp_remote_get( self::GA_ADMIN_API_URL . '/accountSummaries', array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $access_token,
			),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			error_log( 'Google Analytics properties request error: ' . $response->get_error_message() );

			return new WP_Error(
				'api_error',
				$response->get_error_message(),
				array( 'status' => 500 )
			);
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $status_code ) {
			$error_message = isset( $body['error']['message'] )
				? sanitize_text_field( $body['error']['message'] )
				: __( 'Failed to fetch properties. Make sure the service account has been added to your GA4 property.', 'flexify-dashboard' );

			return new WP_Error(
				'api_error',
				$error_message,
				array( 'status' => $status_code )
			);
		}

		$properties = array();

		foreach ( $body['accountSummaries'] ?? array() as $account ) {
			foreach ( $account['propertySummaries'] ?? array() as $property ) {
				$property_id = str_replace( 'properties/', '', $property['property'] ?? '' );

				$properties[] = array(
					'id' => sanitize_text_field( $property_id ),
					'name' => sanitize_text_field( $property['displayName'] ?? $property_id ),
					'account' => sanitize_text_field( $account['displayName'] ?? '' ),
				);
			}
		}

		$settings = $this->get_settings();
		$selected_property = isset( $settings[ self::PROPERTY_ID_SETTING ] ) ? $settings[ self::PROPERTY_ID_SETTING ] : '';

		return new WP_REST_Response( array(
			'success' => true,
			'properties' => $properties,
			'selected' => $selected_property,
		), 200 );
	}


	/**
	 * Get connection status.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response
	 */
	public function get_status( WP_REST_Request $request ) {
		$settings = $this->get_settings();
		$has_credentials = ! empty( $settings[ self::SERVICE_ACCOUNT_SETTING ] );
		$has_property = ! empty( $settings[ self::PROPERTY_ID_SETTING ] );
		$client_email = '';

		if ( $has_credentials ) {
			$json = $this->decrypt_token( $settings[ self::SERVICE_ACCOUNT_SETTING ] );
			$credentials = json_decode( $json, true );

			if ( is_array( $credentials ) ) {
				$client_email = isset( $credentials['client_email'] ) ? sanitize_email( $credentials['client_email'] ) : '';
			}
		}

		return new WP_REST_Response( array(
			'success' => true,
			'connected' => $has_credentials,
			'configured' => $has_credentials && $has_property,
			'property_id' => isset( $settings[ self::PROPERTY_ID_SETTING ] ) ? $settings[ self::PROPERTY_ID_SETTING ] : '',
			'client_email' => $client_email,
		), 200 );
	}


	/**
	 * Save selected property.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function save_property( WP_REST_Request $request ) {
		$property_id = sanitize_text_field( (string) $request->get_param( 'property_id' ) );

		if ( empty( $property_id ) ) {
			return new WP_Error(
				'missing_property',
				__( 'Property ID is required', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$this->update_settings( array(
			self::PROPERTY_ID_SETTING => $property_id,
		) );

		$this->clear_ga_cache();

		return new WP_REST_Response( array(
			'success' => true,
			'message' => __( 'Property saved successfully', 'flexify-dashboard' ),
			'property_id' => $property_id,
		), 200 );
	}


	/**
	 * Get access token using saved service account credentials.
	 *
	 * @since 2.0.0
	 * @return string|null
	 */
	private function get_access_token() {
		$cached_token = get_transient( self::ACCESS_TOKEN_TRANSIENT );

		if ( ! empty( $cached_token ) ) {
			return $cached_token;
		}

		$settings = $this->get_settings();
		$encrypted_json = isset( $settings[ self::SERVICE_ACCOUNT_SETTING ] ) ? $settings[ self::SERVICE_ACCOUNT_SETTING ] : '';

		if ( empty( $encrypted_json ) ) {
			return null;
		}

		$decrypted_json = $this->decrypt_token( $encrypted_json );
		$credentials = json_decode( $decrypted_json, true );

		if ( ! is_array( $credentials ) ) {
			return null;
		}

		return $this->get_access_token_from_credentials( $credentials );
	}


	/**
	 * Get access token from credentials array.
	 *
	 * @since 2.0.0
	 * @param array $credentials Service account credentials.
	 * @return string|null
	 */
	private function get_access_token_from_credentials( array $credentials ) {
		$jwt = $this->generate_jwt( $credentials );

		if ( empty( $jwt ) ) {
			return null;
		}

		$response = wp_remote_post( self::TOKEN_URL, array(
			'body' => array(
				'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				'assertion' => $jwt,
			),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			error_log( 'Flexify Dashboard GA token error: ' . $response->get_error_message() );
			return null;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $body['access_token'] ) ) {
			set_transient( self::ACCESS_TOKEN_TRANSIENT, $body['access_token'], self::TOKEN_CACHE_TTL );
			return $body['access_token'];
		}

		$error_message = isset( $body['error_description'] ) ? $body['error_description'] : ( $body['error'] ?? 'Unknown error' );
		error_log( 'Flexify Dashboard GA token error: ' . $error_message );

		return null;
	}


	/**
	 * Generate a JWT for service account authentication.
	 *
	 * @since 2.0.0
	 * @param array $credentials Service account credentials.
	 * @return string|null
	 */
	private function generate_jwt( array $credentials ) {
		if ( empty( $credentials['client_email'] ) || empty( $credentials['private_key'] ) ) {
			return null;
		}

		$now = time();
		$expiry = $now + HOUR_IN_SECONDS;

		$header = array(
			'alg' => 'RS256',
			'typ' => 'JWT',
		);

		$payload = array(
			'iss' => $credentials['client_email'],
			'scope' => 'https://www.googleapis.com/auth/analytics.readonly',
			'aud' => self::TOKEN_URL,
			'iat' => $now,
			'exp' => $expiry,
		);

		$header_encoded = $this->base64_url_encode( wp_json_encode( $header ) );
		$payload_encoded = $this->base64_url_encode( wp_json_encode( $payload ) );

		if ( false === $header_encoded || false === $payload_encoded ) {
			return null;
		}

		$data_to_sign = $header_encoded . '.' . $payload_encoded;
		$signature = '';
		$success = openssl_sign( $data_to_sign, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256 );

		if ( ! $success ) {
			error_log( 'Flexify Dashboard GA JWT signing failed: ' . openssl_error_string() );
			return null;
		}

		return $header_encoded . '.' . $payload_encoded . '.' . $this->base64_url_encode( $signature );
	}


	/**
	 * Base64 URL encode.
	 *
	 * @since 2.0.0
	 * @param string $data Data to encode.
	 * @return string|false
	 */
	private function base64_url_encode( $data ) {
		if ( ! is_string( $data ) ) {
			return false;
		}

		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}


	/**
	 * Parse and validate service account credentials.
	 *
	 * @since 2.0.0
	 * @param string $json Raw JSON credentials.
	 * @return array|WP_Error
	 */
	private function parse_and_validate_credentials( $json ) {
		$credentials = json_decode( $json, true );

		if ( ! is_array( $credentials ) ) {
			return new WP_Error(
				'invalid_json',
				__( 'Invalid JSON format', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$required_fields = array(
			'type',
			'project_id',
			'private_key',
			'client_email',
		);

		foreach ( $required_fields as $field ) {
			if ( empty( $credentials[ $field ] ) ) {
				return new WP_Error(
					'missing_field',
					sprintf( __( 'Missing required field: %s', 'flexify-dashboard' ), $field ),
					array( 'status' => 400 )
				);
			}
		}

		if ( 'service_account' !== $credentials['type'] ) {
			return new WP_Error(
				'invalid_type',
				__( 'JSON must be a service account key (type should be "service_account")', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return array(
			'type' => sanitize_text_field( $credentials['type'] ),
			'project_id' => sanitize_text_field( $credentials['project_id'] ),
			'private_key' => (string) $credentials['private_key'],
			'client_email' => sanitize_email( $credentials['client_email'] ),
		);
	}


	/**
	 * Get plugin settings.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_settings() {
		$settings = get_option( self::SETTINGS_OPTION, array() );
		return is_array( $settings ) ? $settings : array();
	}


	/**
	 * Update plugin settings.
	 *
	 * @since 2.0.0
	 * @param array $updates Settings to update.
	 * @return void
	 */
	private function update_settings( array $updates ) {
		$settings = $this->get_settings();
		$settings = array_merge( $settings, $updates );

		update_option( self::SETTINGS_OPTION, $settings );
	}


	/**
	 * Encrypt a token for storage.
	 *
	 * @since 2.0.0
	 * @param string $token Token to encrypt.
	 * @return string
	 */
	private function encrypt_token( $token ) {
		if ( empty( $token ) ) {
			return '';
		}

		$key = wp_salt( 'auth' );
		$iv = substr( md5( $key ), 0, 16 );
		$encrypted = openssl_encrypt( $token, 'AES-256-CBC', $key, 0, $iv );

		return false !== $encrypted ? base64_encode( $encrypted ) : '';
	}


	/**
	 * Decrypt a stored token.
	 *
	 * @since 2.0.0
	 * @param string $encrypted_token Encrypted token.
	 * @return string
	 */
	private function decrypt_token( $encrypted_token ) {
		if ( empty( $encrypted_token ) ) {
			return '';
		}

		$key = wp_salt( 'auth' );
		$iv = substr( md5( $key ), 0, 16 );
		$decoded = base64_decode( $encrypted_token, true );

		if ( false === $decoded ) {
			return '';
		}

		$decrypted = openssl_decrypt( $decoded, 'AES-256-CBC', $key, 0, $iv );

		return false !== $decrypted ? $decrypted : '';
	}


	/**
	 * Clear Google Analytics related cache.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function clear_ga_cache() {
		global $wpdb;

		$wpdb->query(
			"DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_ga_%' OR option_name LIKE '_transient_timeout_ga_%' OR option_name LIKE '_transient_flexify_dashboard_ga_%' OR option_name LIKE '_transient_timeout_flexify_dashboard_ga_%'"
		);
	}
}