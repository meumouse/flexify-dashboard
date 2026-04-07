<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsDatabase;
use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsProviderRouter;

use Exception;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class Analytics
 *
 * REST API endpoints for Flexify Dashboard Analytics functionality.
 * Handles fetching analytics stats and inserting new analytics data.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class Analytics {

	/**
	 * Maximum allowed URL length.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const MAX_URL_LENGTH = 500;

	/**
	 * Maximum allowed page title length.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const MAX_TITLE_LENGTH = 255;

	/**
	 * Maximum requests per hour for tracking.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const RATE_LIMIT_REQUESTS = 100;

	/**
	 * Session cookie name.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const SESSION_COOKIE_NAME = 'flexify_dashboard_analytics_session';

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_analytics_routes' ) );
	}


	/**
	 * Register analytics REST API routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_analytics_routes() {
		if ( ! AnalyticsDatabase::is_analytics_enabled() ) {
			return;
		}

		register_rest_route( self::REST_NAMESPACE, '/analytics/active-users', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_active_users' ),
			'permission_callback' => array( $this, 'check_analytics_view_permissions' ),
			'args' => array(
				'timezone' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'description' => __( 'Browser timezone for accurate time calculations', 'flexify-dashboard' ),
				),
				'browser_time' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'format' => 'date-time',
					'description' => __( 'Browser time in ISO format', 'flexify-dashboard' ),
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/analytics/stats', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_analytics_stats' ),
			'permission_callback' => array( $this, 'check_analytics_view_permissions' ),
			'args' => array(
				'start_date' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'format' => 'date-time',
					'description' => __( 'Start date for analytics data (ISO 8601 format)', 'flexify-dashboard' ),
				),
				'end_date' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'format' => 'date-time',
					'description' => __( 'End date for analytics data (ISO 8601 format)', 'flexify-dashboard' ),
				),
				'page_url' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'sanitize_callback' => array( $this, 'sanitize_nullable_url' ),
					'description' => __( 'Filter by specific page URL', 'flexify-dashboard' ),
				),
				'stat_type' => array(
					'required' => false,
					'default' => 'overview',
					'type' => 'string',
					'enum' => array( 'overview', 'pages', 'referrers', 'devices', 'geo', 'events' ),
					'sanitize_callback' => 'sanitize_text_field',
					'description' => __( 'Type of analytics stats to retrieve', 'flexify-dashboard' ),
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/analytics/track', array(
			'methods' => 'POST',
			'callback' => array( $this, 'track_analytics_event' ),
			'permission_callback' => array( $this, 'check_analytics_track_permissions' ),
			'args' => array(
				'page_url' => array(
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => array( $this, 'sanitize_required_url' ),
					'validate_callback' => array( $this, 'validate_url' ),
					'description' => __( 'URL of the page being viewed', 'flexify-dashboard' ),
				),
				'page_title' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'allow_empty' => true,
					'sanitize_callback' => array( $this, 'sanitize_nullable_text' ),
					'description' => __( 'Title of the page being viewed', 'flexify-dashboard' ),
				),
				'referrer' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'allow_empty' => true,
					'sanitize_callback' => array( $this, 'sanitize_nullable_url' ),
					'description' => __( 'Referrer URL', 'flexify-dashboard' ),
				),
				'user_agent' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'allow_empty' => true,
					'sanitize_callback' => array( $this, 'sanitize_nullable_text' ),
					'description' => __( 'User agent string', 'flexify-dashboard' ),
				),
				'session_id' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'sanitize_callback' => array( $this, 'sanitize_session_id' ),
					'description' => __( 'Client-side session ID', 'flexify-dashboard' ),
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/analytics/settings', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_analytics_settings' ),
			'permission_callback' => array( $this, 'check_analytics_view_permissions' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/analytics/settings', array(
			'methods' => 'POST',
			'callback' => array( $this, 'update_analytics_settings' ),
			'permission_callback' => array( $this, 'check_analytics_permissions' ),
			'args' => array(
				'settings' => array(
					'required' => true,
					'type' => 'object',
					'description' => __( 'Analytics settings to update', 'flexify-dashboard' ),
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/analytics/chart', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_chart_data' ),
			'permission_callback' => array( $this, 'check_analytics_view_permissions' ),
			'args' => array(
				'start_date' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'format' => 'date-time',
					'description' => __( 'Start date for chart data (ISO 8601 format)', 'flexify-dashboard' ),
				),
				'end_date' => array(
					'required' => false,
					'default' => null,
					'type' => 'string',
					'format' => 'date-time',
					'description' => __( 'End date for chart data (ISO 8601 format)', 'flexify-dashboard' ),
				),
				'chart_type' => array(
					'required' => false,
					'default' => 'pageviews',
					'type' => 'string',
					'enum' => array( 'pageviews', 'visitors', 'both' ),
					'sanitize_callback' => 'sanitize_text_field',
					'description' => __( 'Type of chart data to retrieve', 'flexify-dashboard' ),
				),
			),
		) );
	}


	/**
	 * Check whether the current user can view analytics data.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public function check_analytics_view_permissions( $request ) {
		return RestPermissionChecker::check_permissions( $request, 'edit_posts' );
	}


	/**
	 * Check whether the current request can track analytics events.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool
	 */
	public function check_analytics_track_permissions( $request ) {
		if ( is_user_logged_in() ) {
			$nonce = $request->get_header( 'X-WP-Nonce' );

			if ( empty( $nonce ) ) {
				$nonce = $request->get_param( '_wpnonce' );
			}

			if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Check whether the current user can manage analytics settings.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public function check_analytics_permissions( $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get active users.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_active_users( $request ) {
		try {
			$timezone = $request->get_param( 'timezone' );
			$browser_time = $request->get_param( 'browser_time' );

			$provider = AnalyticsProviderRouter::get_provider();
			$data = $provider->getActiveUsers( $timezone, $browser_time );

			if ( ! is_array( $data ) ) {
				$data = array();
			}

			$data['_provider'] = $provider->getIdentifier();

			$data = $this->append_provider_error( $provider, $data );

			$response = new WP_REST_Response( $data, 200 );
			$response->header( 'Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0' );
			$response->header( 'Pragma', 'no-cache' );
			$response->header( 'Expires', '0' );

			return $response;
		} catch ( Exception $e ) {
			error_log( 'Flexify Dashboard Analytics Active Users Error: ' . $e->getMessage() );

			return new WP_Error(
				'analytics_error',
				$e->getMessage(),
				array( 'status' => 500 )
			);
		}
	}


	/**
	 * Get analytics statistics.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_analytics_stats( $request ) {
		$start_date = $request->get_param( 'start_date' );
		$end_date = $request->get_param( 'end_date' );
		$page_url = $request->get_param( 'page_url' );
		$stat_type = $request->get_param( 'stat_type' );

		try {
			$provider = AnalyticsProviderRouter::get_provider();

			switch ( $stat_type ) {
				case 'overview':
					$data = $provider->getOverview( $start_date, $end_date, $page_url );
					break;

				case 'pages':
					$data = $provider->getPages( $start_date, $end_date, $page_url );
					break;

				case 'referrers':
					$data = $provider->getReferrers( $start_date, $end_date );
					break;

				case 'devices':
					$data = $provider->getDevices( $start_date, $end_date );
					break;

				case 'geo':
					$data = $provider->getGeo( $start_date, $end_date );
					break;

				case 'events':
					$data = $provider->getEvents( $start_date, $end_date );
					break;

				default:
					return new WP_Error(
						'invalid_stat_type',
						__( 'Invalid stat type', 'flexify-dashboard' ),
						array( 'status' => 400 )
					);
			}

			if ( ! is_array( $data ) ) {
				$data = array();
			}

			$data['_provider'] = $provider->getIdentifier();
			$data = $this->append_provider_error( $provider, $data );

			return new WP_REST_Response( $data, 200 );
		} catch ( Exception $e ) {
			error_log( 'Flexify Dashboard Analytics Stats Error: ' . $e->getMessage() );

			return new WP_Error(
				'analytics_error',
				$e->getMessage(),
				array( 'status' => 500 )
			);
		}
	}


	/**
	 * Track a new analytics event.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function track_analytics_event( $request ) {
		try {
			$page_url = $request->get_param( 'page_url' );
			$page_title = $request->get_param( 'page_title' );
			$referrer = $request->get_param( 'referrer' );
			$user_agent = $request->get_param( 'user_agent' );
			$client_session_id = $this->sanitize_session_id( $request->get_param( 'session_id' ) );

			if ( empty( $page_url ) ) {
				return new WP_Error(
					'missing_page_url',
					__( 'Page URL is required', 'flexify-dashboard' ),
					array( 'status' => 400 )
				);
			}

			$validation_error = $this->validate_tracking_payload( $page_url, $page_title, $referrer );

			if ( is_wp_error( $validation_error ) ) {
				return $validation_error;
			}

			$rate_limit_error = $this->maybe_apply_rate_limit();

			if ( is_wp_error( $rate_limit_error ) ) {
				return $rate_limit_error;
			}

			$server_user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
			$server_ip = function_exists( 'wp_get_ip_address' ) ? wp_get_ip_address() : '';
			$server_ip = ! empty( $server_ip ) ? sanitize_text_field( $server_ip ) : '';

			$client_info = $this->parse_user_agent( ! empty( $user_agent ) ? $user_agent : $server_user_agent );
			$geo_info = $this->get_geo_info();

			$session_id = ! empty( $client_session_id ) ? $client_session_id : $this->get_or_create_session_id();

			if ( empty( $session_id ) || ! $this->is_valid_session_id( $session_id ) ) {
				$session_id = $this->get_or_create_session_id();
			}

			$ip_hash = $this->hash_ip( $server_ip );
			$is_unique = $this->is_unique_visitor( $session_id, $page_url );

			$pageview_id = $this->insert_page_view( array(
				'page_url' => $page_url,
				'page_title' => $page_title,
				'referrer' => $referrer,
				'referrer_domain' => $this->extract_domain( $referrer ),
				'user_agent' => ! empty( $user_agent ) ? $user_agent : $server_user_agent,
				'device_type' => $client_info['device_type'],
				'browser' => $client_info['browser'],
				'browser_version' => $client_info['browser_version'],
				'os' => $client_info['os'],
				'country_code' => $geo_info['country_code'],
				'city' => $geo_info['city'],
				'ip_hash' => $ip_hash,
				'session_id' => $session_id,
				'is_unique_visitor' => $is_unique ? 1 : 0,
				'created_at' => current_time( 'mysql' ),
			) );

			if ( false === $pageview_id ) {
				return new WP_Error(
					'tracking_failed',
					__( 'Failed to track analytics event', 'flexify-dashboard' ),
					array( 'status' => 500 )
				);
			}

			return new WP_REST_Response( array(
				'success' => true,
				'pageview_id' => $pageview_id,
				'is_unique_visitor' => $is_unique,
			), 200 );
		} catch ( Exception $e ) {
			error_log( 'Flexify Dashboard Analytics Tracking Error: ' . $e->getMessage() );

			return new WP_Error(
				'tracking_error',
				$e->getMessage(),
				array( 'status' => 500 )
			);
		}
	}


	/**
	 * Get analytics settings.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public function get_analytics_settings( $request ) {
		unset( $request );

		global $wpdb;

		$table_name = $wpdb->prefix . 'flexify_dashboard_analytics_settings';
		$results = $wpdb->get_results( "SELECT setting_key, setting_value FROM {$table_name}", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		$formatted_settings = array();

		if ( ! empty( $results ) && is_array( $results ) ) {
			foreach ( $results as $setting ) {
				if ( empty( $setting['setting_key'] ) ) {
					continue;
				}

				$formatted_settings[ $setting['setting_key'] ] = isset( $setting['setting_value'] ) ? $setting['setting_value'] : '';
			}
		}

		return new WP_REST_Response( $formatted_settings, 200 );
	}


	/**
	 * Update analytics settings.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_analytics_settings( $request ) {
		try {
			$settings = $request->get_param( 'settings' );

			if ( ! is_array( $settings ) ) {
				return new WP_Error(
					'invalid_settings',
					__( 'Settings must be an object', 'flexify-dashboard' ),
					array( 'status' => 400 )
				);
			}

			foreach ( $settings as $key => $value ) {
				AnalyticsDatabase::update_setting( sanitize_text_field( $key ), $value );
			}

			return new WP_REST_Response( array( 'success' => true ), 200 );
		} catch ( Exception $e ) {
			error_log( 'Flexify Dashboard Analytics Settings Update Error: ' . $e->getMessage() );

			return new WP_Error(
				'settings_update_error',
				$e->getMessage(),
				array( 'status' => 500 )
			);
		}
	}


	/**
	 * Get chart data.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_chart_data( $request ) {
		try {
			$start_date = $request->get_param( 'start_date' );
			$end_date = $request->get_param( 'end_date' );
			$chart_type = $request->get_param( 'chart_type' );

			if ( empty( $chart_type ) ) {
				$chart_type = 'pageviews';
			}

			if ( empty( $start_date ) || empty( $end_date ) ) {
				$end_date = gmdate( 'Y-m-d H:i:s' );
				$start_date = gmdate( 'Y-m-d H:i:s', strtotime( '-30 days' ) );
			}

			$provider = AnalyticsProviderRouter::get_provider();
			$chart_data = $provider->getChart( $start_date, $end_date, $chart_type );

			if ( ! is_array( $chart_data ) ) {
				$chart_data = array();
			}

			$response_data = array(
				'success' => true,
				'data' => $chart_data,
				'total_points' => isset( $chart_data['labels'] ) && is_array( $chart_data['labels'] ) ? count( $chart_data['labels'] ) : 0,
				'_provider' => $provider->getIdentifier(),
			);

			$response_data = $this->append_provider_error( $provider, $response_data );

			return new WP_REST_Response( $response_data, 200 );
		} catch ( Exception $e ) {
			error_log( 'Flexify Dashboard Analytics Chart Data Error: ' . $e->getMessage() );

			return new WP_Error(
				'chart_data_error',
				__( 'Failed to retrieve chart data', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}
	}


	/**
	 * Sanitize a required URL.
	 *
	 * @since 2.0.0
	 * @param mixed $value URL value.
	 * @return string
	 */
	public function sanitize_required_url( $value ) {
		return esc_url_raw( trim( (string) $value ) );
	}


	/**
	 * Sanitize a nullable URL.
	 *
	 * @since 2.0.0
	 * @param mixed $value URL value.
	 * @return string|null
	 */
	public function sanitize_nullable_url( $value ) {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return null;
		}

		return esc_url_raw( $value );
	}


	/**
	 * Validate a URL.
	 *
	 * @since 2.0.0
	 * @param mixed $value URL value.
	 * @return bool
	 */
	public function validate_url( $value ) {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return false;
		}

		return false !== filter_var( $value, FILTER_VALIDATE_URL );
	}


	/**
	 * Sanitize nullable text.
	 *
	 * @since 2.0.0
	 * @param mixed $value Text value.
	 * @return string|null
	 */
	public function sanitize_nullable_text( $value ) {
		$value = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : '';

		return '' === $value ? null : $value;
	}


	/**
	 * Sanitize session ID.
	 *
	 * @since 2.0.0
	 * @param mixed $value Session ID.
	 * @return string|null
	 */
	public function sanitize_session_id( $value ) {
		$value = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : '';

		return '' === $value ? null : $value;
	}


	/**
	 * Append provider error to response data when available.
	 *
	 * @since 2.0.0
	 * @param object $provider Analytics provider instance.
	 * @param array  $data Response data.
	 * @return array
	 */
	private function append_provider_error( $provider, $data ) {
		if ( method_exists( $provider, 'getLastError' ) ) {
			$last_error = $provider->getLastError();

			if ( ! empty( $last_error ) ) {
				$data['_error'] = $last_error;
			}
		}

		return $data;
	}


	/**
	 * Validate tracking payload lengths.
	 *
	 * @since 2.0.0
	 * @param string      $page_url Page URL.
	 * @param string|null $page_title Page title.
	 * @param string|null $referrer Referrer URL.
	 * @return true|WP_Error
	 */
	private function validate_tracking_payload( $page_url, $page_title, $referrer ) {
		if ( strlen( $page_url ) > self::MAX_URL_LENGTH ) {
			return new WP_Error(
				'url_too_long',
				__( 'URL exceeds maximum length', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! empty( $page_title ) && strlen( $page_title ) > self::MAX_TITLE_LENGTH ) {
			return new WP_Error(
				'title_too_long',
				__( 'Page title exceeds maximum length', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! empty( $referrer ) && strlen( $referrer ) > self::MAX_URL_LENGTH ) {
			return new WP_Error(
				'referrer_too_long',
				__( 'Referrer URL exceeds maximum length', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return true;
	}


	/**
	 * Apply request rate limiting.
	 *
	 * @since 2.0.0
	 * @return true|WP_Error
	 */
	private function maybe_apply_rate_limit() {
		$remote_addr = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$ip_hash = hash( 'sha256', $remote_addr );
		$transient_key = 'flexify_dashboard_analytics_rate_limit_' . substr( $ip_hash, 0, 16 );
		$requests = (int) get_transient( $transient_key );

		if ( $requests > self::RATE_LIMIT_REQUESTS ) {
			return new WP_Error(
				'rate_limit',
				__( 'Too many requests', 'flexify-dashboard' ),
				array( 'status' => 429 )
			);
		}

		set_transient( $transient_key, $requests + 1, HOUR_IN_SECONDS );

		return true;
	}


	/**
	 * Insert a new page view record.
	 *
	 * @since 2.0.0
	 * @param array $data Page view data.
	 * @return int|false
	 */
	private function insert_page_view( $data ) {
		global $wpdb;

		$table_name = $wpdb->prefix . 'flexify_dashboard_analytics_pageviews';

		$inserted = $wpdb->insert(
			$table_name,
			$data,
			array(
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%d',
				'%s',
			)
		);

		if ( false === $inserted ) {
			return false;
		}

		return (int) $wpdb->insert_id;
	}


	/**
	 * Parse user agent string.
	 *
	 * @since 2.0.0
	 * @param string $user_agent User agent string.
	 * @return array
	 */
	private function parse_user_agent( $user_agent ) {
		$device_type = 'desktop';
		$browser = 'unknown';
		$browser_version = '';
		$os = 'unknown';

		if ( preg_match( '/Tablet|iPad/i', $user_agent ) ) {
			$device_type = 'tablet';
		} elseif ( preg_match( '/Mobile|Android|iPhone/i', $user_agent ) ) {
			$device_type = 'mobile';
		}

		if ( preg_match( '/Edg\/([0-9.]+)/i', $user_agent, $matches ) ) {
			$browser = 'Edge';
			$browser_version = $matches[1];
		} elseif ( preg_match( '/Chrome\/([0-9.]+)/i', $user_agent, $matches ) ) {
			$browser = 'Chrome';
			$browser_version = $matches[1];
		} elseif ( preg_match( '/Firefox\/([0-9.]+)/i', $user_agent, $matches ) ) {
			$browser = 'Firefox';
			$browser_version = $matches[1];
		} elseif ( preg_match( '/Version\/([0-9.]+).*Safari/i', $user_agent, $matches ) ) {
			$browser = 'Safari';
			$browser_version = $matches[1];
		}

		if ( preg_match( '/Android/i', $user_agent ) ) {
			$os = 'Android';
		} elseif ( preg_match( '/iPhone|iPad|iPod/i', $user_agent ) ) {
			$os = 'iOS';
		} elseif ( preg_match( '/Windows/i', $user_agent ) ) {
			$os = 'Windows';
		} elseif ( preg_match( '/Mac OS X|Macintosh/i', $user_agent ) ) {
			$os = 'macOS';
		} elseif ( preg_match( '/Linux/i', $user_agent ) ) {
			$os = 'Linux';
		}

		return array(
			'device_type' => $device_type,
			'browser' => $browser,
			'browser_version' => $browser_version,
			'os' => $os,
		);
	}


	/**
	 * Get geographic information.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_geo_info() {
		return array(
			'country_code' => null,
			'city' => null,
		);
	}


	/**
	 * Get or create a session ID.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_or_create_session_id() {
		if ( isset( $_COOKIE[ self::SESSION_COOKIE_NAME ] ) ) {
			$session_id = sanitize_text_field( wp_unslash( $_COOKIE[ self::SESSION_COOKIE_NAME ] ) );

			if ( $this->is_valid_session_id( $session_id ) ) {
				return $session_id;
			}
		}

		$session_id = $this->generate_session_id();

		if ( ! headers_sent() ) {
			setcookie(
				self::SESSION_COOKIE_NAME,
				$session_id,
				time() + ( 30 * DAY_IN_SECONDS ),
				COOKIEPATH ? COOKIEPATH : '/',
				COOKIE_DOMAIN,
				is_ssl(),
				true
			);
		}

		return $session_id;
	}


	/**
	 * Generate a secure session ID.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function generate_session_id() {
		try {
			return bin2hex( random_bytes( 32 ) );
		} catch ( Exception $e ) {
			return wp_generate_password( 64, false, false );
		}
	}


	/**
	 * Validate session ID format.
	 *
	 * @since 2.0.0
	 * @param string $session_id Session ID.
	 * @return bool
	 */
	private function is_valid_session_id( $session_id ) {
		return ! empty( $session_id ) && preg_match( '/^[a-zA-Z0-9.]+$/', $session_id ) && strlen( $session_id ) <= 128;
	}


	/**
	 * Hash IP address for privacy.
	 *
	 * @since 2.0.0
	 * @param string $ip IP address.
	 * @return string
	 */
	private function hash_ip( $ip ) {
		return hash( 'sha256', (string) $ip . wp_salt() );
	}


	/**
	 * Check if visitor is unique for the session and page.
	 *
	 * @since 2.0.0
	 * @param string $session_id Session ID.
	 * @param string $page_url Page URL.
	 * @return bool
	 */
	private function is_unique_visitor( $session_id, $page_url ) {
		global $wpdb;

		$table_name = $wpdb->prefix . 'flexify_dashboard_analytics_pageviews';
		$count = (int) $wpdb->get_var(
			$wpdb->prepare(
				"
				SELECT COUNT(*)
				FROM {$table_name}
				WHERE session_id = %s
					AND page_url = %s
					AND created_at >= %s
				",
				$session_id,
				$page_url,
				gmdate( 'Y-m-d H:i:s', strtotime( '-24 hours' ) )
			)
		);

		return 0 === $count;
	}


	/**
	 * Extract domain from URL.
	 *
	 * @since 2.0.0
	 * @param string|null $url URL.
	 * @return string|null
	 */
	private function extract_domain( $url ) {
		if ( empty( $url ) ) {
			return null;
		}

		$parsed = wp_parse_url( $url );

		return isset( $parsed['host'] ) ? sanitize_text_field( $parsed['host'] ) : null;
	}
}
