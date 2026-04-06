<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class CustomPostTypes
 *
 * REST API endpoints for managing custom post types stored in JSON.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class CustomPostTypes {
	/**
	 * REST API namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $namespace = 'flexify-dashboard/v1';

	/**
	 * REST API base route.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $base = 'custom-post-types';

	/**
	 * JSON storage file path.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $json_file_path;

	/**
	 * Reserved WordPress post type slugs.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $reserved_post_types = array(
		'post',
		'page',
		'attachment',
		'revision',
		'nav_menu_item',
		'custom_css',
		'customize_changeset',
		'oembed_cache',
		'user_request',
		'wp_block',
		'wp_template',
		'wp_template_part',
		'wp_global_styles',
		'wp_navigation',
		'action',
		'author',
		'order',
		'theme',
	);

	/**
	 * Allowed supports values for custom post types.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $valid_supports = array(
		'title',
		'editor',
		'author',
		'thumbnail',
		'excerpt',
		'trackbacks',
		'custom-fields',
		'comments',
		'revisions',
		'page-attributes',
		'post-formats',
	);

	/**
	 * Hidden icon names that must not be exposed in the selector.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $excluded_icons = array(
		'logo',
		'uipress',
		'flexify-dashboard',
		'flexify-dashboard-logo',
		'flexify-dashboard-logo-text',
		'flexify-dashboard-logo-text copy',
		'vendbase',
		'woobase',
		'pb-logo-fill',
		'pb-logo-lines',
	);

	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		$this->json_file_path = WP_CONTENT_DIR . '/flexify-dashboard-custom-post-types.json';

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
			'callback' => array( $this, 'get_post_types' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/export', array(
			'methods' => 'GET',
			'callback' => array( $this, 'export_post_types' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/import', array(
			'methods' => 'POST',
			'callback' => array( $this, 'import_post_types' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '-icons', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_icons' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '-taxonomies', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_taxonomies' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/(?P<slug>[a-zA-Z0-9_-]+)', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_post_type' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base, array(
			'methods' => 'POST',
			'callback' => array( $this, 'create_post_type' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/(?P<slug>[a-zA-Z0-9_-]+)', array(
			'methods' => 'PUT,PATCH',
			'callback' => array( $this, 'update_post_type' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/(?P<slug>[a-zA-Z0-9_-]+)', array(
			'methods' => 'DELETE',
			'callback' => array( $this, 'delete_post_type' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );
	}


	/**
	 * Check if the current user has permission to access the endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error
	 */
	public function permissions_check( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get all custom post types.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_post_types( WP_REST_Request $request ) {
		$post_types = $this->read_json_file();

		foreach ( $post_types as $index => $cpt ) {
			$post_types[ $index ] = $this->append_post_counts( $cpt );
		}

		return new WP_REST_Response( $post_types, 200 );
	}


	/**
	 * Get a single custom post type.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_post_type( WP_REST_Request $request ) {
		$slug = sanitize_key( $request->get_param( 'slug' ) );

		if ( ! $this->is_valid_slug( $slug ) ) {
			return new WP_Error(
				'rest_invalid_slug',
				__( 'Invalid post type slug.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$post_types = $this->read_json_file();

		foreach ( $post_types as $cpt ) {
			if ( isset( $cpt['slug'] ) && $cpt['slug'] === $slug ) {
				return new WP_REST_Response( $this->append_post_counts( $cpt ), 200 );
			}
		}

		return new WP_Error(
			'rest_not_found',
			__( 'Custom post type not found.', 'flexify-dashboard' ),
			array( 'status' => 404 )
		);
	}


	/**
	 * Create a new custom post type.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_post_type( WP_REST_Request $request ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		$slug = isset( $body['slug'] ) ? sanitize_key( $body['slug'] ) : '';
		$name = isset( $body['name'] ) ? sanitize_text_field( $body['name'] ) : '';

		if ( empty( $slug ) ) {
			return new WP_Error(
				'rest_missing_slug',
				__( 'Post type slug is required.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( empty( $name ) ) {
			return new WP_Error(
				'rest_missing_name',
				__( 'Post type name is required.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! $this->is_valid_slug( $slug ) ) {
			return new WP_Error(
				'rest_invalid_slug',
				__( 'Invalid post type slug. Use only lowercase letters, numbers, and underscores. Maximum 20 characters.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( $this->is_reserved_post_type( $slug ) ) {
			return new WP_Error(
				'rest_reserved_slug',
				__( 'This post type slug is reserved by WordPress.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$post_types = $this->read_json_file();

		foreach ( $post_types as $existing ) {
			if ( isset( $existing['slug'] ) && $existing['slug'] === $slug ) {
				return new WP_Error(
					'rest_slug_exists',
					__( 'A custom post type with this slug already exists.', 'flexify-dashboard' ),
					array( 'status' => 409 )
				);
			}
		}

		$new_cpt = $this->sanitize_cpt_data( $body );
		$new_cpt['created_at'] = current_time( 'mysql' );
		$new_cpt['updated_at'] = current_time( 'mysql' );

		$post_types[] = $new_cpt;

		if ( ! $this->write_json_file( $post_types ) ) {
			return new WP_Error(
				'rest_save_failed',
				__( 'Failed to save custom post type.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		flush_rewrite_rules();

		return new WP_REST_Response( array(
			'message' => __( 'Custom post type created successfully.', 'flexify-dashboard' ),
			'data' => $new_cpt,
		), 201 );
	}


	/**
	 * Update an existing custom post type.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_post_type( WP_REST_Request $request ) {
		$slug = sanitize_key( $request->get_param( 'slug' ) );
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		if ( ! $this->is_valid_slug( $slug ) ) {
			return new WP_Error(
				'rest_invalid_slug',
				__( 'Invalid post type slug.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$post_types = $this->read_json_file();
		$found_index = $this->find_post_type_index( $post_types, $slug );

		if ( -1 === $found_index ) {
			return new WP_Error(
				'rest_not_found',
				__( 'Custom post type not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$body['slug'] = $slug;
		$body['created_at'] = isset( $post_types[ $found_index ]['created_at'] ) ? $post_types[ $found_index ]['created_at'] : current_time( 'mysql' );

		$updated_cpt = $this->sanitize_cpt_data( $body );
		$updated_cpt['updated_at'] = current_time( 'mysql' );

		$post_types[ $found_index ] = $updated_cpt;

		if ( ! $this->write_json_file( $post_types ) ) {
			return new WP_Error(
				'rest_save_failed',
				__( 'Failed to save custom post type.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		flush_rewrite_rules();

		return new WP_REST_Response( array(
			'message' => __( 'Custom post type updated successfully.', 'flexify-dashboard' ),
			'data' => $updated_cpt,
		), 200 );
	}


	/**
	 * Delete a custom post type.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_post_type( WP_REST_Request $request ) {
		$slug = sanitize_key( $request->get_param( 'slug' ) );

		if ( ! $this->is_valid_slug( $slug ) ) {
			return new WP_Error(
				'rest_invalid_slug',
				__( 'Invalid post type slug.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$post_types = $this->read_json_file();
		$found_index = $this->find_post_type_index( $post_types, $slug );

		if ( -1 === $found_index ) {
			return new WP_Error(
				'rest_not_found',
				__( 'Custom post type not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		unset( $post_types[ $found_index ] );

		$post_types = array_values( $post_types );

		if ( ! $this->write_json_file( $post_types ) ) {
			return new WP_Error(
				'rest_save_failed',
				__( 'Failed to delete custom post type.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		flush_rewrite_rules();

		return new WP_REST_Response( array(
			'message' => __( 'Custom post type deleted successfully.', 'flexify-dashboard' ),
		), 200 );
	}


	/**
	 * Get available icons from the assets/icons directory.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_icons( WP_REST_Request $request ) {
		$icons_dir = trailingslashit( FLEXIFY_DASHBOARD_PLUGIN_PATH ) . 'assets/icons/';
		$icons = array();

		if ( is_dir( $icons_dir ) ) {
			$files = scandir( $icons_dir );

			if ( is_array( $files ) ) {
				foreach ( $files as $file ) {
					if ( 'svg' !== pathinfo( $file, PATHINFO_EXTENSION ) ) {
						continue;
					}

					$icon_name = pathinfo( $file, PATHINFO_FILENAME );

					if ( in_array( $icon_name, self::$excluded_icons, true ) ) {
						continue;
					}

					$icons[] = $icon_name;
				}
			}

			sort( $icons, SORT_NATURAL | SORT_FLAG_CASE );
		}

		return new WP_REST_Response( $icons, 200 );
	}


	/**
	 * Get existing taxonomies.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_taxonomies( WP_REST_Request $request ) {
		$taxonomies = get_taxonomies( array( 'public' => true ), 'objects' );
		$result = array();

		foreach ( $taxonomies as $taxonomy ) {
			$result[] = array(
				'name' => $taxonomy->name,
				'label' => $taxonomy->label,
				'hierarchical' => (bool) $taxonomy->hierarchical,
			);
		}

		return new WP_REST_Response( $result, 200 );
	}


	/**
	 * Export all custom post types as JSON.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function export_post_types( WP_REST_Request $request ) {
		$post_types = $this->read_json_file();
		$export_data = array();

		foreach ( $post_types as $cpt ) {
			unset( $cpt['post_count'] );
			unset( $cpt['total_count'] );

			$export_data[] = $cpt;
		}

		return new WP_REST_Response( array(
			'data' => $export_data,
			'exported_at' => current_time( 'mysql' ),
			'version' => '1.0',
		), 200 );
	}


	/**
	 * Import custom post types from JSON.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function import_post_types( WP_REST_Request $request ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		if ( empty( $body['data'] ) || ! is_array( $body['data'] ) ) {
			return new WP_Error(
				'rest_invalid_data',
				__( 'Invalid import data. Expected an array of post types.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$import_data = $body['data'];
		$mode = isset( $body['mode'] ) ? sanitize_text_field( $body['mode'] ) : 'merge';
		$strict = isset( $body['strict'] ) ? (bool) $body['strict'] : false;

		if ( ! in_array( $mode, array( 'merge', 'replace' ), true ) ) {
			return new WP_Error(
				'rest_invalid_mode',
				__( 'Invalid import mode. Use "merge" or "replace".', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$existing_post_types = $this->read_json_file();
		$errors = array();
		$imported = 0;
		$skipped = 0;
		$updated = 0;

		foreach ( $import_data as $index => $cpt ) {
			if ( ! is_array( $cpt ) ) {
				$errors[] = sprintf( __( 'Post type at index %d is missing required fields (slug or name).', 'flexify-dashboard' ), $index );
				$skipped++;
				continue;
			}

			$name = isset( $cpt['name'] ) ? sanitize_text_field( $cpt['name'] ) : '';
			$slug = isset( $cpt['slug'] ) ? sanitize_key( $cpt['slug'] ) : '';

			if ( empty( $slug ) || empty( $name ) ) {
				$errors[] = sprintf( __( 'Post type at index %d is missing required fields (slug or name).', 'flexify-dashboard' ), $index );
				$skipped++;
				continue;
			}

			if ( ! $this->is_valid_slug( $slug ) ) {
				$errors[] = sprintf( __( 'Post type "%s" has an invalid slug format.', 'flexify-dashboard' ), $name );
				$skipped++;
				continue;
			}

			if ( $this->is_reserved_post_type( $slug ) ) {
				$errors[] = sprintf( __( 'Post type "%s" uses a reserved slug: %s', 'flexify-dashboard' ), $name, $slug );
				$skipped++;
				continue;
			}

			$sanitized_cpt = $this->sanitize_cpt_data( $cpt );

			if ( 'replace' === $mode || empty( $sanitized_cpt['created_at'] ) ) {
				$sanitized_cpt['created_at'] = current_time( 'mysql' );
			}

			$sanitized_cpt['updated_at'] = current_time( 'mysql' );

			$existing_index = $this->find_post_type_index( $existing_post_types, $slug );

			if ( $existing_index >= 0 ) {
				if ( isset( $existing_post_types[ $existing_index ]['created_at'] ) ) {
					$sanitized_cpt['created_at'] = $existing_post_types[ $existing_index ]['created_at'];
				}

				$existing_post_types[ $existing_index ] = $sanitized_cpt;
				$updated++;
			} else {
				$existing_post_types[] = $sanitized_cpt;
				$imported++;
			}
		}

		if ( ! empty( $errors ) && $strict ) {
			return new WP_Error(
				'rest_validation_errors',
				__( 'Import validation failed.', 'flexify-dashboard' ),
				array(
					'status' => 400,
					'errors' => $errors,
				)
			);
		}

		if ( ! $this->write_json_file( $existing_post_types ) ) {
			return new WP_Error(
				'rest_save_failed',
				__( 'Failed to save imported post types.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		flush_rewrite_rules();

		return new WP_REST_Response( array(
			'message' => __( 'Import completed successfully.', 'flexify-dashboard' ),
			'imported' => $imported,
			'updated' => $updated,
			'skipped' => $skipped,
			'errors' => $errors,
		), 200 );
	}


	/**
	 * Register custom post types from the JSON file.
	 *
	 * This method should be called on the init hook.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_custom_post_types() {
		$json_file_path = WP_CONTENT_DIR . '/flexify-dashboard-custom-post-types.json';

		if ( ! file_exists( $json_file_path ) ) {
			return;
		}

		$json_content = file_get_contents( $json_file_path );

		if ( false === $json_content ) {
			return;
		}

		$post_types = json_decode( $json_content, true );

		if ( ! is_array( $post_types ) ) {
			return;
		}

		foreach ( $post_types as $cpt ) {
			if ( empty( $cpt['slug'] ) || empty( $cpt['active'] ) ) {
				continue;
			}

			register_post_type( $cpt['slug'], self::build_post_type_args( $cpt ) );
		}
	}


	/**
	 * Read custom post types from the JSON file.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function read_json_file() {
		if ( ! file_exists( $this->json_file_path ) ) {
			return array();
		}

		$json_content = file_get_contents( $this->json_file_path );

		if ( false === $json_content ) {
			return array();
		}

		$data = json_decode( $json_content, true );

		return is_array( $data ) ? array_values( $data ) : array();
	}


	/**
	 * Write custom post types to the JSON file.
	 *
	 * @since 2.0.0
	 * @param array $post_types Custom post types.
	 * @return bool
	 */
	private function write_json_file( array $post_types ) {
		$dir = dirname( $this->json_file_path );

		if ( ! file_exists( $dir ) ) {
			wp_mkdir_p( $dir );
		}

		$json_content = wp_json_encode( $post_types, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE );

		if ( false === $json_content ) {
			return false;
		}

		$result = file_put_contents( $this->json_file_path, $json_content );

		if ( false !== $result && function_exists( 'wp_cache_flush' ) ) {
			wp_cache_flush();
		}

		return false !== $result;
	}


	/**
	 * Append post counts to a custom post type entry.
	 *
	 * @since 2.0.0
	 * @param array $cpt Custom post type data.
	 * @return array
	 */
	private function append_post_counts( array $cpt ) {
		$slug = isset( $cpt['slug'] ) ? sanitize_key( $cpt['slug'] ) : '';

		$cpt['post_count'] = 0;
		$cpt['total_count'] = 0;

		if ( empty( $slug ) ) {
			return $cpt;
		}

		$count = wp_count_posts( $slug );

		if ( ! $count ) {
			return $cpt;
		}

		$cpt['post_count'] = isset( $count->publish ) ? (int) $count->publish : 0;

		foreach ( (array) $count as $total ) {
			$cpt['total_count'] += (int) $total;
		}

		return $cpt;
	}


	/**
	 * Find a custom post type index by slug.
	 *
	 * @since 2.0.0
	 * @param array  $post_types Custom post types list.
	 * @param string $slug Post type slug.
	 * @return int
	 */
	private function find_post_type_index( array $post_types, $slug ) {
		foreach ( $post_types as $index => $post_type ) {
			if ( isset( $post_type['slug'] ) && $post_type['slug'] === $slug ) {
				return $index;
			}
		}

		return -1;
	}


	/**
	 * Validate post type slug format.
	 *
	 * @since 2.0.0
	 * @param string $slug Post type slug.
	 * @return bool
	 */
	private function is_valid_slug( $slug ) {
		if ( empty( $slug ) || ! is_string( $slug ) ) {
			return false;
		}

		return 1 === preg_match( '/^[a-z0-9_]{1,20}$/', $slug );
	}


	/**
	 * Check if the slug is reserved by WordPress.
	 *
	 * @since 2.0.0
	 * @param string $slug Post type slug.
	 * @return bool
	 */
	private function is_reserved_post_type( $slug ) {
		return in_array( $slug, self::$reserved_post_types, true );
	}


	/**
	 * Generate default labels based on plural and singular names.
	 *
	 * @since 2.0.0
	 * @param string $name Plural name.
	 * @param string $singular_name Singular name.
	 * @return array
	 */
	private function generate_default_labels( $name, $singular_name ) {
		$name_lower = strtolower( $name );
		$singular_lower = strtolower( $singular_name );

		return array(
			'name' => $name,
			'singular_name' => $singular_name,
			'add_new' => __( 'Add New', 'flexify-dashboard' ),
			'add_new_item' => sprintf( __( 'Add New %s', 'flexify-dashboard' ), $singular_name ),
			'edit_item' => sprintf( __( 'Edit %s', 'flexify-dashboard' ), $singular_name ),
			'new_item' => sprintf( __( 'New %s', 'flexify-dashboard' ), $singular_name ),
			'view_item' => sprintf( __( 'View %s', 'flexify-dashboard' ), $singular_name ),
			'view_items' => sprintf( __( 'View %s', 'flexify-dashboard' ), $name ),
			'search_items' => sprintf( __( 'Search %s', 'flexify-dashboard' ), $name ),
			'not_found' => sprintf( __( 'No %s found', 'flexify-dashboard' ), $name_lower ),
			'not_found_in_trash' => sprintf( __( 'No %s found in Trash', 'flexify-dashboard' ), $name_lower ),
			'parent_item_colon' => sprintf( __( 'Parent %s:', 'flexify-dashboard' ), $singular_name ),
			'all_items' => sprintf( __( 'All %s', 'flexify-dashboard' ), $name ),
			'archives' => sprintf( __( '%s Archives', 'flexify-dashboard' ), $singular_name ),
			'attributes' => sprintf( __( '%s Attributes', 'flexify-dashboard' ), $singular_name ),
			'insert_into_item' => sprintf( __( 'Insert into %s', 'flexify-dashboard' ), $singular_lower ),
			'uploaded_to_this_item' => sprintf( __( 'Uploaded to this %s', 'flexify-dashboard' ), $singular_lower ),
			'featured_image' => __( 'Featured image', 'flexify-dashboard' ),
			'set_featured_image' => __( 'Set featured image', 'flexify-dashboard' ),
			'remove_featured_image' => __( 'Remove featured image', 'flexify-dashboard' ),
			'use_featured_image' => __( 'Use as featured image', 'flexify-dashboard' ),
			'menu_name' => $name,
			'filter_items_list' => sprintf( __( 'Filter %s list', 'flexify-dashboard' ), $name_lower ),
			'items_list_navigation' => sprintf( __( '%s list navigation', 'flexify-dashboard' ), $name ),
			'items_list' => sprintf( __( '%s list', 'flexify-dashboard' ), $name ),
			'item_published' => sprintf( __( '%s published.', 'flexify-dashboard' ), $singular_name ),
			'item_published_privately' => sprintf( __( '%s published privately.', 'flexify-dashboard' ), $singular_name ),
			'item_reverted_to_draft' => sprintf( __( '%s reverted to draft.', 'flexify-dashboard' ), $singular_name ),
			'item_scheduled' => sprintf( __( '%s scheduled.', 'flexify-dashboard' ), $singular_name ),
			'item_updated' => sprintf( __( '%s updated.', 'flexify-dashboard' ), $singular_name ),
		);
	}


	/**
	 * Sanitize custom post type data.
	 *
	 * @since 2.0.0
	 * @param array $data Raw custom post type data.
	 * @return array
	 */
	private function sanitize_cpt_data( array $data ) {
		$name = isset( $data['name'] ) ? sanitize_text_field( $data['name'] ) : '';
		$singular_name = isset( $data['singular_name'] ) ? sanitize_text_field( $data['singular_name'] ) : $name;
		$labels = isset( $data['labels'] ) && is_array( $data['labels'] ) ? $data['labels'] : array();
		$rewrite = isset( $data['rewrite'] ) && is_array( $data['rewrite'] ) ? $data['rewrite'] : array();
		$default_labels = $this->generate_default_labels( $name, $singular_name );

		return array(
			'slug' => isset( $data['slug'] ) ? sanitize_key( $data['slug'] ) : '',
			'name' => $name,
			'singular_name' => $singular_name,
			'description' => isset( $data['description'] ) ? sanitize_textarea_field( $data['description'] ) : '',
			'menu_icon' => isset( $data['menu_icon'] ) ? sanitize_text_field( $data['menu_icon'] ) : 'article',
			'active' => isset( $data['active'] ) ? (bool) $data['active'] : true,
			'labels' => $this->sanitize_labels( $labels, $default_labels ),
			'public' => isset( $data['public'] ) ? (bool) $data['public'] : true,
			'publicly_queryable' => isset( $data['publicly_queryable'] ) ? (bool) $data['publicly_queryable'] : true,
			'show_ui' => isset( $data['show_ui'] ) ? (bool) $data['show_ui'] : true,
			'show_in_menu' => isset( $data['show_in_menu'] ) ? (bool) $data['show_in_menu'] : true,
			'show_in_nav_menus' => isset( $data['show_in_nav_menus'] ) ? (bool) $data['show_in_nav_menus'] : true,
			'show_in_admin_bar' => isset( $data['show_in_admin_bar'] ) ? (bool) $data['show_in_admin_bar'] : true,
			'show_in_rest' => isset( $data['show_in_rest'] ) ? (bool) $data['show_in_rest'] : true,
			'rest_base' => isset( $data['rest_base'] ) ? sanitize_key( $data['rest_base'] ) : ( isset( $data['slug'] ) ? sanitize_key( $data['slug'] ) : '' ),
			'rest_namespace' => isset( $data['rest_namespace'] ) ? sanitize_text_field( $data['rest_namespace'] ) : 'wp/v2',
			'rest_controller_class' => isset( $data['rest_controller_class'] ) ? sanitize_text_field( $data['rest_controller_class'] ) : 'WP_REST_Posts_Controller',
			'menu_position' => isset( $data['menu_position'] ) && is_numeric( $data['menu_position'] ) ? absint( $data['menu_position'] ) : 25,
			'capability_type' => isset( $data['capability_type'] ) ? sanitize_key( $data['capability_type'] ) : 'post',
			'map_meta_cap' => isset( $data['map_meta_cap'] ) ? (bool) $data['map_meta_cap'] : true,
			'hierarchical' => isset( $data['hierarchical'] ) ? (bool) $data['hierarchical'] : false,
			'supports' => $this->sanitize_supports( isset( $data['supports'] ) ? $data['supports'] : array( 'title', 'editor', 'thumbnail' ) ),
			'taxonomies' => $this->sanitize_taxonomies( isset( $data['taxonomies'] ) ? $data['taxonomies'] : array() ),
			'has_archive' => isset( $data['has_archive'] ) ? (bool) $data['has_archive'] : true,
			'can_export' => isset( $data['can_export'] ) ? (bool) $data['can_export'] : true,
			'delete_with_user' => isset( $data['delete_with_user'] ) ? (bool) $data['delete_with_user'] : false,
			'exclude_from_search' => isset( $data['exclude_from_search'] ) ? (bool) $data['exclude_from_search'] : false,
			'query_var' => isset( $data['query_var'] ) ? (bool) $data['query_var'] : true,
			'rewrite' => array(
				'slug' => isset( $rewrite['slug'] ) ? sanitize_title( $rewrite['slug'] ) : ( isset( $data['slug'] ) ? sanitize_title( $data['slug'] ) : '' ),
				'with_front' => isset( $rewrite['with_front'] ) ? (bool) $rewrite['with_front'] : true,
				'feeds' => isset( $rewrite['feeds'] ) ? (bool) $rewrite['feeds'] : true,
				'pages' => isset( $rewrite['pages'] ) ? (bool) $rewrite['pages'] : true,
			),
			'created_at' => isset( $data['created_at'] ) ? sanitize_text_field( $data['created_at'] ) : current_time( 'mysql' ),
			'updated_at' => isset( $data['updated_at'] ) ? sanitize_text_field( $data['updated_at'] ) : current_time( 'mysql' ),
		);
	}


	/**
	 * Sanitize labels array.
	 *
	 * @since 2.0.0
	 * @param array $labels Raw labels.
	 * @param array $default_labels Default labels.
	 * @return array
	 */
	private function sanitize_labels( array $labels, array $default_labels ) {
		$sanitized = array();

		foreach ( $default_labels as $key => $default_value ) {
			$value = isset( $labels[ $key ] ) ? sanitize_text_field( $labels[ $key ] ) : '';
			$sanitized[ $key ] = ! empty( $value ) ? $value : $default_value;
		}

		return $sanitized;
	}


	/**
	 * Sanitize supports array.
	 *
	 * @since 2.0.0
	 * @param mixed $supports Supports array.
	 * @return array
	 */
	private function sanitize_supports( $supports ) {
		if ( ! is_array( $supports ) ) {
			return array( 'title', 'editor' );
		}

		$sanitized = array_map( 'sanitize_key', $supports );
		$sanitized = array_intersect( $sanitized, self::$valid_supports );

		return array_values( array_unique( $sanitized ) );
	}


	/**
	 * Sanitize taxonomies array.
	 *
	 * @since 2.0.0
	 * @param mixed $taxonomies Taxonomies array.
	 * @return array
	 */
	private function sanitize_taxonomies( $taxonomies ) {
		if ( ! is_array( $taxonomies ) ) {
			return array();
		}

		$taxonomies = array_map( 'sanitize_key', $taxonomies );

		return array_values( array_unique( $taxonomies ) );
	}


	/**
	 * Build menu icon URL from icon name.
	 *
	 * Converts an SVG icon name to a data URI for the WordPress admin menu.
	 *
	 * @since 2.0.0
	 * @param string $icon_name Icon name.
	 * @return string
	 */
	private static function get_menu_icon_url( $icon_name ) {
		if ( 0 === strpos( $icon_name, 'dashicons-' ) || 0 === strpos( $icon_name, 'http' ) || 0 === strpos( $icon_name, 'data:' ) ) {
			return $icon_name;
		}

		$svg_path = trailingslashit( FLEXIFY_DASHBOARD_PLUGIN_PATH ) . 'assets/icons/' . $icon_name . '.svg';

		if ( file_exists( $svg_path ) ) {
			$svg_content = file_get_contents( $svg_path );

			if ( false !== $svg_content ) {
				return 'data:image/svg+xml;base64,' . base64_encode( $svg_content );
			}
		}

		return 'dashicons-admin-post';
	}


	/**
	 * Build register_post_type arguments from saved configuration.
	 *
	 * @since 2.0.0
	 * @param array $cpt Custom post type configuration.
	 * @return array
	 */
	private static function build_post_type_args( array $cpt ) {
		$slug = isset( $cpt['slug'] ) ? sanitize_key( $cpt['slug'] ) : '';

		return array(
			'label' => isset( $cpt['name'] ) ? $cpt['name'] : '',
			'description' => isset( $cpt['description'] ) ? $cpt['description'] : '',
			'labels' => isset( $cpt['labels'] ) && is_array( $cpt['labels'] ) ? $cpt['labels'] : array(),
			'public' => isset( $cpt['public'] ) ? (bool) $cpt['public'] : true,
			'publicly_queryable' => isset( $cpt['publicly_queryable'] ) ? (bool) $cpt['publicly_queryable'] : true,
			'show_ui' => isset( $cpt['show_ui'] ) ? (bool) $cpt['show_ui'] : true,
			'show_in_menu' => isset( $cpt['show_in_menu'] ) ? (bool) $cpt['show_in_menu'] : true,
			'show_in_nav_menus' => isset( $cpt['show_in_nav_menus'] ) ? (bool) $cpt['show_in_nav_menus'] : true,
			'show_in_admin_bar' => isset( $cpt['show_in_admin_bar'] ) ? (bool) $cpt['show_in_admin_bar'] : true,
			'show_in_rest' => isset( $cpt['show_in_rest'] ) ? (bool) $cpt['show_in_rest'] : true,
			'rest_base' => isset( $cpt['rest_base'] ) ? $cpt['rest_base'] : $slug,
			'rest_namespace' => isset( $cpt['rest_namespace'] ) ? $cpt['rest_namespace'] : 'wp/v2',
			'rest_controller_class' => isset( $cpt['rest_controller_class'] ) ? $cpt['rest_controller_class'] : 'WP_REST_Posts_Controller',
			'menu_position' => isset( $cpt['menu_position'] ) ? absint( $cpt['menu_position'] ) : 25,
			'menu_icon' => self::get_menu_icon_url( isset( $cpt['menu_icon'] ) ? $cpt['menu_icon'] : 'article' ),
			'capability_type' => isset( $cpt['capability_type'] ) ? $cpt['capability_type'] : 'post',
			'map_meta_cap' => isset( $cpt['map_meta_cap'] ) ? (bool) $cpt['map_meta_cap'] : true,
			'hierarchical' => isset( $cpt['hierarchical'] ) ? (bool) $cpt['hierarchical'] : false,
			'supports' => isset( $cpt['supports'] ) && is_array( $cpt['supports'] ) ? $cpt['supports'] : array( 'title', 'editor', 'thumbnail' ),
			'taxonomies' => isset( $cpt['taxonomies'] ) && is_array( $cpt['taxonomies'] ) ? $cpt['taxonomies'] : array(),
			'has_archive' => isset( $cpt['has_archive'] ) ? (bool) $cpt['has_archive'] : true,
			'rewrite' => isset( $cpt['rewrite'] ) && is_array( $cpt['rewrite'] ) ? $cpt['rewrite'] : array( 'slug' => $slug ),
			'can_export' => isset( $cpt['can_export'] ) ? (bool) $cpt['can_export'] : true,
			'delete_with_user' => isset( $cpt['delete_with_user'] ) ? (bool) $cpt['delete_with_user'] : false,
			'exclude_from_search' => isset( $cpt['exclude_from_search'] ) ? (bool) $cpt['exclude_from_search'] : false,
			'query_var' => isset( $cpt['query_var'] ) ? (bool) $cpt['query_var'] : true,
		);
	}
}