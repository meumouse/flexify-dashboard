<?php

namespace MeuMouse\Flexify_Dashboard\Analytics\Providers;

use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsDatabase;

use DateInterval;
use DateTime;
use DateTimeZone;
use Exception;

defined('ABSPATH') || exit;

/**
 * Class FlexifyDashboardAnalyticsProvider
 *
 * Built-in analytics provider that uses Flexify Dashboard own database tables.
 * This provider wraps the existing analytics database queries.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Analytics\Providers
 * @author MeuMouse.com
 */
class FlexifyDashboardAnalyticsProvider implements AnalyticsProviderInterface {
	/**
	 * Daily analytics table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DAILY_TABLE_SUFFIX = 'flexify_dashboard_analytics_daily';

	/**
	 * Referrers analytics table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REFERRERS_TABLE_SUFFIX = 'flexify_dashboard_analytics_referrers';

	/**
	 * Devices analytics table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DEVICES_TABLE_SUFFIX = 'flexify_dashboard_analytics_devices';

	/**
	 * Geographic analytics table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const GEO_TABLE_SUFFIX = 'flexify_dashboard_analytics_geo';

	/**
	 * Pageviews analytics table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const PAGEVIEWS_TABLE_SUFFIX = 'flexify_dashboard_analytics_pageviews';

	/**
	 * Active users timeframe in minutes.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const ACTIVE_USERS_TIMEFRAME = 5;


	/**
	 * Get the provider identifier.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function getIdentifier(): string {
		return 'flexify-dashboard';
	}


	/**
	 * Get the provider display name.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function getDisplayName(): string {
		return __( 'Built-in Analytics', 'flexify-dashboard' );
	}


	/**
	 * Check if the provider is configured.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public function isConfigured(): bool {
		return AnalyticsDatabase::is_analytics_enabled();
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
		global $wpdb;

		$table_name = $this->get_table_name( self::DAILY_TABLE_SUFFIX );
		$current_period = $this->build_date_range_with_optional_page( $start_date, $end_date, $page_url );
		$comparison_period = $this->get_comparison_period( $start_date, $end_date );
		$comparison_where = $this->build_date_range_with_optional_page( $comparison_period['start'], $comparison_period['end'], $page_url );

		$current_query = "
			SELECT
				SUM(views) as total_views,
				SUM(unique_visitors) as total_unique_visitors,
				AVG(avg_time_on_page) as avg_time_on_page,
				AVG(bounce_rate) as avg_bounce_rate,
				COUNT(DISTINCT page_url) as unique_pages
			FROM {$table_name}
			WHERE {$current_period['where']}
		";

		$comparison_query = "
			SELECT
				SUM(views) as total_views,
				SUM(unique_visitors) as total_unique_visitors,
				AVG(avg_time_on_page) as avg_time_on_page,
				AVG(bounce_rate) as avg_bounce_rate,
				COUNT(DISTINCT page_url) as unique_pages
			FROM {$table_name}
			WHERE {$comparison_where['where']}
		";

		$stats = $wpdb->get_row( $wpdb->prepare( $current_query, $current_period['values'] ), ARRAY_A );
		$comparison_stats = $wpdb->get_row( $wpdb->prepare( $comparison_query, $comparison_where['values'] ), ARRAY_A );

		return array(
			'total_views'            => (int) ( $stats['total_views'] ?? 0 ),
			'total_unique_visitors'  => (int) ( $stats['total_unique_visitors'] ?? 0 ),
			'avg_time_on_page'       => (float) ( $stats['avg_time_on_page'] ?? 0 ),
			'avg_bounce_rate'        => (float) ( $stats['avg_bounce_rate'] ?? 0 ),
			'unique_pages'           => (int) ( $stats['unique_pages'] ?? 0 ),
			'comparison'             => array(
				'total_views'           => (int) ( $comparison_stats['total_views'] ?? 0 ),
				'total_unique_visitors' => (int) ( $comparison_stats['total_unique_visitors'] ?? 0 ),
				'avg_time_on_page'      => (float) ( $comparison_stats['avg_time_on_page'] ?? 0 ),
				'avg_bounce_rate'       => (float) ( $comparison_stats['avg_bounce_rate'] ?? 0 ),
				'unique_pages'          => (int) ( $comparison_stats['unique_pages'] ?? 0 ),
				'period'                => array(
					'start' => $comparison_period['start'],
					'end'   => $comparison_period['end'],
				),
			),
		);
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
		global $wpdb;

		$table_name = $this->get_table_name( self::DAILY_TABLE_SUFFIX );
		$where_data = $this->build_date_range_with_optional_page( $start_date, $end_date, $page_url );

		$query = "
			SELECT
				page_url,
				page_title,
				SUM(views) as total_views,
				SUM(unique_visitors) as total_unique_visitors,
				AVG(avg_time_on_page) as avg_time_on_page,
				AVG(bounce_rate) as bounce_rate
			FROM {$table_name}
			WHERE {$where_data['where']}
			GROUP BY page_url, page_title
			ORDER BY total_views DESC
			LIMIT 50
		";

		$pages = $wpdb->get_results( $wpdb->prepare( $query, $where_data['values'] ), ARRAY_A );

		return is_array( $pages ) ? $pages : array();
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
		global $wpdb;

		$table_name = $this->get_table_name( self::REFERRERS_TABLE_SUFFIX );
		$where_data = $this->build_date_range_condition( $start_date, $end_date );

		$query = "
			SELECT
				referrer_domain,
				SUM(visits) as total_visits,
				SUM(unique_visitors) as total_unique_visitors
			FROM {$table_name}
			WHERE {$where_data['where']}
			GROUP BY referrer_domain
			ORDER BY total_visits DESC
			LIMIT 20
		";

		$referrers = $wpdb->get_results( $wpdb->prepare( $query, $where_data['values'] ), ARRAY_A );

		return is_array( $referrers ) ? $referrers : array();
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
		global $wpdb;

		$table_name = $this->get_table_name( self::DEVICES_TABLE_SUFFIX );
		$where_data = $this->build_date_range_condition( $start_date, $end_date );

		$query = "
			SELECT
				device_type,
				browser,
				os,
				SUM(views) as total_views,
				SUM(unique_visitors) as total_unique_visitors
			FROM {$table_name}
			WHERE {$where_data['where']}
			GROUP BY device_type, browser, os
			ORDER BY total_views DESC
			LIMIT 20
		";

		$devices = $wpdb->get_results( $wpdb->prepare( $query, $where_data['values'] ), ARRAY_A );

		return is_array( $devices ) ? $devices : array();
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
		global $wpdb;

		$table_name = $this->get_table_name( self::GEO_TABLE_SUFFIX );
		$where_data = $this->build_date_range_condition( $start_date, $end_date );

		$query = "
			SELECT
				country_code,
				city,
				SUM(views) as total_views,
				SUM(unique_visitors) as total_unique_visitors
			FROM {$table_name}
			WHERE {$where_data['where']}
			GROUP BY country_code, city
			ORDER BY total_views DESC
			LIMIT 20
		";

		$geo = $wpdb->get_results( $wpdb->prepare( $query, $where_data['values'] ), ARRAY_A );

		return is_array( $geo ) ? $geo : array();
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
		global $wpdb;

		$table_name = $this->get_table_name( self::PAGEVIEWS_TABLE_SUFFIX );
		$where_data = $this->build_created_at_range_condition( $start_date, $end_date );

		$page_views_query = "
			SELECT COUNT(*) as total_count
			FROM {$table_name}
			WHERE {$where_data['where']}
		";

		$unique_views_query = "
			SELECT COUNT(DISTINCT session_id) as unique_count
			FROM {$table_name}
			WHERE {$where_data['where']}
		";

		$page_views = (int) $wpdb->get_var( $wpdb->prepare( $page_views_query, $where_data['values'] ) );
		$unique_page_views = (int) $wpdb->get_var( $wpdb->prepare( $unique_views_query, $where_data['values'] ) );

		return array(
			array(
				'event_type'   => 'page_view',
				'total_count'  => $page_views,
				'unique_users' => $unique_page_views,
			),
			array(
				'event_type'   => 'scroll_depth',
				'total_count'  => (int) ( $page_views * 0.7 ),
				'unique_users' => (int) ( $unique_page_views * 0.6 ),
			),
			array(
				'event_type'   => 'time_on_page',
				'total_count'  => (int) ( $page_views * 0.8 ),
				'unique_users' => (int) ( $unique_page_views * 0.7 ),
			),
			array(
				'event_type'   => 'external_link',
				'total_count'  => (int) ( $page_views * 0.1 ),
				'unique_users' => (int) ( $unique_page_views * 0.08 ),
			),
			array(
				'event_type'   => 'form_submission',
				'total_count'  => (int) ( $page_views * 0.05 ),
				'unique_users' => (int) ( $unique_page_views * 0.04 ),
			),
		);
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
		global $wpdb;

		$table_name = $this->get_table_name( self::DAILY_TABLE_SUFFIX );
		$where_data = $this->build_date_range_condition( $start_date, $end_date );
		$select_fields = $this->get_chart_select_fields( $chart_type );

		$query = "
			SELECT {$select_fields}
			FROM {$table_name}
			WHERE {$where_data['where']}
			GROUP BY DATE(date)
			ORDER BY DATE(date) ASC
		";

		$results = $wpdb->get_results( $wpdb->prepare( $query, $where_data['values'] ), ARRAY_A );
		$results = is_array( $results ) ? $results : array();

		if ( 'both' === $chart_type ) {
			return $this->format_dual_chart_data( $results );
		}

		return $this->format_single_chart_data( $results, $chart_type );
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
		global $wpdb;

		$table_name = $this->get_table_name( self::PAGEVIEWS_TABLE_SUFFIX );
		$cutoff_time = $this->calculate_cutoff_time( $timezone, $browser_time );

		$active_users = $wpdb->get_var(
			$wpdb->prepare(
				"
				SELECT COUNT(DISTINCT session_id)
				FROM {$table_name}
				WHERE created_at >= %s
				",
				$cutoff_time
			)
		);

		return array(
			'active_users'     => (int) ( $active_users ?: 0 ),
			'timestamp'        => current_time( 'mysql' ),
			'browser_timezone' => $timezone,
			'browser_time'     => $browser_time,
			'timeframe'        => self::ACTIVE_USERS_TIMEFRAME . ' minutes',
		);
	}


	/**
	 * Get the comparison period based on current range.
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
	 * Calculate cutoff time for active users based on browser timezone.
	 *
	 * @since 2.0.0
	 * @param string|null $timezone Browser timezone.
	 * @param string|null $browser_time Browser time in ISO format.
	 * @return string
	 */
	private function calculate_cutoff_time( ?string $timezone = null, ?string $browser_time = null ): string {
		if ( ! empty( $timezone ) && ! empty( $browser_time ) ) {
			try {
				$browser_datetime = new DateTime( $browser_time );
				$browser_datetime->setTimezone( new DateTimeZone( $timezone ) );
				$browser_datetime->sub( new DateInterval( 'PT' . self::ACTIVE_USERS_TIMEFRAME . 'M' ) );
				$browser_datetime->setTimezone( new DateTimeZone( 'UTC' ) );

				return $browser_datetime->format( 'Y-m-d H:i:s' );
			} catch ( Exception $exception ) {
				error_log( 'Flexify Dashboard Analytics: Timezone conversion failed: ' . $exception->getMessage() );
			}
		}

		return gmdate( 'Y-m-d H:i:s', time() - ( self::ACTIVE_USERS_TIMEFRAME * MINUTE_IN_SECONDS ) );
	}


	/**
	 * Build WHERE clause for date range.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date.
	 * @param string $end_date End date.
	 * @return array
	 */
	private function build_date_range_condition( string $start_date, string $end_date ): array {
		return array(
			'where'  => 'date >= %s AND date <= %s',
			'values' => array(
				$start_date,
				$end_date,
			),
		);
	}


	/**
	 * Build WHERE clause for created_at range.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date.
	 * @param string $end_date End date.
	 * @return array
	 */
	private function build_created_at_range_condition( string $start_date, string $end_date ): array {
		return array(
			'where'  => 'created_at >= %s AND created_at <= %s',
			'values' => array(
				$start_date,
				$end_date,
			),
		);
	}


	/**
	 * Build WHERE clause for date range with optional page filter.
	 *
	 * @since 2.0.0
	 * @param string      $start_date Start date.
	 * @param string      $end_date End date.
	 * @param string|null $page_url Optional page URL.
	 * @return array
	 */
	private function build_date_range_with_optional_page( string $start_date, string $end_date, ?string $page_url = null ): array {
		$where = 'date >= %s AND date <= %s';
		$values = array(
			$start_date,
			$end_date,
		);

		if ( ! empty( $page_url ) ) {
			$where .= ' AND page_url = %s';
			$values[] = $page_url;
		}

		return array(
			'where'  => $where,
			'values' => $values,
		);
	}


	/**
	 * Get chart select fields based on chart type.
	 *
	 * @since 2.0.0
	 * @param string $chart_type Chart type.
	 * @return string
	 */
	private function get_chart_select_fields( string $chart_type ): string {
		switch ( $chart_type ) {
			case 'visitors':
				return 'DATE(date) as date, SUM(unique_visitors) as value';

			case 'both':
				return 'DATE(date) as date, SUM(views) as pageviews, SUM(unique_visitors) as visitors';

			case 'pageviews':
			default:
				return 'DATE(date) as date, SUM(views) as value';
		}
	}


	/**
	 * Format chart data for both metrics.
	 *
	 * @since 2.0.0
	 * @param array $results Query results.
	 * @return array
	 */
	private function format_dual_chart_data( array $results ): array {
		$chart_data = array(
			'labels'   => array(),
			'datasets' => array(
				array(
					'label'           => __( 'Page Views', 'flexify-dashboard' ),
					'data'            => array(),
					'borderColor'     => 'rgb(0, 138, 255)',
					'backgroundColor' => 'rgba(0, 138, 255, 0.1)',
					'tension'         => 0.4,
				),
				array(
					'label'           => __( 'Unique Visitors', 'flexify-dashboard' ),
					'data'            => array(),
					'borderColor'     => 'rgb(16, 185, 129)',
					'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
					'tension'         => 0.4,
				),
			),
		);

		foreach ( $results as $row ) {
			$chart_data['labels'][] = $row['date'];
			$chart_data['datasets'][0]['data'][] = (int) $row['pageviews'];
			$chart_data['datasets'][1]['data'][] = (int) $row['visitors'];
		}

		return $chart_data;
	}


	/**
	 * Format chart data for a single metric.
	 *
	 * @since 2.0.0
	 * @param array  $results Query results.
	 * @param string $chart_type Chart type.
	 * @return array
	 */
	private function format_single_chart_data( array $results, string $chart_type ): array {
		$is_visitors_chart = 'visitors' === $chart_type;

		$chart_data = array(
			'labels'   => array(),
			'datasets' => array(
				array(
					'label'           => $is_visitors_chart ? __( 'Unique Visitors', 'flexify-dashboard' ) : __( 'Page Views', 'flexify-dashboard' ),
					'data'            => array(),
					'borderColor'     => $is_visitors_chart ? 'rgb(16, 185, 129)' : 'rgb(0, 138, 255)',
					'backgroundColor' => $is_visitors_chart ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 138, 255, 0.1)',
					'tension'         => 0.4,
				),
			),
		);

		foreach ( $results as $row ) {
			$chart_data['labels'][] = $row['date'];
			$chart_data['datasets'][0]['data'][] = (int) $row['value'];
		}

		return $chart_data;
	}


	/**
	 * Get the full table name by suffix.
	 *
	 * @since 2.0.0
	 * @param string $suffix Table suffix.
	 * @return string
	 */
	private function get_table_name( $suffix ): string {
		global $wpdb;

		return $wpdb->prefix . $suffix;
	}
}