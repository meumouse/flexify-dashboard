<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

use MeuMouse\Flexify_Dashboard\Rest\RestPermissionChecker;

use WP_Error;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use WP_User_Query;

defined('ABSPATH') || exit;

/**
 * Class CustomFields
 *
 * REST API endpoints for managing custom field groups stored in JSON.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class CustomFields {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * REST base route.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_BASE = 'custom-fields';

	/**
	 * Custom fields JSON filename.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const JSON_FILENAME = 'flexify-dashboard-custom-fields.json';

	/**
	 * Allowed functions for preview endpoint.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $allowed_preview_functions = array(
		'flexify_dashboard_get_field',
		'flexify_dashboard_get_post_field',
		'flexify_dashboard_get_term_field',
		'flexify_dashboard_get_user_field',
		'flexify_dashboard_get_option_field',
		'flexify_dashboard_get_image_field',
		'flexify_dashboard_get_file_field',
		'flexify_dashboard_get_link_field',
		'flexify_dashboard_get_repeater_field',
		'flexify_dashboard_get_relationship_field',
		'flexify_dashboard_get_google_map_field',
		'flexify_dashboard_get_date_field',
	);

	/**
	 * Repository instance.
	 *
	 * @since 2.0.0
	 * @var FieldGroupRepository
	 */
	private $repository;


	/**
	 * Sanitizer instance.
	 *
	 * @since 2.0.0
	 * @var FieldGroupSanitizer
	 */
	private $sanitizer;


	/**
	 * Location data provider instance.
	 *
	 * @since 2.0.0
	 * @var LocationDataProvider
	 */
	private $location_data_provider;


	/**
	 * Meta box manager instance.
	 *
	 * @since 2.0.0
	 * @var MetaBoxManager
	 */
	private $meta_box_manager;


	/**
	 * Field saver instance.
	 *
	 * @since 2.0.0
	 * @var FieldSaver
	 */
	private $field_saver;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		$this->repository             = new FieldGroupRepository( $this->get_json_file_path() );
		$this->sanitizer              = new FieldGroupSanitizer( $this->repository );
		$this->location_data_provider = new LocationDataProvider();

		$evaluator              = new LocationRuleEvaluator();
		$this->meta_box_manager = new MetaBoxManager( $this->repository, $evaluator );
		$this->field_saver      = new FieldSaver( $this->repository, $evaluator );

		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register REST routes.
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
				'callback'            => array( $this, 'get_field_groups' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/export',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'export_field_groups' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/import',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'import_field_groups' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '-post-types',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_post_types' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '-templates',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_templates' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '-location-data',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_location_data' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/preview-value',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'preview_field_value' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/search-posts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'search_posts' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/search-terms',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'search_terms' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/search-users',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'search_users' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/(?P<id>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_field_group' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE,
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_field_group' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/(?P<id>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => 'PUT,PATCH',
				'callback'            => array( $this, 'update_field_group' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/(?P<id>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_field_group' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE . '/(?P<id>[a-zA-Z0-9_-]+)/duplicate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'duplicate_field_group' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);
	}


	/**
	 * Check endpoint permissions.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error
	 */
	public function permissions_check( $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get all field groups.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_field_groups( $request ) {
		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			$field_groups = array();
		}

		foreach ( $field_groups as &$group ) {
			$group['field_count'] = isset( $group['fields'] ) && is_array( $group['fields'] ) ? count( $group['fields'] ) : 0;
		}

		unset( $group );

		return new WP_REST_Response( $field_groups, 200 );
	}


	/**
	 * Get a single field group.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_field_group( $request ) {
		$id = sanitize_text_field( $request->get_param( 'id' ) );

		if ( ! $this->sanitizer->is_valid_id( $id ) ) {
			return $this->get_error_response( 'rest_invalid_id', __( 'Invalid field group ID.', 'flexify-dashboard' ), 400 );
		}

		$group = $this->repository->find_by_id( $id );

		if ( null === $group ) {
			return $this->get_error_response( 'rest_not_found', __( 'Field group not found.', 'flexify-dashboard' ), 404 );
		}

		return new WP_REST_Response( $group, 200 );
	}


	/**
	 * Create a new field group.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_field_group( $request ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		if ( empty( $body['title'] ) ) {
			return $this->get_error_response( 'rest_missing_title', __( 'Field group title is required.', 'flexify-dashboard' ), 400 );
		}

		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			$field_groups = array();
		}

		$new_group               = $this->sanitizer->sanitize_field_group_data( $body );
		$new_group['id']         = $this->generate_unique_group_id( $field_groups );
		$new_group['created_at'] = current_time( 'mysql' );
		$new_group['updated_at'] = current_time( 'mysql' );

		$field_groups[] = $new_group;

		if ( ! $this->repository->write( $field_groups ) ) {
			return $this->get_error_response( 'rest_save_failed', __( 'Failed to save field group.', 'flexify-dashboard' ), 500 );
		}

		return new WP_REST_Response(
			array(
				'message' => __( 'Field group created successfully.', 'flexify-dashboard' ),
				'data'    => $new_group,
			),
			201
		);
	}


	/**
	 * Update an existing field group.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_field_group( $request ) {
		$id   = sanitize_text_field( $request->get_param( 'id' ) );
		$body = $request->get_json_params();

		if ( ! $this->sanitizer->is_valid_id( $id ) ) {
			return $this->get_error_response( 'rest_invalid_id', __( 'Invalid field group ID.', 'flexify-dashboard' ), 400 );
		}

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			$field_groups = array();
		}

		$found_index = $this->repository->find_index_by_id( $id );

		if ( -1 === $found_index || ! isset( $field_groups[ $found_index ] ) ) {
			return $this->get_error_response( 'rest_not_found', __( 'Field group not found.', 'flexify-dashboard' ), 404 );
		}

		$body['id']         = $id;
		$body['created_at'] = isset( $field_groups[ $found_index ]['created_at'] ) ? $field_groups[ $found_index ]['created_at'] : current_time( 'mysql' );

		$updated_group               = $this->sanitizer->sanitize_field_group_data( $body );
		$updated_group['id']         = $id;
		$updated_group['created_at'] = $body['created_at'];
		$updated_group['updated_at'] = current_time( 'mysql' );

		$field_groups[ $found_index ] = $updated_group;

		if ( ! $this->repository->write( $field_groups ) ) {
			return $this->get_error_response( 'rest_save_failed', __( 'Failed to save field group.', 'flexify-dashboard' ), 500 );
		}

		return new WP_REST_Response(
			array(
				'message' => __( 'Field group updated successfully.', 'flexify-dashboard' ),
				'data'    => $updated_group,
			),
			200
		);
	}


	/**
	 * Delete a field group.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_field_group( $request ) {
		$id = sanitize_text_field( $request->get_param( 'id' ) );

		if ( ! $this->sanitizer->is_valid_id( $id ) ) {
			return $this->get_error_response( 'rest_invalid_id', __( 'Invalid field group ID.', 'flexify-dashboard' ), 400 );
		}

		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			$field_groups = array();
		}

		$found = false;

		$field_groups = array_filter(
			$field_groups,
			function( $group ) use ( $id, &$found ) {
				if ( isset( $group['id'] ) && $id === $group['id'] ) {
					$found = true;
					return false;
				}

				return true;
			}
		);

		if ( ! $found ) {
			return $this->get_error_response( 'rest_not_found', __( 'Field group not found.', 'flexify-dashboard' ), 404 );
		}

		$field_groups = array_values( $field_groups );

		if ( ! $this->repository->write( $field_groups ) ) {
			return $this->get_error_response( 'rest_save_failed', __( 'Failed to delete field group.', 'flexify-dashboard' ), 500 );
		}

		return new WP_REST_Response(
			array(
				'message' => __( 'Field group deleted successfully.', 'flexify-dashboard' ),
			),
			200
		);
	}


	/**
	 * Duplicate a field group.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function duplicate_field_group( $request ) {
		$id = sanitize_text_field( $request->get_param( 'id' ) );

		if ( ! $this->sanitizer->is_valid_id( $id ) ) {
			return $this->get_error_response( 'rest_invalid_id', __( 'Invalid field group ID.', 'flexify-dashboard' ), 400 );
		}

		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			$field_groups = array();
		}

		$original = $this->repository->find_by_id( $id );

		if ( empty( $original ) || ! is_array( $original ) ) {
			return $this->get_error_response( 'rest_not_found', __( 'Field group not found.', 'flexify-dashboard' ), 404 );
		}

		$duplicate               = $original;
		$duplicate['id']         = $this->generate_unique_group_id( $field_groups );
		$duplicate['title']      = $original['title'] . ' ' . __( '(Copy)', 'flexify-dashboard' );
		$duplicate['created_at'] = current_time( 'mysql' );
		$duplicate['updated_at'] = current_time( 'mysql' );

		if ( ! empty( $duplicate['fields'] ) && is_array( $duplicate['fields'] ) ) {
			$duplicate['fields'] = $this->sanitizer->regenerate_field_ids( $duplicate['fields'] );
		}

		$field_groups[] = $duplicate;

		if ( ! $this->repository->write( $field_groups ) ) {
			return $this->get_error_response( 'rest_save_failed', __( 'Failed to duplicate field group.', 'flexify-dashboard' ), 500 );
		}

		return new WP_REST_Response(
			array(
				'message' => __( 'Field group duplicated successfully.', 'flexify-dashboard' ),
				'data'    => $duplicate,
			),
			201
		);
	}


	/**
	 * Export all field groups as JSON.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function export_field_groups( $request ) {
		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			$field_groups = array();
		}

		$export_data = array_map(
			function( $group ) {
				if ( isset( $group['field_count'] ) ) {
					unset( $group['field_count'] );
				}

				return $group;
			},
			$field_groups
		);

		return new WP_REST_Response(
			array(
				'data'        => $export_data,
				'exported_at' => current_time( 'mysql' ),
				'version'     => '1.0',
			),
			200
		);
	}


	/**
	 * Import field groups from JSON.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function import_field_groups( $request ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		if ( empty( $body['data'] ) || ! is_array( $body['data'] ) ) {
			return $this->get_error_response( 'rest_invalid_data', __( 'Invalid import data. Expected an array of field groups.', 'flexify-dashboard' ), 400 );
		}

		$mode = isset( $body['mode'] ) ? sanitize_text_field( $body['mode'] ) : 'merge';

		if ( ! in_array( $mode, array( 'merge', 'replace' ), true ) ) {
			return $this->get_error_response( 'rest_invalid_mode', __( 'Invalid import mode. Use "merge" or "replace".', 'flexify-dashboard' ), 400 );
		}

		$existing_groups = 'replace' === $mode ? array() : $this->repository->read();

		if ( ! is_array( $existing_groups ) ) {
			$existing_groups = array();
		}

		$errors   = array();
		$imported = 0;
		$updated  = 0;

		foreach ( $body['data'] as $index => $group ) {
			if ( ! is_array( $group ) ) {
				$errors[] = sprintf( __( 'Field group at index %d is invalid.', 'flexify-dashboard' ), absint( $index ) );
				continue;
			}

			if ( empty( $group['title'] ) ) {
				$errors[] = sprintf( __( 'Field group at index %d is missing a title.', 'flexify-dashboard' ), absint( $index ) );
				continue;
			}

			$sanitized_group = $this->sanitizer->sanitize_field_group_data( $group );
			$existing_index  = -1;

			if ( ! empty( $sanitized_group['id'] ) ) {
				$existing_index = $this->find_index_in_groups( $existing_groups, $sanitized_group['id'] );
			}

			if ( $existing_index >= 0 && isset( $existing_groups[ $existing_index ] ) ) {
				$sanitized_group['id']         = $existing_groups[ $existing_index ]['id'];
				$sanitized_group['created_at'] = isset( $existing_groups[ $existing_index ]['created_at'] ) ? $existing_groups[ $existing_index ]['created_at'] : current_time( 'mysql' );
				$sanitized_group['updated_at'] = current_time( 'mysql' );

				$existing_groups[ $existing_index ] = $sanitized_group;
				++$updated;
				continue;
			}

			if ( empty( $sanitized_group['id'] ) || $this->repository->id_exists( $sanitized_group['id'], $existing_groups ) ) {
				$sanitized_group['id'] = $this->generate_unique_group_id( $existing_groups );
			}

			$sanitized_group['created_at'] = current_time( 'mysql' );
			$sanitized_group['updated_at'] = current_time( 'mysql' );

			$existing_groups[] = $sanitized_group;
			++$imported;
		}

		if ( ! $this->repository->write( $existing_groups ) ) {
			return $this->get_error_response( 'rest_save_failed', __( 'Failed to save imported field groups.', 'flexify-dashboard' ), 500 );
		}

		return new WP_REST_Response(
			array(
				'message'  => __( 'Import completed successfully.', 'flexify-dashboard' ),
				'imported' => $imported,
				'updated'  => $updated,
				'errors'   => $errors,
			),
			200
		);
	}


	/**
	 * Get available post types for location rules.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_post_types( $request ) {
		return new WP_REST_Response( $this->location_data_provider->get_post_types(), 200 );
	}


	/**
	 * Get available templates for location rules.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_templates( $request ) {
		return new WP_REST_Response( $this->location_data_provider->get_templates(), 200 );
	}


	/**
	 * Get all location rule data for the UI.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_location_data( $request ) {
		try {
			return new WP_REST_Response( $this->location_data_provider->get_location_data(), 200 );
		} catch ( \Exception $e ) {
			error_log( 'Custom Fields location data error: ' . $e->getMessage() );

			return new WP_Error(
				'location_data_error',
				$e->getMessage(),
				array(
					'status' => 500,
				)
			);
		}
	}


	/**
	 * Preview a field value for code examples.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function preview_field_value( $request ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = array();
		}

		$function    = isset( $body['function'] ) ? sanitize_text_field( $body['function'] ) : '';
		$field_name  = isset( $body['field_name'] ) ? sanitize_text_field( $body['field_name'] ) : '';
		$object_id   = isset( $body['object_id'] ) ? absint( $body['object_id'] ) : 0;
		$context     = isset( $body['context'] ) ? sanitize_text_field( $body['context'] ) : 'post';
		$option_page = isset( $body['option_page'] ) ? sanitize_text_field( $body['option_page'] ) : '';
		$options     = isset( $body['options'] ) && is_array( $body['options'] ) ? $body['options'] : array();

		if ( ! in_array( $function, self::$allowed_preview_functions, true ) ) {
			return $this->get_error_response( 'rest_invalid_function', __( 'Invalid or unauthorized function.', 'flexify-dashboard' ), 400 );
		}

		if ( empty( $field_name ) ) {
			return $this->get_error_response( 'rest_missing_field_name', __( 'Field name is required.', 'flexify-dashboard' ), 400 );
		}

		if ( 'option' === $context ) {
			if ( empty( $option_page ) ) {
				return $this->get_error_response( 'rest_invalid_option_page', __( 'Valid option page is required.', 'flexify-dashboard' ), 400 );
			}
		} elseif ( $object_id <= 0 ) {
			return $this->get_error_response( 'rest_invalid_object_id', __( 'Valid object ID is required.', 'flexify-dashboard' ), 400 );
		}

		if ( ! function_exists( $function ) ) {
			return $this->get_error_response(
				'rest_function_not_available',
				__( 'Helper function not available. Please ensure the plugin is properly initialized.', 'flexify-dashboard' ),
				500
			);
		}

		try {
			$call_options = array_merge(
				$options,
				array(
					'context' => $context,
					'format'  => 'raw',
				)
			);

			if ( 'option' === $context ) {
				$value = call_user_func( $function, $field_name, $option_page, $call_options );
			} else {
				$value = call_user_func( $function, $field_name, $object_id, $call_options );
			}

			$response_data = array(
				'success'   => true,
				'value'     => $value,
				'formatted' => $this->format_value_for_display( $value ),
				'context'   => $context,
			);

			if ( 'option' === $context ) {
				$response_data['option_page'] = $option_page;
			} else {
				$response_data['object_id'] = $object_id;
			}

			return new WP_REST_Response( $response_data, 200 );
		} catch ( \Exception $e ) {
			error_log( 'Custom Fields preview error: ' . $e->getMessage() );

			return new WP_Error(
				'rest_preview_error',
				$e->getMessage(),
				array(
					'status' => 500,
				)
			);
		}
	}


	/**
	 * Search posts for preview selector.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function search_posts( $request ) {
		$search    = sanitize_text_field( $request->get_param( 'search' ) );
		$post_type = sanitize_text_field( $request->get_param( 'post_type' ) );
		$per_page  = $this->get_per_page_value( $request );
		$page      = $this->get_page_value( $request );

		if ( empty( $post_type ) || ! post_type_exists( $post_type ) ) {
			$post_type = 'post';
		}

		$args = array(
			'post_type'      => $post_type,
			'post_status'    => 'any',
			'posts_per_page' => $per_page,
			'paged'          => $page,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		if ( ! empty( $search ) ) {
			$args['s'] = $search;
		}

		$query   = new WP_Query( $args );
		$results = array();

		foreach ( $query->posts as $post ) {
			$results[] = array(
				'id'     => $post->ID,
				'title'  => ! empty( $post->post_title ) ? $post->post_title : __( '(no title)', 'flexify-dashboard' ),
				'status' => $post->post_status,
				'type'   => $post->post_type,
				'date'   => get_the_date( 'Y-m-d', $post ),
			);
		}

		return new WP_REST_Response(
			array(
				'results'     => $results,
				'total'       => (int) $query->found_posts,
				'page'        => $page,
				'per_page'    => $per_page,
				'total_pages' => $per_page > 0 ? (int) ceil( $query->found_posts / $per_page ) : 0,
			),
			200
		);
	}


	/**
	 * Search taxonomy terms for preview selector.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function search_terms( $request ) {
		$search   = sanitize_text_field( $request->get_param( 'search' ) );
		$taxonomy = sanitize_text_field( $request->get_param( 'taxonomy' ) );
		$per_page = $this->get_per_page_value( $request );
		$page     = $this->get_page_value( $request );

		if ( empty( $taxonomy ) || ! taxonomy_exists( $taxonomy ) ) {
			$taxonomy = 'category';
		}

		$count_args = array(
			'taxonomy'   => $taxonomy,
			'hide_empty' => false,
			'fields'     => 'count',
		);

		if ( ! empty( $search ) ) {
			$count_args['search'] = $search;
		}

		$total = wp_count_terms( $count_args );

		if ( is_wp_error( $total ) ) {
			$total = 0;
		}

		$args = array(
			'taxonomy'   => $taxonomy,
			'hide_empty' => false,
			'number'     => $per_page,
			'offset'     => ( $page - 1 ) * $per_page,
			'orderby'    => 'name',
			'order'      => 'ASC',
		);

		if ( ! empty( $search ) ) {
			$args['search'] = $search;
		}

		$terms   = get_terms( $args );
		$results = array();

		if ( ! is_wp_error( $terms ) && is_array( $terms ) ) {
			foreach ( $terms as $term ) {
				$results[] = array(
					'id'       => $term->term_id,
					'name'     => $term->name,
					'slug'     => $term->slug,
					'taxonomy' => $term->taxonomy,
					'count'    => $term->count,
				);
			}
		}

		return new WP_REST_Response(
			array(
				'results'     => $results,
				'total'       => (int) $total,
				'page'        => $page,
				'per_page'    => $per_page,
				'total_pages' => $per_page > 0 ? (int) ceil( (int) $total / $per_page ) : 0,
			),
			200
		);
	}


	/**
	 * Search users for preview selector.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function search_users( $request ) {
		$search   = sanitize_text_field( $request->get_param( 'search' ) );
		$role     = sanitize_text_field( $request->get_param( 'role' ) );
		$per_page = $this->get_per_page_value( $request );
		$page     = $this->get_page_value( $request );

		$count_args = array(
			'count_total' => true,
			'number'      => 1,
			'fields'      => 'ID',
		);

		if ( ! empty( $search ) ) {
			$count_args['search']         = '*' . $search . '*';
			$count_args['search_columns'] = array( 'user_login', 'user_nicename', 'user_email', 'display_name' );
		}

		if ( ! empty( $role ) ) {
			$count_args['role'] = $role;
		}

		$total_query = new WP_User_Query( $count_args );
		$total       = (int) $total_query->get_total();

		$args = array(
			'number'  => $per_page,
			'offset'  => ( $page - 1 ) * $per_page,
			'orderby' => 'display_name',
			'order'   => 'ASC',
		);

		if ( ! empty( $search ) ) {
			$args['search']         = '*' . $search . '*';
			$args['search_columns'] = array( 'user_login', 'user_nicename', 'user_email', 'display_name' );
		}

		if ( ! empty( $role ) ) {
			$args['role'] = $role;
		}

		$users   = get_users( $args );
		$results = array();

		foreach ( $users as $user ) {
			$results[] = array(
				'id'           => $user->ID,
				'display_name' => $user->display_name,
				'user_login'   => $user->user_login,
				'email'        => $user->user_email,
				'roles'        => $user->roles,
			);
		}

		return new WP_REST_Response(
			array(
				'results'     => $results,
				'total'       => $total,
				'page'        => $page,
				'per_page'    => $per_page,
				'total_pages' => $per_page > 0 ? (int) ceil( $total / $per_page ) : 0,
			),
			200
		);
	}


	/**
	 * Check if there are active field groups.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function has_active_field_groups() {
		return self::get_repository_instance()->has_active_groups();
	}


	/**
	 * Enqueue scripts for the block editor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function enqueue_block_editor_scripts() {
		$manager = self::get_meta_box_manager_instance();
		$manager->enqueue_block_editor_scripts();
	}


	/**
	 * Print scripts for the classic editor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function print_meta_box_scripts() {
		$manager = self::get_meta_box_manager_instance();
		$manager->print_meta_box_scripts();
	}


	/**
	 * Register custom fields meta boxes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_meta_boxes() {
		$manager = self::get_meta_box_manager_instance();
		$manager->register_meta_boxes();
	}


	/**
	 * Save custom fields.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public static function save_custom_fields( $post_id ) {
		$saver = self::get_field_saver_instance();
		$saver->save_custom_fields( $post_id );
	}


	/**
	 * Get custom fields JSON file path.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_json_file_path() {
		return WP_CONTENT_DIR . '/' . self::JSON_FILENAME;
	}


	/**
	 * Generate a unique group ID.
	 *
	 * @since 2.0.0
	 * @param array $field_groups Existing field groups.
	 * @return string
	 */
	private function generate_unique_group_id( $field_groups ) {
		$id = $this->repository->generate_id();

		while ( $this->repository->id_exists( $id, $field_groups ) ) {
			$id = $this->repository->generate_id();
		}

		return $id;
	}


	/**
	 * Find a group index inside a given array of groups.
	 *
	 * @since 2.0.0
	 * @param array  $groups Groups list.
	 * @param string $id Group ID.
	 * @return int
	 */
	private function find_index_in_groups( $groups, $id ) {
		foreach ( $groups as $index => $group ) {
			if ( isset( $group['id'] ) && $id === $group['id'] ) {
				return (int) $index;
			}
		}

		return -1;
	}


	/**
	 * Format a value for display in code examples.
	 *
	 * @since 2.0.0
	 * @param mixed $value Value to format.
	 * @return string
	 */
	private function format_value_for_display( $value ) {
		if ( null === $value ) {
			return 'null';
		}

		if ( '' === $value ) {
			return '""';
		}

		if ( is_bool( $value ) ) {
			return $value ? 'true' : 'false';
		}

		if ( is_array( $value ) || is_object( $value ) ) {
			return wp_json_encode(
				$value,
				JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
			);
		}

		if ( is_numeric( $value ) ) {
			return (string) $value;
		}

		return wp_json_encode(
			$value,
			JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
		);
	}


	/**
	 * Get sanitized per page value.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return int
	 */
	private function get_per_page_value( $request ) {
		$per_page = absint( $request->get_param( 'per_page' ) );

		if ( empty( $per_page ) ) {
			$per_page = 10;
		}

		return min( $per_page, 50 );
	}


	/**
	 * Get sanitized page value.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request object.
	 * @return int
	 */
	private function get_page_value( $request ) {
		$page = absint( $request->get_param( 'page' ) );

		if ( empty( $page ) ) {
			$page = 1;
		}

		return max( $page, 1 );
	}


	/**
	 * Build a standardized REST error response.
	 *
	 * @since 2.0.0
	 * @param string $code Error code.
	 * @param string $message Error message.
	 * @param int    $status HTTP status code.
	 * @return WP_Error
	 */
	private function get_error_response( $code, $message, $status ) {
		return new WP_Error(
			$code,
			$message,
			array(
				'status' => absint( $status ),
			)
		);
	}


	/**
	 * Get repository instance for static usage.
	 *
	 * @since 2.0.0
	 * @return FieldGroupRepository
	 */
	private static function get_repository_instance() {
		return new FieldGroupRepository( WP_CONTENT_DIR . '/' . self::JSON_FILENAME );
	}


	/**
	 * Get location evaluator instance for static usage.
	 *
	 * @since 2.0.0
	 * @return LocationRuleEvaluator
	 */
	private static function get_evaluator_instance() {
		return new LocationRuleEvaluator();
	}


	/**
	 * Get meta box manager instance for static usage.
	 *
	 * @since 2.0.0
	 * @return MetaBoxManager
	 */
	private static function get_meta_box_manager_instance() {
		return new MetaBoxManager( self::get_repository_instance(), self::get_evaluator_instance() );
	}


	/**
	 * Get field saver instance for static usage.
	 *
	 * @since 2.0.0
	 * @return FieldSaver
	 */
	private static function get_field_saver_instance() {
		return new FieldSaver( self::get_repository_instance(), self::get_evaluator_instance() );
	}
}