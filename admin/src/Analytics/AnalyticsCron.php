<?php

namespace MeuMouse\Flexify_Dashboard\Analytics;

defined('ABSPATH') || exit;

/**
 * Class AnalyticsCron
 *
 * Handle cron jobs for analytics data aggregation and cleanup.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Analytics
 * @author MeuMouse.com
 */
class AnalyticsCron {
    
	/**
	 * Aggregation cron hook.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const AGGREGATE_HOOK = 'flexify_dashboard_analytics_aggregate';

	/**
	 * Cleanup cron hook.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const CLEANUP_HOOK = 'flexify_dashboard_analytics_cleanup';

	/**
	 * Custom cron interval key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const THIRTY_MINUTES_INTERVAL = 'every_30_minutes';

	/**
	 * Default retention days.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const DEFAULT_RETENTION_DAYS = 30;

	/**
	 * Default fallback aggregation range.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DEFAULT_LAST_AGGREGATION = '-1 day';


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'schedule_cron_jobs' ) );
		add_action( self::AGGREGATE_HOOK, array( $this, 'aggregate_analytics_data' ) );
		add_action( self::CLEANUP_HOOK, array( $this, 'cleanup_old_data' ) );

		add_filter( 'cron_schedules', array( $this, 'add_custom_cron_intervals' ) );
	}


	/**
	 * Schedule cron jobs if they do not exist.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function schedule_cron_jobs() {
		if ( ! AnalyticsDatabase::is_analytics_enabled() ) {
			return;
		}

		if ( ! wp_next_scheduled( self::AGGREGATE_HOOK ) ) {
			wp_schedule_event( time(), self::THIRTY_MINUTES_INTERVAL, self::AGGREGATE_HOOK );
		}

		if ( ! wp_next_scheduled( self::CLEANUP_HOOK ) ) {
			wp_schedule_event( time(), 'daily', self::CLEANUP_HOOK );
		}
	}


	/**
	 * Add custom cron intervals.
	 *
	 * @since 2.0.0
	 * @param array $schedules Existing cron schedules.
	 * @return array
	 */
	public function add_custom_cron_intervals( $schedules ) {
		$schedules[ self::THIRTY_MINUTES_INTERVAL ] = array(
			'interval' => 30 * MINUTE_IN_SECONDS,
			'display'  => __( 'Every 30 Minutes', 'flexify-dashboard' ),
		);

		return $schedules;
	}


	/**
	 * Aggregate raw analytics data into daily summaries.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function aggregate_analytics_data() {
		if ( ! AnalyticsDatabase::is_analytics_enabled() ) {
			return;
		}

		try {
			$last_aggregation = $this->get_last_aggregation_time();

			$this->process_daily_aggregation( $last_aggregation );
			$this->process_referrers_aggregation( $last_aggregation );
			$this->process_devices_aggregation( $last_aggregation );
			$this->process_geo_aggregation( $last_aggregation );

			$this->update_last_aggregation_time();
			$this->update_summary_cache();
		} catch ( \Exception $exception ) {
			error_log( 'Flexify Dashboard Analytics Aggregation Error: ' . $exception->getMessage() );
		}
	}


	/**
	 * Cleanup old raw analytics data based on retention settings.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function cleanup_old_data() {
		if ( ! AnalyticsDatabase::is_analytics_enabled() ) {
			return;
		}

		global $wpdb;

		try {
			$retention_days = $this->get_retention_days();
			$pageviews_table = $this->get_table_name( 'flexify_dashboard_analytics_pageviews' );

			$wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$pageviews_table} WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
					$retention_days
				)
			);

			$this->update_last_cleanup_time();
		} catch ( \Exception $exception ) {
			error_log( 'Flexify Dashboard Analytics Cleanup Error: ' . $exception->getMessage() );
		}
	}


	/**
	 * Unschedule cron jobs when analytics is disabled.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function unschedule_cron_jobs() {
		wp_clear_scheduled_hook( self::AGGREGATE_HOOK );
		wp_clear_scheduled_hook( self::CLEANUP_HOOK );
	}


	/**
	 * Process daily aggregation from raw pageviews.
	 *
	 * @since 2.0.0
	 * @param string $last_aggregation Last aggregation timestamp.
	 * @return void
	 */
	private function process_daily_aggregation( $last_aggregation ) {
		global $wpdb;

		$pageviews_table = $this->get_table_name( 'flexify_dashboard_analytics_pageviews' );
		$daily_table = $this->get_table_name( 'flexify_dashboard_analytics_daily' );

		$raw_data = $wpdb->get_results(
			$wpdb->prepare(
				"
				SELECT
					DATE(created_at) as date,
					page_url,
					page_title,
					COUNT(*) as views,
					COUNT(DISTINCT session_id) as unique_visitors
				FROM {$pageviews_table}
				WHERE created_at > %s
				GROUP BY DATE(created_at), page_url, page_title
				",
				$last_aggregation
			),
			ARRAY_A
		);

		if ( empty( $raw_data ) || ! is_array( $raw_data ) ) {
			return;
		}

		foreach ( $raw_data as $row ) {
			$bounce_rate = $this->calculate_bounce_rate( $row['page_url'], $row['date'] );

			$wpdb->replace(
				$daily_table,
				array(
					'date'             => $row['date'],
					'page_url'         => $row['page_url'],
					'page_title'       => $row['page_title'],
					'views'            => (int) $row['views'],
					'unique_visitors'  => (int) $row['unique_visitors'],
					'avg_time_on_page' => 0,
					'bounce_rate'      => (float) $bounce_rate,
					'created_at'       => current_time( 'mysql' ),
					'updated_at'       => current_time( 'mysql' ),
				),
				array(
					'%s',
					'%s',
					'%s',
					'%d',
					'%d',
					'%d',
					'%f',
					'%s',
					'%s',
				)
			);
		}
	}


	/**
	 * Process referrers aggregation.
	 *
	 * @since 2.0.0
	 * @param string $last_aggregation Last aggregation timestamp.
	 * @return void
	 */
	private function process_referrers_aggregation( $last_aggregation ) {
		global $wpdb;

		$pageviews_table = $this->get_table_name( 'flexify_dashboard_analytics_pageviews' );
		$referrers_table = $this->get_table_name( 'flexify_dashboard_analytics_referrers' );

		$referrer_data = $wpdb->get_results(
			$wpdb->prepare(
				"
				SELECT
					DATE(created_at) as date,
					referrer_domain,
					referrer as referrer_url,
					page_url,
					COUNT(*) as visits,
					COUNT(DISTINCT session_id) as unique_visitors
				FROM {$pageviews_table}
				WHERE created_at > %s
				AND referrer_domain IS NOT NULL
				AND referrer_domain != ''
				GROUP BY DATE(created_at), referrer_domain, referrer, page_url
				",
				$last_aggregation
			),
			ARRAY_A
		);

		if ( empty( $referrer_data ) || ! is_array( $referrer_data ) ) {
			return;
		}

		foreach ( $referrer_data as $row ) {
			$wpdb->replace(
				$referrers_table,
				array(
					'date'            => $row['date'],
					'referrer_domain' => $row['referrer_domain'],
					'referrer_url'    => $row['referrer_url'],
					'page_url'        => $row['page_url'],
					'visits'          => (int) $row['visits'],
					'unique_visitors' => (int) $row['unique_visitors'],
					'created_at'      => current_time( 'mysql' ),
					'updated_at'      => current_time( 'mysql' ),
				),
				array(
					'%s',
					'%s',
					'%s',
					'%s',
					'%d',
					'%d',
					'%s',
					'%s',
				)
			);
		}
	}


	/**
	 * Process devices aggregation.
	 *
	 * @since 2.0.0
	 * @param string $last_aggregation Last aggregation timestamp.
	 * @return void
	 */
	private function process_devices_aggregation( $last_aggregation ) {
		global $wpdb;

		$pageviews_table = $this->get_table_name( 'flexify_dashboard_analytics_pageviews' );
		$devices_table = $this->get_table_name( 'flexify_dashboard_analytics_devices' );

		$device_data = $wpdb->get_results(
			$wpdb->prepare(
				"
				SELECT
					DATE(created_at) as date,
					device_type,
					browser,
					os,
					COUNT(*) as views,
					COUNT(DISTINCT session_id) as unique_visitors
				FROM {$pageviews_table}
				WHERE created_at > %s
				GROUP BY DATE(created_at), device_type, browser, os
				",
				$last_aggregation
			),
			ARRAY_A
		);

		if ( empty( $device_data ) || ! is_array( $device_data ) ) {
			return;
		}

		foreach ( $device_data as $row ) {
			$wpdb->replace(
				$devices_table,
				array(
					'date'            => $row['date'],
					'device_type'     => $row['device_type'],
					'browser'         => $row['browser'],
					'os'              => $row['os'],
					'views'           => (int) $row['views'],
					'unique_visitors' => (int) $row['unique_visitors'],
					'created_at'      => current_time( 'mysql' ),
					'updated_at'      => current_time( 'mysql' ),
				),
				array(
					'%s',
					'%s',
					'%s',
					'%s',
					'%d',
					'%d',
					'%s',
					'%s',
				)
			);
		}
	}


	/**
	 * Process geographic aggregation.
	 *
	 * @since 2.0.0
	 * @param string $last_aggregation Last aggregation timestamp.
	 * @return void
	 */
	private function process_geo_aggregation( $last_aggregation ) {
		global $wpdb;

		$pageviews_table = $this->get_table_name( 'flexify_dashboard_analytics_pageviews' );
		$geo_table = $this->get_table_name( 'flexify_dashboard_analytics_geo' );

		$geo_data = $wpdb->get_results(
			$wpdb->prepare(
				"
				SELECT
					DATE(created_at) as date,
					country_code,
					city,
					COUNT(*) as views,
					COUNT(DISTINCT session_id) as unique_visitors
				FROM {$pageviews_table}
				WHERE created_at > %s
				AND country_code IS NOT NULL
				GROUP BY DATE(created_at), country_code, city
				",
				$last_aggregation
			),
			ARRAY_A
		);

		if ( empty( $geo_data ) || ! is_array( $geo_data ) ) {
			return;
		}

		foreach ( $geo_data as $row ) {
			$wpdb->replace(
				$geo_table,
				array(
					'date'            => $row['date'],
					'country_code'    => $row['country_code'],
					'city'            => $row['city'],
					'views'           => (int) $row['views'],
					'unique_visitors' => (int) $row['unique_visitors'],
					'created_at'      => current_time( 'mysql' ),
					'updated_at'      => current_time( 'mysql' ),
				),
				array(
					'%s',
					'%s',
					'%s',
					'%d',
					'%d',
					'%s',
					'%s',
				)
			);
		}
	}


	/**
	 * Update summary cache with precomputed stats.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function update_summary_cache() {
		global $wpdb;

		$summary_table = $this->get_table_name( 'flexify_dashboard_analytics_summary' );
		$daily_table = $this->get_table_name( 'flexify_dashboard_analytics_daily' );

		$this->replace_summary_stat( $summary_table, 'overview_7d', '7d', $this->get_overview_stats( $daily_table, 7 ) );
		$this->replace_summary_stat( $summary_table, 'overview_30d', '30d', $this->get_overview_stats( $daily_table, 30 ) );
		$this->replace_summary_stat( $summary_table, 'overview_all_time', 'all_time', $this->get_overview_stats( $daily_table ) );
	}


	/**
	 * Get the last aggregation timestamp.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_last_aggregation_time() {
		global $wpdb;

		$settings_table = $this->get_table_name( 'flexify_dashboard_analytics_settings' );
		$result = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT setting_value FROM {$settings_table} WHERE setting_key = %s",
				'last_aggregation'
			)
		);

		return ! empty( $result ) ? $result : gmdate( 'Y-m-d H:i:s', strtotime( self::DEFAULT_LAST_AGGREGATION ) );
	}


	/**
	 * Update last aggregation timestamp.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function update_last_aggregation_time() {
		$this->update_setting_timestamp( 'last_aggregation' );
	}


	/**
	 * Update last cleanup timestamp.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function update_last_cleanup_time() {
		$this->update_setting_timestamp( 'last_cleanup' );
	}


	/**
	 * Get retention days setting.
	 *
	 * @since 2.0.0
	 * @return int
	 */
	private function get_retention_days() {
		global $wpdb;

		$settings_table = $this->get_table_name( 'flexify_dashboard_analytics_settings' );
		$result = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT setting_value FROM {$settings_table} WHERE setting_key = %s",
				'retention_days'
			)
		);

		$retention_days = ! empty( $result ) ? absint( $result ) : self::DEFAULT_RETENTION_DAYS;

		return $retention_days > 0 ? $retention_days : self::DEFAULT_RETENTION_DAYS;
	}


	/**
	 * Calculate bounce rate for a specific page and date.
	 *
	 * @since 2.0.0
	 * @param string $page_url The page URL.
	 * @param string $date The date.
	 * @return float
	 */
	private function calculate_bounce_rate( $page_url, $date ) {
		global $wpdb;

		$pageviews_table = $this->get_table_name( 'flexify_dashboard_analytics_pageviews' );

		$bounced_sessions = $wpdb->get_var(
			$wpdb->prepare(
				"
				SELECT COUNT(DISTINCT session_id)
				FROM {$pageviews_table}
				WHERE DATE(created_at) = %s
				AND page_url = %s
				AND session_id IN (
					SELECT session_id
					FROM {$pageviews_table}
					WHERE DATE(created_at) = %s
					GROUP BY session_id
					HAVING COUNT(DISTINCT page_url) = 1
				)
				",
				$date,
				$page_url,
				$date
			)
		);

		$total_sessions = $wpdb->get_var(
			$wpdb->prepare(
				"
				SELECT COUNT(DISTINCT session_id)
				FROM {$pageviews_table}
				WHERE DATE(created_at) = %s
				AND page_url = %s
				",
				$date,
				$page_url
			)
		);

		if ( empty( $total_sessions ) ) {
			return 0.0;
		}

		return round( ( (float) $bounced_sessions / (float) $total_sessions ) * 100, 2 );
	}


	/**
	 * Replace a summary stat row.
	 *
	 * @since 2.0.0
	 * @param string $summary_table Summary table name.
	 * @param string $stat_key Stat key.
	 * @param string $stat_period Stat period.
	 * @param array  $stat_value Stat value.
	 * @return void
	 */
	private function replace_summary_stat( $summary_table, $stat_key, $stat_period, $stat_value ) {
		global $wpdb;

		$wpdb->replace(
			$summary_table,
			array(
				'stat_key'    => $stat_key,
				'stat_period' => $stat_period,
				'stat_value'  => wp_json_encode( $stat_value ),
				'updated_at'  => current_time( 'mysql' ),
			),
			array(
				'%s',
				'%s',
				'%s',
				'%s',
			)
		);
	}


	/**
	 * Get overview stats for a specific period.
	 *
	 * @since 2.0.0
	 * @param string   $daily_table Daily analytics table name.
	 * @param int|null $days Optional number of days.
	 * @return array
	 */
	private function get_overview_stats( $daily_table, $days = null ) {
		global $wpdb;

		if ( is_null( $days ) ) {
			$query = "
				SELECT
					SUM(views) as total_views,
					SUM(unique_visitors) as total_unique_visitors,
					COUNT(DISTINCT page_url) as unique_pages
				FROM {$daily_table}
			";

			$stats = $wpdb->get_row( $query, ARRAY_A );
		} else {
			$query = "
				SELECT
					SUM(views) as total_views,
					SUM(unique_visitors) as total_unique_visitors,
					COUNT(DISTINCT page_url) as unique_pages
				FROM {$daily_table}
				WHERE date >= DATE_SUB(CURDATE(), INTERVAL %d DAY)
			";

			$stats = $wpdb->get_row( $wpdb->prepare( $query, $days ), ARRAY_A );
		}

		return is_array( $stats ) ? $stats : array(
			'total_views'           => 0,
			'total_unique_visitors' => 0,
			'unique_pages'          => 0,
		);
	}


	/**
	 * Update a timestamp setting value.
	 *
	 * @since 2.0.0
	 * @param string $setting_key Setting key.
	 * @return void
	 */
	private function update_setting_timestamp( $setting_key ) {
		global $wpdb;

		$settings_table = $this->get_table_name( 'flexify_dashboard_analytics_settings' );

		$wpdb->replace(
			$settings_table,
			array(
				'setting_key'   => $setting_key,
				'setting_value' => current_time( 'mysql' ),
				'updated_at'    => current_time( 'mysql' ),
			),
			array(
				'%s',
				'%s',
				'%s',
			)
		);
	}


	/**
	 * Get full table name.
	 *
	 * @since 2.0.0
	 * @param string $table_suffix Table suffix.
	 * @return string
	 */
	private function get_table_name( $table_suffix ) {
		global $wpdb;

		return $wpdb->prefix . $table_suffix;
	}
}