<?php

namespace MeuMouse\Flexify_Dashboard\Analytics;

defined('ABSPATH') || exit;

/**
 * Class AnalyticsDatabase
 *
 * Handle database schema creation and management for analytics.
 * Only initialize when analytics is enabled in settings.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Analytics
 * @author MeuMouse.com
 */
class AnalyticsDatabase {
    
	/**
	 * Plugin settings option key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const SETTINGS_OPTION = 'flexify_dashboard_settings';

	/**
	 * Analytics enabled option key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const ENABLE_OPTION = 'enable_flexify_dashboard_analytics';

	/**
	 * Analytics pageviews table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const PAGEVIEWS_TABLE = 'flexify_dashboard_analytics_pageviews';

	/**
	 * Analytics daily table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DAILY_TABLE = 'flexify_dashboard_analytics_daily';

	/**
	 * Analytics referrers table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REFERRERS_TABLE = 'flexify_dashboard_analytics_referrers';

	/**
	 * Analytics devices table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DEVICES_TABLE = 'flexify_dashboard_analytics_devices';

	/**
	 * Analytics geo table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const GEO_TABLE = 'flexify_dashboard_analytics_geo';

	/**
	 * Analytics summary table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const SUMMARY_TABLE = 'flexify_dashboard_analytics_summary';

	/**
	 * Analytics settings table suffix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const ANALYTICS_SETTINGS_TABLE = 'flexify_dashboard_analytics_settings';

	/**
	 * Default retention days.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const DEFAULT_RETENTION_DAYS = 30;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'admin_init', array( $this, 'maybe_initialize_analytics_tables' ) );
		add_action( 'admin_init', array( $this, 'maybe_cleanup_analytics_tables' ) );
	}


	/**
	 * Check if analytics is enabled and initialize tables if needed.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function maybe_initialize_analytics_tables() {
		if ( ! self::is_analytics_enabled() ) {
			return;
		}

		if ( $this->tables_exist() ) {
			return;
		}

		$this->create_analytics_tables();
	}


	/**
	 * Handle cleanup checks when analytics is disabled.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function maybe_cleanup_analytics_tables() {
		if ( self::is_analytics_enabled() ) {
			return;
		}

		/**
		 * Tables are intentionally preserved when analytics is disabled.
		 * Future cleanup behavior can be added here if needed.
		 */
	}


	/**
	 * Check if all analytics tables exist.
	 *
	 * @since 2.0.0
	 * @return bool True if all tables exist, false otherwise.
	 */
	private function tables_exist() {
		$tables = array(
			self::PAGEVIEWS_TABLE,
			self::DAILY_TABLE,
			self::REFERRERS_TABLE,
			self::DEVICES_TABLE,
			self::GEO_TABLE,
			self::SUMMARY_TABLE,
			self::ANALYTICS_SETTINGS_TABLE,
		);

		foreach ( $tables as $table_suffix ) {
			if ( ! $this->table_exists( $this->get_table_name( $table_suffix ) ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Check if a specific table exists.
	 *
	 * @since 2.0.0
	 * @param string $table_name Full table name.
	 * @return bool
	 */
	private function table_exists( $table_name ) {
		global $wpdb;

		$existing_table = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) );

		return $existing_table === $table_name;
	}


	/**
	 * Create all analytics tables with the specified schema.
	 *
	 * @since 2.0.0
	 * @return bool True on success, false otherwise.
	 */
	private function create_analytics_tables() {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();

		$pageviews_table = $this->get_table_name( self::PAGEVIEWS_TABLE );
		$daily_table = $this->get_table_name( self::DAILY_TABLE );
		$referrers_table = $this->get_table_name( self::REFERRERS_TABLE );
		$devices_table = $this->get_table_name( self::DEVICES_TABLE );
		$geo_table = $this->get_table_name( self::GEO_TABLE );
		$summary_table = $this->get_table_name( self::SUMMARY_TABLE );
		$settings_table = $this->get_table_name( self::ANALYTICS_SETTINGS_TABLE );

		$sql_pageviews = "CREATE TABLE {$pageviews_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			page_url VARCHAR(500) NOT NULL,
			page_title VARCHAR(255) DEFAULT NULL,
			referrer VARCHAR(500) DEFAULT NULL,
			referrer_domain VARCHAR(255) DEFAULT NULL,
			user_agent TEXT DEFAULT NULL,
			device_type VARCHAR(20) DEFAULT NULL,
			browser VARCHAR(50) DEFAULT NULL,
			browser_version VARCHAR(20) DEFAULT NULL,
			os VARCHAR(50) DEFAULT NULL,
			country_code CHAR(2) DEFAULT NULL,
			city VARCHAR(100) DEFAULT NULL,
			ip_hash VARCHAR(64) DEFAULT NULL,
			session_id VARCHAR(64) DEFAULT NULL,
			is_unique_visitor TINYINT(1) DEFAULT 0,
			created_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			KEY idx_created_at (created_at),
			KEY idx_page_url (page_url(255)),
			KEY idx_session_date (session_id, created_at),
			KEY idx_referrer_domain (referrer_domain)
		) {$charset_collate};";

		$sql_daily = "CREATE TABLE {$daily_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			date DATE NOT NULL,
			page_url VARCHAR(500) NOT NULL,
			page_title VARCHAR(255) DEFAULT NULL,
			views INT UNSIGNED DEFAULT 0,
			unique_visitors INT UNSIGNED DEFAULT 0,
			avg_time_on_page INT UNSIGNED DEFAULT 0,
			bounce_rate DECIMAL(5,2) DEFAULT 0.00,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY unique_date_page (date, page_url(255)),
			KEY idx_date (date),
			KEY idx_page_url (page_url(255))
		) {$charset_collate};";

		$sql_referrers = "CREATE TABLE {$referrers_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			date DATE NOT NULL,
			referrer_domain VARCHAR(255) NOT NULL,
			referrer_url VARCHAR(500) DEFAULT NULL,
			page_url VARCHAR(500) NOT NULL,
			visits INT UNSIGNED DEFAULT 0,
			unique_visitors INT UNSIGNED DEFAULT 0,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY unique_date_referrer_page (date, referrer_domain, page_url(255)),
			KEY idx_date (date),
			KEY idx_referrer_domain (referrer_domain)
		) {$charset_collate};";

		$sql_devices = "CREATE TABLE {$devices_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			date DATE NOT NULL,
			device_type VARCHAR(20) NOT NULL,
			browser VARCHAR(50) DEFAULT NULL,
			os VARCHAR(50) DEFAULT NULL,
			views INT UNSIGNED DEFAULT 0,
			unique_visitors INT UNSIGNED DEFAULT 0,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY unique_date_device (date, device_type, browser, os),
			KEY idx_date (date)
		) {$charset_collate};";

		$sql_geo = "CREATE TABLE {$geo_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			date DATE NOT NULL,
			country_code CHAR(2) NOT NULL,
			city VARCHAR(100) DEFAULT NULL,
			views INT UNSIGNED DEFAULT 0,
			unique_visitors INT UNSIGNED DEFAULT 0,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY unique_date_location (date, country_code, city),
			KEY idx_date (date),
			KEY idx_country (country_code)
		) {$charset_collate};";

		$sql_summary = "CREATE TABLE {$summary_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			stat_key VARCHAR(100) NOT NULL,
			stat_period VARCHAR(20) NOT NULL,
			stat_value LONGTEXT DEFAULT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY unique_stat (stat_key, stat_period),
			KEY idx_updated_at (updated_at)
		) {$charset_collate};";

		$sql_settings = "CREATE TABLE {$settings_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			setting_key VARCHAR(100) NOT NULL,
			setting_value LONGTEXT DEFAULT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY unique_setting_key (setting_key),
			KEY idx_setting_key (setting_key)
		) {$charset_collate};";

		dbDelta( $sql_pageviews );
		dbDelta( $sql_daily );
		dbDelta( $sql_referrers );
		dbDelta( $sql_devices );
		dbDelta( $sql_geo );
		dbDelta( $sql_summary );
		dbDelta( $sql_settings );

		$this->insert_default_settings();

		return $this->tables_exist();
	}


	/**
	 * Insert default analytics settings.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function insert_default_settings() {
		global $wpdb;

		$table_name = $this->get_table_name( self::ANALYTICS_SETTINGS_TABLE );
		$current_time = current_time( 'mysql' );

		$default_settings = array(
			'retention_days'        => (string) self::DEFAULT_RETENTION_DAYS,
			'track_logged_in_users' => '0',
			'anonymize_ips'         => '1',
			'exclude_bots'          => '1',
			'last_cleanup'          => null,
			'last_aggregation'      => null,
		);

		foreach ( $default_settings as $setting_key => $setting_value ) {
			$wpdb->replace(
				$table_name,
				array(
					'setting_key'   => $setting_key,
					'setting_value' => $setting_value,
					'updated_at'    => $current_time,
				),
				array(
					'%s',
					'%s',
					'%s',
				)
			);
		}
	}


	/**
	 * Get a specific analytics setting.
	 *
	 * @since 2.0.0
	 * @param string $setting_key Setting key to retrieve.
	 * @param mixed  $default_value Default value if setting does not exist.
	 * @return mixed
	 */
	public static function get_setting( $setting_key, $default_value = null ) {
		global $wpdb;

		$table_name = $wpdb->prefix . self::ANALYTICS_SETTINGS_TABLE;
		$result = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT setting_value FROM {$table_name} WHERE setting_key = %s",
				$setting_key
			)
		);

		return null !== $result ? $result : $default_value;
	}


	/**
	 * Update a specific analytics setting.
	 *
	 * @since 2.0.0
	 * @param string $setting_key Setting key to update.
	 * @param mixed  $setting_value New setting value.
	 * @return bool True on success, false otherwise.
	 */
	public static function update_setting( $setting_key, $setting_value ) {
		global $wpdb;

		$table_name = $wpdb->prefix . self::ANALYTICS_SETTINGS_TABLE;

		return false !== $wpdb->replace(
			$table_name,
			array(
				'setting_key'   => $setting_key,
				'setting_value' => $setting_value,
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
	 * Check if analytics is enabled in plugin settings.
	 *
	 * @since 2.0.0
	 * @return bool True if analytics is enabled, false otherwise.
	 */
	public static function is_analytics_enabled() {
		$settings = get_option( self::SETTINGS_OPTION, array() );

		return ! empty( $settings[ self::ENABLE_OPTION ] );
	}


	/**
	 * Handle analytics enable or disable action.
	 *
	 * @since 2.0.0
	 * @param bool $enabled Whether analytics should be enabled.
	 * @return void
	 */
	public static function toggle_analytics( $enabled ) {
		if ( $enabled ) {
			$instance = new self();
			$instance->maybe_initialize_analytics_tables();

			return;
		}

		AnalyticsCron::unschedule_cron_jobs();
	}


	/**
	 * Get full table name by suffix.
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