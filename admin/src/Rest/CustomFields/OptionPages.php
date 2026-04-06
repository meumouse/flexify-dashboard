<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

use MeuMouse\Flexify_Dashboard\Rest\RestPermissionChecker;

defined('ABSPATH') || exit;

/**
 * Class OptionPages
 *
 * REST API endpoints for managing option pages stored in JSON.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class OptionPages {

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
	private $base = 'options-pages';

	/**
	 * Option pages repository instance.
	 *
	 * @since 2.0.0
	 * @var OptionPagesRepository
	 */
	private $repository;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 */
	public function __construct() {
		$this->repository = new OptionPagesRepository();

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
			'callback' => array( $this, 'get_option_pages' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/meta', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_meta_data' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/(?P<slug>[a-zA-Z0-9_-]+)', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_option_page' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base, array(
			'methods' => 'POST',
			'callback' => array( $this, 'create_option_page' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/(?P<slug>[a-zA-Z0-9_-]+)', array(
			'methods' => 'PUT,PATCH',
			'callback' => array( $this, 'update_option_page' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/(?P<slug>[a-zA-Z0-9_-]+)', array(
			'methods' => 'DELETE',
			'callback' => array( $this, 'delete_option_page' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( $this->namespace, '/' . $this->base . '/(?P<slug>[a-zA-Z0-9_-]+)/duplicate', array(
			'methods' => 'POST',
			'callback' => array( $this, 'duplicate_option_page' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );
	}


	/**
	 * Check if the user has permission to access the endpoint.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return bool|\WP_Error
	 */
	public function permissions_check( $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get all option pages.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_option_pages( $request ) {
		$option_pages = $this->repository->read();

		if ( ! is_array( $option_pages ) ) {
			$option_pages = array();
		}

		return new \WP_REST_Response( $option_pages, 200 );
	}


	/**
	 * Get option pages meta data.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_meta_data( $request ) {
		return new \WP_REST_Response( array(
			'parent_menus' => OptionPagesRepository::get_parent_menus(),
			'capabilities' => OptionPagesRepository::get_capabilities(),
		), 200 );
	}


	/**
	 * Get a single option page.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_option_page( $request ) {
		$slug = sanitize_key( $request->get_param( 'slug' ) );

		if ( ! $this->is_valid_slug( $slug ) ) {
			return $this->rest_error( 'rest_invalid_slug', __( 'Invalid option page slug.', 'flexify-dashboard' ), 400 );
		}

		$page = $this->repository->find_by_slug( $slug );

		if ( null === $page ) {
			return $this->rest_error( 'rest_not_found', __( 'Option page not found.', 'flexify-dashboard' ), 404 );
		}

		return new \WP_REST_Response( $page, 200 );
	}


	/**
	 * Create a new option page.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_option_page( $request ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		if ( empty( $body['title'] ) ) {
			return $this->rest_error( 'rest_missing_title', __( 'Option page title is required.', 'flexify-dashboard' ), 400 );
		}

		$option_pages = $this->repository->read();

		if ( ! is_array( $option_pages ) ) {
			$option_pages = array();
		}

		$new_page = $this->sanitize_option_page_data( $body );

		if ( empty( $new_page['slug'] ) ) {
			$new_page['slug'] = $this->repository->generate_slug( $new_page['title'], $option_pages );
		} elseif ( $this->repository->slug_exists( $new_page['slug'], $option_pages ) ) {
			return $this->rest_error( 'rest_slug_exists', __( 'An option page with this slug already exists.', 'flexify-dashboard' ), 400 );
		}

		$new_page['created_at'] = current_time( 'mysql' );
		$new_page['updated_at'] = current_time( 'mysql' );

		$option_pages[] = $new_page;

		if ( ! $this->repository->write( $option_pages ) ) {
			return $this->rest_error( 'rest_save_failed', __( 'Failed to save option page.', 'flexify-dashboard' ), 500 );
		}

		return new \WP_REST_Response( array(
			'message' => __( 'Option page created successfully.', 'flexify-dashboard' ),
			'data' => $new_page,
		), 201 );
	}


	/**
	 * Update an existing option page.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_option_page( $request ) {
		$slug = sanitize_key( $request->get_param( 'slug' ) );
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		if ( ! $this->is_valid_slug( $slug ) ) {
			return $this->rest_error( 'rest_invalid_slug', __( 'Invalid option page slug.', 'flexify-dashboard' ), 400 );
		}

		$option_pages = $this->repository->read();

		if ( ! is_array( $option_pages ) ) {
			$option_pages = array();
		}

		$found_index = $this->repository->find_index_by_slug( $slug );

		if ( -1 === $found_index || ! isset( $option_pages[ $found_index ] ) ) {
			return $this->rest_error( 'rest_not_found', __( 'Option page not found.', 'flexify-dashboard' ), 404 );
		}

		$body['slug']       = $slug;
		$body['created_at'] = isset( $option_pages[ $found_index ]['created_at'] ) ? $option_pages[ $found_index ]['created_at'] : '';

		$updated_page               = $this->sanitize_option_page_data( $body );
		$updated_page['slug']       = $slug;
		$updated_page['updated_at'] = current_time( 'mysql' );

		$option_pages[ $found_index ] = $updated_page;

		if ( ! $this->repository->write( $option_pages ) ) {
			return $this->rest_error( 'rest_save_failed', __( 'Failed to save option page.', 'flexify-dashboard' ), 500 );
		}

		return new \WP_REST_Response( array(
			'message' => __( 'Option page updated successfully.', 'flexify-dashboard' ),
			'data' => $updated_page,
		), 200 );
	}


	/**
	 * Delete an option page.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_option_page( $request ) {
		$slug = sanitize_key( $request->get_param( 'slug' ) );

		if ( ! $this->is_valid_slug( $slug ) ) {
			return $this->rest_error( 'rest_invalid_slug', __( 'Invalid option page slug.', 'flexify-dashboard' ), 400 );
		}

		$option_pages = $this->repository->read();

		if ( ! is_array( $option_pages ) ) {
			$option_pages = array();
		}

		$found = false;

		$option_pages = array_filter( $option_pages, function( $page ) use ( $slug, &$found ) {
			if ( isset( $page['slug'] ) && $page['slug'] === $slug ) {
				$found = true;
				return false;
			}

			return true;
		} );

		if ( ! $found ) {
			return $this->rest_error( 'rest_not_found', __( 'Option page not found.', 'flexify-dashboard' ), 404 );
		}

		$option_pages = array_values( $option_pages );

		if ( ! $this->repository->write( $option_pages ) ) {
			return $this->rest_error( 'rest_save_failed', __( 'Failed to delete option page.', 'flexify-dashboard' ), 500 );
		}

		return new \WP_REST_Response( array(
			'message' => __( 'Option page deleted successfully.', 'flexify-dashboard' ),
		), 200 );
	}


	/**
	 * Duplicate an option page.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function duplicate_option_page( $request ) {
		$slug = sanitize_key( $request->get_param( 'slug' ) );

		if ( ! $this->is_valid_slug( $slug ) ) {
			return $this->rest_error( 'rest_invalid_slug', __( 'Invalid option page slug.', 'flexify-dashboard' ), 400 );
		}

		$option_pages = $this->repository->read();

		if ( ! is_array( $option_pages ) ) {
			$option_pages = array();
		}

		$original = $this->repository->find_by_slug( $slug );

		if ( empty( $original ) || ! is_array( $original ) ) {
			return $this->rest_error( 'rest_not_found', __( 'Option page not found.', 'flexify-dashboard' ), 404 );
		}

		$duplicate               = $original;
		$duplicate['title']      = $original['title'] . ' ' . __( '(Copy)', 'flexify-dashboard' );
		$duplicate['slug']       = $this->repository->generate_slug( $duplicate['title'], $option_pages );
		$duplicate['created_at'] = current_time( 'mysql' );
		$duplicate['updated_at'] = current_time( 'mysql' );

		$option_pages[] = $duplicate;

		if ( ! $this->repository->write( $option_pages ) ) {
			return $this->rest_error( 'rest_save_failed', __( 'Failed to duplicate option page.', 'flexify-dashboard' ), 500 );
		}

		return new \WP_REST_Response( array(
			'message' => __( 'Option page duplicated successfully.', 'flexify-dashboard' ),
			'data' => $duplicate,
		), 201 );
	}


	/**
	 * Validate slug format.
	 *
	 * @since 2.0.0
	 * @param string $slug Slug to validate.
	 * @return bool
	 */
	private function is_valid_slug( $slug ) {
		if ( ! is_string( $slug ) || '' === $slug ) {
			return false;
		}

		return preg_match( '/^[a-zA-Z0-9_-]+$/', $slug ) === 1;
	}


	/**
	 * Sanitize option page data.
	 *
	 * @since 2.0.0
	 * @param array $data Raw option page data.
	 * @return array
	 */
	private function sanitize_option_page_data( $data ) {
		$defaults = OptionPagesRepository::get_defaults();

		$allowed_menu_types = array( 'top_level', 'submenu' );

		return array(
			'slug' => isset( $data['slug'] ) ? sanitize_key( $data['slug'] ) : $defaults['slug'],
			'title' => isset( $data['title'] ) ? sanitize_text_field( $data['title'] ) : $defaults['title'],
			'description' => isset( $data['description'] ) ? sanitize_textarea_field( $data['description'] ) : $defaults['description'],
			'menu_type' => isset( $data['menu_type'] ) && in_array( $data['menu_type'], $allowed_menu_types, true ) ? $data['menu_type'] : $defaults['menu_type'],
			'parent_menu' => isset( $data['parent_menu'] ) ? sanitize_text_field( $data['parent_menu'] ) : $defaults['parent_menu'],
			'menu_icon' => isset( $data['menu_icon'] ) ? sanitize_text_field( $data['menu_icon'] ) : $defaults['menu_icon'],
			'menu_position' => isset( $data['menu_position'] ) ? absint( $data['menu_position'] ) : $defaults['menu_position'],
			'capability' => isset( $data['capability'] ) ? sanitize_text_field( $data['capability'] ) : $defaults['capability'],
			'active' => isset( $data['active'] ) ? (bool) $data['active'] : $defaults['active'],
			'created_at' => isset( $data['created_at'] ) ? sanitize_text_field( $data['created_at'] ) : $defaults['created_at'],
			'updated_at' => isset( $data['updated_at'] ) ? sanitize_text_field( $data['updated_at'] ) : $defaults['updated_at'],
		);
	}


	/**
	 * Build a standardized REST error.
	 *
	 * @since 2.0.0
	 * @param string $code Error code.
	 * @param string $message Error message.
	 * @param int    $status HTTP status code.
	 * @return \WP_Error
	 */
	private function rest_error( $code, $message, $status ) {
		return new \WP_Error( $code, $message, array( 'status' => absint( $status ) ) );
	}
}