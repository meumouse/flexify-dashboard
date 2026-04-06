<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Rest\PluginMetricsCollector;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_Upgrader_Skin;
use Plugin_Upgrader;

defined('ABSPATH') || exit;

require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
require_once ABSPATH . 'wp-admin/includes/update.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/misc.php';

/**
 * Class Silent_Upgrader_Skin
 *
 * Custom upgrader skin that suppresses direct output and stores errors.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class Silent_Upgrader_Skin extends WP_Upgrader_Skin {

	/**
	 * Stored upgrader errors.
	 *
	 * @since 2.0.0
	 * @var WP_Error
	 */
	protected $errors;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		$this->errors = new WP_Error();
	}


	/**
	 * Bypass filesystem credentials request.
	 *
	 * @since 2.0.0
	 * @param bool   $error                        Whether an error occurred.
	 * @param string $context                      Filesystem context.
	 * @param bool   $allow_relaxed_file_ownership Allow relaxed ownership.
	 * @return bool
	 */
	public function request_filesystem_credentials( $error = false, $context = '', $allow_relaxed_file_ownership = false ) {
		unset( $error, $context, $allow_relaxed_file_ownership );

		return true;
	}


	/**
	 * Get upgrade messages.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_upgrade_messages() {
		return array();
	}


	/**
	 * Suppress upgrader feedback output.
	 *
	 * @since 2.0.0
	 * @param string $string Feedback string.
	 * @param mixed  ...$args Extra arguments.
	 * @return void
	 */
	public function feedback( $string, ...$args ) {
		unset( $string, $args );
	}


	/**
	 * Suppress header output.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function header() {}


	/**
	 * Suppress footer output.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function footer() {}


	/**
	 * Store upgrader errors.
	 *
	 * @since 2.0.0
	 * @param string|WP_Error $errors Error data.
	 * @return void
	 */
	public function error( $errors ) {
		if ( is_string( $errors ) ) {
			$this->errors->add( 'unknown', $errors );
			return;
		}

		if ( is_wp_error( $errors ) ) {
			foreach ( $errors->get_error_codes() as $code ) {
				$this->errors->add( $code, $errors->get_error_message( $code ), $errors->get_error_data( $code ) );
			}
		}
	}


	/**
	 * Get collected errors.
	 *
	 * @since 2.0.0
	 * @return WP_Error
	 */
	public function get_errors() {
		return $this->errors;
	}
}

/**
 * Class PluginManager
 *
 * Creates REST API endpoints to manage WordPress plugins.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class PluginManager {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Plugin slug validation pattern.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const SLUG_PATTERN = '[a-zA-Z0-9-_]+';


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_custom_endpoints' ) );

		new PluginMetricsCollector();
	}


	/**
	 * Register custom REST API endpoints.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_custom_endpoints() {
		$slug_arg_schema = self::get_slug_arg_schema();

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/activate/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'POST',
				'callback' => array( __CLASS__, 'activate_plugin' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args' => array(
					'slug' => $slug_arg_schema,
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/deactivate/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'POST',
				'callback' => array( __CLASS__, 'deactivate_plugin' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args' => array(
					'slug' => $slug_arg_schema,
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/delete/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'DELETE',
				'callback' => array( __CLASS__, 'delete_plugin' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args' => array(
					'slug' => $slug_arg_schema,
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/update/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'POST',
				'callback' => array( __CLASS__, 'update_plugin' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args' => array(
					'slug' => $slug_arg_schema,
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/toggle-auto-update/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'POST',
				'callback' => array( __CLASS__, 'toggle_auto_update' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args' => array(
					'slug' => $slug_arg_schema,
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/install',
			array(
				'methods' => 'POST',
				'callback' => array( __CLASS__, 'install_plugin_from_zip' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'accept_file_uploads' => true,
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/install-repo/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'POST',
				'callback' => array( __CLASS__, 'install_plugin_from_repo' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args' => array(
					'slug' => $slug_arg_schema,
					'version' => array(
						'required' => false,
						'validate_callback' => function( $param ) {
							return empty( $param ) || ( is_string( $param ) && preg_match( '/^[\d\.]+$/', $param ) );
						},
						'sanitize_callback' => 'sanitize_text_field',
						'description' => __( 'Specific version to install (optional)', 'flexify-dashboard' ),
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugin/repository-assets/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'GET',
				'callback' => array( __CLASS__, 'get_plugin_repository_assets' ),
				'permission_callback' => function( WP_REST_Request $request ) {
					return RestPermissionChecker::check_permissions( $request, 'activate_plugins' );
				},
				'args' => array(
					'slug' => $slug_arg_schema,
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugins/performance/(?P<slug>' . self::SLUG_PATTERN . ')',
			array(
				'methods' => 'GET',
				'callback' => array( __CLASS__, 'get_plugin_performance_metrics' ),
				'permission_callback' => function( WP_REST_Request $request ) {
					return RestPermissionChecker::check_permissions( $request, 'manage_options' );
				},
				'args' => array(
					'slug' => array(
						'required' => false,
						'validate_callback' => function( $param ) {
							return empty( $param ) || ( is_string( $param ) && preg_match( '/^[a-zA-Z0-9-_]+$/', $param ) );
						},
						'sanitize_callback' => 'sanitize_text_field',
						'description' => __( 'Plugin slug to get metrics for (optional)', 'flexify-dashboard' ),
					),
					'timeframe' => array(
						'required' => false,
						'validate_callback' => function( $param ) {
							$valid_timeframes = array( 'hour', 'day', 'week', 'month' );
							return empty( $param ) || in_array( $param, $valid_timeframes, true );
						},
						'sanitize_callback' => 'sanitize_text_field',
						'default' => 'day',
						'description' => __( 'Timeframe for metrics (hour, day, week, month)', 'flexify-dashboard' ),
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/plugins',
			array(
				'methods' => 'GET',
				'callback' => array( __CLASS__, 'get_plugins_list' ),
				'permission_callback' => function( WP_REST_Request $request ) {
					return RestPermissionChecker::check_permissions( $request, 'activate_plugins' );
				},
			)
		);
	}


	/**
	 * Check if user has required permissions.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request|null $request REST request object.
	 * @return bool|WP_Error
	 */
	public static function check_permissions( WP_REST_Request $request = null ) {
		if ( ! $request ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'Invalid request.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return RestPermissionChecker::check_permissions( $request, array( 'activate_plugins', 'delete_plugins' ) );
	}


	/**
	 * Activate a plugin.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function activate_plugin( WP_REST_Request $request ) {
		self::define_runtime_constants();

		$plugin_slug = $request->get_param( 'slug' );
		$plugin_file = self::get_plugin_file( $plugin_slug );

		if ( empty( $plugin_file ) ) {
			return self::response(
				false,
				__( 'Plugin not found', 'flexify-dashboard' ),
				404
			);
		}

		$plugin_data = get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin_file );

		ob_start();
		$result = activate_plugin( $plugin_file );
		ob_end_clean();

		if ( is_wp_error( $result ) ) {
			return self::response(
				false,
				$result->get_error_message(),
				500
			);
		}

		$action_links = apply_filters( 'plugin_action_links_' . $plugin_file, array(), $plugin_file, $plugin_data, '' );
		$row_meta = apply_filters( 'plugin_row_meta', array(), $plugin_file, $plugin_data, '' );
		$cleaned_links = self::normalize_plugin_links( array_merge( $action_links, $row_meta ) );

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Plugin activated successfully', 'flexify-dashboard' ),
				'action_links' => $cleaned_links,
			),
			200
		);
	}


	/**
	 * Deactivate a plugin.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function deactivate_plugin( WP_REST_Request $request ) {
		$plugin_slug = $request->get_param( 'slug' );
		$plugin_file = self::get_plugin_file( $plugin_slug );

		if ( empty( $plugin_file ) ) {
			return self::response(
				false,
				__( 'Plugin not found', 'flexify-dashboard' ),
				404
			);
		}

		deactivate_plugins( $plugin_file );

		if ( is_plugin_active( $plugin_file ) ) {
			return self::response(
				false,
				__( 'Failed to deactivate plugin', 'flexify-dashboard' ),
				500
			);
		}

		$response_data = array(
			'success' => true,
			'message' => __( 'Plugin deactivated successfully', 'flexify-dashboard' ),
		);

		if ( 'flexify-dashboard/flexify-dashboard.php' === $plugin_file ) {
			$response_data['redirect_url'] = admin_url( 'plugins.php' );
		}

		return new WP_REST_Response( $response_data, 200 );
	}


	/**
	 * Delete a plugin.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function delete_plugin( WP_REST_Request $request ) {
		$plugin_slug = $request->get_param( 'slug' );
		$plugin_file = self::get_plugin_file( $plugin_slug );

		if ( empty( $plugin_file ) ) {
			return self::response(
				false,
				__( 'Plugin not found', 'flexify-dashboard' ),
				404
			);
		}

		deactivate_plugins( $plugin_file );

		$result = delete_plugins( array( $plugin_file ) );

		if ( is_wp_error( $result ) ) {
			return self::response(
				false,
				$result->get_error_message(),
				500
			);
		}

		return self::response(
			true,
			__( 'Plugin deleted successfully', 'flexify-dashboard' ),
			200
		);
	}


	/**
	 * Update a plugin.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function update_plugin( WP_REST_Request $request ) {
		$plugin_slug = $request->get_param( 'slug' );
		$plugin_file = self::get_plugin_file( $plugin_slug );

		if ( empty( $plugin_file ) ) {
			return self::response(
				false,
				__( 'Plugin not found', 'flexify-dashboard' ),
				404
			);
		}

		$was_active = is_plugin_active( $plugin_file );

		wp_update_plugins();

		$update_plugins = get_site_transient( 'update_plugins' );

		if ( ! isset( $update_plugins->response[ $plugin_file ] ) ) {
			return self::response(
				false,
				__( 'No update available for this plugin', 'flexify-dashboard' ),
				400
			);
		}

		self::init_filesystem();

		$skin = new Silent_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$result = $upgrader->upgrade( $plugin_file );

		if ( is_wp_error( $result ) ) {
			return self::response(
				false,
				$result->get_error_message(),
				500
			);
		}

		$errors = $skin->get_errors();

		if ( $errors->has_errors() ) {
			return self::response(
				false,
				$errors->get_error_message(),
				500
			);
		}

		if ( false === $result ) {
			return self::response(
				false,
				__( 'Plugin update failed', 'flexify-dashboard' ),
				500
			);
		}

		if ( $was_active ) {
			$activate_result = activate_plugin( $plugin_file );

			if ( is_wp_error( $activate_result ) ) {
				return new WP_REST_Response(
					array(
						'success' => true,
						'message' => sprintf(
							__( 'Plugin updated successfully but reactivation failed: %s', 'flexify-dashboard' ),
							$activate_result->get_error_message()
						),
					),
					200
				);
			}
		}

		return self::response(
			true,
			$was_active
				? __( 'Plugin updated successfully and reactivated', 'flexify-dashboard' )
				: __( 'Plugin updated successfully', 'flexify-dashboard' ),
			200
		);
	}


	/**
	 * Toggle plugin auto updates.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function toggle_auto_update( WP_REST_Request $request ) {
		$plugin_slug = $request->get_param( 'slug' );
		$plugin_file = self::get_plugin_file( $plugin_slug );

		if ( empty( $plugin_file ) ) {
			return self::response(
				false,
				__( 'Plugin not found', 'flexify-dashboard' ),
				404
			);
		}

		$auto_updates = (array) get_site_option( 'auto_update_plugins', array() );
		$auto_update_enabled = in_array( $plugin_file, $auto_updates, true );

		if ( $auto_update_enabled ) {
			$auto_updates = array_diff( $auto_updates, array( $plugin_file ) );
			$message = __( 'Auto updates disabled', 'flexify-dashboard' );
		} else {
			$auto_updates[] = $plugin_file;
			$message = __( 'Auto updates enabled', 'flexify-dashboard' );
		}

		$update_result = update_site_option( 'auto_update_plugins', array_values( $auto_updates ) );

		if ( ! $update_result ) {
			return self::response(
				false,
				__( 'Failed to update auto update settings', 'flexify-dashboard' ),
				500
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => $message,
				'auto_update_enabled' => ! $auto_update_enabled,
			),
			200
		);
	}


	/**
	 * Install a plugin from ZIP file.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function install_plugin_from_zip( WP_REST_Request $request ) {
		ob_start();

		$files = $request->get_file_params();

		if ( empty( $files['plugin_zip'] ) ) {
			ob_end_clean();

			return self::response(
				false,
				__( 'No plugin file uploaded', 'flexify-dashboard' ),
				400
			);
		}

		$file = $files['plugin_zip'];
		$file_type = wp_check_filetype( $file['name'], array( 'zip' => 'application/zip' ) );

		if ( 'application/zip' !== $file_type['type'] ) {
			ob_end_clean();

			return self::response(
				false,
				__( 'Invalid file type. Please upload a ZIP file.', 'flexify-dashboard' ),
				400
			);
		}

		self::init_filesystem();

		$temp_dir = trailingslashit( wp_upload_dir()['basedir'] ) . 'temp-plugin-' . time();
		$extract_result = unzip_file( $file['tmp_name'], $temp_dir );

		if ( is_wp_error( $extract_result ) ) {
			ob_end_clean();

			return self::response(
				false,
				sprintf(
					__( 'Failed to extract plugin ZIP: %s', 'flexify-dashboard' ),
					$extract_result->get_error_message()
				),
				500
			);
		}

		$plugin_info = self::detect_plugin_from_extracted_zip( $temp_dir );

		global $wp_filesystem;
		$wp_filesystem->delete( $temp_dir, true );

		if ( empty( $plugin_info['main_plugin_file'] ) ) {
			ob_end_clean();

			return self::response(
				false,
				__( 'Invalid plugin structure - no main plugin file found', 'flexify-dashboard' ),
				400
			);
		}

		$existing_plugin_file = self::get_plugin_file( $plugin_info['plugin_folder'] );
		$is_update = ! empty( $existing_plugin_file );
		$was_active = false;

		if ( $is_update ) {
			$was_active = is_plugin_active( $existing_plugin_file );

			if ( $was_active ) {
				deactivate_plugins( $existing_plugin_file );
			}

			$delete_result = delete_plugins( array( $existing_plugin_file ) );

			if ( is_wp_error( $delete_result ) ) {
				ob_end_clean();

				return self::response(
					false,
					sprintf(
						__( 'Failed to remove existing plugin: %s', 'flexify-dashboard' ),
						$delete_result->get_error_message()
					),
					500
				);
			}
		}

		$skin = new Silent_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$result = $upgrader->install( $file['tmp_name'] );

		if ( is_wp_error( $result ) ) {
			ob_end_clean();

			return self::response(
				false,
				$result->get_error_message(),
				500
			);
		}

		$errors = $skin->get_errors();

		if ( $errors->has_errors() ) {
			ob_end_clean();

			return self::response(
				false,
				$errors->get_error_message(),
				500
			);
		}

		if ( false === $result ) {
			ob_end_clean();

			return self::response(
				false,
				__( 'Plugin installation failed', 'flexify-dashboard' ),
				500
			);
		}

		$plugin_file = $upgrader->plugin_info();

		if ( empty( $plugin_file ) ) {
			ob_end_clean();

			return self::response(
				true,
				$is_update
					? __( 'Plugin updated successfully but could not determine the plugin file', 'flexify-dashboard' )
					: __( 'Plugin installed successfully but could not determine the plugin file', 'flexify-dashboard' ),
				200
			);
		}

		if ( $was_active ) {
			$activate_result = activate_plugin( $plugin_file );

			if ( is_wp_error( $activate_result ) ) {
				ob_end_clean();

				return new WP_REST_Response(
					array(
						'success' => true,
						'message' => $is_update
							? sprintf(
								__( 'Plugin updated successfully but reactivation failed: %s', 'flexify-dashboard' ),
								$activate_result->get_error_message()
							)
							: sprintf(
								__( 'Plugin installed successfully but reactivation failed: %s', 'flexify-dashboard' ),
								$activate_result->get_error_message()
							),
					),
					200
				);
			}
		}

		$plugin_data = get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin_file );
		$plugin_data['active'] = $was_active;
		$plugin_data['slug'] = $plugin_file;

		ob_end_clean();

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => $is_update
					? ( $was_active ? __( 'Plugin updated successfully and reactivated', 'flexify-dashboard' ) : __( 'Plugin updated successfully', 'flexify-dashboard' ) )
					: ( $was_active ? __( 'Plugin installed successfully and reactivated', 'flexify-dashboard' ) : __( 'Plugin installed successfully', 'flexify-dashboard' ) ),
				'plugin' => $plugin_data,
				'was_update' => $is_update,
			),
			200
		);
	}


	/**
	 * Install a plugin from WordPress repository.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function install_plugin_from_repo( WP_REST_Request $request ) {
		$plugin_slug = $request->get_param( 'slug' );

		self::init_filesystem();

		$skin = new Silent_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$result = $upgrader->install( 'https://downloads.wordpress.org/plugin/' . $plugin_slug . '.latest-stable.zip' );

		if ( is_wp_error( $result ) ) {
			return self::response(
				false,
				$result->get_error_message(),
				500
			);
		}

		$errors = $skin->get_errors();

		if ( $errors->has_errors() ) {
			return self::response(
				false,
				$errors->get_error_message(),
				500
			);
		}

		if ( false === $result ) {
			return self::response(
				false,
				__( 'Plugin installation failed', 'flexify-dashboard' ),
				500
			);
		}

		$plugin_file = $upgrader->plugin_info();
		$plugin_data = get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin_file );
		$plugin_data['active'] = false;
		$plugin_data['slug'] = $plugin_file;
		$plugin_data['splitSlug'] = self::get_base_slug_from_plugin_file( $plugin_file );

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Plugin installed successfully', 'flexify-dashboard' ),
				'plugin' => $plugin_data,
			),
			200
		);
	}


	/**
	 * Get repository assets for a plugin.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function get_plugin_repository_assets( WP_REST_Request $request ) {
		$plugin_slug = $request->get_param( 'slug' );

		if ( empty( $plugin_slug ) ) {
			return self::response(
				false,
				__( 'Plugin slug is required', 'flexify-dashboard' ),
				400
			);
		}

		$plugin_info = plugins_api(
			'plugin_information',
			array(
				'slug' => $plugin_slug,
				'fields' => array(
					'icons' => true,
					'banners' => true,
					'tags' => true,
					'sections' => false,
					'short_description' => false,
					'description' => false,
					'reviews' => false,
					'downloaded' => false,
					'active_installs' => false,
					'requires' => false,
					'tested' => false,
					'requires_php' => false,
				),
			)
		);

		if ( is_wp_error( $plugin_info ) ) {
			return new WP_REST_Response(
				array(
					'success' => false,
					'message' => $plugin_info->get_error_message(),
					'notInRepository' => true,
				),
				404
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'icons' => isset( $plugin_info->icons ) ? (array) $plugin_info->icons : array(),
				'banners' => isset( $plugin_info->banners ) ? (array) $plugin_info->banners : array(),
				'tags' => isset( $plugin_info->tags ) ? (array) $plugin_info->tags : array(),
				'notInRepository' => false,
			),
			200
		);
	}


	/**
	 * Get plugin performance metrics.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function get_plugin_performance_metrics( WP_REST_Request $request ) {
		$plugin_slug = $request->get_param( 'slug' );
		$backend = $request->get_param( 'backend' );

		$path = $plugin_slug
			? '/?collect_plugin_metrics=1&plugin_slug=' . rawurlencode( $plugin_slug )
			: '/?collect_plugin_metrics=1';

		$url = $backend ? admin_url( $path ) : home_url( $path );

		$response = wp_remote_get(
			$url,
			array(
				'timeout' => 30,
			)
		);

		if ( is_wp_error( $response ) ) {
			error_log( 'Plugin metrics WP Error: ' . $response->get_error_message() );

			return new WP_REST_Response(
				array(
					'error' => __( 'Failed to collect metrics', 'flexify-dashboard' ),
					'message' => $response->get_error_message(),
				),
				500
			);
		}

		$status_code = wp_remote_retrieve_response_code( $response );

		if ( 200 !== $status_code ) {
			error_log( 'Plugin metrics HTTP Error: ' . $status_code . ' - ' . wp_remote_retrieve_response_message( $response ) );

			return new WP_REST_Response(
				array(
					'error' => __( 'HTTP Error', 'flexify-dashboard' ),
					'status' => $status_code,
					'message' => wp_remote_retrieve_response_message( $response ),
				),
				500
			);
		}

		$body = wp_remote_retrieve_body( $response );

		if ( preg_match( '/<script id="plugin-metrics-data" type="application\/json">(.*?)<\/script>/s', $body, $matches ) ) {
			$metrics = json_decode( $matches[1], true );

			if ( null === $metrics ) {
				return new WP_REST_Response(
					array(
						'error' => __( 'Failed to parse metrics JSON', 'flexify-dashboard' ),
						'json_error' => json_last_error_msg(),
					),
					500
				);
			}

			return new WP_REST_Response( $metrics, 200 );
		}

		return new WP_REST_Response(
			array(
				'error' => __( 'No metrics found', 'flexify-dashboard' ),
			),
			404
		);
	}


	/**
	 * Get list of all installed plugins.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function get_plugins_list( WP_REST_Request $request ) {
		unset( $request );

		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$all_plugins = get_plugins();
		$active_plugins = get_option( 'active_plugins', array() );
		$update_plugins = get_plugin_updates();
		$auto_updates = (array) get_site_option( 'auto_update_plugins', array() );

		$update_slugs = array();

		if ( ! empty( $update_plugins ) ) {
			foreach ( $update_plugins as $plugin_file => $plugin_data ) {
				unset( $plugin_data );
				$update_slugs[] = $plugin_file;
			}
		}

		$formatted_plugins = array();

		foreach ( $all_plugins as $plugin_file => $plugin_data ) {
			$is_active = in_array( $plugin_file, $active_plugins, true );
			$has_update = in_array( $plugin_file, $update_slugs, true );
			$auto_update_enabled = in_array( $plugin_file, $auto_updates, true );

			$formatted_plugins[ $plugin_file ] = array(
				'Name' => $plugin_data['Name'],
				'PluginURI' => $plugin_data['PluginURI'],
				'Version' => $plugin_data['Version'],
				'Description' => $plugin_data['Description'],
				'Author' => $plugin_data['Author'],
				'AuthorURI' => $plugin_data['AuthorURI'],
				'TextDomain' => $plugin_data['TextDomain'],
				'DomainPath' => $plugin_data['DomainPath'],
				'Network' => $plugin_data['Network'],
				'RequiresWP' => isset( $plugin_data['RequiresWP'] ) ? $plugin_data['RequiresWP'] : '',
				'RequiresPHP' => isset( $plugin_data['RequiresPHP'] ) ? $plugin_data['RequiresPHP'] : '',
				'active' => $is_active,
				'slug' => $plugin_file,
				'has_update' => $has_update,
				'deleted' => false,
				'auto_update_enabled' => $auto_update_enabled,
				'splitSlug' => self::get_base_slug_from_plugin_file( $plugin_file ),
				'action_links' => self::normalize_plugin_links(
					apply_filters( 'plugin_action_links_' . $plugin_file, array(), $plugin_file, $plugin_data, '' )
				),
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'plugins' => $formatted_plugins,
			),
			200
		);
	}


	/**
	 * Get slug argument schema.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_slug_arg_schema() {
		return array(
			'required' => true,
			'validate_callback' => function( $param ) {
				return is_string( $param ) && ! empty( $param ) && preg_match( '/^[a-zA-Z0-9-_]+$/', $param );
			},
			'sanitize_callback' => 'sanitize_text_field',
			'description' => __( 'Plugin slug identifier', 'flexify-dashboard' ),
		);
	}


	/**
	 * Define runtime constants for plugin operations.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private static function define_runtime_constants() {
		if ( ! defined( 'REST_REQUEST' ) ) {
			define( 'REST_REQUEST', true );
		}

		if ( ! defined( 'DOING_AJAX' ) ) {
			define( 'DOING_AJAX', true );
		}
	}


	/**
	 * Initialize WordPress filesystem.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private static function init_filesystem() {
		global $wp_filesystem;

		if ( empty( $wp_filesystem ) ) {
			WP_Filesystem();
		}
	}


	/**
	 * Detect plugin information from extracted ZIP contents.
	 *
	 * @since 2.0.0
	 * @param string $temp_dir Temporary extracted directory.
	 * @return array
	 */
	private static function detect_plugin_from_extracted_zip( $temp_dir ) {
		global $wp_filesystem;

		$plugin_files = $wp_filesystem->dirlist( $temp_dir );
		$plugin_folder = null;
		$main_plugin_file = null;

		if ( empty( $plugin_files ) || ! is_array( $plugin_files ) ) {
			return array(
				'plugin_folder' => null,
				'main_plugin_file' => null,
			);
		}

		foreach ( $plugin_files as $file_name => $file_info ) {
			if ( ! isset( $file_info['type'] ) || 'd' !== $file_info['type'] ) {
				continue;
			}

			$plugin_folder = $file_name;
			$plugin_folder_files = $wp_filesystem->dirlist( trailingslashit( $temp_dir ) . $file_name );

			if ( empty( $plugin_folder_files ) || ! is_array( $plugin_folder_files ) ) {
				break;
			}

			foreach ( $plugin_folder_files as $php_file => $php_info ) {
				unset( $php_info );

				if ( '.php' !== substr( $php_file, -4 ) ) {
					continue;
				}

				$php_content = $wp_filesystem->get_contents( trailingslashit( $temp_dir ) . $file_name . '/' . $php_file );

				if ( is_string( $php_content ) && preg_match( '/Plugin Name:/i', $php_content ) ) {
					$main_plugin_file = $file_name . '/' . $php_file;
					break 2;
				}
			}

			break;
		}

		return array(
			'plugin_folder' => $plugin_folder,
			'main_plugin_file' => $main_plugin_file,
		);
	}


	/**
	 * Get plugin file from slug.
	 *
	 * @since 2.0.0
	 * @param string $plugin_slug Plugin slug.
	 * @return string|null
	 */
	private static function get_plugin_file( $plugin_slug ) {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugins = get_plugins();

		foreach ( $plugins as $plugin_file => $plugin_info ) {
			unset( $plugin_info );

			if ( 0 === strpos( $plugin_file, $plugin_slug . '/' ) || $plugin_file === $plugin_slug . '.php' ) {
				return $plugin_file;
			}
		}

		return null;
	}


	/**
	 * Get base slug from plugin file path.
	 *
	 * @since 2.0.0
	 * @param string $plugin_file Plugin file path.
	 * @return string
	 */
	private static function get_base_slug_from_plugin_file( $plugin_file ) {
		$slug_parts = explode( '/', $plugin_file );

		return isset( $slug_parts[0] ) ? $slug_parts[0] : '';
	}


	/**
	 * Build a standard REST response.
	 *
	 * @since 2.0.0
	 * @param bool   $success Success state.
	 * @param string $message Response message.
	 * @param int    $status  HTTP status code.
	 * @param array  $extra   Additional response data.
	 * @return WP_REST_Response
	 */
	private static function response( $success, $message, $status, $extra = array() ) {
		return new WP_REST_Response(
			array_merge(
				array(
					'success' => $success,
					'message' => $message,
				),
				$extra
			),
			$status
		);
	}


	/**
	 * Normalize plugin links from HTML anchor tags.
	 *
	 * @since 2.0.0
	 * @param array $links Plugin links.
	 * @return array
	 */
	private static function normalize_plugin_links( $links ) {
		$normalized_links = array();

		foreach ( $links as $link ) {
			if ( ! is_string( $link ) ) {
				continue;
			}

			if ( ! preg_match( '/<a.*?href=["\'](.*?)["\'].*?>(.*?)<\/a>/i', $link, $matches ) ) {
				continue;
			}

			$normalized_links[] = array(
				'url' => $matches[1],
				'text' => wp_strip_all_tags( $matches[2] ),
			);
		}

		return $normalized_links;
	}
}