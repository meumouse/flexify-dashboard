<?php

namespace MeuMouse\Flexify_Dashboard\Activity;

defined('ABSPATH') || exit;

/**
 * Class ActivityDatabase
 *
 * Handle database schema creation and management for activity logger.
 * Only initialize when activity logger is enabled in settings.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Activity
 * @author MeuMouse.com
 */
class ActivityDatabase {
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
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'admin_init', array( $this, 'maybe_initialize_activity_tables' ) );
	}


	/**
	 * Check if activity logger is enabled and initialize tables if needed.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function maybe_initialize_activity_tables() {
		if ( ! self::is_activity_logger_enabled() ) {
			return;
		}

		if ( $this->table_exists() ) {
			return;
		}

		$this->create_activity_table();
	}


	/**
	 * Check if activity log table exists.
	 *
	 * @since 2.0.0
	 * @return bool True if table exists, false otherwise.
	 */
	private function table_exists() {
		global $wpdb;

		$table_name = $this->get_table_name();
		$existing_table = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) );

		return $existing_table === $table_name;
	}


	/**
	 * Create the activity log table with the specified schema.
	 *
	 * @since 2.0.0
	 * @return bool True on success, false otherwise.
	 */
	private function create_activity_table() {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table_name = $this->get_table_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL,
			action VARCHAR(50) NOT NULL,
			object_type VARCHAR(50) NOT NULL,
			object_id BIGINT UNSIGNED DEFAULT NULL,
			old_value LONGTEXT DEFAULT NULL,
			new_value LONGTEXT DEFAULT NULL,
			ip_address VARCHAR(45) DEFAULT NULL,
			user_agent TEXT DEFAULT NULL,
			metadata LONGTEXT DEFAULT NULL,
			created_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			KEY idx_user_id (user_id),
			KEY idx_action (action),
			KEY idx_object_type (object_type),
			KEY idx_object_id (object_id),
			KEY idx_created_at (created_at),
			KEY idx_user_action (user_id, action),
			KEY idx_object (object_type, object_id)
		) {$charset_collate};";

		dbDelta( $sql );

		return $this->table_exists();
	}


	/**
	 * Check if activity logger is enabled in plugin settings.
	 *
	 * @since 2.0.0
	 * @return bool True if activity logger is enabled, false otherwise.
	 */
	public static function is_activity_logger_enabled() {
		$settings = self::get_settings();

		return ! empty( $settings['enable_activity_logger'] );
	}


	/**
	 * Handle activity logger enable or disable action.
	 *
	 * @since 2.0.0
	 * @param bool $enabled Whether activity logger should be enabled.
	 * @return void
	 */
	public static function toggle_activity_logger( $enabled ) {
		if ( $enabled ) {
			$instance = new self();
			$instance->maybe_initialize_activity_tables();

			return;
		}

		ActivityCron::unschedule_cron_jobs();
	}


	/**
	 * Get plugin settings.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_settings() {
		$settings = get_option( self::SETTINGS_OPTION, array() );

		return is_array( $settings ) ? $settings : array();
	}


	/**
	 * Get the full activity log table name.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_table_name() {
		global $wpdb;

		return $wpdb->prefix . self::TABLE_SUFFIX;
	}
}