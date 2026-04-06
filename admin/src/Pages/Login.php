<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Rest\RestPermissionChecker;
use MeuMouse\Flexify_Dashboard\Security\TurnStyle;
use MeuMouse\Flexify_Dashboard\Utility\Encryption;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_Styles;
use WP_User;

defined('ABSPATH') || exit;

/**
 * Class Login
 *
 * Handles custom login routing, styling, AJAX authentication and security integrations.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class Login {

	/**
	 * Whether the current request is using the custom login screen.
	 *
	 * @since 2.0.0
	 * @var bool
	 */
	private static $is_custom_login = false;

	/**
	 * Cached plugin options.
	 *
	 * @since 2.0.0
	 * @var array|null
	 */
	private static $options = null;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'login_init', array( $this, 'get_options' ), 0 );
		add_action( 'login_init', array( $this, 'maybe_load_turnstyle' ), 1 );

		add_action( 'login_init', array( $this, 'redirect_login_page' ), 1 );
		add_filter( 'login_url', array( $this, 'custom_login_url' ), 10, 3 );
		add_action( 'init', array( $this, 'custom_login_page' ), 2 );
		add_filter( 'logout_url', array( $this, 'custom_logout_url' ), 10, 2 );
		add_filter( 'retrieve_password_url', array( $this, 'custom_retrieve_password_url' ), 10, 1 );
		add_filter( 'lostpassword_url', array( $this, 'custom_lostpassword_url' ), 10, 2 );
		add_filter( 'lostpassword_redirect', array( $this, 'custom_lostpassword_redirect' ), 10, 1 );
		add_filter( 'retrieve_password_message', array( $this, 'custom_password_reset_message' ), 99, 4 );
		add_action( 'login_form_resetpass', array( $this, 'modify_resetpass_form' ) );

		add_action( 'login_header', array( $this, 'start_login_wrapper' ) );
		add_action( 'login_footer', array( $this, 'end_login_wrapper' ) );
		add_action( 'login_enqueue_scripts', array( $this, 'load_styles' ) );
		add_action( 'login_enqueue_scripts', array( $this, 'load_scripts' ) );
		add_action( 'login_enqueue_scripts', array( $this, 'remove_wordpress_login_styles' ), 100 );
		add_filter( 'login_headerurl', array( $this, 'login_logo_url' ) );
		add_filter( 'login_body_class', array( $this, 'filter_login_body_class' ) );

		add_action( 'wp_ajax_nopriv_flexify_dashboard_login', array( $this, 'handle_ajax_login_request' ) );
		add_action( 'wp_ajax_nopriv_flexify_dashboard_lostpassword', array( $this, 'handle_ajax_lostpassword_request' ) );
	}


	/**
	 * Register REST API routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_rest_routes() {
		register_rest_route(
			'flexify-dashboard/v1',
			'/login',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'handle_login_rest_request' ),
				'permission_callback' => '__return_true',
				'args' => array(
					'username' => array(
						'type' => 'string',
						'required' => true,
					),
					'password' => array(
						'type' => 'string',
						'required' => true,
					),
					'remember' => array(
						'type' => 'boolean',
						'required' => false,
					),
					'redirect_to' => array(
						'type' => 'string',
						'required' => false,
					),
					'login_nonce' => array(
						'type' => 'string',
						'required' => true,
					),
					'g_recaptcha_response' => array(
						'type' => 'string',
						'required' => false,
					),
				),
			)
		);

		register_rest_route(
			'flexify-dashboard/v1',
			'/lostpassword',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'handle_lostpassword_rest_request' ),
				'permission_callback' => '__return_true',
				'args' => array(
					'user_login' => array(
						'type' => 'string',
						'required' => true,
					),
					'lostpassword_nonce' => array(
						'type' => 'string',
						'required' => true,
					),
					'g_recaptcha_response' => array(
						'type' => 'string',
						'required' => false,
					),
				),
			)
		);

		register_rest_route(
			'flexify-dashboard/v1',
			'/login/site-info',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_login_site_info_rest_response' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'flexify-dashboard/v1',
			'/google-recaptcha/status',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_google_recaptcha_status' ),
				'permission_callback' => array( $this, 'check_admin_permissions' ),
			)
		);

		register_rest_route(
			'flexify-dashboard/v1',
			'/google-recaptcha/credentials',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'save_google_recaptcha_credentials' ),
				'permission_callback' => array( $this, 'check_admin_permissions' ),
				'args' => array(
					'site_key' => array(
						'type' => 'string',
						'required' => true,
					),
					'secret_key' => array(
						'type' => 'string',
						'required' => true,
					),
				),
			)
		);

		register_rest_route(
			'flexify-dashboard/v1',
			'/google-recaptcha/disconnect',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'disconnect_google_recaptcha' ),
				'permission_callback' => array( $this, 'check_admin_permissions' ),
			)
		);
	}


	/**
	 * Check admin permissions for REST requests.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return bool
	 */
	public function check_admin_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Handle REST login request.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_login_rest_request( WP_REST_Request $request ) {
		$nonce_validation = $this->validate_request_nonce(
			(string) $request->get_param( 'login_nonce' ),
			'flexify-dashboard-login',
			'invalid_nonce',
			403
		);

		if ( is_wp_error( $nonce_validation ) ) {
			return $nonce_validation;
		}

		$result = $this->process_login_attempt(
			array(
				'username' => $request->get_param( 'username' ),
				'password' => $request->get_param( 'password' ),
				'remember' => rest_sanitize_boolean( $request->get_param( 'remember' ) ),
				'redirect_to' => $request->get_param( 'redirect_to' ),
				'g_recaptcha_response' => $request->get_param( 'g_recaptcha_response' ),
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 200 );
	}


	/**
	 * Handle REST lost password request.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_lostpassword_rest_request( WP_REST_Request $request ) {
		$nonce_validation = $this->validate_request_nonce(
			(string) $request->get_param( 'lostpassword_nonce' ),
			'flexify-dashboard-lostpassword',
			'invalid_nonce',
			403
		);

		if ( is_wp_error( $nonce_validation ) ) {
			return $nonce_validation;
		}

		$result = $this->process_lostpassword_attempt(
			array(
				'user_login' => $request->get_param( 'user_login' ),
				'g_recaptcha_response' => $request->get_param( 'g_recaptcha_response' ),
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 200 );
	}


	/**
	 * Backward-compatible login request handler.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_login_request( WP_REST_Request $request ) {
		return $this->handle_login_rest_request( $request );
	}


	/**
	 * Backward-compatible lost password request handler.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_lostpassword_request( WP_REST_Request $request ) {
		return $this->handle_lostpassword_rest_request( $request );
	}


	/**
	 * Return login site info REST response.
	 *
	 * @since 2.0.0
	 * @return WP_REST_Response
	 */
	public function get_login_site_info_rest_response() {
		$site_info = $this->get_login_site_info();
		$response = new WP_REST_Response( $site_info, 200 );

		$response->header( 'Cache-Control', 'public, max-age=300, s-maxage=300' );

		return $response;
	}


	/**
	 * Handle AJAX login request.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_ajax_login_request() {
		$login_nonce = isset( $_POST['login_nonce'] ) ? wp_unslash( (string) $_POST['login_nonce'] ) : '';

		$nonce_validation = $this->validate_request_nonce(
			$login_nonce,
			'flexify-dashboard-login',
			'invalid_nonce',
			403
		);

		if ( is_wp_error( $nonce_validation ) ) {
			$this->send_ajax_error( $nonce_validation );
		}

		$result = $this->process_login_attempt(
			array(
				'username' => isset( $_POST['username'] ) ? wp_unslash( (string) $_POST['username'] ) : '',
				'password' => isset( $_POST['password'] ) ? wp_unslash( (string) $_POST['password'] ) : '',
				'remember' => isset( $_POST['remember'] ) ? wp_unslash( (string) $_POST['remember'] ) : '',
				'redirect_to' => isset( $_POST['redirect_to'] ) ? wp_unslash( (string) $_POST['redirect_to'] ) : '',
				'g_recaptcha_response' => isset( $_POST['g_recaptcha_response'] ) ? wp_unslash( (string) $_POST['g_recaptcha_response'] ) : '',
			)
		);

		if ( is_wp_error( $result ) ) {
			$this->send_ajax_error( $result );
		}

		wp_send_json_success( $result );
	}


	/**
	 * Handle AJAX lost password request.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_ajax_lostpassword_request() {
		$lostpassword_nonce = isset( $_POST['lostpassword_nonce'] ) ? wp_unslash( (string) $_POST['lostpassword_nonce'] ) : '';

		$nonce_validation = $this->validate_request_nonce(
			$lostpassword_nonce,
			'flexify-dashboard-lostpassword',
			'invalid_nonce',
			403
		);

		if ( is_wp_error( $nonce_validation ) ) {
			$this->send_ajax_error( $nonce_validation );
		}

		$result = $this->process_lostpassword_attempt(
			array(
				'user_login' => isset( $_POST['user_login'] ) ? wp_unslash( (string) $_POST['user_login'] ) : '',
				'g_recaptcha_response' => isset( $_POST['g_recaptcha_response'] ) ? wp_unslash( (string) $_POST['g_recaptcha_response'] ) : '',
			)
		);

		if ( is_wp_error( $result ) ) {
			$this->send_ajax_error( $result );
		}

		wp_send_json_success( $result );
	}


	/**
	 * Return Google reCAPTCHA connection status.
	 *
	 * @since 2.0.0
	 * @return WP_REST_Response
	 */
	public function get_google_recaptcha_status() {
		self::get_options();

		return new WP_REST_Response(
			array(
				'success' => true,
				'enabled' => self::google_recaptcha_enabled(),
				'configured' => (bool) ( self::google_recaptcha_site_key() && self::google_recaptcha_secret_key() ),
				'site_key' => self::google_recaptcha_site_key() ? self::google_recaptcha_site_key() : '',
			),
			200
		);
	}


	/**
	 * Save Google reCAPTCHA credentials.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public function save_google_recaptcha_credentials( WP_REST_Request $request ) {
		$site_key = sanitize_text_field( (string) $request->get_param( 'site_key' ) );
		$secret_key = sanitize_text_field( (string) $request->get_param( 'secret_key' ) );

		if ( empty( $site_key ) || empty( $secret_key ) ) {
			return new WP_Error(
				'missing_recaptcha_credentials',
				__( 'Enter the Google reCAPTCHA site key and secret key.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$encrypted_secret = Encryption::encrypt( $secret_key );

		if ( empty( $encrypted_secret ) ) {
			return new WP_Error(
				'recaptcha_secret_encryption_failed',
				__( 'We were unable to save the Google reCAPTCHA secret key.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		$this->update_settings(
			array(
				'google_recaptcha_site_key' => $site_key,
				'google_recaptcha_secret_key' => $encrypted_secret,
			)
		);

		return new WP_REST_Response(
			array(
				'success' => true,
				'configured' => true,
				'site_key' => $site_key,
				'message' => __( 'Google reCAPTCHA credentials saved successfully.', 'flexify-dashboard' ),
			),
			200
		);
	}


	/**
	 * Disconnect Google reCAPTCHA integration.
	 *
	 * @since 2.0.0
	 * @return WP_REST_Response
	 */
	public function disconnect_google_recaptcha() {
		$this->update_settings(
			array(
				'google_recaptcha_site_key' => '',
				'google_recaptcha_secret_key' => '',
			)
		);

		return new WP_REST_Response(
			array(
				'success' => true,
				'configured' => false,
				'message' => __( 'Integration with Google reCAPTCHA removed.', 'flexify-dashboard' ),
			),
			200
		);
	}


	/**
	 * Modify reset password form action.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function modify_resetpass_form() {
		$custom_path = self::login_path();

		if ( empty( $custom_path ) ) {
			return;
		}

		add_filter(
			'resetpass_form',
			function( $form ) use ( $custom_path ) {
				$new_action = home_url( "/{$custom_path}/?action=resetpass" );

				return preg_replace( '/(action=")[^"]*(")/i', 'action="' . esc_url( $new_action ) . '"', $form );
			}
		);
	}


	/**
	 * Replace password reset message URL.
	 *
	 * @since 2.0.0
	 * @param string   $message Original message.
	 * @param string   $key Reset key.
	 * @param string   $user_login User login.
	 * @param WP_User  $user_data User data.
	 * @return string
	 */
	public function custom_password_reset_message( $message, $key, $user_login, $user_data ) {
		$custom_path = self::login_path();

		if ( empty( $custom_path ) ) {
			return $message;
		}

		return str_replace( 'wp-login.php', $custom_path, $message );
	}


	/**
	 * Customize lost password redirect URL.
	 *
	 * @since 2.0.0
	 * @param string $url Original URL.
	 * @return string
	 */
	public function custom_lostpassword_redirect( $url ) {
		$custom_path = self::login_path();

		if ( empty( $custom_path ) ) {
			return $url;
		}

		return add_query_arg(
			array(
				'checkemail' => 'confirm',
			),
			home_url( "/{$custom_path}/" )
		);
	}


	/**
	 * Customize retrieve password URL.
	 *
	 * @since 2.0.0
	 * @param string $url Original URL.
	 * @return string
	 */
	public function custom_retrieve_password_url( $url ) {
		$custom_path = self::login_path();

		if ( empty( $custom_path ) ) {
			return $url;
		}

		$parsed_url = wp_parse_url( $url );
		$query = array();

		if ( isset( $parsed_url['query'] ) ) {
			parse_str( (string) $parsed_url['query'], $query );
		}

		return add_query_arg(
			array(
				'action' => 'rp',
				'key' => isset( $query['key'] ) ? sanitize_text_field( (string) $query['key'] ) : '',
				'login' => isset( $query['login'] ) ? sanitize_text_field( (string) $query['login'] ) : '',
			),
			home_url( "/{$custom_path}/" )
		);
	}


	/**
	 * Customize logout URL.
	 *
	 * @since 2.0.0
	 * @param string $logout_url Original logout URL.
	 * @param string $redirect Optional redirect URL.
	 * @return string
	 */
	public function custom_logout_url( $logout_url, $redirect = '' ) {
		$custom_path = self::login_path();

		if ( empty( $custom_path ) ) {
			return $logout_url;
		}

		$custom_logout_url = wp_nonce_url( home_url( "/{$custom_path}/?action=logout" ), 'log-out' );

		if ( ! empty( $redirect ) ) {
			$custom_logout_url = add_query_arg( 'redirect_to', $redirect, $custom_logout_url );
		}

		return $custom_logout_url;
	}


	/**
	 * Redirect default login page to custom login path.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function redirect_login_page() {
		if ( ! isset( $GLOBALS['pagenow'] ) || self::$is_custom_login || ! self::login_path() ) {
			return;
		}

		$request_method = isset( $_SERVER['REQUEST_METHOD'] ) ? sanitize_text_field( (string) wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) : '';

		if ( 'wp-login.php' !== $GLOBALS['pagenow'] || 'GET' !== $request_method ) {
			return;
		}

		if ( is_user_logged_in() && 'login' === self::current_login_action() ) {
			wp_safe_redirect( admin_url() );
			exit;
		}

		$custom_url = home_url( '/' . trim( (string) self::login_path(), '/' ) . '/' );
		$query_args = array();

		foreach ( (array) $_GET as $key => $value ) {
			if ( is_array( $value ) ) {
				continue;
			}

			$sanitized_key = sanitize_key( (string) $key );
			$query_args[ $sanitized_key ] = 'redirect_to' === $key
				? esc_url_raw( wp_unslash( (string) $value ) )
				: sanitize_text_field( wp_unslash( (string) $value ) );
		}

		wp_safe_redirect( add_query_arg( $query_args, $custom_url ) );
		exit;
	}


	/**
	 * Customize login URL.
	 *
	 * @since 2.0.0
	 * @param string $login_url Original login URL.
	 * @param string $redirect Redirect URL.
	 * @param bool   $force_reauth Force re-authentication.
	 * @return string
	 */
	public static function custom_login_url( $login_url, $redirect = '', $force_reauth = false ) {
		$custom_path = self::login_path();

		if ( empty( $custom_path ) ) {
			return $login_url;
		}

		$login_url = home_url( "/{$custom_path}/" );

		if ( ! empty( $redirect ) ) {
			$login_url = add_query_arg( 'redirect_to', $redirect, $login_url );
		}

		if ( $force_reauth ) {
			$login_url = add_query_arg( 'reauth', '1', $login_url );
		}

		return $login_url;
	}


	/**
	 * Customize lost password URL.
	 *
	 * @since 2.0.0
	 * @param string $lostpassword_url Original URL.
	 * @param string $redirect Redirect URL.
	 * @return string
	 */
	public static function custom_lostpassword_url( $lostpassword_url, $redirect = '' ) {
		$custom_path = self::login_path();

		if ( empty( $custom_path ) ) {
			return $lostpassword_url;
		}

		$url = home_url( "/{$custom_path}/?action=lostpassword" );

		if ( ! empty( $redirect ) ) {
			$url = add_query_arg( 'redirect_to', $redirect, $url );
		}

		return $url;
	}


	/**
	 * Load the custom login page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function custom_login_page() {
		$custom_path = self::login_path();

		if ( ! isset( $_SERVER['REQUEST_URI'] ) || empty( $custom_path ) || is_admin() ) {
			return;
		}

		$request_uri = (string) wp_unslash( $_SERVER['REQUEST_URI'] );
		$request_path = wp_parse_url( $request_uri, PHP_URL_PATH );
		$request_path = is_string( $request_path ) ? untrailingslashit( $request_path ) : '';
		$custom_request_path = untrailingslashit( '/' . trim( (string) $custom_path, '/' ) );

		if ( $request_path !== $custom_request_path ) {
			return;
		}

		if ( is_user_logged_in() && 'login' === self::current_login_action() ) {
			wp_safe_redirect( admin_url() );
			exit;
		}

		global $error, $interim_login, $action, $user_login;

		$error = isset( $_GET['error'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['error'] ) ) : '';
		$interim_login = isset( $_REQUEST['interim-login'] );
		$action = self::current_login_action();
		$user_login = isset( $_POST['log'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['log'] ) ) : '';

		$GLOBALS['pagenow'] = 'wp-login.php';
		self::$is_custom_login = true;

		require_once ABSPATH . 'wp-login.php';
		exit;
	}


	/**
	 * Load plugin options.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function get_options() {
		self::$options = Settings::get();
	}


	/**
	 * Ensure options are loaded in memory.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private static function ensure_options_loaded() {
		if ( null === self::$options ) {
			self::get_options();
		}
	}


	/**
	 * Maybe load Turnstile integration.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function maybe_load_turnstyle() {
		if ( self::is_modern_login_screen() ) {
			return;
		}

		if ( ! self::turnstyle_enabled() || ! self::turnstyle_site_key() || ! self::turnstyle_secret_key() ) {
			return;
		}

		new TurnStyle( self::turnstyle_site_key(), self::turnstyle_secret_key() );
	}


	/**
	 * Get custom login path.
	 *
	 * @since 2.0.0
	 * @return string|false
	 */
	private static function login_path() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && ! empty( self::$options['login_path'] )
			? self::normalize_login_path( (string) self::$options['login_path'] )
			: false;
	}


	/**
	 * Normalize login path.
	 *
	 * @since 2.0.0
	 * @param string $path Raw path.
	 * @return string|false
	 */
	private static function normalize_login_path( $path ) {
		$path = trim( (string) $path );
		$path = trim( $path, '/' );
		$path = preg_replace( '/\.php$/i', '', $path );

		if ( empty( $path ) || 'wp-login' === $path ) {
			return false;
		}

		$segments = array_filter( array_map( 'sanitize_title', explode( '/', $path ) ) );

		return ! empty( $segments ) ? implode( '/', $segments ) : false;
	}


	/**
	 * Get Turnstile site key.
	 *
	 * @since 2.0.0
	 * @return string|false
	 */
	private static function turnstyle_site_key() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && ! empty( self::$options['turnstyle_site_key'] )
			? sanitize_text_field( (string) self::$options['turnstyle_site_key'] )
			: false;
	}


	/**
	 * Get Turnstile secret key.
	 *
	 * @since 2.0.0
	 * @return string|false
	 */
	private static function turnstyle_secret_key() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && ! empty( self::$options['turnstyle_secret_key'] )
			? sanitize_text_field( (string) self::$options['turnstyle_secret_key'] )
			: false;
	}


	/**
	 * Check whether Turnstile is enabled.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private static function turnstyle_enabled() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && isset( self::$options['enable_turnstyle'] ) && self::$options['enable_turnstyle'];
	}


	/**
	 * Check whether Google reCAPTCHA is enabled.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private static function google_recaptcha_enabled() {
		self::ensure_options_loaded();

		if ( ! is_array( self::$options ) ) {
			return false;
		}

		if ( array_key_exists( 'enable_google_recaptcha', self::$options ) ) {
			return (bool) self::$options['enable_google_recaptcha'];
		}

		return (bool) ( self::google_recaptcha_site_key() && self::google_recaptcha_secret_key() );
	}


	/**
	 * Get Google reCAPTCHA site key.
	 *
	 * @since 2.0.0
	 * @return string|false
	 */
	private static function google_recaptcha_site_key() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && ! empty( self::$options['google_recaptcha_site_key'] )
			? sanitize_text_field( (string) self::$options['google_recaptcha_site_key'] )
			: false;
	}


	/**
	 * Get decrypted Google reCAPTCHA secret key.
	 *
	 * @since 2.0.0
	 * @return string|false
	 */
	private static function google_recaptcha_secret_key() {
		self::ensure_options_loaded();

		if ( ! is_array( self::$options ) || empty( self::$options['google_recaptcha_secret_key'] ) ) {
			return false;
		}

		$secret = Encryption::decrypt( (string) self::$options['google_recaptcha_secret_key'] );

		return $secret ? sanitize_text_field( (string) $secret ) : false;
	}


	/**
	 * Check whether the custom login theme is enabled.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private static function login_theme_enabled() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && isset( self::$options['style_login'] ) && self::$options['style_login'];
	}


	/**
	 * Get login image URL.
	 *
	 * @since 2.0.0
	 * @return string|false
	 */
	private static function has_login_image() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && ! empty( self::$options['login_image'] )
			? esc_url_raw( (string) self::$options['login_image'] )
			: false;
	}


	/**
	 * Get custom CSS for login page.
	 *
	 * @since 2.0.0
	 * @return string|false
	 */
	private static function has_custom_css() {
		self::ensure_options_loaded();

		return is_array( self::$options ) && ! empty( self::$options['custom_css'] )
			? (string) self::$options['custom_css']
			: false;
	}


	/**
	 * Filter login body classes.
	 *
	 * @since 2.0.0
	 * @param array $classes Body classes.
	 * @return array
	 */
	public function filter_login_body_class( $classes ) {
		$classes = is_array( $classes ) ? $classes : array();

		if ( self::login_theme_enabled() ) {
			$classes[] = 'fd-login-enabled';
		}

		if ( self::is_modern_login_screen() ) {
			$classes[] = 'fd-modern-login-active';
		}

		return array_unique( $classes );
	}


	/**
	 * Remove WordPress core styles from the login screen so only plugin styles remain.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function remove_wordpress_login_styles() {
		if ( ! self::login_theme_enabled() ) {
			return;
		}

		global $wp_styles;

		if ( ! ( $wp_styles instanceof WP_Styles ) || empty( $wp_styles->queue ) ) {
			return;
		}

		$admin_url = wp_normalize_path( admin_url() );
		$includes_url = wp_normalize_path( includes_url() );

		foreach ( $wp_styles->queue as $handle ) {
			if ( 'flexify-dashboard-login' === $handle ) {
				continue;
			}

			if ( ! isset( $wp_styles->registered[ $handle ] ) ) {
				continue;
			}

			$style = $wp_styles->registered[ $handle ];
			$src = isset( $style->src ) ? wp_normalize_path( (string) $style->src ) : '';

			if ( '' === $src ) {
				continue;
			}

			$is_core_style = str_contains( $src, '/wp-admin/' )
				|| str_contains( $src, '/wp-includes/' )
				|| str_starts_with( $src, $admin_url )
				|| str_starts_with( $src, $includes_url );

			if ( ! $is_core_style ) {
				continue;
			}

			wp_dequeue_style( $handle );
			wp_deregister_style( $handle );
		}
	}


	/**
	 * Output login wrapper opening markup.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function start_login_wrapper() {
		if ( ! self::login_theme_enabled() ) {
			return;
		}

		$script = <<<JS
		const userThemePreference = localStorage.getItem("uipc_theme") || "system";
		
		if ((window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches && userThemePreference !== "light") || userThemePreference === "dark") {
			document.body.classList.add("dark");
		} else {
			document.body.classList.remove("dark");
		}
		JS;

		wp_print_inline_script_tag( $script );

		if ( self::is_modern_login_screen() ) {
			wp_print_inline_script_tag( 'document.body.classList.add("fd-modern-login-pending");' );
			echo wp_kses_post( '<div id="flexify-dashboard-login-wrap"><div id="fd-login-app"></div><div id="flexify-dashboard-login-fallback">' );
			return;
		}

		echo wp_kses_post( '<div id="flexify-dashboard-login-wrap"><div id="flexify-dashboard-login-form-wrap"><div id="flexify-dashboard-login-form">' );
	}


	/**
	 * Output login wrapper closing markup.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function end_login_wrapper() {
		if ( ! self::login_theme_enabled() ) {
			return;
		}

		if ( self::is_modern_login_screen() ) {
			echo wp_kses_post( '</div></div>' );
		} else {
			echo wp_kses_post( '</div></div><div id="flexify-dashboard-login-panel"></div></div>' );

			$login_image = self::has_login_image();

			if ( $login_image ) {
				$css = '#flexify-dashboard-login-panel{background-image:url("' . esc_url( $login_image ) . '");background-size:cover;background-position:center;}';
				echo '<style>' . wp_strip_all_tags( $css ) . '</style>';
			}
		}

		$custom_css = self::has_custom_css();

		if ( $custom_css ) {
			echo '<style>' . wp_strip_all_tags( $custom_css ) . '</style>';
		}

		self::load_custom_properties();
	}


	/**
	 * Output CSS custom properties.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private static function load_custom_properties() {
		self::ensure_options_loaded();

		$base_styles_scale = isset( self::$options['base_theme_scale'] ) && is_array( self::$options['base_theme_scale'] )
			? self::$options['base_theme_scale']
			: array();

		$accent_styles_scale = isset( self::$options['accent_theme_scale'] ) && is_array( self::$options['accent_theme_scale'] )
			? self::$options['accent_theme_scale']
			: self::get_default_accent_scale();

		if ( empty( $accent_styles_scale ) ) {
			$accent_styles_scale = self::get_default_accent_scale();
		}

		$base_styles = self::build_custom_properties( $base_styles_scale, 'base' );
		$accent_styles = self::build_custom_properties( $accent_styles_scale, 'accent' );

		echo '<style type="text/css">' . wp_strip_all_tags( $base_styles . $accent_styles ) . '</style>';
	}


	/**
	 * Get default accent scale.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_default_accent_scale() {
		return array(
			array(
				'step' => '50',
				'color' => '#eff8ff',
			),
			array(
				'step' => '100',
				'color' => '#d9efff',
			),
			array(
				'step' => '200',
				'color' => '#bce2ff',
			),
			array(
				'step' => '300',
				'color' => '#8fd0ff',
			),
			array(
				'step' => '400',
				'color' => '#59b6ff',
			),
			array(
				'step' => '500',
				'color' => '#008aff',
			),
			array(
				'step' => '600',
				'color' => '#0070db',
			),
			array(
				'step' => '700',
				'color' => '#0059ad',
			),
			array(
				'step' => '800',
				'color' => '#004a8f',
			),
			array(
				'step' => '900',
				'color' => '#063f76',
			),
			array(
				'step' => '950',
				'color' => '#04284c',
			),
		);
	}


	/**
	 * Build CSS custom properties from a color scale.
	 *
	 * @since 2.0.0
	 * @param array  $scale Color scale.
	 * @param string $color_name Color name prefix.
	 * @return string
	 */
	private static function build_custom_properties( $scale, $color_name ) {
		$styles = ':root{';

		foreach ( $scale as $color ) {
			if ( ! is_array( $color ) || empty( $color['color'] ) || ! isset( $color['step'] ) ) {
				continue;
			}

			$hex_array = self::hex_to_rgb( $color['color'] );
			$escaped_step = esc_html( (string) $color['step'] );
			$color_value = is_array( $hex_array ) ? esc_html( implode( ' ', $hex_array ) ) : '';
			$property_name = "--fd-{$color_name}-{$escaped_step}";

			$styles .= "{$property_name}:{$color_value};";
		}

		return $styles . '}';
	}


	/**
	 * Enqueue login styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_styles() {
		if ( ! self::login_theme_enabled() ) {
			return;
		}

		self::ensure_options_loaded();

		$plugin_base_file = dirname( __DIR__, 3 ) . '/flexify-dashboard.php';
		$plugin_path = dirname( $plugin_base_file );
		$url = plugins_url( '/', $plugin_base_file );

		$stylesheet_path = Scripts::get_stylesheet_path( 'Login.js' );

		if ( $stylesheet_path ) {
			$style = $url . "app/dist/{$stylesheet_path}";
		} elseif ( file_exists( $plugin_path . '/app/dist/assets/styles/login.css' ) ) {
			$style = $url . 'app/dist/assets/styles/login.css';
		} else {
			$style = $url . 'app/src/apps/styles/login.css';
		}

		wp_enqueue_style( 'flexify-dashboard-login', $style, array(), FLEXIFY_DASHBOARD_VERSION );

		$logo = isset( self::$options['modern_login_logo'] ) && '' !== self::$options['modern_login_logo']
			? esc_url_raw( (string) self::$options['modern_login_logo'] )
			: (
				isset( self::$options['logo'] ) && '' !== self::$options['logo']
					? esc_url_raw( (string) self::$options['logo'] )
					: false
			);

		$dark_logo = isset( self::$options['dark_logo'] ) && '' !== self::$options['dark_logo']
			? esc_url_raw( (string) self::$options['dark_logo'] )
			: false;

		if ( $logo ) {
			$logo_css = '
				#login h1 a,
				.login h1 a {
					background-image: url("' . esc_url( $logo ) . '");
					margin-left: 0;
					background-size: contain;
					height: 50px;
					width: auto;
					background-position: left;
				}
			';

			echo '<style type="text/css">' . wp_strip_all_tags( $logo_css ) . '</style>';
		}

		if ( $dark_logo ) {
			$dark_logo_css = '
				.dark #login h1 a,
				.dark .login h1 a {
					background-image: url("' . esc_url( $dark_logo ) . '");
				}
			';

			echo '<style type="text/css">' . wp_strip_all_tags( $dark_logo_css ) . '</style>';
		}
	}


	/**
	 * Enqueue login scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_scripts() {
		if ( ! self::is_modern_login_screen() ) {
			return;
		}

		$script_name = Scripts::get_base_script_path( 'Login.js' );

		if ( ! $script_name ) {
			return;
		}

		$script_url = plugins_url( "flexify-dashboard/app/dist/{$script_name}" );

		wp_enqueue_script( 'wp-i18n' );

		wp_add_inline_script(
			'wp-i18n',
			'const i18n = (window.wp && wp.i18n) ? wp.i18n : {};
			window.__ = i18n.__ || ((s)=>s);
			window._x = i18n._x || ((s)=>s);
			window._n = i18n._n || ((s)=>s);
			window.sprintf = i18n.sprintf || ((s)=>s);',
			'after'
		);

		wp_add_inline_script(
			'wp-i18n',
			'window.flexifyDashboardLoginConfig = ' . wp_json_encode( $this->get_login_app_config() ) . ';',
			'after'
		);

		add_filter(
			'script_loader_tag',
			function( $tag, $handle, $src ) {
				if ( 'flexify-dashboard-login-js' === $handle ) {
					return '<script type="module" src="' . esc_url( $src ) . '"></script>';
				}

				return $tag;
			},
			10,
			3
		);

		wp_enqueue_script(
			'flexify-dashboard-login-js',
			$script_url,
			array( 'wp-i18n' ),
			FLEXIFY_DASHBOARD_VERSION,
			true
		);

		if ( function_exists( 'wp_script_add_data' ) ) {
			wp_script_add_data( 'flexify-dashboard-login-js', 'type', 'module' );
		}

		if ( $this->is_google_recaptcha_active() ) {
			wp_enqueue_script(
				'flexify-dashboard-google-recaptcha',
				'https://www.google.com/recaptcha/api.js?render=explicit',
				array(),
				null,
				true
			);
		}
	}


	/**
	 * Convert HEX color to RGB array.
	 *
	 * @since 2.0.0
	 * @param string $hex HEX color.
	 * @return array|string
	 */
	private static function hex_to_rgb( $hex ) {
		if ( empty( $hex ) ) {
			return '';
		}

		$hex = ltrim( (string) $hex, '#' );

		if ( 3 === strlen( $hex ) ) {
			$r = hexdec( str_repeat( substr( $hex, 0, 1 ), 2 ) );
			$g = hexdec( str_repeat( substr( $hex, 1, 1 ), 2 ) );
			$b = hexdec( str_repeat( substr( $hex, 2, 1 ), 2 ) );
		} else {
			$r = hexdec( substr( $hex, 0, 2 ) );
			$g = hexdec( substr( $hex, 2, 2 ) );
			$b = hexdec( substr( $hex, 4, 2 ) );
		}

		return array( $r, $g, $b );
	}


	/**
	 * Normalize HEX color string.
	 *
	 * @since 2.0.0
	 * @param string $hex HEX color.
	 * @return string
	 */
	private static function normalize_hex_color( $hex ) {
		$hex = trim( (string) $hex );

		if ( '' === $hex ) {
			return '#008aff';
		}

		if ( 0 !== strpos( $hex, '#' ) ) {
			$hex = '#' . $hex;
		}

		if ( ! preg_match( '/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $hex ) ) {
			return '#008aff';
		}

		if ( 4 === strlen( $hex ) ) {
			return sprintf(
				'#%s%s%s%s%s%s',
				$hex[1],
				$hex[1],
				$hex[2],
				$hex[2],
				$hex[3],
				$hex[3]
			);
		}

		return strtolower( $hex );
	}


	/**
	 * Adjust HEX color brightness.
	 *
	 * @since 2.0.0
	 * @param string $hex HEX color.
	 * @param int    $amount Adjustment amount.
	 * @return string
	 */
	private static function adjust_hex_color( $hex, $amount = 0 ) {
		$normalized_hex = self::normalize_hex_color( $hex );
		$rgb = self::hex_to_rgb( $normalized_hex );

		if ( ! is_array( $rgb ) || 3 !== count( $rgb ) ) {
			return '#008aff';
		}

		$adjusted = array_map(
			function( $channel ) use ( $amount ) {
				$value = (int) $channel + (int) $amount;

				return max( 0, min( 255, $value ) );
			},
			$rgb
		);

		return sprintf( '#%02x%02x%02x', $adjusted[0], $adjusted[1], $adjusted[2] );
	}


	/**
	 * Return home URL as login logo URL.
	 *
	 * @since 2.0.0
	 * @param string $url Original URL.
	 * @return string
	 */
	public static function login_logo_url( $url ) {
		return get_home_url();
	}


	/**
	 * Get current login action.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function current_login_action() {
		if ( isset( $_REQUEST['action'] ) && is_string( $_REQUEST['action'] ) && '' !== $_REQUEST['action'] ) {
			return sanitize_key( wp_unslash( $_REQUEST['action'] ) );
		}

		return 'login';
	}


	/**
	 * Check whether the modern login screen is active.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private static function is_modern_login_screen() {
		return self::login_theme_enabled() && 'login' === self::current_login_action();
	}


	/**
	 * Build frontend login app config.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_login_app_config() {
		self::get_options();

		$plugin_base_file = dirname( __DIR__, 3 ) . '/flexify-dashboard.php';
		$redirect_to = isset( $_GET['redirect_to'] )
			? wp_validate_redirect( wp_unslash( (string) $_GET['redirect_to'] ), admin_url() )
			: admin_url();

		$site_info = $this->get_login_site_info();

		return array(
			'ajaxUrl' => esc_url_raw( admin_url( 'admin-ajax.php' ) ),
			'loginAjaxAction' => 'flexify_dashboard_login',
			'lostPasswordAjaxAction' => 'flexify_dashboard_lostpassword',
			'restUrl' => esc_url_raw( rest_url( 'flexify-dashboard/v1/login' ) ),
			'lostPasswordRestUrl' => esc_url_raw( rest_url( 'flexify-dashboard/v1/lostpassword' ) ),
			'siteInfoUrl' => esc_url_raw( rest_url( 'flexify-dashboard/v1/login/site-info' ) ),
			'loginNonce' => wp_create_nonce( 'flexify-dashboard-login' ),
			'lostPasswordNonce' => wp_create_nonce( 'flexify-dashboard-lostpassword' ),
			'redirectTo' => $redirect_to,
			'adminUrl' => esc_url_raw( admin_url() ),
			'homeUrl' => esc_url_raw( home_url( '/' ) ),
			'loginPath' => self::login_path() ? self::login_path() : 'wp-login.php',
			'lostPasswordUrl' => esc_url_raw( self::custom_lostpassword_url( wp_lostpassword_url() ) ),
			'loginUrl' => esc_url_raw( self::custom_login_url( wp_login_url() ) ),
			'loginActionUrl' => esc_url_raw( self::custom_login_url( wp_login_url( $redirect_to ) ) ),
			'siteName' => $site_info['siteName'],
			'siteDescription' => $site_info['siteDescription'],
			'tagline' => $site_info['siteDescription'],
			'loginImage' => self::has_login_image() ? self::has_login_image() : '',
			'logoUrl' => $site_info['logoUrl'],
			'authLogoUrl' => $site_info['logoUrl'],
			'siteLogoUrl' => $site_info['siteLogoUrl'],
			'asideLogoUrl' => $site_info['logoUrl'],
			'gridPatternUrl' => esc_url_raw( plugins_url( 'assets/icons/grid-login.svg', $plugin_base_file ) ),
			'asideColor' => $site_info['asideColor'],
			'asideGradientStart' => $site_info['asideGradientStart'],
			'asideGradientEnd' => $site_info['asideGradientEnd'],
			'asideGlowColor' => $site_info['asideGlowColor'],
			'recaptchaEnabled' => $this->is_google_recaptcha_active(),
			'recaptchaSiteKey' => self::google_recaptcha_site_key() ? self::google_recaptcha_site_key() : '',
			'notice' => $this->get_login_notice(),
		);
	}


	/**
	 * Get login site information.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_login_site_info() {
		$modern_logo = isset( self::$options['modern_login_logo'] ) && '' !== self::$options['modern_login_logo']
			? esc_url_raw( (string) self::$options['modern_login_logo'] )
			: '';

		$dashboard_logo = isset( self::$options['logo'] ) && '' !== self::$options['logo']
			? esc_url_raw( (string) self::$options['logo'] )
			: '';

		$site_logo = $this->get_site_identity_logo();
		$display_logo = $modern_logo ? $modern_logo : ( $dashboard_logo ? $dashboard_logo : $site_logo );
		$aside_palette = $this->get_login_aside_palette();

		return array(
			'siteName' => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			'siteDescription' => wp_specialchars_decode( get_bloginfo( 'description' ), ENT_QUOTES ),
			'logoUrl' => $display_logo,
			'siteLogoUrl' => $site_logo,
			'asideColor' => $aside_palette['asideColor'],
			'asideGradientStart' => $aside_palette['asideGradientStart'],
			'asideGradientEnd' => $aside_palette['asideGradientEnd'],
			'asideGlowColor' => $aside_palette['asideGlowColor'],
		);
	}


	/**
	 * Get aside color palette for login screen.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_login_aside_palette() {
		$configured_color = '';

		if ( ! empty( self::$options['base_theme_color'] ) ) {
			$configured_color = (string) self::$options['base_theme_color'];
		} elseif ( ! empty( self::$options['base_theme_scale'] ) && is_array( self::$options['base_theme_scale'] ) ) {
			$configured_color = $this->get_scale_color( self::$options['base_theme_scale'], array( '500', '400', '600' ) );
		}

		$aside_color = self::normalize_hex_color( $configured_color ? $configured_color : '#008aff' );
		$base_scale = isset( self::$options['base_theme_scale'] ) && is_array( self::$options['base_theme_scale'] )
			? self::$options['base_theme_scale']
			: array();

		$gradient_start = $this->get_scale_color( $base_scale, array( '400', '500' ) );
		$gradient_end = $this->get_scale_color( $base_scale, array( '900', '800', '700' ) );
		$glow_color = $this->get_scale_color( $base_scale, array( '300', '400', '500' ) );

		return array(
			'asideColor' => $aside_color,
			'asideGradientStart' => $gradient_start ? self::normalize_hex_color( $gradient_start ) : self::adjust_hex_color( $aside_color, -26 ),
			'asideGradientEnd' => $gradient_end ? self::normalize_hex_color( $gradient_end ) : self::adjust_hex_color( $aside_color, -70 ),
			'asideGlowColor' => $glow_color ? self::normalize_hex_color( $glow_color ) : self::adjust_hex_color( $aside_color, 8 ),
		);
	}


	/**
	 * Get a preferred color from scale.
	 *
	 * @since 2.0.0
	 * @param array $scale Color scale.
	 * @param array $preferred_steps Preferred scale steps.
	 * @return string
	 */
	private function get_scale_color( $scale, $preferred_steps = array() ) {
		if ( ! is_array( $scale ) || empty( $scale ) ) {
			return '';
		}

		foreach ( $preferred_steps as $preferred_step ) {
			foreach ( $scale as $color ) {
				if (
					is_array( $color ) &&
					isset( $color['step'], $color['color'] ) &&
					(string) $color['step'] === (string) $preferred_step &&
					'' !== $color['color']
				) {
					return (string) $color['color'];
				}
			}
		}

		foreach ( $scale as $color ) {
			if ( is_array( $color ) && ! empty( $color['color'] ) ) {
				return (string) $color['color'];
			}
		}

		return '';
	}


	/**
	 * Get site identity logo.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_site_identity_logo() {
		$custom_logo_id = (int) get_theme_mod( 'custom_logo' );

		if ( $custom_logo_id ) {
			$custom_logo = wp_get_attachment_image_url( $custom_logo_id, 'full' );

			if ( $custom_logo ) {
				return esc_url_raw( $custom_logo );
			}
		}

		$site_icon = get_site_icon_url( 512 );

		return $site_icon ? esc_url_raw( $site_icon ) : '';
	}


	/**
	 * Get login notice data.
	 *
	 * @since 2.0.0
	 * @return array|null
	 */
	private function get_login_notice() {
		if ( isset( $_GET['loggedout'] ) ) {
			return array(
				'type' => 'success',
				'message' => __( 'Sua sessão foi encerrada.', 'flexify-dashboard' ),
			);
		}

		if ( isset( $_GET['password-reset'] ) ) {
			return array(
				'type' => 'success',
				'message' => __( 'Senha redefinida com sucesso. Faça login para continuar.', 'flexify-dashboard' ),
			);
		}

		if ( isset( $_GET['checkemail'] ) && 'confirm' === sanitize_key( (string) $_GET['checkemail'] ) ) {
			return array(
				'type' => 'info',
				'message' => __( 'Confira seu e-mail para continuar o processo de recuperação de senha.', 'flexify-dashboard' ),
			);
		}

		if ( isset( $_GET['checkemail'] ) && 'registered' === sanitize_key( (string) $_GET['checkemail'] ) ) {
			return array(
				'type' => 'info',
				'message' => __( 'Verifique seu e-mail para ativar a conta.', 'flexify-dashboard' ),
			);
		}

		return null;
	}


	/**
	 * Check whether Google reCAPTCHA is fully active.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_google_recaptcha_active() {
		return self::google_recaptcha_enabled() && self::google_recaptcha_site_key() && self::google_recaptcha_secret_key();
	}


	/**
	 * Validate Google reCAPTCHA token.
	 *
	 * @since 2.0.0
	 * @param string $token Captcha token.
	 * @return true|WP_Error
	 */
	private function validate_google_recaptcha_token( $token ) {
		if ( empty( $token ) ) {
			return new WP_Error(
				'google_recaptcha_missing',
				__( 'Confirm the Google reCAPTCHA to continue.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$remote_ip = function_exists( 'wp_get_ip_address' )
			? wp_get_ip_address()
			: ( isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( (string) wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '' );

		$response = wp_remote_post(
			'https://www.google.com/recaptcha/api/siteverify',
			array(
				'timeout' => 20,
				'body' => array(
					'secret' => self::google_recaptcha_secret_key(),
					'response' => $token,
					'remoteip' => $remote_ip,
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'google_recaptcha_request_failed',
				__( 'We were unable to validate Google reCAPTCHA at this time. Please try again.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		$payload = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		if ( empty( $payload['success'] ) ) {
			return new WP_Error(
				'google_recaptcha_failed',
				__( 'Google reCAPTCHA validation failed. Please try again.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return true;
	}


	/**
	 * Map login-related WP_Error messages.
	 *
	 * @since 2.0.0
	 * @param mixed $error Error object.
	 * @return string
	 */
	private function map_login_error_message( $error ) {
		if ( ! $error instanceof WP_Error ) {
			return __( 'We were unable to authenticate right now. Please try again.', 'flexify-dashboard' );
		}

		$codes = $error->get_error_codes();

		if ( in_array( 'invalid_username', $codes, true ) || in_array( 'incorrect_password', $codes, true ) ) {
			return __( 'Invalid username or password.', 'flexify-dashboard' );
		}

		if ( in_array( 'empty_username', $codes, true ) || in_array( 'empty_password', $codes, true ) ) {
			return __( 'Enter your username and password to continue.', 'flexify-dashboard' );
		}

		$message = trim( wp_strip_all_tags( $error->get_error_message() ) );

		return $message ? $message : __( 'We were unable to authenticate right now. Please try again.', 'flexify-dashboard' );
	}


	/**
	 * Validate a request nonce.
	 *
	 * @since 2.0.0
	 * @param string $nonce Nonce value.
	 * @param string $action Nonce action.
	 * @param string $error_code Error code.
	 * @param int    $status HTTP status.
	 * @return true|WP_Error
	 */
	private function validate_request_nonce( $nonce, $action, $error_code = 'invalid_nonce', $status = 403 ) {
		if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, $action ) ) {
			return new WP_Error(
				$error_code,
				__( 'Invalid session. Please reload the page and try again.', 'flexify-dashboard' ),
				array( 'status' => $status )
			);
		}

		return true;
	}


	/**
	 * Process login attempt.
	 *
	 * @since 2.0.0
	 * @param array $payload Login payload.
	 * @return array|WP_Error
	 */
	private function process_login_attempt( $payload ) {
		$username = sanitize_text_field( (string) ( $payload['username'] ?? '' ) );
		$password = (string) ( $payload['password'] ?? '' );
		$remember = ! empty( $payload['remember'] ) && rest_sanitize_boolean( $payload['remember'] );
		$redirect_to = wp_validate_redirect( (string) ( $payload['redirect_to'] ?? '' ), admin_url() );

		if ( empty( $username ) || '' === $password ) {
			return new WP_Error(
				'missing_credentials',
				__( 'Enter your username and password to continue.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( $this->is_google_recaptcha_active() ) {
			$captcha_token = sanitize_text_field( (string) ( $payload['g_recaptcha_response'] ?? '' ) );
			$captcha_result = $this->validate_google_recaptcha_token( $captcha_token );

			if ( is_wp_error( $captcha_result ) ) {
				return $captcha_result;
			}
		}

		$credentials = array(
			'user_login' => trim( $username ),
			'user_password' => $password,
			'remember' => $remember,
		);

		$validation_error = apply_filters(
			'woocommerce_process_login_errors',
			new WP_Error(),
			$credentials['user_login'],
			$credentials['user_password']
		);

		if ( $validation_error instanceof WP_Error && $validation_error->get_error_code() ) {
			return new WP_Error(
				'login_validation',
				$this->map_login_error_message( $validation_error ),
				array( 'status' => 400 )
			);
		}

		if ( is_multisite() ) {
			$user_data = get_user_by(
				is_email( $credentials['user_login'] ) ? 'email' : 'login',
				$credentials['user_login']
			);

			if ( $user_data instanceof WP_User && ! is_user_member_of_blog( $user_data->ID, get_current_blog_id() ) ) {
				add_user_to_blog( get_current_blog_id(), $user_data->ID, get_option( 'default_role', 'subscriber' ) );
			}
		}

		$user = wp_signon(
			apply_filters( 'flexify_dashboard_login_credentials', $credentials ),
			is_ssl()
		);

		if ( is_wp_error( $user ) ) {
			return new WP_Error(
				'invalid_login',
				$this->map_login_error_message( $user ),
				array( 'status' => 401 )
			);
		}

		if ( ! $user instanceof WP_User || ! user_can( $user, 'edit_posts' ) ) {
			wp_logout();

			return new WP_Error(
				'forbidden_admin_login',
				__( 'Your account is valid, but you do not have access to the administrative panel.', 'flexify-dashboard' ),
				array( 'status' => 403 )
			);
		}

		return array(
			'success' => true,
			'message' => __( 'Login successful.', 'flexify-dashboard' ),
			'redirect_to' => $redirect_to ? $redirect_to : admin_url(),
		);
	}


	/**
	 * Process lost password attempt.
	 *
	 * @since 2.0.0
	 * @param array $payload Lost password payload.
	 * @return array|WP_Error
	 */
	private function process_lostpassword_attempt( $payload ) {
		$user_login = sanitize_text_field( (string) ( $payload['user_login'] ?? '' ) );

		if ( empty( $user_login ) ) {
			return new WP_Error(
				'missing_user_login',
				__( 'Enter your email or username to recover your password.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( $this->is_google_recaptcha_active() ) {
			$captcha_token = sanitize_text_field( (string) ( $payload['g_recaptcha_response'] ?? '' ) );
			$captcha_result = $this->validate_google_recaptcha_token( $captcha_token );

			if ( is_wp_error( $captcha_result ) ) {
				return $captcha_result;
			}
		}

		$result = retrieve_password( $user_login );

		if ( is_wp_error( $result ) ) {
			return new WP_Error(
				'lostpassword_failed',
				$this->map_login_error_message( $result ),
				array( 'status' => 400 )
			);
		}

		return array(
			'success' => true,
			'message' => __( 'Check your email to continue the password recovery process.', 'flexify-dashboard' ),
		);
	}


	/**
	 * Send standardized AJAX error response.
	 *
	 * @since 2.0.0
	 * @param mixed $error Error data.
	 * @return void
	 */
	private function send_ajax_error( $error ) {
		$status = 400;
		$message = __( 'The request could not be completed.', 'flexify-dashboard' );

		if ( $error instanceof WP_Error ) {
			$error_data = $error->get_error_data();
			$status = is_array( $error_data ) && isset( $error_data['status'] ) ? (int) $error_data['status'] : 400;
			$message = $this->map_login_error_message( $error );
		} elseif ( is_string( $error ) && '' !== $error ) {
			$message = $error;
		}

		wp_send_json_error(
			array(
				'error' => $message,
				'message' => $message,
			),
			$status
		);
	}


	/**
	 * Update plugin settings and clear cache.
	 *
	 * @since 2.0.0
	 * @param array $updates Settings to update.
	 * @return void
	 */
	private function update_settings( $updates ) {
		$settings = get_option( 'flexify_dashboard_settings', array() );
		$settings = is_array( $settings ) ? $settings : array();

		update_option( 'flexify_dashboard_settings', array_merge( $settings, $updates ) );
		Settings::clear_cache();
		self::get_options();
	}
}