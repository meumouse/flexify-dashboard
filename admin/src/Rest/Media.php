<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Query;
use WP_REST_Request;

defined('ABSPATH') || exit;

/**
 * Class Media
 *
 * Registers custom REST API parameters for media library queries and handles
 * unused attachment detection with custom ordering support.
 *
 * Definition of "unused" for now:
 * - Unattached (post_parent = 0)
 * - Not referenced as a featured image
 * - Optionally, not referenced inside post_content when deep mode is enabled
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class Media {
	/**
	 * REST cache key for featured attachment IDs.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const FEATURED_ATTACHMENTS_CACHE_KEY = 'flexify_dashboard_featured_attachment_ids_cache';

	/**
	 * REST cache key for attached attachment IDs.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const ATTACHED_ATTACHMENTS_CACHE_KEY = 'flexify_dashboard_attached_attachment_ids';

	/**
	 * REST cache key for content-used attachment IDs.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const CONTENT_ATTACHMENTS_CACHE_KEY = 'flexify_dashboard_used_attachment_ids_content_cache';

	/**
	 * Attachment filesize meta key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const FILESIZE_META_KEY = 'flexify_dashboard_filesize';

	/**
	 * Bootstrap hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function init(): void {
		add_filter( 'rest_attachment_collection_params', array( __CLASS__, 'register_unused_param' ) );
		add_filter( 'rest_attachment_query', array( __CLASS__, 'filter_unused_attachments' ), 10, 2 );

		add_filter( 'posts_clauses', array( __CLASS__, 'handle_custom_orderby_clauses' ), 10, 2 );
		add_filter( 'the_posts', array( __CLASS__, 'maybe_prime_filesize_meta' ), 10, 2 );
	}


	/**
	 * Add custom collection parameters to the attachments endpoint.
	 *
	 * @since 2.0.0
	 * @param array $query_params Existing query params.
	 * @return array
	 */
	public static function register_unused_param( array $query_params ): array {
		$query_params['unused'] = array(
			'description' => __( 'Return only unused media items (unattached and not used as featured image).', 'flexify-dashboard' ),
			'type'        => 'boolean',
			'default'     => false,
		);

		$query_params['unused_mode'] = array(
			'description' => __( 'Unused detection mode: shallow (default) or deep (scans post_content).', 'flexify-dashboard' ),
			'type'        => 'string',
			'enum'        => array( 'shallow', 'deep' ),
			'default'     => 'shallow',
		);

		if ( isset( $query_params['orderby']['enum'] ) && is_array( $query_params['orderby']['enum'] ) ) {
			if ( ! in_array( 'size', $query_params['orderby']['enum'], true ) ) {
				$query_params['orderby']['enum'][] = 'size';
			}

			if ( ! in_array( 'type', $query_params['orderby']['enum'], true ) ) {
				$query_params['orderby']['enum'][] = 'type';
			}
		}

		return $query_params;
	}


	/**
	 * Filter attachment queries when the unused parameter is present.
	 *
	 * @since 2.0.0
	 * @param array           $args    Query arguments.
	 * @param WP_REST_Request $request REST request instance.
	 * @return array
	 */
	public static function filter_unused_attachments( array $args, WP_REST_Request $request ): array {
		$args = self::maybe_apply_custom_orderby( $args, $request );

		$unused = rest_sanitize_boolean( $request->get_param( 'unused' ) );

		if ( ! $unused ) {
			return $args;
		}

		$used_attachment_ids = self::get_used_attachment_ids( $request );

		if ( ! empty( $used_attachment_ids ) ) {
			$existing_exclusions = isset( $args['post__not_in'] ) && is_array( $args['post__not_in'] )
				? array_map( 'intval', $args['post__not_in'] )
				: array();

			$args['post__not_in'] = array_values(
				array_unique(
					array_merge( $existing_exclusions, $used_attachment_ids )
				)
			);
		}

		return $args;
	}


	/**
	 * Apply custom orderby handling for size and type.
	 *
	 * @since 2.0.0
	 * @param array           $args    Query arguments.
	 * @param WP_REST_Request $request REST request instance.
	 * @return array
	 */
	private static function maybe_apply_custom_orderby( array $args, WP_REST_Request $request ): array {
		$orderby = sanitize_key( (string) $request->get_param( 'orderby' ) );
		$order   = strtoupper( sanitize_text_field( (string) $request->get_param( 'order' ) ) );

		$order = 'ASC' === $order ? 'ASC' : 'DESC';

		if ( ! in_array( $orderby, array( 'size', 'type' ), true ) ) {
			return $args;
		}

		$args['orderby']                              = 'none';
		$args['flexify_dashboard_custom_orderby']     = $orderby;
		$args['flexify_dashboard_custom_order']       = $order;
		$args['flexify_dashboard_rest_media_request'] = true;

		return $args;
	}


	/**
	 * Modify SQL clauses for custom media ordering.
	 *
	 * @since 2.0.0
	 * @param array    $clauses Query clauses.
	 * @param WP_Query $query   WP_Query instance.
	 * @return array
	 */
	public static function handle_custom_orderby_clauses( array $clauses, WP_Query $query ): array {
		global $wpdb;

		$is_rest_media_request = (bool) $query->get( 'flexify_dashboard_rest_media_request' );
		$orderby              = sanitize_key( (string) $query->get( 'flexify_dashboard_custom_orderby' ) );
		$order                = strtoupper( sanitize_text_field( (string) $query->get( 'flexify_dashboard_custom_order' ) ) );

		if ( ! $is_rest_media_request || ! in_array( $orderby, array( 'size', 'type' ), true ) ) {
			return $clauses;
		}

		$order = 'ASC' === $order ? 'ASC' : 'DESC';

		if ( 'size' === $orderby ) {
			$clauses['join'] .= " LEFT JOIN {$wpdb->postmeta} AS fd_filesize_meta ON ( {$wpdb->posts}.ID = fd_filesize_meta.post_id AND fd_filesize_meta.meta_key = '" . esc_sql( self::FILESIZE_META_KEY ) . "' ) ";
			$clauses['orderby'] = "CAST(fd_filesize_meta.meta_value AS UNSIGNED) {$order}, {$wpdb->posts}.post_date DESC";
		}

		if ( 'type' === $orderby ) {
			$clauses['orderby'] = "{$wpdb->posts}.post_mime_type {$order}, {$wpdb->posts}.post_date DESC";
		}

		return $clauses;
	}


	/**
	 * Populate filesize meta for returned attachments when sorting by size.
	 *
	 * @since 2.0.0
	 * @param array    $posts Array of posts.
	 * @param WP_Query $query WP_Query instance.
	 * @return array
	 */
	public static function maybe_prime_filesize_meta( array $posts, WP_Query $query ): array {
		$is_rest_media_request = (bool) $query->get( 'flexify_dashboard_rest_media_request' );
		$orderby              = sanitize_key( (string) $query->get( 'flexify_dashboard_custom_orderby' ) );

		if ( ! $is_rest_media_request || 'size' !== $orderby ) {
			return $posts;
		}

		foreach ( $posts as $post ) {
			if ( ! isset( $post->ID ) || 'attachment' !== $post->post_type ) {
				continue;
			}

			$existing_size = get_post_meta( $post->ID, self::FILESIZE_META_KEY, true );

			if ( '' !== $existing_size && null !== $existing_size ) {
				continue;
			}

			$path = get_attached_file( $post->ID );

			if ( empty( $path ) || ! file_exists( $path ) ) {
				continue;
			}

			$filesize = (int) filesize( $path );

			if ( $filesize > 0 ) {
				update_post_meta( $post->ID, self::FILESIZE_META_KEY, $filesize );
			}
		}

		return $posts;
	}


	/**
	 * Get used attachment IDs based on the current detection mode.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request instance.
	 * @return array
	 */
	private static function get_used_attachment_ids( WP_REST_Request $request ): array {
		$used_attachment_ids = array();

		$featured_ids = self::get_featured_attachment_ids();
		$attached_ids = self::get_attached_attachment_ids();

		$used_attachment_ids = array_merge( $used_attachment_ids, $featured_ids, $attached_ids );

		$mode = sanitize_key( (string) $request->get_param( 'unused_mode' ) );

		if ( 'deep' === $mode ) {
			$used_attachment_ids = array_merge( $used_attachment_ids, self::collect_used_attachment_ids_from_content() );
		}

		return array_values(
			array_unique(
				array_filter(
					array_map( 'intval', $used_attachment_ids )
				)
			)
		);
	}


	/**
	 * Get attachment IDs used as featured images.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_featured_attachment_ids(): array {
		global $wpdb;

		$featured_ids = get_transient( self::FEATURED_ATTACHMENTS_CACHE_KEY );

		if ( false !== $featured_ids && is_array( $featured_ids ) ) {
			return $featured_ids;
		}

		$featured_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value <> '' AND meta_value > 0",
				'_thumbnail_id'
			)
		);

		$featured_ids = array_values(
			array_filter(
				array_map( 'intval', (array) $featured_ids )
			)
		);

		set_transient( self::FEATURED_ATTACHMENTS_CACHE_KEY, $featured_ids, MINUTE_IN_SECONDS * 5 );

		return $featured_ids;
	}


	/**
	 * Get attachment IDs that are attached to posts.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_attached_attachment_ids(): array {
		global $wpdb;

		$attached_ids = get_transient( self::ATTACHED_ATTACHMENTS_CACHE_KEY );

		if ( false !== $attached_ids && is_array( $attached_ids ) ) {
			return $attached_ids;
		}

		$attached_ids = $wpdb->get_col(
			"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'attachment' AND post_parent > 0"
		);

		$attached_ids = array_values(
			array_filter(
				array_map( 'intval', (array) $attached_ids )
			)
		);

		set_transient( self::ATTACHED_ATTACHMENTS_CACHE_KEY, $attached_ids, MINUTE_IN_SECONDS * 5 );

		return $attached_ids;
	}


	/**
	 * Parse post content to collect attachment IDs used in blocks, galleries and uploads URLs.
	 * Cached via transient to reduce repeated scans.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function collect_used_attachment_ids_from_content(): array {
		global $wpdb;

		$cached_ids = get_transient( self::CONTENT_ATTACHMENTS_CACHE_KEY );

		if ( false !== $cached_ids && is_array( $cached_ids ) ) {
			return $cached_ids;
		}

		$posts = $wpdb->get_results(
			"SELECT ID, post_content FROM {$wpdb->posts} WHERE post_type NOT IN ('attachment','revision','nav_menu_item') AND post_status IN ('publish','draft','future','pending','private')",
			ARRAY_A
		);

		$attachment_ids = array();

		if ( empty( $posts ) || ! is_array( $posts ) ) {
			set_transient( self::CONTENT_ATTACHMENTS_CACHE_KEY, $attachment_ids, MINUTE_IN_SECONDS * 10 );
			return $attachment_ids;
		}

		foreach ( $posts as $post ) {
			$content = isset( $post['post_content'] ) ? (string) $post['post_content'] : '';

			if ( empty( $content ) ) {
				continue;
			}

			if ( preg_match_all( '/"id"\s*:\s*(\d+)/', $content, $matches ) ) {
				$attachment_ids = array_merge( $attachment_ids, array_map( 'intval', $matches[1] ) );
			}

			if ( preg_match_all( '/wp-image-(\d+)/', $content, $matches ) ) {
				$attachment_ids = array_merge( $attachment_ids, array_map( 'intval', $matches[1] ) );
			}

			if ( preg_match_all( '/\[gallery[^\]]*ids=\"([^\"]+)\"/i', $content, $matches ) ) {
				foreach ( $matches[1] as $csv_ids ) {
					$gallery_ids = array_map(
						'intval',
						array_filter(
							array_map( 'trim', explode( ',', $csv_ids ) )
						)
					);

					$attachment_ids = array_merge( $attachment_ids, $gallery_ids );
				}
			}

			if ( preg_match_all( '/wp-content\/uploads\/[^"\'>\s]+/', $content, $matches ) ) {
				foreach ( $matches[0] as $relative_url ) {
					$attachment_id = attachment_url_to_postid( $relative_url );

					if ( $attachment_id > 0 ) {
						$attachment_ids[] = (int) $attachment_id;
					}
				}
			}
		}

		$attachment_ids = array_values(
			array_unique(
				array_filter(
					array_map( 'intval', $attachment_ids )
				)
			)
		);

		set_transient( self::CONTENT_ATTACHMENTS_CACHE_KEY, $attachment_ids, MINUTE_IN_SECONDS * 10 );

		return $attachment_ids;
	}
}