<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

use MeuMouse\Flexify_Dashboard\Rest\RestPermissionChecker;

use WP_Post;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use WP_Term;

defined('ABSPATH') || exit;

/**
 * Class RelationshipSearch
 *
 * REST API endpoints for searching posts and taxonomy terms
 * for the relationship field type.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class RelationshipSearch {

	/**
	 * The namespace for the REST API endpoint.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $namespace = 'flexify-dashboard/v1';

	/**
	 * The base for the REST API endpoint.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $base = 'relationship-search';


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register the REST API routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route( $this->namespace, '/' . $this->base . '/posts', array(
			'methods' => 'GET',
			'callback' => array( $this, 'search_posts' ),
			'permission_callback' => array( $this, 'permissions_check' ),
			'args' => $this->get_posts_route_args(),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/terms', array(
			'methods' => 'GET',
			'callback' => array( $this, 'search_terms' ),
			'permission_callback' => array( $this, 'permissions_check' ),
			'args' => $this->get_terms_route_args(),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/posts/by-ids', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_posts_by_ids' ),
			'permission_callback' => array( $this, 'permissions_check' ),
			'args' => array(
				'ids' => array(
					'type' => 'array',
					'items' => array(
						'type' => 'integer',
					),
					'required' => true,
				),
			),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/terms/by-ids', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_terms_by_ids' ),
			'permission_callback' => array( $this, 'permissions_check' ),
			'args' => array(
				'ids' => array(
					'type' => 'array',
					'items' => array(
						'type' => 'integer',
					),
					'required' => true,
				),
			),
		) );
	}


	/**
	 * Check if the user has permission to access the endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return bool|\WP_Error
	 */
	public function permissions_check( $request ) {
		return RestPermissionChecker::check_permissions( $request, 'edit_posts' );
	}


	/**
	 * Search posts.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function search_posts( $request ) {
		$search     = sanitize_text_field( $request->get_param( 'search' ) );
		$post_types = $this->sanitize_post_types( $request->get_param( 'post_type' ) );
		$statuses   = $this->sanitize_key_array( $request->get_param( 'status' ) );
		$exclude    = $this->sanitize_absint_array( $request->get_param( 'exclude' ) );
		$include    = $this->sanitize_absint_array( $request->get_param( 'include' ) );
		$per_page   = absint( $request->get_param( 'per_page' ) );
		$page       = absint( $request->get_param( 'page' ) );

		if ( empty( $post_types ) ) {
			$post_types = array( 'post', 'page' );
		}

		if ( empty( $statuses ) ) {
			$statuses = array( 'publish' );
		}

		$args = array(
			'post_type'        => $post_types,
			'post_status'      => $statuses,
			'posts_per_page'   => $per_page ? $per_page : 20,
			'paged'            => $page ? $page : 1,
			'orderby'          => 'title',
			'order'            => 'ASC',
			'suppress_filters' => false,
			'no_found_rows'    => false,
		);

		if ( '' !== $search ) {
			$args['s'] = $search;
		}

		if ( ! empty( $exclude ) ) {
			$args['post__not_in'] = $exclude;
		}

		if ( ! empty( $include ) ) {
			$args['post__in'] = $include;
		}

		$query   = new WP_Query( $args );
		$results = array();

		foreach ( $query->posts as $post ) {
			if ( $post instanceof WP_Post ) {
				$results[] = $this->format_post( $post );
			}
		}

		return new WP_REST_Response( array(
			'results' => $results,
			'total'   => absint( $query->found_posts ),
			'pages'   => absint( $query->max_num_pages ),
		), 200 );
	}


	/**
	 * Search taxonomy terms.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function search_terms( $request ) {
		$search     = sanitize_text_field( $request->get_param( 'search' ) );
		$taxonomies = $this->sanitize_taxonomies( $request->get_param( 'taxonomy' ) );
		$exclude    = $this->sanitize_absint_array( $request->get_param( 'exclude' ) );
		$include    = $this->sanitize_absint_array( $request->get_param( 'include' ) );
		$per_page   = absint( $request->get_param( 'per_page' ) );
		$page       = absint( $request->get_param( 'page' ) );

		if ( empty( $taxonomies ) ) {
			$taxonomies = array( 'category', 'post_tag' );
		}

		if ( $per_page < 1 ) {
			$per_page = 20;
		}

		if ( $page < 1 ) {
			$page = 1;
		}

		$args = array(
			'taxonomy'   => $taxonomies,
			'hide_empty' => false,
			'number'     => $per_page,
			'offset'     => ( $page - 1 ) * $per_page,
			'orderby'    => 'name',
			'order'      => 'ASC',
		);

		if ( '' !== $search ) {
			$args['search'] = $search;
		}

		if ( ! empty( $exclude ) ) {
			$args['exclude'] = $exclude;
		}

		if ( ! empty( $include ) ) {
			$args['include'] = $include;
		}

		$terms = get_terms( $args );

		if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
			return new WP_REST_Response( array(
				'results' => array(),
				'total'   => 0,
				'pages'   => 0,
			), 200 );
		}

		$count_args = $args;
		unset( $count_args['number'], $count_args['offset'] );
		$count_args['count'] = true;

		$total = get_terms( $count_args );
		$total = is_wp_error( $total ) ? 0 : absint( $total );

		$results = array();

		foreach ( $terms as $term ) {
			if ( $term instanceof WP_Term ) {
				$results[] = $this->format_term( $term );
			}
		}

		return new WP_REST_Response( array(
			'results' => $results,
			'total'   => $total,
			'pages'   => $per_page > 0 ? (int) ceil( $total / $per_page ) : 1,
		), 200 );
	}


	/**
	 * Get posts by IDs.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_posts_by_ids( $request ) {
		$ids = $this->sanitize_absint_array( $request->get_param( 'ids' ) );

		if ( empty( $ids ) ) {
			return new WP_REST_Response( array( 'results' => array() ), 200 );
		}

		$query = new WP_Query( array(
			'post_type'        => 'any',
			'post_status'      => 'any',
			'post__in'         => $ids,
			'posts_per_page'   => count( $ids ),
			'orderby'          => 'post__in',
			'suppress_filters' => false,
			'no_found_rows'    => true,
		) );

		$results = array();

		foreach ( $query->posts as $post ) {
			if ( $post instanceof WP_Post ) {
				$results[] = $this->format_post( $post );
			}
		}

		return new WP_REST_Response( array( 'results' => $results ), 200 );
	}


	/**
	 * Get terms by IDs.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_terms_by_ids( $request ) {
		$ids = $this->sanitize_absint_array( $request->get_param( 'ids' ) );

		if ( empty( $ids ) ) {
			return new WP_REST_Response( array( 'results' => array() ), 200 );
		}

		$terms = get_terms( array(
			'include'    => $ids,
			'hide_empty' => false,
			'orderby'    => 'include',
		) );

		if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
			return new WP_REST_Response( array( 'results' => array() ), 200 );
		}

		$results = array();

		foreach ( $terms as $term ) {
			if ( $term instanceof WP_Term ) {
				$results[] = $this->format_term( $term );
			}
		}

		return new WP_REST_Response( array( 'results' => $results ), 200 );
	}


	/**
	 * Get route args for post search.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_posts_route_args() {
		return array(
			'search' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			),
			'post_type' => array(
				'type'    => 'array',
				'items'   => array(
					'type' => 'string',
				),
				'default' => array( 'post', 'page' ),
			),
			'status' => array(
				'type'    => 'array',
				'items'   => array(
					'type' => 'string',
				),
				'default' => array( 'publish' ),
			),
			'exclude' => array(
				'type'    => 'array',
				'items'   => array(
					'type' => 'integer',
				),
				'default' => array(),
			),
			'include' => array(
				'type'    => 'array',
				'items'   => array(
					'type' => 'integer',
				),
				'default' => array(),
			),
			'per_page' => array(
				'type'    => 'integer',
				'default' => 20,
				'minimum' => 1,
				'maximum' => 100,
			),
			'page' => array(
				'type'    => 'integer',
				'default' => 1,
				'minimum' => 1,
			),
		);
	}


	/**
	 * Get route args for term search.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_terms_route_args() {
		return array(
			'search' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			),
			'taxonomy' => array(
				'type'    => 'array',
				'items'   => array(
					'type' => 'string',
				),
				'default' => array( 'category', 'post_tag' ),
			),
			'exclude' => array(
				'type'    => 'array',
				'items'   => array(
					'type' => 'integer',
				),
				'default' => array(),
			),
			'include' => array(
				'type'    => 'array',
				'items'   => array(
					'type' => 'integer',
				),
				'default' => array(),
			),
			'per_page' => array(
				'type'    => 'integer',
				'default' => 20,
				'minimum' => 1,
				'maximum' => 100,
			),
			'page' => array(
				'type'    => 'integer',
				'default' => 1,
				'minimum' => 1,
			),
		);
	}


	/**
	 * Sanitize an array of keys.
	 *
	 * @since 2.0.0
	 * @param mixed $values Values to sanitize.
	 * @return array
	 */
	private function sanitize_key_array( $values ) {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map( 'sanitize_key', $values )
			)
		);
	}


	/**
	 * Sanitize an array of integers.
	 *
	 * @since 2.0.0
	 * @param mixed $values Values to sanitize.
	 * @return array
	 */
	private function sanitize_absint_array( $values ) {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map( 'absint', $values )
			)
		);
	}


	/**
	 * Sanitize post types and keep only public allowed values.
	 *
	 * @since 2.0.0
	 * @param mixed $post_types Post types.
	 * @return array
	 */
	private function sanitize_post_types( $post_types ) {
		$post_types         = $this->sanitize_key_array( $post_types );
		$allowed_post_types = get_post_types( array( 'public' => true ), 'names' );

		return array_values( array_intersect( $post_types, $allowed_post_types ) );
	}


	/**
	 * Sanitize taxonomies and keep only public allowed values.
	 *
	 * @since 2.0.0
	 * @param mixed $taxonomies Taxonomies.
	 * @return array
	 */
	private function sanitize_taxonomies( $taxonomies ) {
		$taxonomies         = $this->sanitize_key_array( $taxonomies );
		$allowed_taxonomies = get_taxonomies( array( 'public' => true ), 'names' );

		return array_values( array_intersect( $taxonomies, $allowed_taxonomies ) );
	}


	/**
	 * Format a post object for the response.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function format_post( $post ) {
		$post_type_object   = get_post_type_object( $post->post_type );
		$post_status_object = get_post_status_object( $post->post_status );
		$thumbnail          = null;

		if ( has_post_thumbnail( $post->ID ) ) {
			$thumbnail = get_the_post_thumbnail_url( $post->ID, 'thumbnail' );
		}

		return array(
			'id'           => absint( $post->ID ),
			'title'        => ! empty( $post->post_title ) ? $post->post_title : __( '(no title)', 'flexify-dashboard' ),
			'type'         => $post->post_type,
			'type_label'   => $post_type_object && isset( $post_type_object->labels->singular_name ) ? $post_type_object->labels->singular_name : $post->post_type,
			'status'       => $post->post_status,
			'status_label' => $post_status_object && isset( $post_status_object->label ) ? $post_status_object->label : $post->post_status,
			'thumbnail'    => $thumbnail ? esc_url_raw( $thumbnail ) : null,
			'edit_link'    => get_edit_post_link( $post->ID, 'raw' ),
			'permalink'    => get_permalink( $post->ID ),
		);
	}


	/**
	 * Format a term object for the response.
	 *
	 * @since 2.0.0
	 * @param WP_Term $term Term object.
	 * @return array
	 */
	private function format_term( $term ) {
		$taxonomy_object = get_taxonomy( $term->taxonomy );

		return array(
			'id'         => absint( $term->term_id ),
			'title'      => $term->name,
			'type'       => $term->taxonomy,
			'type_label' => $taxonomy_object && isset( $taxonomy_object->labels->singular_name ) ? $taxonomy_object->labels->singular_name : $term->taxonomy,
			'slug'       => $term->slug,
			'count'      => absint( $term->count ),
			'parent'     => absint( $term->parent ),
			'edit_link'  => get_edit_term_link( $term->term_id, $term->taxonomy ),
		);
	}
}