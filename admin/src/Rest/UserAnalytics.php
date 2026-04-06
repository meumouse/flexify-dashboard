<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use DateInterval;
use DatePeriod;
use DateTime;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class UserAnalytics
 *
 * Provides REST API endpoints for user registration analytics
 * with date range filtering and transient caching.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class UserAnalytics {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * REST route base.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_BASE = 'user-analytics';

	/**
	 * Default analytics range in days.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private const DEFAULT_RANGE_DAYS = 30;

	/**
	 * Cache expiration time.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private const CACHE_EXPIRATION = HOUR_IN_SECONDS;

	/**
	 * Initialize hooks.
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
		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE,
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_user_analytics' ),
				'permission_callback' => array( $this, 'get_user_analytics_permissions_check' ),
				'args' => array(
					'start_date' => array(
						'required' => false,
						'type' => 'string',
						'description' => __( 'Start date for analytics (ISO 8601)', 'flexify-dashboard' ),
						'sanitize_callback' => array( $this, 'sanitize_date_param' ),
						'validate_callback' => array( $this, 'validate_date_param' ),
					),
					'end_date' => array(
						'required' => false,
						'type' => 'string',
						'description' => __( 'End date for analytics (ISO 8601)', 'flexify-dashboard' ),
						'sanitize_callback' => array( $this, 'sanitize_date_param' ),
						'validate_callback' => array( $this, 'validate_date_param' ),
					),
				),
			)
		);
	}


	/**
	 * Check if the current user has permission to view analytics.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request instance.
	 * @return bool|WP_Error
	 */
	public function get_user_analytics_permissions_check( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'list_users' );
	}


	/**
	 * Sanitize date parameter.
	 *
	 * @since 2.0.0
	 * @param mixed $value Raw parameter value.
	 * @return string
	 */
	public function sanitize_date_param( $value ) {
		return is_string( $value ) ? sanitize_text_field( $value ) : '';
	}


	/**
	 * Validate date parameter.
	 *
	 * @since 2.0.0
	 * @param mixed            $value   Parameter value.
	 * @param WP_REST_Request  $request Request instance.
	 * @param string           $param   Parameter name.
	 * @return bool|WP_Error
	 */
	public function validate_date_param( $value, WP_REST_Request $request, $param ) {
		if ( empty( $value ) ) {
			return true;
		}

		if ( false === strtotime( $value ) ) {
			return new WP_Error(
				'invalid_date_param',
				sprintf(
					/* translators: %s: parameter name */
					__( 'Invalid date provided for %s.', 'flexify-dashboard' ),
					esc_html( $param )
				),
				array( 'status' => 400 )
			);
		}

		return true;
	}


	/**
	 * Get user analytics data.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response
	 */
	public function get_user_analytics( WP_REST_Request $request ) {
		$start_date = $request->get_param( 'start_date' );
		$end_date   = $request->get_param( 'end_date' );

		$normalized_dates = $this->normalize_date_range( $start_date, $end_date );
		$cache_key        = $this->get_cache_key( $normalized_dates['start'], $normalized_dates['end'] );
		$cached_data      = get_transient( $cache_key );

		if ( false !== $cached_data && is_array( $cached_data ) ) {
			$cached_data['from_cache'] = true;

			return new WP_REST_Response( $cached_data, 200 );
		}

		$analytics               = $this->calculate_user_analytics( $normalized_dates['start'], $normalized_dates['end'] );
		$analytics['from_cache'] = false;

		set_transient( $cache_key, $analytics, self::CACHE_EXPIRATION );

		return new WP_REST_Response( $analytics, 200 );
	}


	/**
	 * Build cache key for analytics range.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date.
	 * @param string $end_date End date.
	 * @return string
	 */
	private function get_cache_key( $start_date, $end_date ) {
		return 'flexify_dashboard_user_analytics_' . md5( $start_date . '|' . $end_date );
	}


	/**
	 * Normalize date range values.
	 *
	 * @since 2.0.0
	 * @param string|null $start_date Raw start date.
	 * @param string|null $end_date Raw end date.
	 * @return array
	 */
	private function normalize_date_range( $start_date = null, $end_date = null ) {
		$end = ! empty( $end_date ) ? strtotime( $end_date ) : current_time( 'timestamp' );
		$end = false !== $end ? $end : current_time( 'timestamp' );

		$start = ! empty( $start_date ) ? strtotime( $start_date ) : strtotime( '-' . self::DEFAULT_RANGE_DAYS . ' days', $end );
		$start = false !== $start ? $start : strtotime( '-' . self::DEFAULT_RANGE_DAYS . ' days', $end );

		if ( $start > $end ) {
			$temp  = $start;
			$start = $end;
			$end   = $temp;
		}

		return array(
			'start' => date( 'Y-m-d H:i:s', $start ),
			'end'   => date( 'Y-m-d H:i:s', $end ),
		);
	}


	/**
	 * Calculate user analytics data.
	 *
	 * @since 2.0.0
	 * @param string $start_date Normalized start date.
	 * @param string $end_date Normalized end date.
	 * @return array
	 */
	private function calculate_user_analytics( $start_date, $end_date ) {
		global $wpdb;

		$total_users = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->users}"
		);

		$users_in_range = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*)
				FROM {$wpdb->users}
				WHERE user_registered >= %s
				AND user_registered <= %s",
				$start_date,
				$end_date
			)
		);

		$daily_registrations = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT DATE(user_registered) AS registration_date, COUNT(*) AS count
				FROM {$wpdb->users}
				WHERE user_registered >= %s
				AND user_registered <= %s
				GROUP BY DATE(user_registered)
				ORDER BY registration_date ASC",
				$start_date,
				$end_date
			)
		);

		$user_roles = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT um.meta_value AS role, COUNT(*) AS count
				FROM {$wpdb->users} AS u
				LEFT JOIN {$wpdb->usermeta} AS um
					ON u.ID = um.user_id
					AND um.meta_key = %s
				GROUP BY um.meta_value
				ORDER BY count DESC",
				$wpdb->prefix . 'capabilities'
			)
		);

		$recent_users = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*)
				FROM {$wpdb->users}
				WHERE user_registered >= %s",
				date( 'Y-m-d H:i:s', strtotime( '-7 days', current_time( 'timestamp' ) ) )
			)
		);

		$monthly_users = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT DATE_FORMAT(user_registered, '%%Y-%%m') AS month, COUNT(*) AS count
				FROM {$wpdb->users}
				WHERE user_registered >= %s
				AND user_registered <= %s
				GROUP BY DATE_FORMAT(user_registered, '%%Y-%%m')
				ORDER BY month ASC",
				$start_date,
				$end_date
			)
		);

		return array(
			'total_users'   => $total_users,
			'users_in_range'=> $users_in_range,
			'recent_users'  => $recent_users,
			'chart_data'    => $this->prepare_chart_data( $daily_registrations, $start_date, $end_date ),
			'user_roles'    => $this->process_user_roles( $user_roles ),
			'monthly_trend' => $this->prepare_monthly_trend( $monthly_users ),
			'date_range'    => array(
				'start' => $start_date,
				'end'   => $end_date,
			),
			'last_updated'  => current_time( 'mysql' ),
		);
	}


	/**
	 * Prepare chart data with a complete date range.
	 *
	 * @since 2.0.0
	 * @param array  $daily_registrations Raw daily registrations.
	 * @param string $start_date Start date.
	 * @param string $end_date End date.
	 * @return array
	 */
	private function prepare_chart_data( $daily_registrations, $start_date, $end_date ) {
		$labels      = array();
		$data        = array();
		$date_counts = array();

		foreach ( $daily_registrations as $day ) {
			if ( isset( $day->registration_date, $day->count ) ) {
				$date_counts[ $day->registration_date ] = (int) $day->count;
			}
		}

		$start  = new DateTime( date( 'Y-m-d', strtotime( $start_date ) ) );
		$end    = new DateTime( date( 'Y-m-d', strtotime( $end_date ) ) );
		$end->modify( '+1 day' );

		$period = new DatePeriod( $start, new DateInterval( 'P1D' ), $end );

		foreach ( $period as $date ) {
			$date_key = $date->format( 'Y-m-d' );

			$labels[] = $date->format( 'M j' );
			$data[]   = isset( $date_counts[ $date_key ] ) ? $date_counts[ $date_key ] : 0;
		}

		return array(
			'labels' => $labels,
			'datasets' => array(
				array(
					'label' => __( 'New Users', 'flexify-dashboard' ),
					'data' => $data,
					'borderColor' => 'rgb(0, 138, 255)',
					'backgroundColor' => 'rgba(0, 138, 255, 0.1)',
					'borderWidth' => 2,
					'fill' => true,
					'tension' => 0.4,
				),
			),
		);
	}


	/**
	 * Process user roles data.
	 *
	 * @since 2.0.0
	 * @param array $user_roles Raw role records.
	 * @return array
	 */
	private function process_user_roles( $user_roles ) {
		$processed = array();

		foreach ( $user_roles as $role_data ) {
			if ( empty( $role_data->role ) ) {
				continue;
			}

			$capabilities = maybe_unserialize( $role_data->role );

			if ( ! is_array( $capabilities ) || empty( $capabilities ) ) {
				continue;
			}

			$role_name = array_key_first( $capabilities );

			if ( empty( $role_name ) ) {
				continue;
			}

			$processed[] = array(
				'role' => $role_name,
				'count' => isset( $role_data->count ) ? (int) $role_data->count : 0,
			);
		}

		return $processed;
	}


	/**
	 * Prepare monthly trend data.
	 *
	 * @since 2.0.0
	 * @param array $monthly_users Raw monthly records.
	 * @return array
	 */
	private function prepare_monthly_trend( $monthly_users ) {
		$trend = array();

		foreach ( $monthly_users as $month_data ) {
			$trend[] = array(
				'month' => isset( $month_data->month ) ? $month_data->month : '',
				'count' => isset( $month_data->count ) ? (int) $month_data->count : 0,
			);
		}

		return $trend;
	}
}