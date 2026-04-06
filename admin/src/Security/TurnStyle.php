<?php

namespace MeuMouse\Flexify_Dashboard\Security;

use WP_Error;

defined('ABSPATH') || exit;

/**
 * Class TurnStyle
 *
 * Integrate Cloudflare Turnstile protection into the WordPress login page.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Security
 * @author MeuMouse.com
 */
class TurnStyle {

	/**
	 * Cloudflare Turnstile site key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $site_key;

	/**
	 * Cloudflare Turnstile secret key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $secret_key;

	/**
	 * Constructor.
	 *
	 * Set Turnstile credentials and register hooks.
	 *
	 * @since 2.0.0
	 * @param string $site_key   Cloudflare Turnstile site key.
	 * @param string $secret_key Cloudflare Turnstile secret key.
	 * @return void
	 */
	public function __construct( $site_key, $secret_key ) {
		$this->site_key   = $site_key;
		$this->secret_key = $secret_key;

		$this->init();
	}


	/**
	 * Register Turnstile hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function init() {
		add_action( 'login_enqueue_scripts', array( $this, 'add_turnstile_script' ) );
		add_action( 'login_form', array( $this, 'add_turnstile_placeholder' ) );
		add_action( 'login_footer', array( $this, 'add_turnstile_js' ) );
		add_filter( 'authenticate', array( $this, 'validate_turnstile' ), 21, 1 );
		add_action( 'wp_login_failed', array( $this, 'handle_failed_login' ) );
	}


	/**
	 * Enqueue the Cloudflare Turnstile script on the login page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function add_turnstile_script() {
		wp_enqueue_script(
			'cloudflare-turnstile',
			'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
			array(),
			null,
			true
		);
	}


	/**
	 * Render the Turnstile placeholder in the login form.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function add_turnstile_placeholder() {
		echo '<div id="cf-turnstile-placeholder"></div>';
	}


	/**
	 * Print Turnstile JavaScript in the login footer.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function add_turnstile_js() {
		?>
		<script>
			document.addEventListener('DOMContentLoaded', function() {
				const userThemePreference = localStorage.getItem('uipc_theme') || 'system';
				const submitButton = document.getElementById('wp-submit');
				const form = document.getElementById('loginform');

				let theme = 'auto';
				let turnstileLoaded = false;
				let turnstileError = '';

				if (
					(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && userThemePreference !== 'light') ||
					userThemePreference === 'dark'
				) {
					theme = 'dark';
				} else {
					theme = 'light';
				}

				if (submitButton) {
					submitButton.disabled = true;
				}

				if (typeof turnstile !== 'undefined' && typeof turnstile.ready === 'function') {
					turnstile.ready(function() {
						try {
							turnstile.render('#cf-turnstile-placeholder', {
								sitekey: '<?php echo esc_js( $this->site_key ); ?>',
								theme: theme,
								size: 'flexible',
								callback: function(token) {
									if (submitButton) {
										submitButton.disabled = false;
									}

									turnstileLoaded = true;
									turnstileError = '';
								},
								'error-callback': function(errorCode) {
									if (submitButton) {
										submitButton.disabled = false;
									}

									turnstileLoaded = false;
									turnstileError = errorCode || 'unknown_error';

									console.error('Turnstile error:', errorCode);
								}
							});
						} catch (error) {
							if (submitButton) {
								submitButton.disabled = false;
							}

							turnstileLoaded = false;
							turnstileError = 'render_failed';

							console.error('Error rendering Turnstile:', error);
						}
					});
				} else {
					if (submitButton) {
						submitButton.disabled = false;
					}

					turnstileLoaded = false;
					turnstileError = 'script_not_loaded';
				}

				if (form) {
					const loadedField = document.createElement('input');
					loadedField.type = 'hidden';
					loadedField.name = 'turnstile_loaded';
					loadedField.value = 'false';
					form.appendChild(loadedField);

					const errorField = document.createElement('input');
					errorField.type = 'hidden';
					errorField.name = 'turnstile_error';
					errorField.value = '';
					form.appendChild(errorField);

					form.addEventListener('submit', function() {
						loadedField.value = turnstileLoaded ? 'true' : 'false';
						errorField.value = turnstileError;
					});
				}
			});
		</script>
		<?php
	}


	/**
	 * Validate the Turnstile response during a login attempt.
	 *
	 * @since 2.0.0
	 * @param mixed $user Authenticated user object, WP_Error, or null.
	 * @return mixed
	 */
	public function validate_turnstile( $user ) {
		$request_method = isset( $_SERVER['REQUEST_METHOD'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) : '';

		if ( 'POST' !== $request_method ) {
			return $user;
		}

		$username = isset( $_POST['log'] ) ? sanitize_text_field( wp_unslash( $_POST['log'] ) ) : '';
		$password = isset( $_POST['pwd'] ) ? sanitize_text_field( wp_unslash( $_POST['pwd'] ) ) : '';

		if ( empty( $username ) || empty( $password ) ) {
			return $user;
		}

		$turnstile_loaded = isset( $_POST['turnstile_loaded'] ) && 'true' === sanitize_text_field( wp_unslash( $_POST['turnstile_loaded'] ) );
		$turnstile_error  = isset( $_POST['turnstile_error'] ) ? sanitize_text_field( wp_unslash( $_POST['turnstile_error'] ) ) : '';

		if ( $turnstile_loaded ) {
			if ( ! isset( $_POST['cf-turnstile-response'] ) ) {
				return new WP_Error( 'turnstile_error', __( 'Please complete the Turnstile challenge.', 'flexify-dashboard' ) );
			}

			$turnstile_response = sanitize_text_field( wp_unslash( $_POST['cf-turnstile-response'] ) );
			$remote_ip          = function_exists( 'wp_get_ip_address' ) ? wp_get_ip_address() : $this->get_remote_ip();

			$response = wp_remote_post(
				'https://challenges.cloudflare.com/turnstile/v0/siteverify',
				array(
					'body'    => array(
						'secret'   => $this->secret_key,
						'response' => $turnstile_response,
						'remoteip' => $remote_ip,
					),
					'timeout' => 15,
				)
			);

			if ( is_wp_error( $response ) ) {
				error_log( 'Turnstile validation request failed: ' . $response->get_error_message() );

				return new WP_Error( 'turnstile_error', __( 'Failed to validate Turnstile response.', 'flexify-dashboard' ) );
			}

			$body   = wp_remote_retrieve_body( $response );
			$result = json_decode( $body, true );

			if ( ! is_array( $result ) || empty( $result['success'] ) ) {
				error_log( 'Turnstile validation failed. Response: ' . $body );

				return new WP_Error( 'turnstile_error', __( 'Turnstile validation failed. Please try again.', 'flexify-dashboard' ) );
			}
		} else {
			if ( preg_match( '/^(3|6)/', $turnstile_error ) ) {
				return new WP_Error( 'turnstile_error', __( 'Security check failed. Please try again or contact the site administrator.', 'flexify-dashboard' ) );
			}

			if ( ! empty( $turnstile_error ) ) {
				error_log( 'Turnstile failed to load. Error: ' . $turnstile_error );
			}
		}

		return $user;
	}


	/**
	 * Handle failed login attempts related to Turnstile validation.
	 *
	 * @since 2.0.0
	 * @param string $username Username used in the failed login attempt.
	 * @return void
	 */
	public function handle_failed_login( $username ) {
		global $errors;

		if ( ! isset( $errors ) || ! $errors instanceof WP_Error ) {
			return;
		}

		$error = $errors->get_error_message( 'turnstile_error' );

		if ( empty( $error ) ) {
			return;
		}

		error_log( 'Turnstile validation failed for user: ' . sanitize_text_field( $username ) );
	}


	/**
	 * Get the remote IP address from the current request.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_remote_ip() {
		$remote_ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

		return $remote_ip;
	}
}