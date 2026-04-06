<?php

namespace MeuMouse\Flexify_Dashboard\Activity;

defined('ABSPATH') || exit;

/**
 * Class ActivityLogger
 *
 * Handle logging of user activities and actions.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Activity
 * @author MeuMouse.com
 */
class ActivityLogger {
	/**
	 * Flush cron hook.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const FLUSH_HOOK = 'flexify_dashboard_activity_log_flush';

	/**
	 * Custom cron interval key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const CRON_INTERVAL = 'flexify_dashboard_30_seconds';

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
	 * Default log level.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const DEFAULT_LOG_LEVEL = 'important';

	/**
	 * Queue for batched inserts.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $log_queue = array();

	/**
	 * Important actions list.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $important_actions = array(
		'deleted',
		'trashed',
		'restored',
		'activated',
		'deactivated',
		'installed',
		'uninstalled',
		'role_changed',
		'permission_changed',
	);


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_filter( 'cron_schedules', array( $this, 'add_cron_interval' ) );

		add_action( 'shutdown', array( self::class, 'flush_log_queue' ), 999 );
		add_action( self::FLUSH_HOOK, array( self::class, 'flush_log_queue' ) );

		$this->maybe_schedule_flush_event();
	}


	/**
	 * Add custom cron interval for queue flush.
	 *
	 * @since 2.0.0
	 * @param array $schedules Existing schedules.
	 * @return array
	 */
	public function add_cron_interval( $schedules ) {
		$schedules[ self::CRON_INTERVAL ] = array(
			'interval' => 30,
			'display'  => __( 'Every 30 Seconds', 'flexify-dashboard' ),
		);

		return $schedules;
	}


	/**
	 * Log an activity to the queue.
	 *
	 * @since 2.0.0
	 * @param string   $action Action type.
	 * @param string   $object_type Object type.
	 * @param int|null $object_id Object ID.
	 * @param array|null $old_value Old value snapshot.
	 * @param array|null $new_value New value snapshot.
	 * @param array|null $metadata Additional metadata.
	 * @param int|null $user_id User ID. Defaults to current user.
	 * @return bool
	 */
	public static function log( $action, $object_type, $object_id = null, $old_value = null, $new_value = null, $metadata = null, $user_id = null ) {
		if ( ! ActivityDatabase::is_activity_logger_enabled() ) {
			return false;
		}

		$user_id = is_null( $user_id ) ? get_current_user_id() : absint( $user_id );

		if ( empty( $user_id ) ) {
			return false;
		}

		if ( ! self::should_log_action( $action, $object_type ) ) {
			return false;
		}

		self::$log_queue[] = array(
			'user_id'     => $user_id,
			'action'      => sanitize_text_field( $action ),
			'object_type' => sanitize_text_field( $object_type ),
			'object_id'   => is_null( $object_id ) ? null : absint( $object_id ),
			'old_value'   => self::encode_log_field( $old_value ),
			'new_value'   => self::encode_log_field( $new_value ),
			'ip_address'  => self::get_client_ip(),
			'user_agent'  => self::get_user_agent(),
			'metadata'    => self::encode_log_field( $metadata ),
			'created_at'  => current_time( 'mysql' ),
		);

		return true;
	}


	/**
	 * Flush queued logs into database.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function flush_log_queue() {
		global $wpdb;

		if ( empty( self::$log_queue ) ) {
			return;
		}

		$table_name = self::get_table_name();

		if ( ! self::table_exists( $table_name ) ) {
			return;
		}

		foreach ( self::$log_queue as $log_data ) {
			$wpdb->insert(
				$table_name,
				array(
					'user_id'     => $log_data['user_id'],
					'action'      => $log_data['action'],
					'object_type' => $log_data['object_type'],
					'object_id'   => $log_data['object_id'],
					'old_value'   => $log_data['old_value'],
					'new_value'   => $log_data['new_value'],
					'ip_address'  => $log_data['ip_address'],
					'user_agent'  => $log_data['user_agent'],
					'metadata'    => $log_data['metadata'],
					'created_at'  => $log_data['created_at'],
				),
				array(
					'%d',
					'%s',
					'%s',
					'%d',
					'%s',
					'%s',
					'%s',
					'%s',
					'%s',
					'%s',
				)
			);
		}

		self::$log_queue = array();
	}


	/**
	 * Retrieve activity logs with filtering and pagination.
	 *
	 * @since 2.0.0
	 * @param array $args Query arguments.
	 * @return array
	 */
	public static function get_logs( $args = array() ) {
		global $wpdb;

		$table_name = self::get_table_name();

		if ( ! self::table_exists( $table_name ) ) {
			return array(
				'logs'        => array(),
				'total'       => 0,
				'page'        => 1,
				'per_page'    => 30,
				'total_pages' => 0,
			);
		}

		$defaults = array(
			'page'        => 1,
			'per_page'    => 30,
			'user_id'     => null,
			'action'      => null,
			'object_type' => null,
			'object_id'   => null,
			'search'      => null,
			'date_from'   => null,
			'date_to'     => null,
			'orderby'     => 'created_at',
			'order'       => 'DESC',
		);

		$args = wp_parse_args( $args, $defaults );

		$page = max( 1, absint( $args['page'] ) );
		$per_page = max( 1, absint( $args['per_page'] ) );
		$offset = ( $page - 1 ) * $per_page;

		$where_data = self::build_where_clause( $args );
		$where_clause = $where_data['where_clause'];
		$where_values = $where_data['where_values'];

		$count_query = "SELECT COUNT(*) FROM {$table_name} WHERE {$where_clause}";
		$total = (int) self::prepare_and_get_var( $count_query, $where_values );

		$order_by = self::get_orderby_clause( $args['orderby'], $args['order'] );

		$query = "SELECT * FROM {$table_name} WHERE {$where_clause} ORDER BY {$order_by} LIMIT %d OFFSET %d";
		$query_values = array_merge( $where_values, array( $per_page, $offset ) );
		$prepared_query = $wpdb->prepare( $query, $query_values );
		$logs = $wpdb->get_results( $prepared_query, ARRAY_A );

		if ( ! is_array( $logs ) ) {
			$logs = array();
		}

		$logs = array_map( array( self::class, 'decode_log_entry' ), $logs );

		return array(
			'logs'        => $logs,
			'total'       => $total,
			'page'        => $page,
			'per_page'    => $per_page,
			'total_pages' => $per_page > 0 ? (int) ceil( $total / $per_page ) : 0,
		);
	}


	/**
	 * Get a single log entry by ID.
	 *
	 * @since 2.0.0
	 * @param int $log_id Log ID.
	 * @return array|null
	 */
	public static function get_log( $log_id ) {
		global $wpdb;

		$table_name = self::get_table_name();

		if ( ! self::table_exists( $table_name ) ) {
			return null;
		}

		$log = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE id = %d",
				absint( $log_id )
			),
			ARRAY_A
		);

		if ( empty( $log ) || ! is_array( $log ) ) {
			return null;
		}

		return self::decode_log_entry( $log );
	}


	/**
	 * Get activity statistics.
	 *
	 * @since 2.0.0
	 * @param array $args Query arguments.
	 * @return array
	 */
	public static function get_stats( $args = array() ) {
		global $wpdb;

		$table_name = self::get_table_name();

		if ( ! self::table_exists( $table_name ) ) {
			return array(
				'total'        => 0,
				'actions'      => array(),
				'object_types' => array(),
				'top_users'    => array(),
			);
		}

		$defaults = array(
			'date_from' => null,
			'date_to'   => null,
		);

		$args = wp_parse_args( $args, $defaults );

		$where_data = self::build_where_clause(
			array(
				'date_from' => $args['date_from'],
				'date_to'   => $args['date_to'],
			)
		);

		$where_clause = $where_data['where_clause'];
		$where_values = $where_data['where_values'];

		$total_query = "SELECT COUNT(*) FROM {$table_name} WHERE {$where_clause}";
		$total = (int) self::prepare_and_get_var( $total_query, $where_values );

		$actions_query = "SELECT action, COUNT(*) as count FROM {$table_name} WHERE {$where_clause} GROUP BY action ORDER BY count DESC";
		$actions = self::prepare_and_get_results( $actions_query, $where_values );

		$types_query = "SELECT object_type, COUNT(*) as count FROM {$table_name} WHERE {$where_clause} GROUP BY object_type ORDER BY count DESC";
		$types = self::prepare_and_get_results( $types_query, $where_values );

		$users_query = "SELECT user_id, COUNT(*) as count FROM {$table_name} WHERE {$where_clause} GROUP BY user_id ORDER BY count DESC LIMIT 10";
		$top_users = self::prepare_and_get_results( $users_query, $where_values );

		return array(
			'total'        => $total,
			'actions'      => is_array( $actions ) ? $actions : array(),
			'object_types' => is_array( $types ) ? $types : array(),
			'top_users'    => is_array( $top_users ) ? $top_users : array(),
		);
	}


	/**
	 * Schedule the queue flush event if needed.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function maybe_schedule_flush_event() {
		if ( wp_next_scheduled( self::FLUSH_HOOK ) ) {
			return;
		}

		wp_schedule_event( time(), self::CRON_INTERVAL, self::FLUSH_HOOK );
	}


	/**
	 * Check if action should be logged based on plugin settings.
	 *
	 * @since 2.0.0
	 * @param string $action Action type.
	 * @param string $object_type Object type.
	 * @return bool
	 */
	private static function should_log_action( $action, $object_type ) {
		$settings = self::get_settings();
		$log_level = isset( $settings['activity_log_level'] ) ? sanitize_text_field( $settings['activity_log_level'] ) : self::DEFAULT_LOG_LEVEL;

		if ( 'important' !== $log_level ) {
			return true;
		}

		return self::is_important_action( $action, $object_type );
	}


	/**
	 * Check if an action is considered important.
	 *
	 * @since 2.0.0
	 * @param string $action Action type.
	 * @param string $object_type Object type.
	 * @return bool
	 */
	private static function is_important_action( $action, $object_type ) {
		unset( $object_type );

		return in_array( $action, self::$important_actions, true );
	}


	/**
	 * Sanitize log data recursively to remove sensitive information.
	 *
	 * @since 2.0.0
	 * @param mixed $data Data to sanitize.
	 * @return mixed
	 */
	private static function sanitize_log_data( $data ) {
		if ( ! is_array( $data ) ) {
			return $data;
		}

		$sensitive_keys = array(
			'password',
			'user_pass',
			'pass',
			'api_key',
			'secret',
			'token',
			'private_key',
			'auth_key',
		);

		$sanitized = array();

		foreach ( $data as $key => $value ) {
			$lower_key = is_string( $key ) ? strtolower( $key ) : '';

			foreach ( $sensitive_keys as $sensitive_key ) {
				if ( false !== strpos( $lower_key, $sensitive_key ) ) {
					$sanitized[ $key ] = '[REDACTED]';

					continue 2;
				}
			}

			if ( is_array( $value ) ) {
				$sanitized[ $key ] = self::sanitize_log_data( $value );
			} else {
				$sanitized[ $key ] = $value;
			}
		}

		return $sanitized;
	}


	/**
	 * Get the current client IP address.
	 *
	 * @since 2.0.0
	 * @return string|null
	 */
	private static function get_client_ip() {
		$ip_keys = array(
			'HTTP_CF_CONNECTING_IP',
			'HTTP_X_REAL_IP',
			'HTTP_X_FORWARDED_FOR',
			'REMOTE_ADDR',
		);

		foreach ( $ip_keys as $server_key ) {
			$server_value = isset( $_SERVER[ $server_key ] ) ? sanitize_text_field( wp_unslash( $_SERVER[ $server_key ] ) ) : '';

			if ( empty( $server_value ) ) {
				continue;
			}

			$ip = $server_value;

			if ( false !== strpos( $ip, ',' ) ) {
				$ip_parts = explode( ',', $ip );
				$ip = isset( $ip_parts[0] ) ? trim( $ip_parts[0] ) : '';
			}

			if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
				return $ip;
			}
		}

		return null;
	}


	/**
	 * Get current request user agent.
	 *
	 * @since 2.0.0
	 * @return string|null
	 */
	private static function get_user_agent() {
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';

		return ! empty( $user_agent ) ? $user_agent : null;
	}


	/**
	 * Build the WHERE clause for log queries.
	 *
	 * @since 2.0.0
	 * @param array $args Query arguments.
	 * @return array
	 */
	private static function build_where_clause( $args ) {
		global $wpdb;

		$where = array( '1=1' );
		$where_values = array();

		if ( ! empty( $args['user_id'] ) ) {
			$where[] = 'user_id = %d';
			$where_values[] = absint( $args['user_id'] );
		}

		if ( ! empty( $args['action'] ) ) {
			$where[] = 'action = %s';
			$where_values[] = sanitize_text_field( $args['action'] );
		}

		if ( ! empty( $args['object_type'] ) ) {
			$where[] = 'object_type = %s';
			$where_values[] = sanitize_text_field( $args['object_type'] );
		}

		if ( ! empty( $args['object_id'] ) ) {
			$where[] = 'object_id = %d';
			$where_values[] = absint( $args['object_id'] );
		}

		if ( ! empty( $args['date_from'] ) ) {
			$where[] = 'created_at >= %s';
			$where_values[] = sanitize_text_field( $args['date_from'] );
		}

		if ( ! empty( $args['date_to'] ) ) {
			$where[] = 'created_at <= %s';
			$where_values[] = sanitize_text_field( $args['date_to'] );
		}

		if ( ! empty( $args['search'] ) ) {
			$search = '%' . $wpdb->esc_like( sanitize_text_field( $args['search'] ) ) . '%';

			$where[] = '(action LIKE %s OR object_type LIKE %s OR old_value LIKE %s OR new_value LIKE %s OR metadata LIKE %s)';
			$where_values[] = $search;
			$where_values[] = $search;
			$where_values[] = $search;
			$where_values[] = $search;
			$where_values[] = $search;
		}

		return array(
			'where_clause' => implode( ' AND ', $where ),
			'where_values' => $where_values,
		);
	}


	/**
	 * Get safe ORDER BY clause.
	 *
	 * @since 2.0.0
	 * @param string $orderby Order by column.
	 * @param string $order Order direction.
	 * @return string
	 */
	private static function get_orderby_clause( $orderby, $order ) {
		$allowed_orderby = array(
			'id',
			'user_id',
			'action',
			'object_type',
			'object_id',
			'created_at',
		);

		$orderby_column = in_array( $orderby, $allowed_orderby, true ) ? $orderby : 'created_at';
		$order_direction = 'ASC' === strtoupper( $order ) ? 'ASC' : 'DESC';
		$order_by = sanitize_sql_orderby( $orderby_column . ' ' . $order_direction );

		return $order_by ? $order_by : 'created_at DESC';
	}


	/**
	 * Decode JSON fields from a log entry.
	 *
	 * @since 2.0.0
	 * @param array $log Log entry.
	 * @return array
	 */
	private static function decode_log_entry( $log ) {
		if ( ! is_array( $log ) ) {
			return array();
		}

		if ( ! empty( $log['old_value'] ) ) {
			$log['old_value'] = json_decode( $log['old_value'], true );
		}

		if ( ! empty( $log['new_value'] ) ) {
			$log['new_value'] = json_decode( $log['new_value'], true );
		}

		if ( ! empty( $log['metadata'] ) ) {
			$log['metadata'] = json_decode( $log['metadata'], true );
		}

		return $log;
	}


	/**
	 * Encode a log field as JSON after sanitization.
	 *
	 * @since 2.0.0
	 * @param mixed $data Field data.
	 * @return string|null
	 */
	private static function encode_log_field( $data ) {
		if ( is_null( $data ) ) {
			return null;
		}

		return wp_json_encode( self::sanitize_log_data( $data ) );
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
	 * Get full activity log table name.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function get_table_name() {
		global $wpdb;

		return $wpdb->prefix . self::TABLE_SUFFIX;
	}


	/**
	 * Check if a database table exists.
	 *
	 * @since 2.0.0
	 * @param string $table_name Database table name.
	 * @return bool
	 */
	private static function table_exists( $table_name ) {
		global $wpdb;

		$existing_table = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) );

		return $existing_table === $table_name;
	}


	/**
	 * Prepare query and get a single variable.
	 *
	 * @since 2.0.0
	 * @param string $query SQL query.
	 * @param array  $values Query values.
	 * @return mixed
	 */
	private static function prepare_and_get_var( $query, $values = array() ) {
		global $wpdb;

		if ( ! empty( $values ) ) {
			$query = $wpdb->prepare( $query, $values );
		}

		return $wpdb->get_var( $query );
	}


	/**
	 * Prepare query and get results.
	 *
	 * @since 2.0.0
	 * @param string $query SQL query.
	 * @param array  $values Query values.
	 * @return array
	 */
	private static function prepare_and_get_results( $query, $values = array() ) {
		global $wpdb;

		if ( ! empty( $values ) ) {
			$query = $wpdb->prepare( $query, $values );
		}

		$results = $wpdb->get_results( $query, ARRAY_A );

		return is_array( $results ) ? $results : array();
	}
}