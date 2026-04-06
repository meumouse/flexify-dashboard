<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Activity\ActivityCron;
use MeuMouse\Flexify_Dashboard\Activity\ActivityDatabase;
use MeuMouse\Flexify_Dashboard\Activity\ActivityLogger;

defined('ABSPATH') || exit;

/**
 * Class ActivityLog
 *
 * REST API endpoints for activity log management.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class ActivityLog {

	/**
	 * Allowed columns for activity log ordering.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $allowed_orderby = array(
		'id',
		'user_id',
		'action',
		'object_type',
		'object_id',
		'created_at',
	);


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_custom_endpoints' ) );
	}


	/**
	 * Register custom REST API endpoints.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_custom_endpoints() {
		register_rest_route( 'flexify-dashboard/v1', '/activity-log', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_logs' ),
			'permission_callback' => array( $this, 'check_permissions' ),
			'args' => $this->get_collection_args(),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/activity-log/(?P<id>\d+)', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_log' ),
			'permission_callback' => array( $this, 'check_permissions' ),
			'args' => array(
				'id' => array(
					'required' => true,
					'validate_callback' => array( $this, 'validate_numeric_param' ),
					'sanitize_callback' => 'absint',
				),
			),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/activity-log/stats', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_stats' ),
			'permission_callback' => array( $this, 'check_permissions' ),
			'args' => $this->get_stats_args(),
		) );

		register_rest_route( 'flexify-dashboard/v1', '/activity-log/cleanup', array(
			'methods' => 'POST',
			'callback' => array( $this, 'manual_cleanup' ),
			'permission_callback' => array( $this, 'check_permissions' ),
		) );
	}


	/**
	 * Check whether the current user can access the endpoint.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request REST request object.
	 * @return bool|\WP_Error
	 */
	public function check_permissions( $request ) {
		if ( ! ActivityDatabase::is_activity_logger_enabled() ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Activity logger is not enabled.', 'flexify-dashboard' ),
				array( 'status' => 403 )
			);
		}

		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get activity logs.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public function get_logs( $request ) {
		$args = array(
			'page' => $request->get_param( 'page' ),
			'per_page' => $request->get_param( 'per_page' ),
			'user_id' => $request->get_param( 'user_id' ),
			'action' => $request->get_param( 'action' ),
			'object_type' => $request->get_param( 'object_type' ),
			'object_id' => $request->get_param( 'object_id' ),
			'search' => $request->get_param( 'search' ),
			'date_from' => $request->get_param( 'date_from' ),
			'date_to' => $request->get_param( 'date_to' ),
			'orderby' => $request->get_param( 'orderby' ),
			'order' => $request->get_param( 'order' ),
		);

		$result = ActivityLogger::get_logs( $args );

		if ( empty( $result['logs'] ) || ! is_array( $result['logs'] ) ) {
			$result['logs'] = array();
		}

		foreach ( $result['logs'] as $index => $log ) {
			$result['logs'][ $index ]['user'] = $this->get_user_data( isset( $log['user_id'] ) ? absint( $log['user_id'] ) : 0, true );
		}

		$response = new \WP_REST_Response( $result['logs'] );
		$response->header( 'X-WP-Total', isset( $result['total'] ) ? absint( $result['total'] ) : 0 );
		$response->header( 'X-WP-TotalPages', isset( $result['total_pages'] ) ? absint( $result['total_pages'] ) : 0 );

		return $response;
	}


	/**
	 * Get a single log entry.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_log( $request ) {
		$log_id = absint( $request->get_param( 'id' ) );
		$log = ActivityLogger::get_log( $log_id );

		if ( empty( $log ) || ! is_array( $log ) ) {
			return new \WP_Error(
				'not_found',
				__( 'Log entry not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$log['user'] = $this->get_user_data( isset( $log['user_id'] ) ? absint( $log['user_id'] ) : 0, true );

		return new \WP_REST_Response( $log );
	}


	/**
	 * Get activity statistics.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public function get_stats( $request ) {
		$args = array(
			'date_from' => $request->get_param( 'date_from' ),
			'date_to' => $request->get_param( 'date_to' ),
		);

		$stats = ActivityLogger::get_stats( $args );

		if ( empty( $stats['top_users'] ) || ! is_array( $stats['top_users'] ) ) {
			$stats['top_users'] = array();
		}

		foreach ( $stats['top_users'] as $index => $user_stat ) {
			$stats['top_users'][ $index ]['user'] = $this->get_user_data( isset( $user_stat['user_id'] ) ? absint( $user_stat['user_id'] ) : 0, false );
		}

		return new \WP_REST_Response( $stats );
	}


	/**
	 * Manually trigger cleanup of old log entries.
	 *
	 * @since 2.0.0
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public function manual_cleanup( $request ) {
		unset( $request );

		$deleted = absint( ActivityCron::manual_cleanup() );

		return new \WP_REST_Response( array(
			'success' => true,
			'deleted' => $deleted,
			'message' => sprintf( __( 'Cleaned up %d old log entries.', 'flexify-dashboard' ), $deleted ),
		) );
	}


	/**
	 * Get REST arguments for the activity log collection endpoint.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_collection_args() {
		return array(
			'page' => array(
				'default' => 1,
				'sanitize_callback' => 'absint',
			),
			'per_page' => array(
				'default' => 30,
				'sanitize_callback' => 'absint',
			),
			'user_id' => array(
				'default' => null,
				'sanitize_callback' => 'absint',
			),
			'action' => array(
				'default' => null,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'object_type' => array(
				'default' => null,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'object_id' => array(
				'default' => null,
				'sanitize_callback' => 'absint',
			),
			'search' => array(
				'default' => null,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'date_from' => array(
				'default' => null,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'date_to' => array(
				'default' => null,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'orderby' => array(
				'default' => 'created_at',
				'validate_callback' => array( $this, 'validate_orderby_param' ),
				'sanitize_callback' => array( $this, 'sanitize_orderby_param' ),
			),
			'order' => array(
				'default' => 'DESC',
				'validate_callback' => array( $this, 'validate_order_param' ),
				'sanitize_callback' => array( $this, 'sanitize_order_param' ),
			),
		);
	}


	/**
	 * Get REST arguments for the statistics endpoint.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_stats_args() {
		return array(
			'date_from' => array(
				'default' => null,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'date_to' => array(
				'default' => null,
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}


	/**
	 * Validate numeric route parameters.
	 *
	 * @since 2.0.0
	 * @param mixed $param Request parameter value.
	 * @return bool
	 */
	public function validate_numeric_param( $param ) {
		return is_numeric( $param );
	}


	/**
	 * Validate the orderby parameter.
	 *
	 * @since 2.0.0
	 * @param mixed $param Request parameter value.
	 * @return bool
	 */
	public function validate_orderby_param( $param ) {
		return in_array( $param, $this->allowed_orderby, true );
	}


	/**
	 * Sanitize the orderby parameter.
	 *
	 * @since 2.0.0
	 * @param mixed $param Request parameter value.
	 * @return string
	 */
	public function sanitize_orderby_param( $param ) {
		return in_array( $param, $this->allowed_orderby, true ) ? $param : 'created_at';
	}


	/**
	 * Validate the order parameter.
	 *
	 * @since 2.0.0
	 * @param mixed $param Request parameter value.
	 * @return bool
	 */
	public function validate_order_param( $param ) {
		return in_array( strtoupper( (string) $param ), array( 'ASC', 'DESC' ), true );
	}


	/**
	 * Sanitize the order parameter.
	 *
	 * @since 2.0.0
	 * @param mixed $param Request parameter value.
	 * @return string
	 */
	public function sanitize_order_param( $param ) {
		return 'ASC' === strtoupper( (string) $param ) ? 'ASC' : 'DESC';
	}


	/**
	 * Get formatted user data for a log record.
	 *
	 * @since 2.0.0
	 * @param int  $user_id        User ID.
	 * @param bool $include_avatar Whether to include avatar URL.
	 * @return array
	 */
	private function get_user_data( $user_id, $include_avatar = false ) {
		$user = $user_id > 0 ? get_userdata( $user_id ) : false;
		$data = array(
			'id' => $user_id,
			'name' => $user ? $user->display_name : __( 'Unknown', 'flexify-dashboard' ),
			'email' => current_user_can( 'list_users' ) && $user ? $user->user_email : '',
		);

		if ( $include_avatar ) {
			$data['avatar'] = $user ? get_avatar_url( $user->ID ) : '';
		}

		return $data;
	}
}