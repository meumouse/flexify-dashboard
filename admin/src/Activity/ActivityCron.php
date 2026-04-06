<?php

namespace MeuMouse\Flexify_Dashboard\Activity;

defined('ABSPATH') || exit;

/**
 * Class ActivityCron
 *
 * Handle scheduled cleanup tasks for activity logs.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Activity
 * @author MeuMouse.com
 */
class ActivityCron {
    
	/**
	 * Cleanup cron hook.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const CLEANUP_HOOK = 'flexify_dashboard_activity_log_cleanup';

	/**
	 * Flush cron hook.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const FLUSH_HOOK = 'flexify_dashboard_activity_log_flush';

	/**
	 * Plugin settings option key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const SETTINGS_OPTION = 'flexify_dashboard_settings';

	/**
	 * Activity log table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const TABLE_SUFFIX = 'flexify_dashboard_activity_log';

	/**
	 * Default retention days.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const DEFAULT_RETENTION_DAYS = 90;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		$this->maybe_schedule_cleanup();

		add_action( self::CLEANUP_HOOK, array( $this, 'cleanup_old_logs' ) );
	}


	/**
	 * Schedule cleanup event if it is not already registered.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function maybe_schedule_cleanup() {
		if ( wp_next_scheduled( self::CLEANUP_HOOK ) ) {
			return;
		}

		wp_schedule_event( time(), 'daily', self::CLEANUP_HOOK );
	}


	/**
	 * Clean up old activity logs based on retention policy.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function cleanup_old_logs() {
		if ( ! ActivityDatabase::is_activity_logger_enabled() ) {
			return;
		}

		if ( ! $this->is_auto_cleanup_enabled() ) {
			return;
		}

		$this->delete_old_logs();
	}


	/**
	 * Manually trigger cleanup of old logs.
	 *
	 * @since 2.0.0
	 * @return int Number of deleted rows.
	 */
	public static function manual_cleanup() {
		$instance = new self();

		return $instance->delete_old_logs();
	}


	/**
	 * Unschedule cron jobs used by the activity module.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function unschedule_cron_jobs() {
		$cleanup_timestamp = wp_next_scheduled( self::CLEANUP_HOOK );

		if ( $cleanup_timestamp ) {
			wp_unschedule_event( $cleanup_timestamp, self::CLEANUP_HOOK );
		}

		$flush_timestamp = wp_next_scheduled( self::FLUSH_HOOK );

		if ( $flush_timestamp ) {
			wp_unschedule_event( $flush_timestamp, self::FLUSH_HOOK );
		}
	}


	/**
	 * Delete old activity logs from database.
	 *
	 * @since 2.0.0
	 * @return int Number of deleted rows.
	 */
	private function delete_old_logs() {
		global $wpdb;

		$table_name = $this->get_table_name();

		if ( ! $this->table_exists( $table_name ) ) {
			return 0;
		}

		$deleted_rows = $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table_name} WHERE created_at < %s",
				$this->get_cutoff_date()
			)
		);

		return false === $deleted_rows ? 0 : absint( $deleted_rows );
	}


	/**
	 * Check if automatic cleanup is enabled.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_auto_cleanup_enabled() {
		$settings = $this->get_settings();

		return ! empty( $settings['activity_log_auto_cleanup'] );
	}


	/**
	 * Get plugin settings.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_settings() {
		$settings = get_option( self::SETTINGS_OPTION, array() );

		return is_array( $settings ) ? $settings : array();
	}


	/**
	 * Get retention period in days.
	 *
	 * @since 2.0.0
	 * @return int
	 */
	private function get_retention_days() {
		$settings = $this->get_settings();
		$retention_days = isset( $settings['activity_log_retention_days'] ) ? absint( $settings['activity_log_retention_days'] ) : self::DEFAULT_RETENTION_DAYS;

		if ( $retention_days <= 0 ) {
			$retention_days = self::DEFAULT_RETENTION_DAYS;
		}

		return $retention_days;
	}


	/**
	 * Get the activity log table name.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_table_name() {
		global $wpdb;

		return $wpdb->prefix . self::TABLE_SUFFIX;
	}


	/**
	 * Check if the activity log table exists.
	 *
	 * @since 2.0.0
	 * @param string $table_name Database table name.
	 * @return bool
	 */
	private function table_exists( $table_name ) {
		global $wpdb;

		$found_table = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) );

		return $found_table === $table_name;
	}


	/**
	 * Get the cutoff date for old log deletion.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_cutoff_date() {
		$timestamp = current_time( 'timestamp' ) - ( DAY_IN_SECONDS * $this->get_retention_days() );

		return wp_date( 'Y-m-d H:i:s', $timestamp );
	}
}