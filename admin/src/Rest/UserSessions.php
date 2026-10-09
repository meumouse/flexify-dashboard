<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_Session_Tokens;

defined('ABSPATH') || exit;

/**
 * Class UserSessions
 *
 * Where a user is signed in, and signing them out of everywhere.
 *
 * Core keeps this behind admin-ajax (`destroy-sessions`) on the profile screen and has no REST
 * route for it, so the user page could only say it exists. This is that route: how many
 * sessions there are, and ending them.
 *
 * @since 4.2.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class UserSessions {

	/**
	 * REST namespace.
	 *
	 * @since 4.2.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';


	/**
	 * Initialize the class and set up REST API routes.
	 *
	 * @since 4.2.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register the REST API routes.
	 *
	 * @since 4.2.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/users/(?P<id>\d+)/sessions',
			array(
				array(
					'methods' => 'GET',
					'callback' => array( $this, 'get_sessions' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args' => $this->id_arg(),
				),
				array(
					'methods' => 'DELETE',
					'callback' => array( $this, 'destroy_sessions' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args' => $this->id_arg(),
				),
			)
		);
	}


	/**
	 * The user id argument shared by both methods.
	 *
	 * @since 4.2.0
	 * @return array
	 */
	private function id_arg() {
		return array(
			'id' => array(
				'required' => true,
				'sanitize_callback' => 'absint',
			),
		);
	}


	/**
	 * Only somebody who may edit this user may see or end their sessions — the same check core
	 * makes before its own "Log out everywhere else" button.
	 *
	 * @since 4.2.0
	 * @param WP_REST_Request $request The request object.
	 * @return bool|WP_Error
	 */
	public function permissions_check( WP_REST_Request $request ) {
		$allowed = RestPermissionChecker::check_permissions( $request, 'edit_users' );

		if ( is_wp_error( $allowed ) ) {
			return $allowed;
		}

		$user_id = absint( $request['id'] );

		if ( ! get_userdata( $user_id ) ) {
			return new WP_Error( 'rest_user_invalid_id', __( 'Invalid user ID.', 'flexify-dashboard' ), array( 'status' => 404 ) );
		}

		if ( ! current_user_can( 'edit_user', $user_id ) ) {
			return new WP_Error( 'rest_forbidden', __( 'Sorry, you are not allowed to manage this user.', 'flexify-dashboard' ), array( 'status' => 403 ) );
		}

		return true;
	}


	/**
	 * How many sessions the user has open, and when the newest one started.
	 *
	 * @since 4.2.0
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response
	 */
	public function get_sessions( WP_REST_Request $request ) {
		$sessions = WP_Session_Tokens::get_instance( absint( $request['id'] ) )->get_all();
		$logins = array_filter( array_map( static fn( $session ) => isset( $session['login'] ) ? (int) $session['login'] : 0, $sessions ) );

		return new WP_REST_Response(
			array(
				'count' => count( $sessions ),
				'last_login' => $logins ? gmdate( 'c', max( $logins ) ) : null,
			),
			200
		);
	}


	/**
	 * Sign the user out of every device.
	 *
	 * When it is the current user, the session making this request goes too: asking to be
	 * signed out everywhere and staying signed in here would not be what was asked.
	 *
	 * @since 4.2.0
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response
	 */
	public function destroy_sessions( WP_REST_Request $request ) {
		WP_Session_Tokens::get_instance( absint( $request['id'] ) )->destroy_all();

		return new WP_REST_Response( array( 'count' => 0 ), 200 );
	}
}
