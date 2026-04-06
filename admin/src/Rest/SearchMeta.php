<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Options\Settings;

use WP_Query;
use WP_REST_Request;
use WP_User_Query;

defined('ABSPATH') || exit;

/**
 * Class SearchMeta
 *
 * Extends WordPress REST API search functionality to include meta fields
 * for posts, pages, and users.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class SearchMeta {

	/**
	 * Query var used to store the post meta search term.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const POST_META_SEARCH_QUERY_VAR = 'flexify_meta_search_term';

	/**
	 * Query var used to store the user meta search term.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const USER_META_SEARCH_QUERY_VAR = 'flexify_user_meta_search_term';


	/**
	 * Constructor.
	 *
	 * Registers REST query filters and low level SQL filters used to
	 * extend searches to metadata.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		$this->register_post_type_filters();

		add_filter( 'rest_user_query', array( $this, 'rest_user_query' ), 10, 2 );
		add_filter( 'posts_where', array( $this, 'extend_posts_search_where' ), 10, 2 );
		add_filter( 'users_pre_query', array( $this, 'extend_users_search_where' ), 10, 2 );
	}


	/**
	 * Register REST filters for configured post types.
	 *
	 * Falls back to post and page when no custom configuration is available.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function register_post_type_filters() {
		$search_post_types = Settings::get_setting( 'search_post_types', array() );
		$registered_slugs   = array();

		if ( is_array( $search_post_types ) && ! empty( $search_post_types ) ) {
			foreach ( $search_post_types as $post_type ) {
				$slug = isset( $post_type['slug'] ) ? sanitize_key( $post_type['slug'] ) : '';

				if ( empty( $slug ) || ! post_type_exists( $slug ) ) {
					continue;
				}

				$registered_slugs[] = $slug;

				add_filter( "rest_{$slug}_query", array( $this, 'rest_post_query' ), 10, 2 );
			}
		}

		if ( empty( $registered_slugs ) ) {
			add_filter( 'rest_post_query', array( $this, 'rest_post_query' ), 10, 2 );
			add_filter( 'rest_page_query', array( $this, 'rest_post_query' ), 10, 2 );
		}
	}


	/**
	 * Modify the REST API query for posts and pages to include meta search.
	 *
	 * @since 2.0.0
	 * @param array           $args    The query arguments.
	 * @param WP_REST_Request $request The REST API request.
	 * @return array
	 */
	public function rest_post_query( $args, $request ) {
		$search_term = isset( $request['search'] ) ? sanitize_text_field( $request['search'] ) : '';

		if ( empty( $search_term ) ) {
			return $args;
		}

		$post_types = $this->normalize_post_types( $args );

		if ( empty( $post_types ) ) {
			return $args;
		}

		$args[ self::POST_META_SEARCH_QUERY_VAR ] = $search_term;
		$args['post_type']                        = $post_types;
		$args['suppress_filters']                 = false;
		$args['groupby']                          = 'ID';

		return $args;
	}


	/**
	 * Extend the post query WHERE clause to include post meta values.
	 *
	 * @since 2.0.0
	 * @param string   $where The existing WHERE clause.
	 * @param WP_Query $query The query instance.
	 * @return string
	 */
	public function extend_posts_search_where( $where, $query ) {
		global $wpdb;

		if ( ! $query instanceof WP_Query ) {
			return $where;
		}

		$search_term = $query->get( self::POST_META_SEARCH_QUERY_VAR );
		$post_types  = $query->get( 'post_type' );

		if ( empty( $search_term ) || empty( $post_types ) ) {
			return $where;
		}

		$post_types = is_array( $post_types ) ? $post_types : array( $post_types );
		$post_types = array_filter(
			array_map(
				'sanitize_key',
				$post_types
			),
			'post_type_exists'
		);

		if ( empty( $post_types ) ) {
			return $where;
		}

		$placeholders = implode( ',', array_fill( 0, count( $post_types ), '%s' ) );
		$search_wild  = '%' . $wpdb->esc_like( $search_term ) . '%';

		$sql = "
			OR (
				{$wpdb->posts}.post_type IN ({$placeholders})
				AND {$wpdb->posts}.ID IN (
					SELECT post_id
					FROM {$wpdb->postmeta}
					WHERE meta_value LIKE %s
				)
			)
		";

		$where .= $wpdb->prepare(
			$sql,
			array_merge( $post_types, array( $search_wild ) )
		);

		return $where;
	}


	/**
	 * Modify the REST API user query to include user meta search.
	 *
	 * @since 2.0.0
	 * @param array           $args    The query arguments.
	 * @param WP_REST_Request $request The REST API request.
	 * @return array
	 */
	public function rest_user_query( $args, $request ) {
		$search_term = isset( $request['search'] ) ? sanitize_text_field( $request['search'] ) : '';

		if ( empty( $search_term ) ) {
			return $args;
		}

		$args[ self::USER_META_SEARCH_QUERY_VAR ] = $search_term;

		return $args;
	}


	/**
	 * Extend the user query WHERE clause to include user meta values.
	 *
	 * @since 2.0.0
	 * @param array|null    $results The results to return instead of executing the query.
	 * @param WP_User_Query $query   The user query instance.
	 * @return array|null
	 */
	public function extend_users_search_where( $results, $query ) {
		global $wpdb;

		if ( ! $query instanceof WP_User_Query ) {
			return $results;
		}

		$search_term = isset( $query->query_vars[ self::USER_META_SEARCH_QUERY_VAR ] )
			? sanitize_text_field( $query->query_vars[ self::USER_META_SEARCH_QUERY_VAR ] )
			: '';

		if ( empty( $search_term ) ) {
			return $results;
		}

		$search_wild = '%' . $wpdb->esc_like( $search_term ) . '%';

		$query->query_where .= $wpdb->prepare(
			" OR {$wpdb->users}.ID IN (
				SELECT user_id
				FROM {$wpdb->usermeta}
				WHERE meta_value LIKE %s
			)",
			$search_wild
		);

		return $results;
	}


	/**
	 * Normalize and validate post types from REST query args.
	 *
	 * @since 2.0.0
	 * @param array $args The query arguments.
	 * @return array
	 */
	private function normalize_post_types( $args ) {
		$post_types = isset( $args['post_type'] ) ? $args['post_type'] : array( 'post' );
		$post_types = is_array( $post_types ) ? $post_types : array( $post_types );

		$post_types = array_filter(
			array_map(
				'sanitize_key',
				$post_types
			),
			'post_type_exists'
		);

		return array_values( array_unique( $post_types ) );
	}
}