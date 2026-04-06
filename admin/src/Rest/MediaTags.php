<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_Post;
use WP_REST_Request;
use WP_REST_Response;
use WP_Term;

defined('ABSPATH') || exit;

/**
 * Class MediaTags
 *
 * Registers a taxonomy for media attachments and provides REST API endpoints
 * for managing media tags.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class MediaTags {

	/**
	 * Taxonomy slug for media tags.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const TAXONOMY_SLUG = 'media_tag';

	/**
	 * Namespace for REST API endpoints.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_taxonomy' ), 0 );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );

		add_filter( 'rest_prepare_attachment', array( __CLASS__, 'add_tags_to_rest_response' ), 10, 3 );
		add_filter( 'rest_attachment_collection_params', array( __CLASS__, 'register_tag_ids_param' ) );
		add_filter( 'rest_attachment_query', array( __CLASS__, 'filter_media_query_by_tags' ), 10, 2 );
	}


	/**
	 * Register tag_ids parameter for media collection.
	 *
	 * @since 2.0.0
	 * @param array $query_params Existing collection parameters.
	 * @return array
	 */
	public static function register_tag_ids_param( $query_params ) {
		$query_params['tag_ids'] = array(
			'description'       => __( 'Filter media items by tag IDs.', 'flexify-dashboard' ),
			'type'              => 'array',
			'items'             => array(
				'type' => 'integer',
			),
			'default'           => array(),
			'sanitize_callback' => function( $param ) {
				return self::normalize_tag_ids( $param );
			},
		);

		return $query_params;
	}


	/**
	 * Filter media query by tags when tag_ids parameter is present.
	 *
	 * @since 2.0.0
	 * @param array           $args    Query arguments.
	 * @param WP_REST_Request $request REST request object.
	 * @return array
	 */
	public static function filter_media_query_by_tags( $args, $request ) {
		$tag_ids = self::normalize_tag_ids( $request->get_param( 'tag_ids' ) );

		if ( empty( $tag_ids ) ) {
			return $args;
		}

		$tag_query = array(
			'taxonomy' => self::TAXONOMY_SLUG,
			'field'    => 'term_id',
			'terms'    => $tag_ids,
			'operator' => 'IN',
		);

		if ( isset( $args['tax_query'] ) && is_array( $args['tax_query'] ) ) {
			$args['tax_query']['relation'] = 'AND';
			$args['tax_query'][] = $tag_query;

			return $args;
		}

		$args['tax_query'] = array(
			$tag_query,
		);

		return $args;
	}


	/**
	 * Register the media tag taxonomy for attachments.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_taxonomy() {
		$labels = array(
			'name'                       => __( 'Media Tags', 'flexify-dashboard' ),
			'singular_name'              => __( 'Media Tag', 'flexify-dashboard' ),
			'menu_name'                  => __( 'Tags', 'flexify-dashboard' ),
			'all_items'                  => __( 'All Tags', 'flexify-dashboard' ),
			'edit_item'                  => __( 'Edit Tag', 'flexify-dashboard' ),
			'view_item'                  => __( 'View Tag', 'flexify-dashboard' ),
			'update_item'                => __( 'Update Tag', 'flexify-dashboard' ),
			'add_new_item'               => __( 'Add New Tag', 'flexify-dashboard' ),
			'new_item_name'              => __( 'New Tag Name', 'flexify-dashboard' ),
			'search_items'               => __( 'Search Tags', 'flexify-dashboard' ),
			'popular_items'              => __( 'Popular Tags', 'flexify-dashboard' ),
			'separate_items_with_commas' => __( 'Separate tags with commas', 'flexify-dashboard' ),
			'add_or_remove_items'        => __( 'Add or remove tags', 'flexify-dashboard' ),
			'choose_from_most_used'      => __( 'Choose from the most used tags', 'flexify-dashboard' ),
			'not_found'                  => __( 'No tags found', 'flexify-dashboard' ),
		);

		$args = array(
			'labels'                => $labels,
			'public'                => false,
			'publicly_queryable'    => false,
			'show_ui'               => false,
			'show_in_menu'          => false,
			'show_in_nav_menus'     => false,
			'show_in_rest'          => true,
			'rest_base'             => self::TAXONOMY_SLUG,
			'hierarchical'          => false,
			'show_admin_column'     => false,
			'update_count_callback' => '_update_generic_term_count',
			'query_var'             => false,
			'rewrite'               => false,
			'capabilities'          => array(
				'manage_terms' => 'upload_files',
				'edit_terms'   => 'upload_files',
				'delete_terms' => 'upload_files',
				'assign_terms' => 'upload_files',
			),
		);

		register_taxonomy( self::TAXONOMY_SLUG, 'attachment', $args );
	}


	/**
	 * Register REST API routes for media tags.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_rest_routes() {
		register_rest_route( self::REST_NAMESPACE, '/media/tags', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_all_tags' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'create_tag' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args'                => array(
					'name' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => function( $param ) {
							return ! empty( trim( (string) $param ) );
						},
					),
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/media/(?P<id>\d+)/tags', array(
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'update_media_tags' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'validate_callback' => function( $param ) {
							return is_numeric( $param ) && (int) $param > 0;
						},
					),
					'tag_ids' => array(
						'required'          => false,
						'type'              => 'array',
						'items'             => array(
							'type' => 'integer',
						),
						'default'           => array(),
						'sanitize_callback' => function( $param ) {
							return self::normalize_tag_ids( $param );
						},
					),
					'tag_names' => array(
						'required'          => false,
						'type'              => 'array',
						'items'             => array(
							'type' => 'string',
						),
						'default'           => array(),
						'sanitize_callback' => function( $param ) {
							return self::normalize_tag_names( $param );
						},
					),
				),
			),
		) );
	}


	/**
	 * Add tags to REST API response for attachments.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Response $response Response object.
	 * @param WP_Post          $post     Attachment post object.
	 * @param WP_REST_Request  $request  REST request object.
	 * @return WP_REST_Response
	 */
	public static function add_tags_to_rest_response( $response, $post, $request ) {
		unset( $request );

		if ( ! $post instanceof WP_Post || 'attachment' !== $post->post_type ) {
			return $response;
		}

		$tags = wp_get_object_terms( $post->ID, self::TAXONOMY_SLUG, array(
			'fields' => 'all',
		) );

		if ( is_wp_error( $tags ) ) {
			$response->data['media_tags'] = array();

			return $response;
		}

		$response->data['media_tags'] = self::format_terms( $tags );

		return $response;
	}


	/**
	 * Get all media tags.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_all_tags( $request ) {
		unset( $request );

		$tags = get_terms( array(
			'taxonomy'   => self::TAXONOMY_SLUG,
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
		) );

		if ( is_wp_error( $tags ) ) {
			return $tags;
		}

		$tags_data = array();

		foreach ( $tags as $tag ) {
			$tags_data[] = array(
				'id'    => $tag->term_id,
				'name'  => $tag->name,
				'slug'  => $tag->slug,
				'count' => (int) $tag->count,
			);
		}

		return new WP_REST_Response( $tags_data, 200 );
	}


	/**
	 * Create a new tag.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_tag( $request ) {
		$name = sanitize_text_field( (string) $request->get_param( 'name' ) );

		if ( empty( $name ) ) {
			return new WP_Error(
				'invalid_param',
				__( 'Tag name is required', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$existing = get_term_by( 'name', $name, self::TAXONOMY_SLUG );

		if ( $existing instanceof WP_Term ) {
			return new WP_REST_Response( array(
				'id'   => $existing->term_id,
				'name' => $existing->name,
				'slug' => $existing->slug,
			), 200 );
		}

		$result = wp_insert_term( $name, self::TAXONOMY_SLUG );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$tag = get_term( $result['term_id'], self::TAXONOMY_SLUG );

		if ( ! $tag instanceof WP_Term ) {
			return new WP_Error(
				'term_creation_failed',
				__( 'Unable to create tag', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response( array(
			'id'   => $tag->term_id,
			'name' => $tag->name,
			'slug' => $tag->slug,
		), 201 );
	}


	/**
	 * Update tags for a media item.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_media_tags( $request ) {
		$media_id   = absint( $request->get_param( 'id' ) );
		$tag_ids    = self::normalize_tag_ids( $request->get_param( 'tag_ids' ) );
		$tag_names  = self::normalize_tag_names( $request->get_param( 'tag_names' ) );
		$attachment = get_post( $media_id );

		if ( ! $attachment instanceof WP_Post || 'attachment' !== $attachment->post_type ) {
			return new WP_Error(
				'invalid_attachment',
				__( 'Invalid media item', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		foreach ( $tag_names as $tag_name ) {
			$term_id = self::get_or_create_tag_id( $tag_name );

			if ( $term_id > 0 ) {
				$tag_ids[] = $term_id;
			}
		}

		$tag_ids = array_values( array_unique( array_map( 'intval', $tag_ids ) ) );

		$result = wp_set_object_terms( $media_id, $tag_ids, self::TAXONOMY_SLUG );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$tags = wp_get_object_terms( $media_id, self::TAXONOMY_SLUG, array(
			'fields' => 'all',
		) );

		if ( is_wp_error( $tags ) ) {
			return $tags;
		}

		return new WP_REST_Response( array(
			'success' => true,
			'tags'    => self::format_terms( $tags ),
		), 200 );
	}


	/**
	 * Check if user has permission to manage media tags.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public static function check_permissions( $request ) {
		return RestPermissionChecker::check_permissions( $request, 'upload_files' );
	}


	/**
	 * Normalize tag IDs.
	 *
	 * @since 2.0.0
	 * @param mixed $tag_ids Raw tag IDs.
	 * @return array
	 */
	private static function normalize_tag_ids( $tag_ids ) {
		if ( empty( $tag_ids ) ) {
			return array();
		}

		if ( ! is_array( $tag_ids ) ) {
			$tag_ids = array( $tag_ids );
		}

		$tag_ids = array_map( 'intval', $tag_ids );
		$tag_ids = array_filter( $tag_ids, function( $tag_id ) {
			return $tag_id > 0;
		} );

		return array_values( array_unique( $tag_ids ) );
	}


	/**
	 * Normalize tag names.
	 *
	 * @since 2.0.0
	 * @param mixed $tag_names Raw tag names.
	 * @return array
	 */
	private static function normalize_tag_names( $tag_names ) {
		if ( empty( $tag_names ) ) {
			return array();
		}

		if ( ! is_array( $tag_names ) ) {
			$tag_names = array( $tag_names );
		}

		$tag_names = array_map( 'sanitize_text_field', $tag_names );
		$tag_names = array_map( 'trim', $tag_names );
		$tag_names = array_filter( $tag_names );

		return array_values( array_unique( $tag_names ) );
	}


	/**
	 * Get or create a tag and return its ID.
	 *
	 * @since 2.0.0
	 * @param string $tag_name Tag name.
	 * @return int
	 */
	private static function get_or_create_tag_id( $tag_name ) {
		$existing = get_term_by( 'name', $tag_name, self::TAXONOMY_SLUG );

		if ( $existing instanceof WP_Term ) {
			return (int) $existing->term_id;
		}

		$result = wp_insert_term( $tag_name, self::TAXONOMY_SLUG );

		if ( is_wp_error( $result ) || empty( $result['term_id'] ) ) {
			return 0;
		}

		return (int) $result['term_id'];
	}


	/**
	 * Format term objects for API responses.
	 *
	 * @since 2.0.0
	 * @param array $terms Term objects.
	 * @return array
	 */
	private static function format_terms( $terms ) {
		$formatted_terms = array();

		foreach ( $terms as $term ) {
			if ( ! $term instanceof WP_Term ) {
				continue;
			}

			$formatted_terms[] = array(
				'id'   => $term->term_id,
				'name' => $term->name,
				'slug' => $term->slug,
			);
		}

		return $formatted_terms;
	}
}