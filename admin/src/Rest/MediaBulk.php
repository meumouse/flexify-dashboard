<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use ZipArchive;

defined('ABSPATH') || exit;

/**
 * Class MediaBulk
 *
 * Register REST API endpoints for bulk media operations.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class MediaBulk {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Maximum allowed items for bulk download.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private const MAX_BULK_ITEMS = 100;

	/**
	 * Cleanup hook name.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CLEANUP_HOOK = 'flexify_dashboard_cleanup_zip';


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
		add_action( self::CLEANUP_HOOK, array( __CLASS__, 'cleanup_zip_file' ), 10, 1 );
	}


	/**
	 * Register REST API routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_rest_routes() {
		register_rest_route( self::REST_NAMESPACE, '/media/bulk-download', array(
			'methods' => 'POST',
			'callback' => array( __CLASS__, 'bulk_download' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'media_ids' => array(
					'required' => true,
					'type' => 'array',
					'items' => array(
						'type' => 'integer',
					),
					'validate_callback' => array( __CLASS__, 'validate_media_ids' ),
					'sanitize_callback' => array( __CLASS__, 'sanitize_media_ids' ),
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/media/(?P<id>\d+)/usage', array(
			'methods' => 'GET',
			'callback' => array( __CLASS__, 'get_media_usage' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'id' => array(
					'required' => true,
					'type' => 'integer',
					'validate_callback' => array( __CLASS__, 'validate_media_id' ),
					'sanitize_callback' => 'absint',
				),
			),
		) );
	}


	/**
	 * Check user permissions for media endpoints.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public static function check_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'upload_files' );
	}


	/**
	 * Validate media IDs array.
	 *
	 * @since 2.0.0
	 * @param mixed           $param Request parameter.
	 * @param WP_REST_Request $request REST request object.
	 * @param string          $key Argument key.
	 * @return bool
	 */
	public static function validate_media_ids( $param, WP_REST_Request $request, $key ) {
		unset( $request, $key );

		return is_array( $param ) && ! empty( $param );
	}


	/**
	 * Sanitize media IDs array.
	 *
	 * @since 2.0.0
	 * @param mixed           $param Request parameter.
	 * @param WP_REST_Request $request REST request object.
	 * @param string          $key Argument key.
	 * @return array
	 */
	public static function sanitize_media_ids( $param, WP_REST_Request $request, $key ) {
		unset( $request, $key );

		if ( ! is_array( $param ) ) {
			return array();
		}

		$media_ids = array_map( 'absint', $param );
		$media_ids = array_filter( $media_ids );

		return array_values( array_unique( $media_ids ) );
	}


	/**
	 * Validate a single media ID.
	 *
	 * @since 2.0.0
	 * @param mixed           $param Request parameter.
	 * @param WP_REST_Request $request REST request object.
	 * @param string          $key Argument key.
	 * @return bool
	 */
	public static function validate_media_id( $param, WP_REST_Request $request, $key ) {
		unset( $request, $key );

		return is_numeric( $param ) && absint( $param ) > 0;
	}


	/**
	 * Handle bulk download request and create ZIP file.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function bulk_download( WP_REST_Request $request ) {
		$media_ids = $request->get_param( 'media_ids' );

		if ( empty( $media_ids ) || ! is_array( $media_ids ) ) {
			return new WP_Error(
				'rest_invalid_param',
				__( 'Invalid media IDs provided.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( count( $media_ids ) > self::MAX_BULK_ITEMS ) {
			return new WP_Error(
				'rest_too_many_items',
				__( 'Maximum 100 items can be downloaded at once.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! class_exists( 'ZipArchive' ) ) {
			return new WP_Error(
				'rest_zip_not_available',
				__( 'ZIP functionality is not available on this server.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		$upload_dir = wp_upload_dir();

		if ( empty( $upload_dir['basedir'] ) || empty( $upload_dir['baseurl'] ) ) {
			return new WP_Error(
				'rest_upload_dir_invalid',
				__( 'Upload directory is not available.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		$zip_filename = self::generate_zip_filename();
		$zip_path = trailingslashit( $upload_dir['basedir'] ) . $zip_filename;

		$zip = new ZipArchive();
		$zip_status = $zip->open( $zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		if ( true !== $zip_status ) {
			return new WP_Error(
				'rest_zip_create_failed',
				__( 'Failed to create ZIP file.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		$added_count = self::add_files_to_zip( $zip, $media_ids );

		$zip->close();

		if ( 0 === $added_count ) {
			self::maybe_delete_file( $zip_path );

			return new WP_Error(
				'rest_no_files',
				__( 'No valid files found to download.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$download_url = self::get_zip_download_url( $upload_dir['baseurl'], $zip_filename );

		wp_schedule_single_event( time() + HOUR_IN_SECONDS, self::CLEANUP_HOOK, array( $zip_path ) );

		return new WP_REST_Response(
			array(
				'success' => true,
				'download_url' => $download_url,
				'filename' => $zip_filename,
				'file_count' => $added_count,
			),
			200
		);
	}


	/**
	 * Add selected media files to ZIP.
	 *
	 * @since 2.0.0
	 * @param ZipArchive $zip ZIP archive instance.
	 * @param array      $media_ids Media IDs.
	 * @return int
	 */
	private static function add_files_to_zip( ZipArchive $zip, array $media_ids ) {
		$added_count = 0;
		$used_names = array();

		foreach ( $media_ids as $media_id ) {
			$media_id = absint( $media_id );
			$file_path = get_attached_file( $media_id );

			if ( empty( $file_path ) || ! file_exists( $file_path ) ) {
				continue;
			}

			$filename = self::get_unique_zip_filename( basename( $file_path ), $used_names );

			if ( $zip->addFile( $file_path, $filename ) ) {
				$added_count++;
			}
		}

		return $added_count;
	}


	/**
	 * Generate ZIP filename.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function generate_zip_filename() {
		return 'media-bulk-' . time() . '-' . wp_generate_password( 8, false, false ) . '.zip';
	}


	/**
	 * Get ZIP download URL.
	 *
	 * @since 2.0.0
	 * @param string $baseurl Upload base URL.
	 * @param string $zip_filename ZIP filename.
	 * @return string
	 */
	private static function get_zip_download_url( $baseurl, $zip_filename ) {
		$download_url = trailingslashit( $baseurl ) . $zip_filename;
		$site_scheme = wp_parse_url( get_site_url(), PHP_URL_SCHEME );

		return set_url_scheme( $download_url, $site_scheme ? $site_scheme : 'https' );
	}


	/**
	 * Get a unique filename for ZIP entries.
	 *
	 * @since 2.0.0
	 * @param string $filename Original filename.
	 * @param array  $used_names Used filenames reference.
	 * @return string
	 */
	private static function get_unique_zip_filename( $filename, array &$used_names ) {
		$pathinfo = pathinfo( $filename );
		$name = isset( $pathinfo['filename'] ) ? $pathinfo['filename'] : 'file';
		$extension = isset( $pathinfo['extension'] ) ? '.' . $pathinfo['extension'] : '';
		$unique_name = $filename;
		$counter = 1;

		while ( in_array( $unique_name, $used_names, true ) ) {
			$unique_name = $name . '-' . $counter . $extension;
			$counter++;
		}

		$used_names[] = $unique_name;

		return $unique_name;
	}


	/**
	 * Delete a file if it exists.
	 *
	 * @since 2.0.0
	 * @param string $file_path File path.
	 * @return void
	 */
	private static function maybe_delete_file( $file_path ) {
		if ( ! empty( $file_path ) && file_exists( $file_path ) ) {
			wp_delete_file( $file_path );
		}
	}


	/**
	 * Cleanup ZIP file after scheduled expiration.
	 *
	 * @since 2.0.0
	 * @param string $zip_path ZIP file path.
	 * @return void
	 */
	public static function cleanup_zip_file( $zip_path ) {
		self::maybe_delete_file( $zip_path );
	}


	/**
	 * Get media usage information.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_media_usage( WP_REST_Request $request ) {
		$media_id = absint( $request->get_param( 'id' ) );

		if ( ! $media_id ) {
			return self::get_usage_response( array() );
		}

		$attachment = get_post( $media_id );

		if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
			return self::get_usage_response( array() );
		}

		$media_url = wp_get_attachment_url( $media_id );

		if ( empty( $media_url ) ) {
			return self::get_usage_response( array() );
		}

		$post_types = self::get_searchable_post_types();
		$image_urls = self::get_media_search_urls( $media_id, $media_url );
		$usage = array();
		$seen_post_ids = array();

		self::collect_featured_image_usage( $media_id, $post_types, $usage, $seen_post_ids );
		self::collect_content_usage( $media_id, $post_types, $image_urls, $usage, $seen_post_ids );
		self::collect_parent_usage( $attachment, $post_types, $usage, $seen_post_ids );

		return self::get_usage_response( $usage );
	}


	/**
	 * Build standard usage response.
	 *
	 * @since 2.0.0
	 * @param array $usage Usage data.
	 * @return WP_REST_Response
	 */
	private static function get_usage_response( array $usage ) {
		return new WP_REST_Response(
			array(
				'success' => true,
				'data' => array_values( $usage ),
				'count' => count( $usage ),
			),
			200
		);
	}


	/**
	 * Get searchable post types.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_searchable_post_types() {
		$post_types = array( 'post', 'page' );
		$custom_post_types = get_post_types(
			array(
				'public' => true,
				'_builtin' => false,
			),
			'names'
		);

		foreach ( $custom_post_types as $post_type ) {
			if ( post_type_supports( $post_type, 'editor' ) ) {
				$post_types[] = $post_type;
			}
		}

		return array_values( array_unique( $post_types ) );
	}


	/**
	 * Get all URLs that should be checked for media usage.
	 *
	 * @since 2.0.0
	 * @param int    $media_id Attachment ID.
	 * @param string $media_url Original media URL.
	 * @return array
	 */
	private static function get_media_search_urls( $media_id, $media_url ) {
		$urls = array( $media_url );

		if ( wp_attachment_is_image( $media_id ) ) {
			$sizes = get_intermediate_image_sizes();

			foreach ( $sizes as $size ) {
				$image_data = wp_get_attachment_image_src( $media_id, $size );

				if ( ! empty( $image_data[0] ) ) {
					$urls[] = $image_data[0];
				}
			}
		}

		return array_values( array_unique( array_filter( $urls ) ) );
	}


	/**
	 * Collect featured image usage.
	 *
	 * @since 2.0.0
	 * @param int   $media_id Attachment ID.
	 * @param array $post_types Post types.
	 * @param array $usage Usage results reference.
	 * @param array $seen_post_ids Seen post IDs reference.
	 * @return void
	 */
	private static function collect_featured_image_usage( $media_id, array $post_types, array &$usage, array &$seen_post_ids ) {
		$query = new WP_Query( array(
			'post_type' => $post_types,
			'post_status' => array( 'publish', 'draft', 'pending', 'future', 'private' ),
			'posts_per_page' => -1,
			'meta_query' => array(
				array(
					'key' => '_thumbnail_id',
					'value' => $media_id,
					'compare' => '=',
				),
			),
			'fields' => 'ids',
			'no_found_rows' => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		) );

		foreach ( $query->posts as $post_id ) {
			self::add_usage_item( $usage, $seen_post_ids, get_post( $post_id ) );
		}

		wp_reset_postdata();
	}


	/**
	 * Collect usage from post content.
	 *
	 * @since 2.0.0
	 * @param int   $media_id Attachment ID.
	 * @param array $post_types Post types.
	 * @param array $image_urls Media URLs.
	 * @param array $usage Usage results reference.
	 * @param array $seen_post_ids Seen post IDs reference.
	 * @return void
	 */
	private static function collect_content_usage( $media_id, array $post_types, array $image_urls, array &$usage, array &$seen_post_ids ) {
		global $wpdb;

		if ( empty( $post_types ) ) {
			return;
		}

		$like_conditions = array(
			'(post_content LIKE %s OR post_content LIKE %s)',
			'post_content LIKE %s',
			'(post_content LIKE %s OR post_content LIKE %s)',
		);

		$prepare_values = array(
			'%"id":' . $media_id . '%',
			'%"mediaId":' . $media_id . '%',
			'%wp-image-' . $media_id . '%',
			'%[gallery%' . $media_id . '%]%',
			'%ids="%' . $media_id . '%"%',
		);

		foreach ( $image_urls as $url ) {
			$prepare_values[] = '%src="' . $wpdb->esc_like( $url ) . '"%';
			$like_conditions[] = 'post_content LIKE %s';

			$prepare_values[] = "%src='" . $wpdb->esc_like( $url ) . "'%";
			$like_conditions[] = 'post_content LIKE %s';

			$prepare_values[] = '%href="' . $wpdb->esc_like( $url ) . '"%';
			$like_conditions[] = 'post_content LIKE %s';

			$prepare_values[] = "%href='" . $wpdb->esc_like( $url ) . "'%";
			$like_conditions[] = 'post_content LIKE %s';
		}

		$post_type_placeholders = implode( ',', array_fill( 0, count( $post_types ), '%s' ) );
		$where_clause = implode( ' OR ', $like_conditions );

		$query = "SELECT ID, post_title, post_type, post_status, post_content
			FROM {$wpdb->posts}
			WHERE post_type IN ({$post_type_placeholders})
			AND post_status IN ('publish', 'draft', 'pending', 'future', 'private')
			AND post_content != ''
			AND post_content IS NOT NULL
			AND ({$where_clause})";

		$prepared_query = $wpdb->prepare( $query, array_merge( $post_types, $prepare_values ) );
		$results = $wpdb->get_results( $prepared_query );

		if ( empty( $results ) ) {
			return;
		}

		foreach ( $results as $post ) {
			$post_id = isset( $post->ID ) ? absint( $post->ID ) : 0;

			if ( ! $post_id || in_array( $post_id, $seen_post_ids, true ) ) {
				continue;
			}

			$content = isset( $post->post_content ) ? (string) $post->post_content : '';

			if ( self::is_media_used_in_content( $content, $media_id, $image_urls ) ) {
				self::add_usage_item( $usage, $seen_post_ids, $post );
			}
		}
	}


	/**
	 * Check if media is used in a content string.
	 *
	 * @since 2.0.0
	 * @param string $content Post content.
	 * @param int    $media_id Attachment ID.
	 * @param array  $image_urls Media URLs.
	 * @return bool
	 */
	private static function is_media_used_in_content( $content, $media_id, array $image_urls ) {
		if ( preg_match( '/"(?:id|mediaId)"\s*:\s*' . preg_quote( (string) $media_id, '/' ) . '\b/', $content ) ) {
			return true;
		}

		if ( preg_match( '/wp-image-' . preg_quote( (string) $media_id, '/' ) . '\b/', $content ) ) {
			return true;
		}

		if ( preg_match( '/\[gallery[^\]]*ids=["\']?[^"\']*' . preg_quote( (string) $media_id, '/' ) . '[^"\']*["\']?/', $content ) ) {
			return true;
		}

		foreach ( $image_urls as $url ) {
			$escaped_url = preg_quote( $url, '/' );

			if ( preg_match( '/src\s*=\s*["\']?' . $escaped_url . '["\']?/', $content ) ) {
				return true;
			}

			if ( preg_match( '/href\s*=\s*["\']?' . $escaped_url . '["\']?/', $content ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Collect attachment parent usage.
	 *
	 * @since 2.0.0
	 * @param object $attachment Attachment post object.
	 * @param array  $post_types Post types.
	 * @param array  $usage Usage results reference.
	 * @param array  $seen_post_ids Seen post IDs reference.
	 * @return void
	 */
	private static function collect_parent_usage( $attachment, array $post_types, array &$usage, array &$seen_post_ids ) {
		$parent_id = isset( $attachment->post_parent ) ? absint( $attachment->post_parent ) : 0;

		if ( ! $parent_id || in_array( $parent_id, $seen_post_ids, true ) ) {
			return;
		}

		$parent = get_post( $parent_id );

		if ( ! $parent || ! in_array( $parent->post_type, $post_types, true ) ) {
			return;
		}

		self::add_usage_item( $usage, $seen_post_ids, $parent );
	}


	/**
	 * Add a usage item if not already included.
	 *
	 * @since 2.0.0
	 * @param array       $usage Usage results reference.
	 * @param array       $seen_post_ids Seen post IDs reference.
	 * @param object|null $post Post object.
	 * @return void
	 */
	private static function add_usage_item( array &$usage, array &$seen_post_ids, $post ) {
		if ( ! $post || empty( $post->ID ) ) {
			return;
		}

		$post_id = absint( $post->ID );

		if ( in_array( $post_id, $seen_post_ids, true ) ) {
			return;
		}

		$seen_post_ids[] = $post_id;
		$usage[] = array(
			'id' => $post_id,
			'title' => ! empty( $post->post_title ) ? $post->post_title : __( '(Untitled)', 'flexify-dashboard' ),
			'type' => isset( $post->post_type ) ? $post->post_type : '',
			'status' => isset( $post->post_status ) ? $post->post_status : '',
			'edit_url' => get_edit_post_link( $post_id, 'raw' ),
		);
	}
}