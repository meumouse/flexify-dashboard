<?php

namespace MeuMouse\Flexify_Dashboard\Analytics\Providers;

use DateInterval;
use DateTime;
use Exception;

defined('ABSPATH') || exit;

/**
 * Class GoogleAnalyticsProvider
 *
 * Google Analytics 4 provider that fetches data from the Google Analytics Data API.
 * Uses Service Account authentication with JWT for simpler setup.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Analytics\Providers
 * @author MeuMouse.com
 */
class GoogleAnalyticsProvider implements AnalyticsProviderInterface {
    
	/**
	 * Google Analytics Data API base URL.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const API_BASE_URL = 'https://analyticsdata.googleapis.com/v1beta';

	/**
	 * Google OAuth token URL.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const TOKEN_URL = 'https://oauth2.googleapis.com/token';

	/**
	 * Cache duration for report responses.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const CACHE_DURATION = 300;

	/**
	 * Cache duration for access token.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const TOKEN_CACHE_DURATION = 3000;

	/**
	 * Settings option key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const SETTINGS_OPTION = 'flexify_dashboard_settings';

	/**
	 * Access token transient key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const ACCESS_TOKEN_TRANSIENT = 'flexify_dashboard_ga_access_token';

	/**
	 * Last error transient key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const LAST_ERROR_TRANSIENT = 'flexify_dashboard_ga_last_error';

	/**
	 * Service account setting key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const SERVICE_ACCOUNT_SETTING = 'google_analytics_service_account';

	/**
	 * Property ID setting key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const PROPERTY_ID_SETTING = 'google_analytics_property_id';

	/**
	 * Provider settings.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $settings = array();


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		$this->settings = $this->get_settings();
	}


	/**
	 * Get the provider identifier.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function getIdentifier(): string {
		return 'google_analytics';
	}


	/**
	 * Get the provider display name.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function getDisplayName(): string {
		return __( 'Google Analytics 4', 'flexify-dashboard' );
	}


	/**
	 * Check if the provider is properly configured.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public function isConfigured(): bool {
		$has_service_account = ! empty( $this->settings[ self::SERVICE_ACCOUNT_SETTING ] );
		$has_property_id = ! empty( $this->settings[ self::PROPERTY_ID_SETTING ] );

		return $has_service_account && $has_property_id;
	}


	/**
	 * Get overview statistics for the specified date range.
	 *
	 * @since 2.0.0
	 * @param string      $start_date Start date in ISO 8601 format.
	 * @param string      $end_date End date in ISO 8601 format.
	 * @param string|null $page_url Optional page URL filter.
	 * @return array
	 */
	public function getOverview( string $start_date, string $end_date, ?string $page_url = null ): array {
		if ( ! $this->isConfigured() ) {
			return $this->get_empty_overview();
		}

		$cache_key = 'ga_overview_' . md5( $start_date . $end_date . ( $page_url ?? '' ) );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$request_body = array(
			'dateRanges' => array(
				array(
					'startDate' => $this->format_date_for_ga( $start_date ),
					'endDate'   => $this->format_date_for_ga( $end_date ),
				),
			),
			'metrics'    => array(
				array( 'name' => 'screenPageViews' ),
				array( 'name' => 'activeUsers' ),
				array( 'name' => 'averageSessionDuration' ),
				array( 'name' => 'bounceRate' ),
			),
		);

		if ( ! empty( $page_url ) ) {
			$request_body['dimensionFilter'] = array(
				'filter' => array(
					'fieldName'    => 'pagePath',
					'stringFilter' => array(
						'matchType' => 'EXACT',
						'value'     => parse_url( $page_url, PHP_URL_PATH ) ?: $page_url,
					),
				),
			);
		}

		$current_data = $this->run_report( $request_body );
		$comparison_period = $this->get_comparison_period( $start_date, $end_date );

		$request_body['dateRanges'] = array(
			array(
				'startDate' => $this->format_date_for_ga( $comparison_period['start'] ),
				'endDate'   => $this->format_date_for_ga( $comparison_period['end'] ),
			),
		);

		$comparison_data = $this->run_report( $request_body );

		$result = array(
			'total_views'           => (int) ( $current_data['screenPageViews'] ?? 0 ),
			'total_unique_visitors' => (int) ( $current_data['activeUsers'] ?? 0 ),
			'avg_time_on_page'      => (float) ( $current_data['averageSessionDuration'] ?? 0 ),
			'avg_bounce_rate'       => (float) ( $current_data['bounceRate'] ?? 0 ) * 100,
			'unique_pages'          => 0,
			'comparison'            => array(
				'total_views'           => (int) ( $comparison_data['screenPageViews'] ?? 0 ),
				'total_unique_visitors' => (int) ( $comparison_data['activeUsers'] ?? 0 ),
				'avg_time_on_page'      => (float) ( $comparison_data['averageSessionDuration'] ?? 0 ),
				'avg_bounce_rate'       => (float) ( $comparison_data['bounceRate'] ?? 0 ) * 100,
				'unique_pages'          => 0,
				'period'                => $comparison_period,
			),
		);

		set_transient( $cache_key, $result, self::CACHE_DURATION );

		return $result;
	}


	/**
	 * Get page-level statistics.
	 *
	 * @since 2.0.0
	 * @param string      $start_date Start date in ISO 8601 format.
	 * @param string      $end_date End date in ISO 8601 format.
	 * @param string|null $page_url Optional page URL filter.
	 * @return array
	 */
	public function getPages( string $start_date, string $end_date, ?string $page_url = null ): array {
		if ( ! $this->isConfigured() ) {
			return array();
		}

		$cache_key = 'ga_pages_' . md5( $start_date . $end_date . ( $page_url ?? '' ) );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$request_body = array(
			'dateRanges' => array(
				array(
					'startDate' => $this->format_date_for_ga( $start_date ),
					'endDate'   => $this->format_date_for_ga( $end_date ),
				),
			),
			'dimensions' => array(
				array( 'name' => 'pagePath' ),
				array( 'name' => 'pageTitle' ),
			),
			'metrics'    => array(
				array( 'name' => 'screenPageViews' ),
				array( 'name' => 'activeUsers' ),
				array( 'name' => 'averageSessionDuration' ),
				array( 'name' => 'bounceRate' ),
			),
			'limit'      => 50,
			'orderBys'   => array(
				array(
					'metric' => array(
						'metricName' => 'screenPageViews',
					),
					'desc'   => true,
				),
			),
		);

		$response = $this->run_report_with_dimensions( $request_body );
		$pages = array();

		foreach ( $response as $row ) {
			$page_path = $row['pagePath'] ?? '';

			if ( ! empty( $page_url ) ) {
				$requested_path = parse_url( $page_url, PHP_URL_PATH ) ?: $page_url;

				if ( $requested_path !== $page_path ) {
					continue;
				}
			}

			$pages[] = array(
				'page_url'              => $page_path,
				'page_title'            => $row['pageTitle'] ?? '',
				'total_views'           => (int) ( $row['screenPageViews'] ?? 0 ),
				'total_unique_visitors' => (int) ( $row['activeUsers'] ?? 0 ),
				'avg_time_on_page'      => (float) ( $row['averageSessionDuration'] ?? 0 ),
				'bounce_rate'           => (float) ( $row['bounceRate'] ?? 0 ) * 100,
			);
		}

		set_transient( $cache_key, $pages, self::CACHE_DURATION );

		return $pages;
	}


	/**
	 * Get referrer statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array
	 */
	public function getReferrers( string $start_date, string $end_date ): array {
		if ( ! $this->isConfigured() ) {
			return array();
		}

		$cache_key = 'ga_referrers_' . md5( $start_date . $end_date );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$request_body = array(
			'dateRanges' => array(
				array(
					'startDate' => $this->format_date_for_ga( $start_date ),
					'endDate'   => $this->format_date_for_ga( $end_date ),
				),
			),
			'dimensions' => array(
				array( 'name' => 'sessionSource' ),
			),
			'metrics'    => array(
				array( 'name' => 'sessions' ),
				array( 'name' => 'activeUsers' ),
			),
			'limit'      => 20,
			'orderBys'   => array(
				array(
					'metric' => array(
						'metricName' => 'sessions',
					),
					'desc'   => true,
				),
			),
		);

		$response = $this->run_report_with_dimensions( $request_body );
		$referrers = array();

		foreach ( $response as $row ) {
			$referrers[] = array(
				'referrer_domain'       => $row['sessionSource'] ?? '(direct)',
				'total_visits'          => (int) ( $row['sessions'] ?? 0 ),
				'total_unique_visitors' => (int) ( $row['activeUsers'] ?? 0 ),
			);
		}

		set_transient( $cache_key, $referrers, self::CACHE_DURATION );

		return $referrers;
	}


	/**
	 * Get device statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array
	 */
	public function getDevices( string $start_date, string $end_date ): array {
		if ( ! $this->isConfigured() ) {
			return array();
		}

		$cache_key = 'ga_devices_' . md5( $start_date . $end_date );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$request_body = array(
			'dateRanges' => array(
				array(
					'startDate' => $this->format_date_for_ga( $start_date ),
					'endDate'   => $this->format_date_for_ga( $end_date ),
				),
			),
			'dimensions' => array(
				array( 'name' => 'deviceCategory' ),
				array( 'name' => 'browser' ),
				array( 'name' => 'operatingSystem' ),
			),
			'metrics'    => array(
				array( 'name' => 'screenPageViews' ),
				array( 'name' => 'activeUsers' ),
			),
			'limit'      => 20,
			'orderBys'   => array(
				array(
					'metric' => array(
						'metricName' => 'screenPageViews',
					),
					'desc'   => true,
				),
			),
		);

		$response = $this->run_report_with_dimensions( $request_body );
		$devices = array();

		foreach ( $response as $row ) {
			$devices[] = array(
				'device_type'           => strtolower( $row['deviceCategory'] ?? 'desktop' ),
				'browser'               => $row['browser'] ?? 'unknown',
				'os'                    => $row['operatingSystem'] ?? 'unknown',
				'total_views'           => (int) ( $row['screenPageViews'] ?? 0 ),
				'total_unique_visitors' => (int) ( $row['activeUsers'] ?? 0 ),
			);
		}

		set_transient( $cache_key, $devices, self::CACHE_DURATION );

		return $devices;
	}


	/**
	 * Get geographic statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array
	 */
	public function getGeo( string $start_date, string $end_date ): array {
		if ( ! $this->isConfigured() ) {
			return array();
		}

		$cache_key = 'ga_geo_' . md5( $start_date . $end_date );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$request_body = array(
			'dateRanges' => array(
				array(
					'startDate' => $this->format_date_for_ga( $start_date ),
					'endDate'   => $this->format_date_for_ga( $end_date ),
				),
			),
			'dimensions' => array(
				array( 'name' => 'country' ),
				array( 'name' => 'city' ),
			),
			'metrics'    => array(
				array( 'name' => 'screenPageViews' ),
				array( 'name' => 'activeUsers' ),
			),
			'limit'      => 20,
			'orderBys'   => array(
				array(
					'metric' => array(
						'metricName' => 'screenPageViews',
					),
					'desc'   => true,
				),
			),
		);

		$response = $this->run_report_with_dimensions( $request_body );
		$geo = array();

		foreach ( $response as $row ) {
			$geo[] = array(
				'country_code'          => $this->country_name_to_code( $row['country'] ?? '' ),
				'city'                  => $row['city'] ?? null,
				'total_views'           => (int) ( $row['screenPageViews'] ?? 0 ),
				'total_unique_visitors' => (int) ( $row['activeUsers'] ?? 0 ),
			);
		}

		set_transient( $cache_key, $geo, self::CACHE_DURATION );

		return $geo;
	}


	/**
	 * Get events statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array
	 */
	public function getEvents( string $start_date, string $end_date ): array {
		if ( ! $this->isConfigured() ) {
			return array();
		}

		$cache_key = 'ga_events_' . md5( $start_date . $end_date );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$request_body = array(
			'dateRanges' => array(
				array(
					'startDate' => $this->format_date_for_ga( $start_date ),
					'endDate'   => $this->format_date_for_ga( $end_date ),
				),
			),
			'dimensions' => array(
				array( 'name' => 'eventName' ),
			),
			'metrics'    => array(
				array( 'name' => 'eventCount' ),
				array( 'name' => 'activeUsers' ),
			),
			'limit'      => 20,
			'orderBys'   => array(
				array(
					'metric' => array(
						'metricName' => 'eventCount',
					),
					'desc'   => true,
				),
			),
		);

		$response = $this->run_report_with_dimensions( $request_body );
		$events = array();

		foreach ( $response as $row ) {
			$events[] = array(
				'event_type'   => $row['eventName'] ?? 'unknown',
				'total_count'  => (int) ( $row['eventCount'] ?? 0 ),
				'unique_users' => (int) ( $row['activeUsers'] ?? 0 ),
			);
		}

		set_transient( $cache_key, $events, self::CACHE_DURATION );

		return $events;
	}


	/**
	 * Get chart data for visualization.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @param string $chart_type Type of chart data.
	 * @return array
	 */
	public function getChart( string $start_date, string $end_date, string $chart_type = 'pageviews' ): array {
		if ( ! $this->isConfigured() ) {
			return $this->get_empty_chart();
		}

		$cache_key = 'ga_chart_' . md5( $start_date . $end_date . $chart_type );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$metrics = $this->get_chart_metrics( $chart_type );

		$request_body = array(
			'dateRanges' => array(
				array(
					'startDate' => $this->format_date_for_ga( $start_date ),
					'endDate'   => $this->format_date_for_ga( $end_date ),
				),
			),
			'dimensions' => array(
				array( 'name' => 'date' ),
			),
			'metrics'    => $metrics,
			'orderBys'   => array(
				array(
					'dimension' => array(
						'dimensionName' => 'date',
					),
					'desc'      => false,
				),
			),
		);

		$response = $this->run_report_with_dimensions( $request_body );

		if ( 'both' === $chart_type ) {
			$chart_data = array(
				'labels'   => array(),
				'datasets' => array(
					array(
						'label'           => 'Page Views',
						'data'            => array(),
						'borderColor'     => 'rgb(0, 138, 255)',
						'backgroundColor' => 'rgba(0, 138, 255, 0.1)',
						'tension'         => 0.4,
					),
					array(
						'label'           => 'Unique Visitors',
						'data'            => array(),
						'borderColor'     => 'rgb(16, 185, 129)',
						'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
						'tension'         => 0.4,
					),
				),
			);

			foreach ( $response as $row ) {
				$chart_data['labels'][] = $this->format_ga_date_for_display( $row['date'] ?? '' );
				$chart_data['datasets'][0]['data'][] = (int) ( $row['screenPageViews'] ?? 0 );
				$chart_data['datasets'][1]['data'][] = (int) ( $row['activeUsers'] ?? 0 );
			}

			set_transient( $cache_key, $chart_data, self::CACHE_DURATION );

			return $chart_data;
		}

		$metric_key = 'visitors' === $chart_type ? 'activeUsers' : 'screenPageViews';
		$chart_data = array(
			'labels'   => array(),
			'datasets' => array(
				array(
					'label'           => 'visitors' === $chart_type ? 'Unique Visitors' : 'Page Views',
					'data'            => array(),
					'borderColor'     => 'visitors' === $chart_type ? 'rgb(16, 185, 129)' : 'rgb(0, 138, 255)',
					'backgroundColor' => 'visitors' === $chart_type ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 138, 255, 0.1)',
					'tension'         => 0.4,
				),
			),
		);

		foreach ( $response as $row ) {
			$chart_data['labels'][] = $this->format_ga_date_for_display( $row['date'] ?? '' );
			$chart_data['datasets'][0]['data'][] = (int) ( $row[ $metric_key ] ?? 0 );
		}

		set_transient( $cache_key, $chart_data, self::CACHE_DURATION );

		return $chart_data;
	}


	/**
	 * Get count of currently active users.
	 *
	 * @since 2.0.0
	 * @param string|null $timezone Browser timezone.
	 * @param string|null $browser_time Browser time in ISO format.
	 * @return array
	 */
	public function getActiveUsers( ?string $timezone = null, ?string $browser_time = null ): array {
		if ( ! $this->isConfigured() ) {
			return array(
				'active_users' => 0,
				'timestamp'    => current_time( 'mysql' ),
				'timeframe'    => '30 minutes',
			);
		}

		$property_id = $this->settings[ self::PROPERTY_ID_SETTING ];
		$url = self::API_BASE_URL . '/properties/' . rawurlencode( $property_id ) . ':runRealtimeReport';

		$request_body = array(
			'metrics' => array(
				array( 'name' => 'activeUsers' ),
			),
		);

		$response = $this->make_api_request( $url, $request_body );
		$active_users = 0;

		if ( isset( $response['rows'][0]['metricValues'][0]['value'] ) ) {
			$active_users = (int) $response['rows'][0]['metricValues'][0]['value'];
		}

		return array(
			'active_users'     => $active_users,
			'timestamp'        => current_time( 'mysql' ),
			'browser_timezone' => $timezone,
			'browser_time'     => $browser_time,
			'timeframe'        => '30 minutes',
		);
	}


	/**
	 * Get the last API error.
	 *
	 * @since 2.0.0
	 * @return array|null
	 */
	public function getLastError(): ?array {
		$error = get_transient( self::LAST_ERROR_TRANSIENT );

		return is_array( $error ) ? $error : null;
	}


	/**
	 * Get service account credentials from stored JSON.
	 *
	 * @since 2.0.0
	 * @return array|null
	 */
	private function get_service_account_credentials(): ?array {
		$json = $this->settings[ self::SERVICE_ACCOUNT_SETTING ] ?? '';

		if ( empty( $json ) ) {
			return null;
		}

		$decrypted = $this->decrypt_token( $json );
		$credentials = json_decode( $decrypted, true );

		if ( ! is_array( $credentials ) || ! isset( $credentials['private_key'], $credentials['client_email'] ) ) {
			$credentials = json_decode( $json, true );
		}

		if ( ! is_array( $credentials ) || ! isset( $credentials['private_key'], $credentials['client_email'] ) ) {
			return null;
		}

		return $credentials;
	}


	/**
	 * Generate JWT for service account authentication.
	 *
	 * @since 2.0.0
	 * @param array $credentials Service account credentials.
	 * @return string|null
	 */
	private function generate_jwt( $credentials ): ?string {
		$now = time();
		$expiry = $now + HOUR_IN_SECONDS;

		$header = array(
			'alg' => 'RS256',
			'typ' => 'JWT',
		);

		$payload = array(
			'iss'   => $credentials['client_email'],
			'scope' => 'https://www.googleapis.com/auth/analytics.readonly',
			'aud'   => self::TOKEN_URL,
			'iat'   => $now,
			'exp'   => $expiry,
		);

		$header_encoded = $this->base64_url_encode( wp_json_encode( $header ) );
		$payload_encoded = $this->base64_url_encode( wp_json_encode( $payload ) );
		$data_to_sign = $header_encoded . '.' . $payload_encoded;
		$signature = '';
		$success = openssl_sign( $data_to_sign, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256 );

		if ( ! $success ) {
			error_log( 'Flexify Dashboard GA: Failed to sign JWT.' );

			return null;
		}

		return $header_encoded . '.' . $payload_encoded . '.' . $this->base64_url_encode( $signature );
	}


	/**
	 * Encode data using JWT-safe base64 URL encoding.
	 *
	 * @since 2.0.0
	 * @param string $data Data to encode.
	 * @return string
	 */
	private function base64_url_encode( $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}


	/**
	 * Get access token using service account JWT.
	 *
	 * @since 2.0.0
	 * @return string|null
	 */
	private function get_access_token(): ?string {
		$cached_token = get_transient( self::ACCESS_TOKEN_TRANSIENT );

		if ( ! empty( $cached_token ) && is_string( $cached_token ) ) {
			return $cached_token;
		}

		$credentials = $this->get_service_account_credentials();

		if ( empty( $credentials ) ) {
			return null;
		}

		$jwt = $this->generate_jwt( $credentials );

		if ( empty( $jwt ) ) {
			return null;
		}

		$response = wp_remote_post(
			self::TOKEN_URL,
			array(
				'body'    => array(
					'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
					'assertion'  => $jwt,
				),
				'timeout' => 30,
			)
		);

		if ( is_wp_error( $response ) ) {
			return null;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $body['access_token'] ) ) {
			set_transient( self::ACCESS_TOKEN_TRANSIENT, $body['access_token'], self::TOKEN_CACHE_DURATION );

			return $body['access_token'];
		}

		return null;
	}


	/**
	 * Run a GA4 report and return aggregated metrics.
	 *
	 * @since 2.0.0
	 * @param array $request_body Report request body.
	 * @return array
	 */
	private function run_report( $request_body ): array {
		$property_id = $this->settings[ self::PROPERTY_ID_SETTING ];
		$url = self::API_BASE_URL . '/properties/' . rawurlencode( $property_id ) . ':runReport';
		$response = $this->make_api_request( $url, $request_body );
		$result = array();

		if ( isset( $response['rows'][0]['metricValues'] ) ) {
			$metric_headers = $response['metricHeaders'] ?? array();

			foreach ( $response['rows'][0]['metricValues'] as $index => $metric ) {
				$metric_name = $metric_headers[ $index ]['name'] ?? 'metric_' . $index;
				$result[ $metric_name ] = $metric['value'] ?? 0;
			}
		}

		return $result;
	}


	/**
	 * Run a GA4 report with dimensions and return rows.
	 *
	 * @since 2.0.0
	 * @param array $request_body Report request body.
	 * @return array
	 */
	private function run_report_with_dimensions( $request_body ): array {
		$property_id = $this->settings[ self::PROPERTY_ID_SETTING ];
		$url = self::API_BASE_URL . '/properties/' . rawurlencode( $property_id ) . ':runReport';
		$response = $this->make_api_request( $url, $request_body );
		$rows = array();

		if ( ! isset( $response['rows'] ) || ! is_array( $response['rows'] ) ) {
			return $rows;
		}

		$dimension_headers = array();
		$metric_headers = array();

		foreach ( $response['dimensionHeaders'] ?? array() as $header ) {
			$dimension_headers[] = $header['name'] ?? '';
		}

		foreach ( $response['metricHeaders'] ?? array() as $header ) {
			$metric_headers[] = $header['name'] ?? '';
		}

		foreach ( $response['rows'] as $row ) {
			$row_data = array();

			foreach ( $row['dimensionValues'] ?? array() as $index => $dimension ) {
				$key = $dimension_headers[ $index ] ?? 'dimension_' . $index;
				$row_data[ $key ] = $dimension['value'] ?? '';
			}

			foreach ( $row['metricValues'] ?? array() as $index => $metric ) {
				$key = $metric_headers[ $index ] ?? 'metric_' . $index;
				$row_data[ $key ] = $metric['value'] ?? 0;
			}

			$rows[] = $row_data;
		}

		return $rows;
	}


	/**
	 * Make an API request to Google Analytics.
	 *
	 * @since 2.0.0
	 * @param string $url API endpoint URL.
	 * @param array  $body Request body.
	 * @return array
	 */
	private function make_api_request( string $url, array $body ): array {
		$access_token = $this->get_valid_access_token();

		if ( empty( $access_token ) ) {
			$this->set_last_error(
				'no_access_token',
				__( 'Could not authenticate with Google Analytics. Please check your service account credentials.', 'flexify-dashboard' )
			);

			return array();
		}

		$response = wp_remote_post(
			$url,
			array(
				'headers' => array(
					'Authorization' => 'Bearer ' . $access_token,
					'Content-Type'  => 'application/json',
				),
				'body'    => wp_json_encode( $body ),
				'timeout' => 30,
			)
		);

		if ( is_wp_error( $response ) ) {
			$this->set_last_error( 'network_error', $response->get_error_message() );

			return array();
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );
		$parsed_body = json_decode( $response_body, true );

		if ( 200 !== (int) $status_code ) {
			$error_message = $parsed_body['error']['message'] ?? 'Unknown error';
			$error_status = $parsed_body['error']['status'] ?? 'UNKNOWN';

			if ( 403 === (int) $status_code && 'PERMISSION_DENIED' === $error_status ) {
				$this->set_last_error(
					'permission_denied',
					__( 'Permission denied: The service account does not have access to this Google Analytics property. Please add the service account email to your GA4 property with Viewer access. Go to Google Analytics → Admin → Property Access Management and add the service account email.', 'flexify-dashboard' ),
					array(
						'help_url'        => 'https://support.google.com/analytics/answer/9305587',
						'action_required' => 'add_service_account_to_property',
					)
				);
			} elseif ( 401 === (int) $status_code ) {
				$this->set_last_error(
					'authentication_failed',
					__( 'Authentication failed. The access token is invalid or expired. Please try reconnecting your Google Analytics account.', 'flexify-dashboard' )
				);

				$this->refresh_access_token();
			} elseif ( 404 === (int) $status_code ) {
				$this->set_last_error(
					'property_not_found',
					__( 'The specified Google Analytics property was not found. Please check that the Property ID is correct.', 'flexify-dashboard' )
				);
			} else {
				$this->set_last_error(
					'api_error',
					$error_message,
					array(
						'status_code' => (int) $status_code,
					)
				);
			}

			return array();
		}

		$this->clear_last_error();

		return is_array( $parsed_body ) ? $parsed_body : array();
	}


	/**
	 * Store the last API error.
	 *
	 * @since 2.0.0
	 * @param string $code Error code.
	 * @param string $message User-friendly error message.
	 * @param array  $extra Additional error data.
	 * @return void
	 */
	private function set_last_error( string $code, string $message, array $extra = array() ): void {
		$error = array(
			'code'      => $code,
			'message'   => $message,
			'timestamp' => time(),
		);

		if ( ! empty( $extra ) ) {
			$error = array_merge( $error, $extra );
		}

		set_transient( self::LAST_ERROR_TRANSIENT, $error, HOUR_IN_SECONDS );
	}


	/**
	 * Clear the last API error.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function clear_last_error(): void {
		delete_transient( self::LAST_ERROR_TRANSIENT );
	}


	/**
	 * Get a valid access token.
	 *
	 * @since 2.0.0
	 * @return string|null
	 */
	private function get_valid_access_token(): ?string {
		return $this->get_access_token();
	}


	/**
	 * Refresh the access token.
	 *
	 * @since 2.0.0
	 * @return string|null
	 */
	private function refresh_access_token(): ?string {
		delete_transient( self::ACCESS_TOKEN_TRANSIENT );

		return $this->get_access_token();
	}


	/**
	 * Get plugin settings.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_settings(): array {
		$settings = get_option( self::SETTINGS_OPTION, array() );

		return is_array( $settings ) ? $settings : array();
	}


	/**
	 * Decrypt a stored token.
	 *
	 * @since 2.0.0
	 * @param string $encrypted_token Encrypted token.
	 * @return string
	 */
	private function decrypt_token( string $encrypted_token ): string {
		if ( empty( $encrypted_token ) ) {
			return '';
		}

		$key = wp_salt( 'auth' );
		$iv = substr( md5( $key ), 0, 16 );
		$decoded = base64_decode( $encrypted_token, true );

		if ( false === $decoded ) {
			return '';
		}

		$decrypted = openssl_decrypt( $decoded, 'AES-256-CBC', $key, 0, $iv );

		return false !== $decrypted ? $decrypted : '';
	}


	/**
	 * Format a date string for GA4 API.
	 *
	 * @since 2.0.0
	 * @param string $date Date string.
	 * @return string
	 */
	private function format_date_for_ga( string $date ): string {
		$timestamp = strtotime( $date );

		return $timestamp ? gmdate( 'Y-m-d', $timestamp ) : gmdate( 'Y-m-d' );
	}


	/**
	 * Format GA4 date for display.
	 *
	 * @since 2.0.0
	 * @param string $ga_date GA4 date string.
	 * @return string
	 */
	private function format_ga_date_for_display( string $ga_date ): string {
		if ( 8 === strlen( $ga_date ) ) {
			return substr( $ga_date, 0, 4 ) . '-' . substr( $ga_date, 4, 2 ) . '-' . substr( $ga_date, 6, 2 );
		}

		return $ga_date;
	}


	/**
	 * Calculate comparison period dates.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date for current period.
	 * @param string $end_date End date for current period.
	 * @return array
	 */
	private function get_comparison_period( string $start_date, string $end_date ): array {
		$start = new DateTime( $start_date );
		$end = new DateTime( $end_date );
		$duration = (int) $end->diff( $start )->days;

		$comparison_end = clone $start;
		$comparison_end->sub( new DateInterval( 'P1D' ) );

		$comparison_start = clone $comparison_end;
		$comparison_start->sub( new DateInterval( 'P' . $duration . 'D' ) );

		return array(
			'start' => $comparison_start->format( 'Y-m-d H:i:s' ),
			'end'   => $comparison_end->format( 'Y-m-d H:i:s' ),
		);
	}


	/**
	 * Convert country name to ISO code.
	 *
	 * @since 2.0.0
	 * @param string $country_name Country name.
	 * @return string
	 */
	private function country_name_to_code( string $country_name ): string {
		$mapping = array(
			'United States'  => 'US',
			'United Kingdom' => 'GB',
			'Canada'         => 'CA',
			'Australia'      => 'AU',
			'Germany'        => 'DE',
			'France'         => 'FR',
			'Spain'          => 'ES',
			'Italy'          => 'IT',
			'Netherlands'    => 'NL',
			'Brazil'         => 'BR',
			'India'          => 'IN',
			'Japan'          => 'JP',
			'China'          => 'CN',
			'Russia'         => 'RU',
			'Mexico'         => 'MX',
		);

		if ( isset( $mapping[ $country_name ] ) ) {
			return $mapping[ $country_name ];
		}

		$fallback = strtoupper( substr( $country_name, 0, 2 ) );

		return ! empty( $fallback ) ? $fallback : '--';
	}


	/**
	 * Get the metrics configuration for chart request.
	 *
	 * @since 2.0.0
	 * @param string $chart_type Chart type.
	 * @return array
	 */
	private function get_chart_metrics( string $chart_type ): array {
		switch ( $chart_type ) {
			case 'visitors':
				return array(
					array( 'name' => 'activeUsers' ),
				);

			case 'both':
				return array(
					array( 'name' => 'screenPageViews' ),
					array( 'name' => 'activeUsers' ),
				);

			case 'pageviews':
			default:
				return array(
					array( 'name' => 'screenPageViews' ),
				);
		}
	}


	/**
	 * Get empty overview structure.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_empty_overview(): array {
		return array(
			'total_views'           => 0,
			'total_unique_visitors' => 0,
			'avg_time_on_page'      => 0,
			'avg_bounce_rate'       => 0,
			'unique_pages'          => 0,
			'comparison'            => array(
				'total_views'           => 0,
				'total_unique_visitors' => 0,
				'avg_time_on_page'      => 0,
				'avg_bounce_rate'       => 0,
				'unique_pages'          => 0,
				'period'                => array(
					'start' => '',
					'end'   => '',
				),
			),
		);
	}


	/**
	 * Get empty chart structure.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_empty_chart(): array {
		return array(
			'labels'   => array(),
			'datasets' => array(
				array(
					'label'           => 'Page Views',
					'data'            => array(),
					'borderColor'     => 'rgb(0, 138, 255)',
					'backgroundColor' => 'rgba(0, 138, 255, 0.1)',
					'tension'         => 0.4,
				),
			),
		);
	}
}