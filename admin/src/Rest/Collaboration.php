<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class Collaboration
 *
 * REST API endpoints for real-time collaboration.
 * Provides authentication and document persistence for Hocuspocus server.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class Collaboration {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Document meta key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DOCUMENT_META_KEY = '_fd_collab_document';

	/**
	 * Default collaboration server URL.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DEFAULT_SERVER_URL = 'ws://localhost:1234';

	/**
	 * Default PartyKit host.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DEFAULT_PARTYKIT_HOST = 'flexify-dashboard-collab.wpuipress.partykit.dev';

	/**
	 * Available user colors.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $user_colors = array(
		'#F44336',
		'#E91E63',
		'#9C27B0',
		'#673AB7',
		'#3F51B5',
		'#2196F3',
		'#03A9F4',
		'#00BCD4',
		'#009688',
		'#4CAF50',
		'#8BC34A',
		'#CDDC39',
		'#FFC107',
		'#FF9800',
		'#FF5722',
		'#795548',
	);


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_custom_endpoints' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_collaboration_config' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_collaboration_config' ) );
	}


	/**
	 * Register custom REST API endpoints.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_custom_endpoints() {
		register_rest_route( self::REST_NAMESPACE, '/collab/verify', array(
			'methods' => 'POST',
			'callback' => array( $this, 'verify_user' ),
			'permission_callback' => '__return_true',
			'args' => array(
				'post_id' => array(
					'required' => true,
					'sanitize_callback' => 'absint',
					'validate_callback' => array( $this, 'validate_post_id' ),
				),
				'token' => array(
					'required' => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/collab/document/(?P<post_id>\d+)', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_document' ),
			'permission_callback' => array( $this, 'check_edit_permissions' ),
			'args' => array(
				'post_id' => array(
					'required' => true,
					'validate_callback' => array( $this, 'validate_post_id' ),
					'sanitize_callback' => 'absint',
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/collab/document/(?P<post_id>\d+)', array(
			'methods' => 'POST',
			'callback' => array( $this, 'save_document' ),
			'permission_callback' => array( $this, 'check_edit_permissions' ),
			'args' => array(
				'post_id' => array(
					'required' => true,
					'validate_callback' => array( $this, 'validate_post_id' ),
					'sanitize_callback' => 'absint',
				),
				'document' => array(
					'required' => true,
					'sanitize_callback' => array( $this, 'sanitize_document' ),
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/collab/settings', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_settings' ),
			'permission_callback' => array( $this, 'check_edit_permissions' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/collab/users/(?P<post_id>\d+)', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_active_users' ),
			'permission_callback' => array( $this, 'check_edit_permissions' ),
			'args' => array(
				'post_id' => array(
					'required' => true,
					'validate_callback' => array( $this, 'validate_post_id' ),
					'sanitize_callback' => 'absint',
				),
			),
		) );
	}


	/**
	 * Enqueue collaboration configuration for the frontend.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function enqueue_collaboration_config() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		$user = wp_get_current_user();

		if ( ! $user || ! $user->exists() ) {
			return;
		}

		$collab_config = array(
			'enabled' => $this->is_collaboration_enabled(),
			'serverUrl' => $this->get_server_url(),
			'partyKitHost' => $this->get_partykit_host(),
			'mode' => $this->get_provider_mode(),
			'siteId' => $this->get_site_id(),
			'siteUrl' => get_site_url(),
			'userId' => $user->ID,
			'userName' => $user->display_name,
			'userColor' => $this->generate_user_color( $user->ID ),
			'userAvatar' => get_avatar_url( $user->ID ),
		);

		wp_add_inline_script(
			'wp-api-fetch',
			'window.flexifyDashboardCollab = ' . wp_json_encode( $collab_config ) . ';',
			'before'
		);
	}


	/**
	 * Get the provider mode.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_provider_mode() {
		$custom_url = get_option( 'fd_collaboration_custom_server_url', '' );

		if ( ! empty( $custom_url ) ) {
			return 'custom';
		}

		return get_option( 'fd_collaboration_mode', 'hosted' );
	}


	/**
	 * Get or generate a unique site identifier.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_site_id() {
		$site_id = get_option( 'fd_collaboration_site_id', '' );

		if ( empty( $site_id ) ) {
			$site_id = substr( md5( get_site_url() ), 0, 12 );
			update_option( 'fd_collaboration_site_id', $site_id );
		}

		return $site_id;
	}


	/**
	 * Check whether the current user has permission to edit posts.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public function check_edit_permissions( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );

		if ( $post_id > 0 ) {
			return current_user_can( 'edit_post', $post_id );
		}

		return current_user_can( 'edit_posts' );
	}


	/**
	 * Verify whether a user can edit a specific post.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public function verify_user( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );
		$token = sanitize_text_field( $request->get_param( 'token' ) );

		if ( ! wp_verify_nonce( $token, 'wp_rest' ) ) {
			$user_id = wp_validate_auth_cookie( '', 'logged_in' );

			if ( ! $user_id ) {
				return new WP_REST_Response( array(
					'can_edit' => false,
					'error' => __( 'Invalid authentication', 'flexify-dashboard' ),
				), 401 );
			}
		}

		$user = wp_get_current_user();

		if ( ! $user || ! $user->exists() ) {
			return new WP_REST_Response( array(
				'can_edit' => false,
				'error' => __( 'User not found', 'flexify-dashboard' ),
			), 401 );
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new WP_REST_Response( array(
				'can_edit' => false,
				'error' => __( 'User cannot edit this post', 'flexify-dashboard' ),
			), 403 );
		}

		return new WP_REST_Response( array(
			'can_edit' => true,
			'user' => array(
				'id' => $user->ID,
				'name' => $user->display_name,
				'email' => $user->user_email,
				'avatar' => get_avatar_url( $user->ID ),
				'color' => $this->generate_user_color( $user->ID ),
			),
		) );
	}


	/**
	 * Get the collaboration document state for a post.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public function get_document( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );
		$document = get_post_meta( $post_id, self::DOCUMENT_META_KEY, true );

		return new WP_REST_Response( array(
			'post_id' => $post_id,
			'document' => ! empty( $document ) ? $document : null,
			'has_document' => ! empty( $document ),
		) );
	}


	/**
	 * Save the collaboration document state for a post.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function save_document( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );
		$document = $request->get_param( 'document' );

		if ( empty( $document ) ) {
			return new WP_Error(
				'invalid_document',
				__( 'Invalid document data.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$updated = update_post_meta( $post_id, self::DOCUMENT_META_KEY, $document );

		return new WP_REST_Response( array(
			'success' => true,
			'post_id' => $post_id,
			'updated' => (bool) $updated,
		) );
	}


	/**
	 * Get collaboration settings.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public function get_settings( $request ) {
		unset( $request );

		$user = wp_get_current_user();

		return new WP_REST_Response( array(
			'enabled' => $this->is_collaboration_enabled(),
			'serverUrl' => $this->get_server_url(),
			'user' => array(
				'id' => $user->ID,
				'name' => $user->display_name,
				'color' => $this->generate_user_color( $user->ID ),
				'avatar' => get_avatar_url( $user->ID ),
			),
		) );
	}


	/**
	 * Get active collaborators for a post.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public function get_active_users( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );

		return new WP_REST_Response( array(
			'post_id' => $post_id,
			'users' => array(),
		) );
	}


	/**
	 * Check whether collaboration is enabled.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_collaboration_enabled() {
		$settings = get_option( 'flexify_dashboard_settings', array() );
		$enabled = isset( $settings['enable_realtime_collaboration'] ) ? (bool) $settings['enable_realtime_collaboration'] : false;
		$modern_editor_enabled = isset( $settings['use_modern_post_editor'] ) ? (bool) $settings['use_modern_post_editor'] : false;

		return $enabled && $modern_editor_enabled;
	}


	/**
	 * Get the collaboration server URL.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_server_url() {
		$url = get_option( 'fd_collaboration_server_url', '' );

		if ( empty( $url ) ) {
			$url = self::DEFAULT_SERVER_URL;
		}

		return esc_url_raw( $url );
	}


	/**
	 * Get the PartyKit host.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_partykit_host() {
		return sanitize_text_field( get_option( 'fd_collaboration_partykit_host', self::DEFAULT_PARTYKIT_HOST ) );
	}


	/**
	 * Generate a consistent color for a user.
	 *
	 * @since 2.0.0
	 * @param int $user_id User ID.
	 * @return string
	 */
	private function generate_user_color( $user_id ) {
		$total_colors = count( $this->user_colors );

		if ( 0 === $total_colors ) {
			return '#2196F3';
		}

		$index = absint( $user_id ) % $total_colors;

		return $this->user_colors[ $index ];
	}


	/**
	 * Validate post ID parameter.
	 *
	 * @since 2.0.0
	 * @param mixed            $param Route parameter value.
	 * @param WP_REST_Request  $request REST request object.
	 * @param string           $key Parameter key.
	 * @return bool
	 */
	public function validate_post_id( $param, $request = null, $key = '' ) {
		unset( $request, $key );

		return is_numeric( $param ) && absint( $param ) > 0;
	}


	/**
	 * Sanitize document payload.
	 *
	 * @since 2.0.0
	 * @param mixed $document Document payload.
	 * @return string
	 */
	public function sanitize_document( $document ) {
		if ( is_array( $document ) || is_object( $document ) ) {
			return wp_json_encode( $document );
		}

		return is_scalar( $document ) ? (string) $document : '';
	}
}