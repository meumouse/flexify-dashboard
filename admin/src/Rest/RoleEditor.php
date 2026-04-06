<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class RoleEditor
 *
 * REST API endpoints for managing WordPress user roles and capabilities.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class RoleEditor {
	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * REST route base.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_BASE = 'role-editor';

	/**
	 * Default roles that cannot be deleted.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	const DEFAULT_WORDPRESS_ROLES = array(
		'administrator',
		'editor',
		'author',
		'contributor',
		'subscriber',
	);

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
		register_rest_route( self::REST_NAMESPACE, '/' . self::REST_BASE . '/role/(?P<role>[a-zA-Z0-9_-]+)', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_role_details' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/' . self::REST_BASE . '/role/(?P<role>[a-zA-Z0-9_-]+)', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'update_role_capabilities' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/' . self::REST_BASE . '/role/(?P<role>[a-zA-Z0-9_-]+)/name', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'update_role_name' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/' . self::REST_BASE . '/capabilities', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_all_capabilities' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/' . self::REST_BASE . '/roles', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'create_role' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/' . self::REST_BASE . '/role/(?P<role>[a-zA-Z0-9_-]+)', array(
			'methods'             => 'DELETE',
			'callback'            => array( $this, 'delete_role' ),
			'permission_callback' => array( $this, 'permissions_check' ),
		) );
	}


	/**
	 * Check whether the current user can access the endpoint.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public function permissions_check( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get role details including capabilities.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_role_details( WP_REST_Request $request ) {
		$role_slug = $this->sanitize_role_slug( $request->get_param( 'role' ) );

		if ( is_wp_error( $role_slug ) ) {
			return $role_slug;
		}

		$wp_roles = wp_roles();

		if ( ! isset( $wp_roles->roles[ $role_slug ] ) ) {
			return new WP_Error(
				'rest_invalid_role',
				__( 'Invalid role.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$role_info = $wp_roles->roles[ $role_slug ];
		$role      = $wp_roles->get_role( $role_slug );

		return new WP_REST_Response( array(
			'slug'         => $role_slug,
			'name'         => translate_user_role( $role_info['name'] ),
			'userCount'    => $this->get_role_user_count( $role_slug ),
			'capabilities' => $this->get_role_capabilities( $role ),
		), 200 );
	}


	/**
	 * Update role capabilities.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_role_capabilities( WP_REST_Request $request ) {
		$role_slug = $this->sanitize_role_slug( $request->get_param( 'role' ) );

		if ( is_wp_error( $role_slug ) ) {
			return $role_slug;
		}

		$wp_roles = wp_roles();
		$role     = $wp_roles->get_role( $role_slug );

		if ( ! $role ) {
			return new WP_Error(
				'rest_role_not_found',
				__( 'Role not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$body         = $request->get_json_params();
		$capabilities = isset( $body['capabilities'] ) ? $body['capabilities'] : array();

		if ( ! is_array( $capabilities ) ) {
			return new WP_Error(
				'rest_invalid_capabilities',
				__( 'Capabilities must be an array.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$all_capabilities       = $this->get_all_available_capabilities();
		$validated_capabilities = $this->sanitize_capabilities_list( $capabilities, $all_capabilities );

		foreach ( $all_capabilities as $capability ) {
			$role->remove_cap( $capability );
		}

		foreach ( $validated_capabilities as $capability ) {
			$role->add_cap( $capability );
		}

		$updated_role = wp_roles()->get_role( $role_slug );

		return new WP_REST_Response( array(
			'slug'         => $role_slug,
			'capabilities' => $this->get_role_capabilities( $updated_role ),
			'message'      => __( 'Role capabilities updated successfully.', 'flexify-dashboard' ),
		), 200 );
	}


	/**
	 * Update role name.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_role_name( WP_REST_Request $request ) {
		$role_slug = $this->sanitize_role_slug( $request->get_param( 'role' ) );

		if ( is_wp_error( $role_slug ) ) {
			return $role_slug;
		}

		$wp_roles = wp_roles();

		if ( ! isset( $wp_roles->roles[ $role_slug ] ) ) {
			return new WP_Error(
				'rest_invalid_role',
				__( 'Invalid role.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$body     = $request->get_json_params();
		$new_name = isset( $body['name'] ) ? $this->sanitize_role_name( $body['name'] ) : '';

		if ( is_wp_error( $new_name ) ) {
			return $new_name;
		}

		$wp_roles->roles[ $role_slug ]['name'] = $new_name;
		update_option( $wp_roles->role_key, $wp_roles->roles );

		return new WP_REST_Response( array(
			'slug'    => $role_slug,
			'name'    => translate_user_role( $new_name ),
			'message' => __( 'Role name updated successfully.', 'flexify-dashboard' ),
		), 200 );
	}


	/**
	 * Get all available capabilities.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public function get_all_capabilities( WP_REST_Request $request ) {
		$capabilities = $this->get_all_available_capabilities();
		$grouped      = array(
			'general'  => array(),
			'posts'    => array(),
			'pages'    => array(),
			'media'    => array(),
			'users'    => array(),
			'plugins'  => array(),
			'themes'   => array(),
			'settings' => array(),
			'other'    => array(),
		);

		foreach ( $capabilities as $capability ) {
			$category = $this->categorize_capability( $capability );
			$grouped[ $category ][] = $capability;
		}

		$grouped = array_filter( $grouped, array( $this, 'filter_empty_capability_group' ) );

		return new WP_REST_Response( array(
			'all'     => $capabilities,
			'grouped' => $grouped,
		), 200 );
	}


	/**
	 * Create a new role.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_role( WP_REST_Request $request ) {
		$body         = $request->get_json_params();
		$role_name    = isset( $body['name'] ) ? $this->sanitize_role_name( $body['name'] ) : '';
		$role_slug    = isset( $body['slug'] ) ? $this->sanitize_new_role_slug( $body['slug'] ) : '';
		$capabilities = isset( $body['capabilities'] ) && is_array( $body['capabilities'] ) ? $body['capabilities'] : array();

		if ( is_wp_error( $role_name ) ) {
			return $role_name;
		}

		if ( empty( $role_slug ) ) {
			$role_slug = $this->sanitize_new_role_slug( sanitize_title( $role_name ) );
		}

		if ( is_wp_error( $role_slug ) ) {
			return $role_slug;
		}

		$wp_roles = wp_roles();

		if ( isset( $wp_roles->roles[ $role_slug ] ) ) {
			return new WP_Error(
				'rest_role_exists',
				__( 'A role with this slug already exists.', 'flexify-dashboard' ),
				array( 'status' => 409 )
			);
		}

		$all_capabilities = $this->get_all_available_capabilities();
		$validated_caps   = $this->sanitize_capabilities_list( $capabilities, $all_capabilities );
		$role_caps_map    = array();

		foreach ( $validated_caps as $capability ) {
			$role_caps_map[ $capability ] = true;
		}

		$result = add_role( $role_slug, $role_name, $role_caps_map );

		if ( ! $result ) {
			return new WP_Error(
				'rest_role_creation_failed',
				__( 'Failed to create role.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response( array(
			'slug'         => $role_slug,
			'name'         => translate_user_role( $role_name ),
			'userCount'    => $this->get_role_user_count( $role_slug ),
			'capabilities' => array_keys( $role_caps_map ),
			'message'      => __( 'Role created successfully.', 'flexify-dashboard' ),
		), 201 );
	}


	/**
	 * Delete a role.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_role( WP_REST_Request $request ) {
		$role_slug = $this->sanitize_role_slug( $request->get_param( 'role' ) );

		if ( is_wp_error( $role_slug ) ) {
			return $role_slug;
		}

		$wp_roles = wp_roles();

		if ( ! isset( $wp_roles->roles[ $role_slug ] ) ) {
			return new WP_Error(
				'rest_invalid_role',
				__( 'Invalid role.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		if ( in_array( $role_slug, self::DEFAULT_WORDPRESS_ROLES, true ) ) {
			return new WP_Error(
				'rest_cannot_delete_default',
				__( 'Cannot delete default WordPress roles.', 'flexify-dashboard' ),
				array( 'status' => 403 )
			);
		}

		$users_with_role = $this->get_role_user_count( $role_slug );

		if ( $users_with_role > 0 ) {
			return new WP_Error(
				'rest_role_has_users',
				sprintf(
					/* translators: %d: number of users */
					__( 'Cannot delete role. There are %d user(s) with this role. Please reassign users to another role first.', 'flexify-dashboard' ),
					$users_with_role
				),
				array( 'status' => 409 )
			);
		}

		remove_role( $role_slug );

		return new WP_REST_Response( array(
			'slug'    => $role_slug,
			'message' => __( 'Role deleted successfully.', 'flexify-dashboard' ),
		), 200 );
	}


	/**
	 * Get all available capabilities from WordPress.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_all_available_capabilities() {
		$wp_roles = wp_roles();
		$all_caps = array();

		foreach ( $wp_roles->roles as $role_slug => $role_info ) {
			$role = $wp_roles->get_role( $role_slug );

			if ( ! $role || empty( $role->capabilities ) || ! is_array( $role->capabilities ) ) {
				continue;
			}

			foreach ( $role->capabilities as $capability => $granted ) {
				if ( ! $granted || ! is_string( $capability ) ) {
					continue;
				}

				if ( ! preg_match( '/^[a-z0-9_]+$/', $capability ) ) {
					continue;
				}

				if ( ! in_array( $capability, $all_caps, true ) ) {
					$all_caps[] = sanitize_text_field( $capability );
				}
			}
		}

		sort( $all_caps );

		return $all_caps;
	}


	/**
	 * Get the number of users assigned to a role.
	 *
	 * @since 2.0.0
	 * @param string $role_slug Role slug.
	 * @return int
	 */
	private function get_role_user_count( $role_slug ) {
		$user_count = count_users();

		return isset( $user_count['avail_roles'][ $role_slug ] ) ? absint( $user_count['avail_roles'][ $role_slug ] ) : 0;
	}


	/**
	 * Get the granted capabilities for a role.
	 *
	 * @since 2.0.0
	 * @param object|null $role WordPress role object.
	 * @return array
	 */
	private function get_role_capabilities( $role ) {
		$capabilities = array();

		if ( ! $role || empty( $role->capabilities ) || ! is_array( $role->capabilities ) ) {
			return $capabilities;
		}

		foreach ( $role->capabilities as $capability => $granted ) {
			if ( $granted && is_string( $capability ) ) {
				$capabilities[] = sanitize_text_field( $capability );
			}
		}

		sort( $capabilities );

		return $capabilities;
	}


	/**
	 * Sanitize and validate a role slug for existing roles.
	 *
	 * @since 2.0.0
	 * @param string $role_slug Role slug.
	 * @return string|WP_Error
	 */
	private function sanitize_role_slug( $role_slug ) {
		$role_slug = sanitize_text_field( $role_slug );

		if ( ! preg_match( '/^[a-zA-Z0-9_-]+$/', $role_slug ) ) {
			return new WP_Error(
				'rest_invalid_role',
				__( 'Invalid role format.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return $role_slug;
	}


	/**
	 * Sanitize and validate a new role slug.
	 *
	 * @since 2.0.0
	 * @param string $role_slug Role slug.
	 * @return string|WP_Error
	 */
	private function sanitize_new_role_slug( $role_slug ) {
		$role_slug = sanitize_text_field( $role_slug );
		$role_slug = wp_strip_all_tags( $role_slug );
		$role_slug = trim( $role_slug );

		if ( empty( $role_slug ) ) {
			return new WP_Error(
				'rest_invalid_slug',
				__( 'Role slug can only contain lowercase letters, numbers, hyphens, and underscores.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! preg_match( '/^[a-z0-9_-]+$/', $role_slug ) ) {
			return new WP_Error(
				'rest_invalid_slug',
				__( 'Role slug can only contain lowercase letters, numbers, hyphens, and underscores.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( strlen( $role_slug ) > 60 ) {
			return new WP_Error(
				'rest_invalid_slug',
				__( 'Role slug is too long.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return $role_slug;
	}


	/**
	 * Sanitize and validate a role name.
	 *
	 * @since 2.0.0
	 * @param string $role_name Role name.
	 * @return string|WP_Error
	 */
	private function sanitize_role_name( $role_name ) {
		$role_name = sanitize_text_field( $role_name );
		$role_name = wp_strip_all_tags( $role_name );
		$role_name = trim( $role_name );

		if ( empty( $role_name ) ) {
			return new WP_Error(
				'rest_invalid_name',
				__( 'Role name cannot be empty.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( strlen( $role_name ) > 100 ) {
			return new WP_Error(
				'rest_invalid_name',
				__( 'Role name is too long.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return $role_name;
	}


	/**
	 * Sanitize a list of capabilities and keep only valid existing entries.
	 *
	 * @since 2.0.0
	 * @param array $capabilities Raw capabilities.
	 * @param array $allowed_capabilities Allowed capabilities.
	 * @return array
	 */
	private function sanitize_capabilities_list( $capabilities, $allowed_capabilities ) {
		$validated = array();

		foreach ( $capabilities as $capability ) {
			if ( ! is_string( $capability ) ) {
				continue;
			}

			$capability = sanitize_text_field( $capability );

			if ( ! preg_match( '/^[a-z0-9_]+$/', $capability ) ) {
				continue;
			}

			if ( ! in_array( $capability, $allowed_capabilities, true ) ) {
				continue;
			}

			if ( ! in_array( $capability, $validated, true ) ) {
				$validated[] = $capability;
			}
		}

		sort( $validated );

		return $validated;
	}


	/**
	 * Filter empty capability groups.
	 *
	 * @since 2.0.0
	 * @param array $capabilities Grouped capabilities.
	 * @return bool
	 */
	private function filter_empty_capability_group( $capabilities ) {
		return ! empty( $capabilities );
	}


	/**
	 * Categorize a capability based on its name.
	 *
	 * @since 2.0.0
	 * @param string $capability Capability name.
	 * @return string
	 */
	private function categorize_capability( $capability ) {
		if ( false !== strpos( $capability, 'post' ) || false !== strpos( $capability, 'edit_' ) ) {
			return 'posts';
		}

		if ( false !== strpos( $capability, 'page' ) ) {
			return 'pages';
		}

		if ( false !== strpos( $capability, 'upload' ) || false !== strpos( $capability, 'media' ) ) {
			return 'media';
		}

		if ( false !== strpos( $capability, 'user' ) || false !== strpos( $capability, 'role' ) ) {
			return 'users';
		}

		if ( false !== strpos( $capability, 'plugin' ) ) {
			return 'plugins';
		}

		if ( false !== strpos( $capability, 'theme' ) ) {
			return 'themes';
		}

		if ( false !== strpos( $capability, 'manage_options' ) || false !== strpos( $capability, 'settings' ) ) {
			return 'settings';
		}

		if ( false !== strpos( $capability, 'read' ) || false !== strpos( $capability, 'level_' ) ) {
			return 'general';
		}

		return 'other';
	}
}