<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use wpdb;

defined('ABSPATH') || exit;

/**
 * Class DatabaseExplorer
 *
 * REST API endpoints for database explorer functionality.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class DatabaseExplorer {
	/**
	 * REST API namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Maximum rows per page for table data.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const MAX_PER_PAGE = 500;

	/**
	 * Default rows per page for table data.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const DEFAULT_PER_PAGE = 50;

	/**
	 * Maximum limit allowed for custom queries.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const MAX_QUERY_LIMIT = 10000;

	/**
	 * Default limit for custom queries.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const DEFAULT_QUERY_LIMIT = 1000;

	/**
	 * Constructor.
	 *
	 * Registers REST API endpoints.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_custom_endpoints' ) );
	}


	/**
	 * Register custom REST API endpoints for database operations.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_custom_endpoints() {
		register_rest_route( self::REST_NAMESPACE, '/database/tables', array(
			'methods' => 'GET',
			'callback' => array( __CLASS__, 'get_tables' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
		) );

		register_rest_route( self::REST_NAMESPACE, '/database/tables/(?P<table>[a-zA-Z0-9_]+)/structure', array(
			'methods' => 'GET',
			'callback' => array( __CLASS__, 'get_table_structure' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'table' => self::get_table_arg_schema(),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/database/tables/(?P<table>[a-zA-Z0-9_]+)/data', array(
			'methods' => 'GET',
			'callback' => array( __CLASS__, 'get_table_data' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'table' => self::get_table_arg_schema(),
				'page' => array(
					'required' => false,
					'default' => 1,
					'validate_callback' => function( $param ) {
						return is_numeric( $param ) && (int) $param > 0;
					},
					'sanitize_callback' => 'absint',
				),
				'per_page' => array(
					'required' => false,
					'default' => self::DEFAULT_PER_PAGE,
					'validate_callback' => function( $param ) {
						return is_numeric( $param ) && (int) $param > 0 && (int) $param <= self::MAX_PER_PAGE;
					},
					'sanitize_callback' => 'absint',
				),
				'orderby' => array(
					'required' => false,
					'default' => null,
					'sanitize_callback' => 'sanitize_key',
				),
				'order' => array(
					'required' => false,
					'default' => 'ASC',
					'validate_callback' => function( $param ) {
						return in_array( strtoupper( (string) $param ), array( 'ASC', 'DESC' ), true );
					},
					'sanitize_callback' => function( $param ) {
						$order = strtoupper( sanitize_text_field( $param ) );
						return in_array( $order, array( 'ASC', 'DESC' ), true ) ? $order : 'ASC';
					},
				),
				'search' => array(
					'required' => false,
					'default' => '',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/database/query', array(
			'methods' => 'POST',
			'callback' => array( __CLASS__, 'execute_query' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'query' => array(
					'required' => true,
					'validate_callback' => function( $param ) {
						return is_string( $param ) && ! empty( trim( $param ) );
					},
					'sanitize_callback' => function( $param ) {
						return is_string( $param ) ? trim( $param ) : '';
					},
				),
				'limit' => array(
					'required' => false,
					'default' => self::DEFAULT_QUERY_LIMIT,
					'validate_callback' => function( $param ) {
						return is_numeric( $param ) && (int) $param > 0 && (int) $param <= self::MAX_QUERY_LIMIT;
					},
					'sanitize_callback' => 'absint',
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/database/tables/(?P<table>[a-zA-Z0-9_]+)/count', array(
			'methods' => 'GET',
			'callback' => array( __CLASS__, 'get_table_count' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'table' => self::get_table_arg_schema(),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/database/verify-password', array(
			'methods' => 'POST',
			'callback' => array( __CLASS__, 'verify_password' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'password' => array(
					'required' => true,
					'validate_callback' => function( $param ) {
						return is_string( $param ) && ! empty( $param );
					},
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( self::REST_NAMESPACE, '/database/tables/(?P<table>[a-zA-Z0-9_]+)', array(
			'methods' => 'DELETE',
			'callback' => array( __CLASS__, 'delete_table' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args' => array(
				'table' => self::get_table_arg_schema(),
				'password' => array(
					'required' => true,
					'validate_callback' => function( $param ) {
						return is_string( $param ) && ! empty( $param );
					},
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );
	}


	/**
	 * Check if the user has permission to access database explorer.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return bool|WP_Error
	 */
	public static function check_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_options' );
	}


	/**
	 * Get list of standard WordPress table names without prefix.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_standard_wp_tables() {
		$standard_tables = array(
			'commentmeta',
			'comments',
			'links',
			'options',
			'postmeta',
			'posts',
			'terms',
			'termmeta',
			'term_relationships',
			'term_taxonomy',
			'usermeta',
			'users',
		);

		if ( is_multisite() ) {
			$standard_tables = array_merge( $standard_tables, array(
				'blogs',
				'blog_versions',
				'registration_log',
				'signups',
				'site',
				'sitemeta',
			) );
		}

		return $standard_tables;
	}


	/**
	 * Check if a table is a WordPress core table regardless of prefix.
	 *
	 * @since 2.0.0
	 * @param string $table_name Full table name.
	 * @return bool
	 */
	private static function is_wordpress_table( $table_name ) {
		global $wpdb;

		$table_prefix = $wpdb->prefix;
		$standard_tables = self::get_standard_wp_tables();

		if ( 0 !== strpos( $table_name, $table_prefix ) ) {
			return false;
		}

		$base_table_name = substr( $table_name, strlen( $table_prefix ) );

		if ( in_array( $base_table_name, $standard_tables, true ) ) {
			return true;
		}

		if ( is_multisite() && preg_match( '/^(\d+)_(.+)$/', $base_table_name, $matches ) ) {
			$actual_table_name = isset( $matches[2] ) ? $matches[2] : '';

			if ( in_array( $actual_table_name, $standard_tables, true ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Validate and sanitize table or column name.
	 *
	 * @since 2.0.0
	 * @param string $identifier Table or column name.
	 * @return string|false
	 */
	private static function validate_table_name( $identifier ) {
		if ( ! is_string( $identifier ) || ! preg_match( '/^[a-zA-Z0-9_]+$/', $identifier ) ) {
			return false;
		}

		if ( strlen( $identifier ) < 1 || strlen( $identifier ) > 64 ) {
			return false;
		}

		return $identifier;
	}


	/**
	 * Get the shared REST argument schema for table names.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_table_arg_schema() {
		return array(
			'required' => true,
			'validate_callback' => function( $param ) {
				return is_string( $param ) && ! empty( $param );
			},
			'sanitize_callback' => 'sanitize_text_field',
		);
	}


	/**
	 * Check if a database table exists.
	 *
	 * @since 2.0.0
	 * @param wpdb   $wpdb WordPress database object.
	 * @param string $table_name Table name.
	 * @return bool
	 */
	private static function table_exists( wpdb $wpdb, $table_name ) {
		$result = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) );

		return ! empty( $result );
	}


	/**
	 * Get escaped SQL identifier after validation.
	 *
	 * @since 2.0.0
	 * @param string $identifier Table or column name.
	 * @return string|false
	 */
	private static function get_escaped_identifier( $identifier ) {
		$validated_identifier = self::validate_table_name( $identifier );

		if ( ! $validated_identifier ) {
			return false;
		}

		return esc_sql( $validated_identifier );
	}


	/**
	 * Build search conditions for a list of columns.
	 *
	 * @since 2.0.0
	 * @param wpdb   $wpdb WordPress database object.
	 * @param array  $columns Column names.
	 * @param string $search Search term.
	 * @return string
	 */
	private static function build_search_sql( wpdb $wpdb, array $columns, $search ) {
		$search = sanitize_text_field( $search );

		if ( empty( $search ) ) {
			return '';
		}

		$search_conditions = array();

		foreach ( $columns as $column ) {
			$escaped_column = self::get_escaped_identifier( $column );

			if ( ! $escaped_column ) {
				continue;
			}

			$search_conditions[] = $wpdb->prepare( "`{$escaped_column}` LIKE %s", '%' . $wpdb->esc_like( $search ) . '%' );
		}

		return ! empty( $search_conditions ) ? ' WHERE ' . implode( ' OR ', $search_conditions ) : '';
	}


	/**
	 * Verify the current user password.
	 *
	 * @since 2.0.0
	 * @param string $password User password.
	 * @return true|WP_Error
	 */
	private static function verify_current_user_password( $password ) {
		$current_user = wp_get_current_user();

		if ( empty( $password ) ) {
			return new WP_Error(
				'password_required',
				__( 'Password is required.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$user = wp_authenticate( $current_user->user_login, $password );

		if ( is_wp_error( $user ) || (int) $user->ID !== (int) $current_user->ID ) {
			return new WP_Error(
				'invalid_password',
				__( 'Invalid password.', 'flexify-dashboard' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}


	/**
	 * Get list of all database tables.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response
	 */
	public static function get_tables( WP_REST_Request $request ) {
		global $wpdb;

		$tables = array();
		$results = $wpdb->get_results( 'SHOW TABLES', ARRAY_N );

		if ( ! is_array( $results ) ) {
			$results = array();
		}

		foreach ( $results as $row ) {
			$table_name = isset( $row[0] ) ? $row[0] : '';
			$escaped_table_name = self::get_escaped_identifier( $table_name );

			if ( ! $escaped_table_name ) {
				continue;
			}

			$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `{$escaped_table_name}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$size_query = $wpdb->prepare(
				'SELECT ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb FROM information_schema.TABLES WHERE table_schema = %s AND table_name = %s',
				DB_NAME,
				$table_name
			);
			$size = $wpdb->get_var( $size_query );

			$tables[] = array(
				'name' => $table_name,
				'is_wp_table' => self::is_wordpress_table( $table_name ),
				'row_count' => $count,
				'size_mb' => $size ? (float) $size : 0,
			);
		}

		return new WP_REST_Response( $tables, 200 );
	}


	/**
	 * Get table structure.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_table_structure( WP_REST_Request $request ) {
		global $wpdb;

		$table_name = sanitize_text_field( $request->get_param( 'table' ) );
		$escaped_table_name = self::get_escaped_identifier( $table_name );

		if ( ! $escaped_table_name ) {
			return new WP_Error(
				'invalid_table_name',
				__( 'Invalid table name.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! self::table_exists( $wpdb, $table_name ) ) {
			return new WP_Error(
				'table_not_found',
				__( 'Table not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$columns = $wpdb->get_results( "DESCRIBE `{$escaped_table_name}`", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$indexes = $wpdb->get_results( "SHOW INDEXES FROM `{$escaped_table_name}`", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$foreign_keys = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND REFERENCED_TABLE_NAME IS NOT NULL',
				DB_NAME,
				$table_name
			),
			ARRAY_A
		);

		return new WP_REST_Response( array(
			'columns' => is_array( $columns ) ? $columns : array(),
			'indexes' => is_array( $indexes ) ? $indexes : array(),
			'foreign_keys' => is_array( $foreign_keys ) ? $foreign_keys : array(),
		), 200 );
	}


	/**
	 * Get table data with pagination.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_table_data( WP_REST_Request $request ) {
		global $wpdb;

		$table_name = sanitize_text_field( $request->get_param( 'table' ) );
		$page = max( 1, absint( $request->get_param( 'page' ) ) );
		$per_page = absint( $request->get_param( 'per_page' ) );
		$per_page = $per_page > 0 ? min( $per_page, self::MAX_PER_PAGE ) : self::DEFAULT_PER_PAGE;
		$orderby = sanitize_key( (string) $request->get_param( 'orderby' ) );
		$order = strtoupper( sanitize_text_field( (string) $request->get_param( 'order' ) ) );
		$order = in_array( $order, array( 'ASC', 'DESC' ), true ) ? $order : 'ASC';
		$search = sanitize_text_field( (string) $request->get_param( 'search' ) );

		$escaped_table_name = self::get_escaped_identifier( $table_name );

		if ( ! $escaped_table_name ) {
			return new WP_Error(
				'invalid_table_name',
				__( 'Invalid table name.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! self::table_exists( $wpdb, $table_name ) ) {
			return new WP_Error(
				'table_not_found',
				__( 'Table not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$columns = $wpdb->get_col( "DESCRIBE `{$escaped_table_name}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( empty( $columns ) || ! is_array( $columns ) ) {
			return new WP_Error(
				'table_error',
				__( 'Unable to retrieve table structure.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		$where_sql = self::build_search_sql( $wpdb, $columns, $search );
		$count_query = "SELECT COUNT(*) FROM `{$escaped_table_name}`{$where_sql}";
		$total = (int) $wpdb->get_var( $count_query ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		$offset = ( $page - 1 ) * $per_page;
		$query = "SELECT * FROM `{$escaped_table_name}`{$where_sql}";

		if ( ! empty( $orderby ) && in_array( $orderby, $columns, true ) ) {
			$escaped_orderby = self::get_escaped_identifier( $orderby );

			if ( $escaped_orderby ) {
				$query .= " ORDER BY `{$escaped_orderby}` {$order}";
			}
		}

		$query .= $wpdb->prepare( ' LIMIT %d OFFSET %d', $per_page, $offset );
		$data = $wpdb->get_results( $query, ARRAY_A );

		return new WP_REST_Response( array(
			'data' => is_array( $data ) ? $data : array(),
			'pagination' => array(
				'page' => $page,
				'per_page' => $per_page,
				'total' => $total,
				'total_pages' => $per_page > 0 ? (int) ceil( $total / $per_page ) : 0,
			),
		), 200 );
	}


	/**
	 * Execute a custom SQL query.
	 *
	 * Only read-only SELECT queries are allowed.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function execute_query( WP_REST_Request $request ) {
		global $wpdb;

		$query = trim( (string) $request->get_param( 'query' ) );
		$limit = absint( $request->get_param( 'limit' ) );
		$limit = $limit > 0 ? min( $limit, self::MAX_QUERY_LIMIT ) : self::DEFAULT_QUERY_LIMIT;

		$query = preg_replace( '/--.*$/m', '', $query );
		$query = preg_replace( '/\/\*.*?\*\//s', '', $query );
		$query = preg_replace( '/\s+/', ' ', $query );
		$query = trim( $query );

		if ( 0 !== stripos( $query, 'SELECT' ) ) {
			return new WP_Error(
				'invalid_query',
				__( 'Only SELECT queries are allowed for safety.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$dangerous_keywords = array(
			'DROP',
			'DELETE',
			'UPDATE',
			'INSERT',
			'ALTER',
			'CREATE',
			'TRUNCATE',
			'EXEC',
			'EXECUTE',
			'CALL',
		);

		foreach ( $dangerous_keywords as $keyword ) {
			if ( preg_match( '/\b' . preg_quote( $keyword, '/' ) . '\b/i', $query ) ) {
				return new WP_Error(
					'invalid_query',
					__( 'Query contains prohibited SQL keywords.', 'flexify-dashboard' ),
					array( 'status' => 400 )
				);
			}
		}

		$parts = explode( ';', $query );

		if ( count( $parts ) > 1 ) {
			foreach ( array_slice( $parts, 1 ) as $part ) {
				if ( ! empty( trim( $part ) ) ) {
					return new WP_Error(
						'invalid_query',
						__( 'Multiple statements are not allowed.', 'flexify-dashboard' ),
						array( 'status' => 400 )
					);
				}
			}
		}

		if ( false === stripos( $query, 'LIMIT' ) ) {
			$query .= $wpdb->prepare( ' LIMIT %d', $limit );
		} elseif ( preg_match( '/LIMIT\s+(\d+)/i', $query, $matches ) ) {
			$existing_limit = isset( $matches[1] ) ? (int) $matches[1] : 0;

			if ( $existing_limit > $limit ) {
				$query = preg_replace( '/LIMIT\s+\d+/i', 'LIMIT ' . $limit, $query, 1 );
			}
		}

		$results = $wpdb->get_results( $query, ARRAY_A );

		if ( ! empty( $wpdb->last_error ) ) {
			error_log( 'Database Explorer query error: ' . $wpdb->last_error );

			return new WP_Error(
				'query_error',
				__( 'Query execution failed. Please check your SQL syntax.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response( array(
			'data' => is_array( $results ) ? $results : array(),
			'rows_affected' => is_array( $results ) ? count( $results ) : 0,
		), 200 );
	}


	/**
	 * Get row count for a table.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_table_count( WP_REST_Request $request ) {
		global $wpdb;

		$table_name = sanitize_text_field( $request->get_param( 'table' ) );
		$escaped_table_name = self::get_escaped_identifier( $table_name );

		if ( ! $escaped_table_name ) {
			return new WP_Error(
				'invalid_table_name',
				__( 'Invalid table name.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! self::table_exists( $wpdb, $table_name ) ) {
			return new WP_Error(
				'table_not_found',
				__( 'Table not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `{$escaped_table_name}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return new WP_REST_Response( array(
			'count' => $count,
		), 200 );
	}


	/**
	 * Verify the current user's password for destructive operations.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function verify_password( WP_REST_Request $request ) {
		$password = sanitize_text_field( (string) $request->get_param( 'password' ) );
		$verified = self::verify_current_user_password( $password );

		if ( is_wp_error( $verified ) ) {
			return $verified;
		}

		return new WP_REST_Response( array(
			'verified' => true,
		), 200 );
	}


	/**
	 * Check if a table is safe to delete.
	 *
	 * Only non-standard WordPress tables can be deleted.
	 *
	 * @since 2.0.0
	 * @param string $table_name Table name.
	 * @return array
	 */
	private static function is_table_safe_to_delete( $table_name ) {
		if ( self::is_wordpress_table( $table_name ) ) {
			return array(
				'safe' => false,
				'reason' => __( 'WordPress core tables cannot be deleted.', 'flexify-dashboard' ),
			);
		}

		$system_tables = array(
			'information_schema',
			'mysql',
			'performance_schema',
			'sys',
		);

		foreach ( $system_tables as $system_table ) {
			if ( 0 === stripos( $table_name, $system_table ) ) {
				return array(
					'safe' => false,
					'reason' => __( 'System tables cannot be deleted.', 'flexify-dashboard' ),
				);
			}
		}

		return array(
			'safe' => true,
			'reason' => '',
		);
	}


	/**
	 * Delete a non-standard WordPress table.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_table( WP_REST_Request $request ) {
		global $wpdb;

		$table_name = sanitize_text_field( $request->get_param( 'table' ) );
		$password = sanitize_text_field( (string) $request->get_param( 'password' ) );
		$escaped_table_name = self::get_escaped_identifier( $table_name );

		if ( ! $escaped_table_name ) {
			return new WP_Error(
				'invalid_table_name',
				__( 'Invalid table name.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( empty( $password ) ) {
			return new WP_Error(
				'password_required',
				__( 'Password is required for this operation.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$verified = self::verify_current_user_password( $password );

		if ( is_wp_error( $verified ) ) {
			return $verified;
		}

		$safety_check = self::is_table_safe_to_delete( $table_name );

		if ( empty( $safety_check['safe'] ) ) {
			return new WP_Error(
				'table_protected',
				$safety_check['reason'],
				array( 'status' => 403 )
			);
		}

		if ( ! self::table_exists( $wpdb, $table_name ) ) {
			return new WP_Error(
				'table_not_found',
				__( 'Table not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$current_user = wp_get_current_user();

		error_log(
			sprintf(
				'Database Explorer: User %s (%d) deleted table %s',
				$current_user->user_login,
				(int) $current_user->ID,
				$table_name
			)
		);

		$result = $wpdb->query( "DROP TABLE IF EXISTS `{$escaped_table_name}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( false === $result ) {
			error_log( 'Database Explorer deletion error: ' . $wpdb->last_error );

			return new WP_Error(
				'deletion_failed',
				__( 'Failed to delete table.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response( array(
			'success' => true,
			'message' => sprintf( __( "Table '%s' has been deleted.", 'flexify-dashboard' ), esc_html( $table_name ) ),
		), 200 );
	}
}