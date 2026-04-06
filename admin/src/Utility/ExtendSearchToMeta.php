<?php

namespace MeuMouse\Flexify_Dashboard\Utility;

defined('ABSPATH') || exit;

/**
 * Class ExtendSearchToMeta
 *
 * Extend WordPress search queries to include post meta values.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Utility
 * @author MeuMouse.com
 */
class ExtendSearchToMeta {

	/**
	 * Search term used in the query filter.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $search_term = '';

	/**
	 * Constructor.
	 *
	 * Register the search filter to include post meta values.
	 *
	 * @since 2.0.0
	 * @param array  $args Query arguments.
	 * @param string $search_term Search term.
	 * @return void
	 */
	public function __construct( $args, $search_term ) {
		$this->search_term = is_string( $search_term ) ? sanitize_text_field( $search_term ) : '';

		if ( '' === $this->search_term ) {
			return;
		}

		add_filter( 'posts_search', array( $this, 'extend_search_to_meta' ), 10, 2 );
	}


	/**
	 * Extend the posts search SQL to include post meta values.
	 *
	 * @since 2.0.0
	 * @param string   $search   Current search SQL.
	 * @param \WP_Query $wp_query WordPress query object.
	 * @return string
	 */
	public function extend_search_to_meta( $search, $wp_query ) {
		global $wpdb;

		if ( empty( $search ) || empty( $wp_query->query_vars['s'] ) ) {
			return $search;
		}

		$search_term = $wpdb->esc_like( $this->search_term );
		$like        = '%' . $search_term . '%';

		$search = $wpdb->prepare(
			" AND (
				{$wpdb->posts}.post_title LIKE %s
				OR {$wpdb->posts}.post_content LIKE %s
				OR {$wpdb->posts}.post_excerpt LIKE %s
				OR EXISTS (
					SELECT 1
					FROM {$wpdb->postmeta}
					WHERE {$wpdb->postmeta}.post_id = {$wpdb->posts}.ID
					AND {$wpdb->postmeta}.meta_value LIKE %s
				)
			)",
			$like,
			$like,
			$like,
			$like
		);

		return $search;
	}
}