<?php

namespace MeuMouse\Flexify_Dashboard\License;

use MeuMouse\Flexify_Dashboard\Options\Settings;

defined('ABSPATH') || exit;

/**
 * Backend license service for Flexify Dashboard.
 *
 * Handles API communication, encryption, caching and local persistence.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\License
 * @author MeuMouse.com
 */
class LicenseService {

	/**
	 * License API host.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const SERVER_HOST = 'https://api.meumouse.com/wp-json/license/';

	/**
	 * Cached request transient.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REQUEST_TRANSIENT = 'flexify_dashboard_api_request_cache';

	/**
	 * Cached validation transient.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const RESPONSE_TRANSIENT = 'flexify_dashboard_api_response_cache';

	/**
	 * Cached boolean validity transient.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const STATUS_TRANSIENT = 'flexify_dashboard_license_status_cached';

	/**
	 * Stored license object option.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const RESPONSE_OPTION = 'flexify_dashboard_license_response_object';

	/**
	 * Stored license status option.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const STATUS_OPTION = 'flexify_dashboard_license_status';

	/**
	 * Product key for Flexify Dashboard.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const FD_PRODUCT_KEY = '3D5766063EF7E2B5';

	/**
	 * Product id for Flexify Dashboard.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const FD_PRODUCT_ID = '6';

	/**
	 * Product base for Flexify Dashboard.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const FD_PRODUCT_BASE = 'flexify-dashboard';

	/**
	 * Product key for Clube M.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CLUBE_M_PRODUCT_KEY = 'B729F2659393EE27';

	/**
	 * Product id for Clube M.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CLUBE_M_PRODUCT_ID = '7';

	/**
	 * Product base for Clube M.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CLUBE_M_PRODUCT_BASE = 'clube-m';

	/**
	 * Activate and validate a license key.
	 *
	 * @since 2.0.0
	 * @param string $license_key License key to activate.
	 * @return array
	 */
	public static function activate( $license_key ) {
		$license_key = trim( (string) $license_key );

		if ( '' === $license_key ) {
			return self::format_result( false, __( 'Please provide a valid license key.', 'flexify-dashboard' ) );
		}

		self::clear_runtime_cache();

		$context = self::get_product_context( $license_key );
		$payload = self::get_response_param( $license_key, $context );
		$error   = '';
		$response = self::request( 'product/active/' . $context['product_id'], $payload, $context, $error, true );

		return self::consume_activation_response( $response, $payload, $context, $error );
	}


	/**
	 * Validate the current or provided license key.
	 *
	 * @since 2.0.0
	 * @param string $license_key Optional explicit key.
	 * @param bool   $force Force a remote refresh.
	 * @return array
	 */
	public static function validate( $license_key = '', $force = false ) {
		$license_key = trim( (string) $license_key );

		if ( '' === $license_key ) {
			$license_key = self::get_current_license_key();
		}

		if ( '' === $license_key ) {
			self::invalidate_license_state();

			return self::format_result( false, __( 'No license key found.', 'flexify-dashboard' ) );
		}

		$context = self::get_product_context( $license_key );
		$old_response = self::get_response_base( $context );

		if ( ! $force ) {
			$cached_response = get_transient( self::RESPONSE_TRANSIENT );

			if ( false !== $cached_response ) {
				$cached_response = maybe_unserialize( $cached_response );

				if ( is_object( $cached_response ) && ! empty( $cached_response->is_valid ) ) {
					return self::format_result( true, __( 'License loaded from cache.', 'flexify-dashboard' ), self::normalize_license_data( $cached_response, 'cache' ) );
				}
			}

			if ( ! empty( $old_response ) && ! empty( $old_response->is_valid ) && ! empty( $old_response->next_request ) && $old_response->next_request > time() && ! empty( $old_response->license_key ) && $old_response->license_key === $license_key ) {
				return self::format_result( true, __( 'License loaded from local cache.', 'flexify-dashboard' ), self::normalize_license_data( $old_response, 'cache' ) );
			}
		}

		$payload = self::get_response_param( $license_key, $context );
		$error   = '';
		$response = self::request( 'product/active/' . $context['product_id'], $payload, $context, $error, $force );

		$result = self::consume_activation_response( $response, $payload, $context, $error, $old_response );

		if ( $result['success'] ) {
			return $result;
		}

		if ( self::can_use_old_response( $old_response ) ) {
			$old_response->next_request = strtotime( '+1 hour' );
			$old_response->tried = empty( $old_response->tried ) ? 1 : ( (int) $old_response->tried + 1 );
			self::set_response_base( $old_response, $context );
			self::persist_runtime_license( $old_response );

			return self::format_result(
				true,
				__( 'License validation failed remotely. Using the last valid local response temporarily.', 'flexify-dashboard' ),
				self::normalize_license_data( $old_response, 'fallback' )
			);
		}

		self::invalidate_license_state();

		return $result;
	}


	/**
	 * Deactivate current license.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public static function deactivate() {
		$current_key = self::get_current_license_key();

		if ( '' === $current_key ) {
			self::invalidate_license_state();

			return self::format_result( true, __( 'License removed locally.', 'flexify-dashboard' ) );
		}

		$context = self::get_product_context( $current_key );
		$stored  = self::get_response_base( $context );
		$license_key = ! empty( $stored->license_key ) ? $stored->license_key : $current_key;

		if ( '' === $license_key ) {
			self::invalidate_license_state();

			return self::format_result( true, __( 'License removed locally.', 'flexify-dashboard' ) );
		}

		$error   = '';
		$payload = self::get_response_param( $license_key, $context );
		$response = self::request( 'product/deactive/' . $context['product_id'], $payload, $context, $error, true );

		self::invalidate_license_state();

		if ( is_object( $response ) && empty( $response->code ) && ! empty( $response->status ) ) {
			return self::format_result( true, ! empty( $response->msg ) ? $response->msg : __( 'License deactivated successfully.', 'flexify-dashboard' ) );
		}

		if ( ! empty( $error ) ) {
			return self::format_result( true, sprintf( __( 'License removed locally after remote deactivation error: %s', 'flexify-dashboard' ), $error ) );
		}

		return self::format_result( true, __( 'License removed locally.', 'flexify-dashboard' ) );
	}


	/**
	 * Get current license status.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public static function get_status() {
		$object = get_option( self::RESPONSE_OPTION );

		if ( is_object( $object ) && ! empty( $object->is_valid ) ) {
			return self::format_result( true, __( 'License is active.', 'flexify-dashboard' ), self::normalize_license_data( $object, 'stored' ) );
		}

		return self::format_result( false, __( 'License is not active.', 'flexify-dashboard' ) );
	}


	/**
	 * Check whether the current license is valid.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function is_valid() {
		$cached = get_transient( self::STATUS_TRANSIENT );

		if ( false !== $cached ) {
			return (bool) $cached;
		}

		$object = get_option( self::RESPONSE_OPTION );
		$is_valid = is_object( $object ) && ! empty( $object->is_valid );

		set_transient( self::STATUS_TRANSIENT, $is_valid, DAY_IN_SECONDS );

		if ( ! $is_valid ) {
			update_option( self::STATUS_OPTION, 'invalid' );
		}

		return $is_valid;
	}


	/**
	 * Return validated license key for integrations such as updater.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public static function get_validated_license_key() {
		$object = get_option( self::RESPONSE_OPTION );

		if ( is_object( $object ) && ! empty( $object->is_valid ) && ! empty( $object->license_key ) ) {
			return (string) $object->license_key;
		}

		return trim( (string) Settings::get_setting( 'license_key', '' ) );
	}


	/**
	 * Build result payload.
	 *
	 * @since 2.0.0
	 * @param bool   $success Result flag.
	 * @param string $message User-facing message.
	 * @param array  $data Optional data payload.
	 * @return array
	 */
	private static function format_result( $success, $message, $data = array() ) {
		return array(
			'success' => (bool) $success,
			'message' => (string) $message,
			'data'    => wp_parse_args(
				$data,
				array(
					'is_valid'      => false,
					'license_key'   => '',
					'license_title' => '',
					'expire_date'   => '',
					'support_end'   => '',
					'renew_link'    => '',
					'status_source' => 'none',
				)
			),
		);
	}


	/**
	 * Resolve product context from a license key.
	 *
	 * @since 2.0.0
	 * @param string $license_key License key.
	 * @return array
	 */
	private static function get_product_context( $license_key ) {
		$is_clube_m = 0 === strpos( $license_key, 'CM-' );

		if ( $is_clube_m ) {
			return array(
				'product_key'  => self::CLUBE_M_PRODUCT_KEY,
				'product_id'   => self::CLUBE_M_PRODUCT_ID,
				'product_base' => self::CLUBE_M_PRODUCT_BASE,
			);
		}

		return array(
			'product_key'  => self::FD_PRODUCT_KEY,
			'product_id'   => self::FD_PRODUCT_ID,
			'product_base' => self::FD_PRODUCT_BASE,
		);
	}


	/**
	 * Build API request parameters.
	 *
	 * @since 2.0.0
	 * @param string $license_key License key.
	 * @param array  $context Product context.
	 * @return \stdClass
	 */
	private static function get_response_param( $license_key, array $context ) {
		$req = new \stdClass();
		$req->license_key = $license_key;
		$req->email = get_bloginfo( 'admin_email' );
		$req->domain = self::get_domain();
		$req->app_version = defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : '';
		$req->product_id = $context['product_id'];
		$req->product_base = $context['product_base'];

		return $req;
	}


	/**
	 * Send a request to the remote license API.
	 *
	 * @since 2.0.0
	 * @param string $relative_url Relative endpoint.
	 * @param object $data Payload object.
	 * @param array  $context Product context.
	 * @param string $error Error output.
	 * @param bool   $force Force bypass transient cache.
	 * @return mixed
	 */
	private static function request( $relative_url, $data, array $context, &$error = '', $force = false ) {
		$request_cache_key = self::REQUEST_TRANSIENT . '_' . md5( $relative_url . '|' . wp_json_encode( $data ) );
		$cached_response = $force ? false : get_transient( $request_cache_key );

		if ( false !== $cached_response ) {
			return self::process_response( $cached_response, $context );
		}

		$response = new \stdClass();
		$response->status = false;
		$response->msg = __( 'Empty response.', 'flexify-dashboard' );
		$response->is_request_error = false;
		$final_data = wp_json_encode( $data );
		$url = rtrim( self::SERVER_HOST, '/' ) . '/' . ltrim( $relative_url, '/' );

		if ( ! empty( $context['product_key'] ) ) {
			$final_data = self::encrypt( $final_data, $context['product_key'] );
		}

		$request_params = array(
			'method'      => 'POST',
			'sslverify'   => true,
			'timeout'     => 60,
			'redirection' => 5,
			'httpversion' => '1.0',
			'blocking'    => true,
			'headers'     => array(
				'Content-Type' => 'text/plain',
			),
			'body'        => $final_data,
		);

		$server_response = wp_remote_post( $url, $request_params );

		if ( is_wp_error( $server_response ) ) {
			$request_params['sslverify'] = false;
			$server_response = wp_remote_post( $url, $request_params );
		}

		if ( is_wp_error( $server_response ) ) {
			$error = $server_response->get_error_message();
			$response->msg = $error;
			$response->status = false;
			$response->is_request_error = true;

			self::log( 'License request error: ' . $error );

			return $response;
		}

		$body = wp_remote_retrieve_body( $server_response );
		$code = (int) wp_remote_retrieve_response_code( $server_response );

		if ( 200 === $code && ! empty( $body ) && 'GET404' !== $body ) {
			set_transient( $request_cache_key, $body, 7 * DAY_IN_SECONDS );

			return self::process_response( $body, $context );
		}

		$response->msg = __( 'Invalid response from license server.', 'flexify-dashboard' );
		$response->status = false;
		$response->is_request_error = true;

		self::log( 'License request invalid response code: ' . $code );

		return $response;
	}


	/**
	 * Decrypt and decode API response.
	 *
	 * @since 2.0.0
	 * @param mixed $response Raw response.
	 * @param array $context Product context.
	 * @return mixed
	 */
	private static function process_response( $response, array $context ) {
		if ( empty( $response ) ) {
			$unknown = new \stdClass();
			$unknown->msg = __( 'Unknown response.', 'flexify-dashboard' );
			$unknown->status = false;

			return $unknown;
		}

		if ( is_object( $response ) ) {
			return $response;
		}

		$decrypted = $response;

		if ( ! empty( $context['product_key'] ) && is_string( $response ) ) {
			$decrypted = self::decrypt( $response, $context['product_key'] );

			if ( '' === $decrypted ) {
				$error = new \stdClass();
				$error->status = false;
				$error->msg = __( 'Failed to decrypt the license server response.', 'flexify-dashboard' );
				$error->is_request_error = true;

				self::log( 'Failed to decrypt license response.' );

				return $error;
			}
		}

		if ( is_object( $decrypted ) ) {
			return $decrypted;
		}

		$decoded = json_decode( $decrypted );

		if ( JSON_ERROR_NONE !== json_last_error() ) {
			$error = new \stdClass();
			$error->status = false;
			$error->msg = sprintf( __( 'JSON error: %s', 'flexify-dashboard' ), json_last_error_msg() );
			$error->is_request_error = true;

			self::log( 'License JSON decode error: ' . json_last_error_msg() );

			return $error;
		}

		return $decoded;
	}


	/**
	 * Consume activation/validation response.
	 *
	 * @since 2.0.0
	 * @param mixed       $response API response.
	 * @param object      $payload Request payload.
	 * @param array       $context Product context.
	 * @param string      $error Error string.
	 * @param object|null $old_response Previous local response.
	 * @return array
	 */
	private static function consume_activation_response( $response, $payload, array $context, $error = '', $old_response = null ) {
		if ( ! is_object( $response ) ) {
			return self::format_result( false, ! empty( $error ) ? $error : __( 'Invalid license response.', 'flexify-dashboard' ) );
		}

		if ( ! empty( $response->is_request_error ) ) {
			return self::format_result( false, ! empty( $response->msg ) ? $response->msg : __( 'Unable to reach the license server.', 'flexify-dashboard' ) );
		}

		if ( ! empty( $response->code ) ) {
			return self::format_result( false, ! empty( $response->message ) ? $response->message : __( 'License server returned an error.', 'flexify-dashboard' ) );
		}

		if ( empty( $response->status ) ) {
			return self::format_result( false, ! empty( $response->msg ) ? $response->msg : __( 'License could not be activated.', 'flexify-dashboard' ) );
		}

		if ( empty( $response->data ) ) {
			return self::format_result( false, __( 'License server returned invalid data.', 'flexify-dashboard' ) );
		}

		$serial_obj = self::decrypt( $response->data, $payload->domain );
		$license_obj = maybe_unserialize( $serial_obj );

		if ( ! is_object( $license_obj ) || empty( $license_obj->is_valid ) ) {
			if ( self::can_use_old_response( $old_response ) ) {
				return self::format_result(
					true,
					__( 'Remote validation failed, using the previous valid response.', 'flexify-dashboard' ),
					self::normalize_license_data( $old_response, 'fallback' )
				);
			}

			return self::format_result( false, ! empty( $response->msg ) ? $response->msg : __( 'License is invalid.', 'flexify-dashboard' ) );
		}

		$stored_response = new \stdClass();
		$stored_response->is_valid = true;
		$stored_response->next_request = ! empty( $license_obj->request_duration ) ? strtotime( '+ ' . absint( $license_obj->request_duration ) . ' hour' ) : time();
		$stored_response->expire_date = ! empty( $license_obj->expire_date ) ? $license_obj->expire_date : '';
		$stored_response->support_end = ! empty( $license_obj->support_end ) ? $license_obj->support_end : '';
		$stored_response->license_title = ! empty( $license_obj->license_title ) ? $license_obj->license_title : '';
		$stored_response->license_key = $payload->license_key;
		$stored_response->msg = ! empty( $response->msg ) ? $response->msg : __( 'License validated successfully.', 'flexify-dashboard' );
		$stored_response->renew_link = ! empty( $license_obj->renew_link ) ? $license_obj->renew_link : '';

		self::set_response_base( $stored_response, $context );
		self::persist_runtime_license( $stored_response );
		set_transient( self::RESPONSE_TRANSIENT, maybe_serialize( $stored_response ), DAY_IN_SECONDS );

		return self::format_result( true, $stored_response->msg, self::normalize_license_data( $stored_response, 'remote' ) );
	}


	/**
	 * Persist runtime license state.
	 *
	 * @since 2.0.0
	 * @param object $response Stored response object.
	 * @return void
	 */
	private static function persist_runtime_license( $response ) {
		update_option( self::RESPONSE_OPTION, $response );
		update_option( self::STATUS_OPTION, ! empty( $response->is_valid ) ? 'valid' : 'invalid' );
		set_transient( self::STATUS_TRANSIENT, ! empty( $response->is_valid ), DAY_IN_SECONDS );
	}


	/**
	 * Invalidate local license state and caches.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private static function invalidate_license_state() {
		delete_option( self::RESPONSE_OPTION );
		update_option( self::STATUS_OPTION, 'invalid' );
		self::clear_runtime_cache();

		$current_key = trim( (string) Settings::get_setting( 'license_key', '' ) );

		if ( '' !== $current_key ) {
			$context = self::get_product_context( $current_key );
			self::remove_response_base( $context );
		}
	}


	/**
	 * Clear transients used by the license runtime.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private static function clear_runtime_cache() {
		delete_transient( self::REQUEST_TRANSIENT );
		delete_transient( self::RESPONSE_TRANSIENT );
		delete_transient( self::STATUS_TRANSIENT );
	}


	/**
	 * Normalize stored response into REST payload.
	 *
	 * @since 2.0.0
	 * @param object $response Stored response object.
	 * @param string $status_source Payload source.
	 * @return array
	 */
	private static function normalize_license_data( $response, $status_source ) {
		return array(
			'is_valid'      => ! empty( $response->is_valid ),
			'license_key'   => ! empty( $response->license_key ) ? (string) $response->license_key : '',
			'license_title' => ! empty( $response->license_title ) ? (string) $response->license_title : '',
			'expire_date'   => self::format_license_date( ! empty( $response->expire_date ) ? (string) $response->expire_date : '' ),
			'support_end'   => ! empty( $response->support_end ) ? (string) $response->support_end : '',
			'renew_link'    => ! empty( $response->renew_link ) ? (string) $response->renew_link : '',
			'status_source' => $status_source,
		);
	}


	/**
	 * Format license date using the WordPress date format setting.
	 *
	 * @since 2.0.0
	 * @param string $date Raw API date.
	 * @return string
	 */
	private static function format_license_date( $date ) {
		$date = trim( (string) $date );

		if ( '' === $date ) {
			return '';
		}

		$normalized = strtolower( $date );

		if ( in_array( $normalized, array( 'no expiry', 'never', 'unlimited' ), true ) ) {
			return __( 'Never expires', 'flexify-dashboard' );
		}

		$timestamp = strtotime( $date );

		if ( false === $timestamp ) {
			return $date;
		}

		return wp_date( get_option( 'date_format' ), $timestamp );
	}


	/**
	 * Return whether a stored old response can be reused temporarily.
	 *
	 * @since 2.0.0
	 * @param object|null $old_response Previous response.
	 * @return bool
	 */
	private static function can_use_old_response( $old_response ) {
		return is_object( $old_response ) && ! empty( $old_response->is_valid ) && ( empty( $old_response->tried ) || (int) $old_response->tried <= 2 );
	}


	/**
	 * Generate key for encrypted stored response.
	 *
	 * @since 2.0.0
	 * @param array $context Product context.
	 * @return string
	 */
	private static function get_key_name( array $context ) {
		return hash( 'crc32b', self::get_domain() . $context['product_id'] . $context['product_base'] . $context['product_key'] . 'LIC' );
	}


	/**
	 * Store encrypted response base.
	 *
	 * @since 2.0.0
	 * @param object $response Response object.
	 * @param array  $context Product context.
	 * @return void
	 */
	private static function set_response_base( $response, array $context ) {
		$key = self::get_key_name( $context );
		$data = self::encrypt( maybe_serialize( $response ), self::get_domain() );
		update_option( $key, $data );
	}


	/**
	 * Load encrypted response base.
	 *
	 * @since 2.0.0
	 * @param array $context Product context.
	 * @return mixed|null
	 */
	private static function get_response_base( array $context ) {
		$key = self::get_key_name( $context );
		$response = get_option( $key, null );

		if ( empty( $response ) ) {
			return null;
		}

		return maybe_unserialize( self::decrypt( $response, self::get_domain() ) );
	}


	/**
	 * Remove encrypted response base.
	 *
	 * @since 2.0.0
	 * @param array $context Product context.
	 * @return void
	 */
	private static function remove_response_base( array $context ) {
		delete_option( self::get_key_name( $context ) );
	}


	/**
	 * Encrypt API or local payload.
	 *
	 * @since 2.0.0
	 * @param string $plaintext Plain payload.
	 * @param string $password Encryption key.
	 * @return string
	 */
	private static function encrypt( $plaintext, $password ) {
		if ( '' === (string) $password ) {
			return '';
		}

		$plaintext = wp_rand( 10, 99 ) . $plaintext . wp_rand( 10, 99 );
		$method = 'aes-256-cbc';
		$key = substr( hash( 'sha256', $password, true ), 0, 32 );
		$iv = substr( strtoupper( md5( $password ) ), 0, 16 );

		return base64_encode( openssl_encrypt( $plaintext, $method, $key, OPENSSL_RAW_DATA, $iv ) );
	}


	/**
	 * Decrypt API or local payload.
	 *
	 * @since 2.0.0
	 * @param string $encrypted Encrypted payload.
	 * @param string $password Encryption key.
	 * @return string
	 */
	private static function decrypt( $encrypted, $password ) {
		if ( ! is_string( $encrypted ) || '' === $encrypted || '' === (string) $password ) {
			return '';
		}

		$method = 'aes-256-cbc';
		$key = substr( hash( 'sha256', $password, true ), 0, 32 );
		$iv = substr( strtoupper( md5( $password ) ), 0, 16 );
		$plaintext = openssl_decrypt( base64_decode( $encrypted ), $method, $key, OPENSSL_RAW_DATA, $iv );

		if ( false === $plaintext || strlen( $plaintext ) < 4 ) {
			return '';
		}

		return substr( $plaintext, 2, -2 );
	}


	/**
	 * Get current domain.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function get_domain() {
		if ( function_exists( 'site_url' ) ) {
			return site_url();
		}

		return home_url();
	}


	/**
	 * Read the best available current license key.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function get_current_license_key() {
		$stored = get_option( self::RESPONSE_OPTION );

		if ( is_object( $stored ) && ! empty( $stored->license_key ) ) {
			return trim( (string) $stored->license_key );
		}

		return trim( (string) Settings::get_setting( 'license_key', '' ) );
	}


	/**
	 * Lightweight logger for debugging network or decryption issues.
	 *
	 * @since 2.0.0
	 * @param string $message Log message.
	 * @return void
	 */
	private static function log( $message ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( '[Flexify Dashboard License] ' . $message );
		}
	}
}
