<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_REST_Request;
use WP_REST_Response;
use wpdb;

defined('ABSPATH') || exit;

/**
 * Class ServerHealth
 *
 * Adds a custom REST API endpoint to fetch server health and system statistics.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class ServerHealth {

	/**
	 * REST API namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * REST API base route.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_BASE = 'server-health';


	/**
	 * Constructor.
	 *
	 * Registers REST API hooks.
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
			'/' . self::REST_BASE,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_server_health' ),
				'permission_callback' => array( $this, 'get_server_health_permissions_check' ),
			)
		);
	}


	/**
	 * Check if the current user has permission to access the endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The request object.
	 * @return bool|\WP_Error
	 */
	public function get_server_health_permissions_check( $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get server health and system statistics.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response
	 */
	public function get_server_health( $request ) {
		global $wp_version;
		global $wpdb;

		$php_version         = PHP_VERSION;
		$server_software     = $this->get_server_software();
		$memory_usage        = memory_get_usage( true );
		$memory_limit        = ini_get( 'memory_limit' );
		$memory_usage_mb     = round( $memory_usage / 1024 / 1024, 2 );
		$memory_limit_mb     = $this->convert_to_mb( $memory_limit );
		$memory_percentage   = $memory_limit_mb > 0 ? round( ( $memory_usage_mb / $memory_limit_mb ) * 100, 1 ) : 0;
		$server_load         = $this->get_server_load();
		$disk_space          = $this->get_disk_space();
		$plugin_updates      = $this->get_plugin_updates_count();
		$theme_updates       = $this->get_theme_updates_count();
		$core_updates        = $this->get_core_updates_count();
		$database_size       = $this->get_database_size( $wpdb );
		$active_plugins      = get_option( 'active_plugins', array() );
		$active_plugins_count = is_array( $active_plugins ) ? count( $active_plugins ) : 0;
		$total_plugins_count = $this->get_total_plugins_count();
		$active_theme        = wp_get_theme();
		$uploads_size        = $this->get_uploads_directory_size();
		$last_backup         = $this->get_last_backup_date();
		$ssl_status          = $this->get_ssl_status();
		$timezone            = wp_timezone_string();
		$max_execution_time  = ini_get( 'max_execution_time' );
		$upload_max_filesize = ini_get( 'upload_max_filesize' );
		$post_max_size       = ini_get( 'post_max_size' );
		$mysql_version       = $this->get_mysql_version( $wpdb );

		$health_data = array(
			'wordpress' => array(
				'version'      => $wp_version,
				'core_updates' => $core_updates,
				'last_backup'  => $last_backup,
				'ssl_status'   => $ssl_status,
				'timezone'     => $timezone,
			),
			'php'       => array(
				'version'             => $php_version,
				'memory_usage'        => $memory_usage_mb,
				'memory_limit'        => $memory_limit_mb,
				'memory_percentage'   => $memory_percentage,
				'max_execution_time'  => $max_execution_time,
				'upload_max_filesize' => $upload_max_filesize,
				'post_max_size'       => $post_max_size,
			),
			'server'    => array(
				'software'      => $server_software,
				'load'          => $server_load,
				'disk_space'    => $disk_space,
				'mysql_version' => $mysql_version,
			),
			'plugins'   => array(
				'total'             => $total_plugins_count,
				'active'            => $active_plugins_count,
				'updates_available' => $plugin_updates,
			),
			'themes'    => array(
				'active'            => $active_theme->get( 'Name' ),
				'version'           => $active_theme->get( 'Version' ),
				'updates_available' => $theme_updates,
			),
			'storage'   => array(
				'database_size' => $database_size,
				'uploads_size'  => $uploads_size,
			),
		);

		return new WP_REST_Response( $health_data, 200 );
	}


	/**
	 * Get the current server software.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_server_software() {
		return isset( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : 'Unknown';
	}


	/**
	 * Convert a memory size string to megabytes.
	 *
	 * @since 2.0.0
	 * @param string|int $memory_limit The memory limit value.
	 * @return float
	 */
	private function convert_to_mb( $memory_limit ) {
		if ( empty( $memory_limit ) ) {
			return 0;
		}

		if ( '-1' === (string) $memory_limit ) {
			return 0;
		}

		$memory_limit = trim( (string) $memory_limit );
		$last         = strtolower( substr( $memory_limit, -1 ) );
		$value        = (float) $memory_limit;

		switch ( $last ) {
			case 'g':
				$value *= 1024;
				break;

			case 'k':
				$value /= 1024;
				break;

			case 'm':
			default:
				break;
		}

		return round( $value, 2 );
	}


	/**
	 * Get server load averages when available.
	 *
	 * @since 2.0.0
	 * @return array|null
	 */
	private function get_server_load() {
		if ( ! function_exists( 'sys_getloadavg' ) ) {
			return null;
		}

		$load = sys_getloadavg();

		if ( ! is_array( $load ) || count( $load ) < 3 ) {
			return null;
		}

		return array(
			'1min'  => round( (float) $load[0], 2 ),
			'5min'  => round( (float) $load[1], 2 ),
			'15min' => round( (float) $load[2], 2 ),
		);
	}


	/**
	 * Get disk space information.
	 *
	 * @since 2.0.0
	 * @return array|null
	 */
	private function get_disk_space() {
		if ( ! function_exists( 'disk_free_space' ) || ! function_exists( 'disk_total_space' ) ) {
			return null;
		}

		$path        = ABSPATH;
		$bytes_free  = @disk_free_space( $path );
		$bytes_total = @disk_total_space( $path );

		if ( false === $bytes_free || false === $bytes_total || $bytes_total <= 0 ) {
			return null;
		}

		$bytes_used = $bytes_total - $bytes_free;

		return array(
			'free'       => round( $bytes_free / 1024 / 1024 / 1024, 2 ),
			'total'      => round( $bytes_total / 1024 / 1024 / 1024, 2 ),
			'used'       => round( $bytes_used / 1024 / 1024 / 1024, 2 ),
			'percentage' => round( ( $bytes_used / $bytes_total ) * 100, 1 ),
		);
	}


	/**
	 * Get the total number of plugin updates available.
	 *
	 * @since 2.0.0
	 * @return int
	 */
	private function get_plugin_updates_count() {
		if ( ! function_exists( 'get_plugin_updates' ) ) {
			require_once ABSPATH . 'wp-admin/includes/update.php';
		}

		$plugin_updates = get_plugin_updates();

		return is_array( $plugin_updates ) ? count( $plugin_updates ) : 0;
	}


	/**
	 * Get the total number of theme updates available.
	 *
	 * @since 2.0.0
	 * @return int
	 */
	private function get_theme_updates_count() {
		if ( ! function_exists( 'get_theme_updates' ) ) {
			require_once ABSPATH . 'wp-admin/includes/update.php';
		}

		$theme_updates = get_theme_updates();

		return is_array( $theme_updates ) ? count( $theme_updates ) : 0;
	}


	/**
	 * Get the total number of core updates available.
	 *
	 * @since 2.0.0
	 * @return int
	 */
	private function get_core_updates_count() {
		if ( ! function_exists( 'get_core_updates' ) ) {
			require_once ABSPATH . 'wp-admin/includes/update.php';
		}

		$core_updates = get_core_updates();

		return is_array( $core_updates ) ? count( $core_updates ) : 0;
	}


	/**
	 * Get the database size in megabytes.
	 *
	 * @since 2.0.0
	 * @param wpdb $wpdb WordPress database instance.
	 * @return float
	 */
	private function get_database_size( $wpdb ) {
		$query = $wpdb->prepare(
			"SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2)
			FROM information_schema.tables
			WHERE table_schema = %s",
			DB_NAME
		);

		$result = $wpdb->get_var( $query );

		return $result ? (float) $result : 0;
	}


	/**
	 * Get the total number of installed plugins.
	 *
	 * @since 2.0.0
	 * @return int
	 */
	private function get_total_plugins_count() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$all_plugins = get_plugins();

		return is_array( $all_plugins ) ? count( $all_plugins ) : 0;
	}


	/**
	 * Get the uploads directory size in megabytes.
	 *
	 * @since 2.0.0
	 * @return float
	 */
	private function get_uploads_directory_size() {
		$upload_dir = wp_upload_dir();
		$upload_path = isset( $upload_dir['basedir'] ) ? $upload_dir['basedir'] : '';

		if ( empty( $upload_path ) || ! is_dir( $upload_path ) ) {
			return 0;
		}

		$size = $this->get_directory_size( $upload_path );

		return round( $size / 1024 / 1024, 2 );
	}


	/**
	 * Get directory size recursively.
	 *
	 * @since 2.0.0
	 * @param string $directory Directory path.
	 * @return int
	 */
	private function get_directory_size( $directory ) {
		$size = 0;

		if ( ! is_dir( $directory ) || ! is_readable( $directory ) ) {
			return $size;
		}

		$items = @scandir( $directory );

		if ( false === $items ) {
			return $size;
		}

		foreach ( $items as $item ) {
			if ( '.' === $item || '..' === $item ) {
				continue;
			}

			$path = trailingslashit( $directory ) . $item;

			if ( is_file( $path ) ) {
				$file_size = @filesize( $path );

				if ( false !== $file_size ) {
					$size += (int) $file_size;
				}
			} elseif ( is_dir( $path ) ) {
				$size += $this->get_directory_size( $path );
			}
		}

		return $size;
	}


	/**
	 * Get the last backup date.
	 *
	 * Placeholder for future backup plugin integrations.
	 *
	 * @since 2.0.0
	 * @return null
	 */
	private function get_last_backup_date() {
		return null;
	}


	/**
	 * Get the SSL status.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_ssl_status() {
		return is_ssl() ? 'enabled' : 'disabled';
	}


	/**
	 * Get the MySQL version.
	 *
	 * @since 2.0.0
	 * @param wpdb $wpdb WordPress database instance.
	 * @return string
	 */
	private function get_mysql_version( $wpdb ) {
		$version = $wpdb->get_var( 'SELECT VERSION()' );

		return ! empty( $version ) ? (string) $version : 'Unknown';
	}
}