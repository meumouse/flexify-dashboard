<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Pages\Login as LoginPage;

defined('ABSPATH') || exit;

/**
 * Class Login
 *
 * Register login-related REST API routes.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class Login {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $namespace = 'flexify-dashboard/v1';

	/**
	 * Login page service instance.
	 *
	 * @since 2.0.0
	 * @var LoginPage
	 */
	private $login_page;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @param LoginPage $login_page Login page instance.
	 * @return void
	 */
	public function __construct( LoginPage $login_page ) {
		$this->login_page = $login_page;

		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register login-related REST routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route( $this->namespace, '/login', array(
			'methods' => 'POST',
			'callback' => array( $this->login_page, 'handle_login_rest_request' ),
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
		) );

		register_rest_route( $this->namespace, '/lostpassword', array(
			'methods' => 'POST',
			'callback' => array( $this->login_page, 'handle_lostpassword_rest_request' ),
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
		) );

		register_rest_route( $this->namespace, '/login/site-info', array(
			'methods' => 'GET',
			'callback' => array( $this->login_page, 'get_login_site_info_rest_response' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( $this->namespace, '/google-recaptcha/status', array(
			'methods' => 'GET',
			'callback' => array( $this->login_page, 'get_google_recaptcha_status' ),
			'permission_callback' => array( $this->login_page, 'check_admin_permissions' ),
		) );

		register_rest_route( $this->namespace, '/google-recaptcha/credentials', array(
			'methods' => 'POST',
			'callback' => array( $this->login_page, 'save_google_recaptcha_credentials' ),
			'permission_callback' => array( $this->login_page, 'check_admin_permissions' ),
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
		) );

		register_rest_route( $this->namespace, '/google-recaptcha/disconnect', array(
			'methods' => 'POST',
			'callback' => array( $this->login_page, 'disconnect_google_recaptcha' ),
			'permission_callback' => array( $this->login_page, 'check_admin_permissions' ),
		) );
	}
}