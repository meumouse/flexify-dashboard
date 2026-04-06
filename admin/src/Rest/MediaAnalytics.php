<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use Exception;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use WP_Error;
use WP_REST_Request;

defined('ABSPATH') || exit;

/**
 * Class MediaAnalytics
 *
 * Register REST API endpoints for media analytics data.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class MediaAnalytics {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $namespace = 'flexify-dashboard/v1';

	/**
	 * REST base route.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $base = 'media-analytics';

	/**
	 * Analytics transient key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $cache_key = 'flexify_dashboard_media_analytics';

	/**
	 * Cache expiration time.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private $cache_expiration = DAY_IN_SECONDS;


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
		register_rest_route( $this->namespace, '/' . $this->base, array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_media_analytics' ),
			'permission_callback' => array( $this, 'get_media_analytics_permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/refresh', array(
			'methods' => 'POST',
			'callback' => array( $this, 'refresh_analytics' ),
			'permission_callback' => array( $this, 'get_media_analytics_permissions_check' ),
		) );
	}


	/**
	 * Check if the current user can access media analytics.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public function get_media_analytics_permissions_check( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'upload_files' );
	}


	/**
	 * Get media analytics data.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return mixed
	 */
	public function get_media_analytics( WP_REST_Request $request ) {
		$cached_data = get_transient( $this->cache_key );

		if ( false !== $cached_data && is_array( $cached_data ) ) {
			$cached_data['from_cache'] = true;
			$cached_data['cache_expires'] = (int) get_option( '_transient_timeout_' . $this->cache_key );

			return rest_ensure_response( $cached_data );
		}

		$analytics = $this->calculate_media_analytics();

		set_transient( $this->cache_key, $analytics, $this->cache_expiration );

		$analytics['from_cache'] = false;
		$analytics['cache_expires'] = time() + $this->cache_expiration;

		return rest_ensure_response( $analytics );
	}


	/**
	 * Refresh media analytics cache.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return mixed
	 */
	public function refresh_analytics( WP_REST_Request $request ) {
		delete_transient( $this->cache_key );

		return $this->get_media_analytics( $request );
	}


	/**
	 * Calculate media analytics data.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function calculate_media_analytics() {
		global $wpdb;

		$total_files = (int) $wpdb->get_var(
			"SELECT COUNT(*)
			FROM {$wpdb->posts}
			WHERE post_type = 'attachment'
			AND post_status = 'inherit'"
		);

		$file_types = $wpdb->get_results(
			"SELECT
				SUBSTRING_INDEX(post_mime_type, '/', 1) AS file_type,
				COUNT(*) AS count
			FROM {$wpdb->posts}
			WHERE post_type = 'attachment'
			AND post_status = 'inherit'
			GROUP BY SUBSTRING_INDEX(post_mime_type, '/', 1)
			ORDER BY count DESC",
			ARRAY_A
		);

		$recent_uploads = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*)
				FROM {$wpdb->posts}
				WHERE post_type = 'attachment'
				AND post_status = 'inherit'
				AND post_date >= %s",
				gmdate( 'Y-m-d H:i:s', time() - ( 30 * DAY_IN_SECONDS ) )
			)
		);

		$unused_media = (int) $wpdb->get_var(
			"SELECT COUNT(*)
			FROM {$wpdb->posts}
			WHERE post_type = 'attachment'
			AND post_status = 'inherit'
			AND post_parent = 0"
		);

		$upload_dir = wp_upload_dir();
		$upload_path = ! empty( $upload_dir['basedir'] ) ? $upload_dir['basedir'] : '';
		$total_size = $this->get_directory_size( $upload_path );
		$average_file_size = $total_files > 0 ? (int) floor( $total_size / $total_files ) : 0;
		$large_files = $this->estimate_large_files( $total_files, $total_size );

		return array(
			'total_files' => $total_files,
			'total_size' => $total_size,
			'total_size_formatted' => $this->format_bytes( $total_size ),
			'average_file_size' => $average_file_size,
			'average_file_size_formatted' => $this->format_bytes( $average_file_size ),
			'file_types' => is_array( $file_types ) ? $file_types : array(),
			'recent_uploads' => $recent_uploads,
			'unused_media' => $unused_media,
			'large_files_estimate' => $large_files,
			'upload_path' => $upload_path,
			'last_updated' => current_time( 'mysql' ),
		);
	}


	/**
	 * Estimate large files amount based on average file size.
	 *
	 * @since 2.0.0
	 * @param int $total_files Total number of files.
	 * @param int $total_size Total size in bytes.
	 * @return int
	 */
	private function estimate_large_files( $total_files, $total_size ) {
		if ( $total_files <= 0 || $total_size <= 0 ) {
			return 0;
		}

		$average_file_size = $total_size / $total_files;

		if ( $average_file_size <= MB_IN_BYTES ) {
			return 0;
		}

		return (int) floor( $total_files * 0.1 );
	}


	/**
	 * Get directory size recursively.
	 *
	 * @since 2.0.0
	 * @param string $directory Directory path.
	 * @return int
	 */
	private function get_directory_size( $directory ) {
		if ( empty( $directory ) || ! is_dir( $directory ) ) {
			return 0;
		}

		$size = 0;

		try {
			$iterator = new RecursiveIteratorIterator(
				new RecursiveDirectoryIterator( $directory, RecursiveDirectoryIterator::SKIP_DOTS ),
				RecursiveIteratorIterator::LEAVES_ONLY
			);

			foreach ( $iterator as $file ) {
				if ( $file->isFile() ) {
					$size += (int) $file->getSize();
				}
			}
		} catch ( Exception $exception ) {
			error_log( 'Flexify Dashboard Media Analytics: Failed to read upload directory. Error: ' . $exception->getMessage() );
		}

		return $size;
	}


	/**
	 * Format bytes to a human-readable string.
	 *
	 * @since 2.0.0
	 * @param int|float $bytes File size in bytes.
	 * @param int       $precision Decimal precision.
	 * @return string
	 */
	private function format_bytes( $bytes, $precision = 2 ) {
		$bytes = (float) $bytes;

		if ( $bytes <= 0 ) {
			return '0 B';
		}

		$units = array( 'B', 'KB', 'MB', 'GB', 'TB' );
		$unit_index = 0;

		while ( $bytes >= 1024 && $unit_index < count( $units ) - 1 ) {
			$bytes /= 1024;
			$unit_index++;
		}

		return round( $bytes, (int) $precision ) . ' ' . $units[ $unit_index ];
	}
}