<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use Exception;
use ReflectionClass;
use ReflectionFunction;

defined('ABSPATH') || exit;

/**
 * Class PluginMetricsCollector
 *
 * Main class responsible for collecting and managing plugin performance metrics.
 * Coordinates all metric collection processes including memory, hooks, queries, and assets.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class PluginMetricsCollector {

	/**
	 * Collected metrics by plugin file.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics = array();

	/**
	 * Specific plugin slug to filter collection.
	 *
	 * @since 2.0.0
	 * @var string|false
	 */
	private $specific_plugin_slug = false;

	/**
	 * Memory threshold used to register snapshots.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private $memory_threshold = 65536;

	/**
	 * Default memory threshold for full scan.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const DEFAULT_MEMORY_THRESHOLD = 65536;

	/**
	 * Memory threshold for single plugin scan.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const SINGLE_PLUGIN_MEMORY_THRESHOLD = 16384;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'plugins_loaded', array( $this, 'initialize_metrics_collection' ), -999999 );
	}


	/**
	 * Initialize the metrics collection process.
	 * Triggers only when the collect_plugin_metrics query parameter is present.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function initialize_metrics_collection() {
		$collect_plugin_metrics = isset( $_GET['collect_plugin_metrics'] ) ? sanitize_text_field( wp_unslash( $_GET['collect_plugin_metrics'] ) ) : '';

		if ( empty( $collect_plugin_metrics ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$this->specific_plugin_slug = isset( $_GET['plugin_slug'] ) ? sanitize_text_field( wp_unslash( $_GET['plugin_slug'] ) ) : false;
		$this->memory_threshold = $this->specific_plugin_slug ? self::SINGLE_PLUGIN_MEMORY_THRESHOLD : self::DEFAULT_MEMORY_THRESHOLD;

		$this->initialize_plugin_metrics();
		$this->setup_hooks();
	}


	/**
	 * Set up initial metrics data structure for active plugins.
	 * Filters plugins based on specific_plugin_slug if provided.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function initialize_plugin_metrics() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$all_plugins = get_plugins();
		$active_plugins = get_option( 'active_plugins', array() );

		if ( ! is_array( $active_plugins ) || empty( $active_plugins ) ) {
			return;
		}

		foreach ( $active_plugins as $plugin ) {
			$plugin = is_string( $plugin ) ? $plugin : '';

			if ( empty( $plugin ) ) {
				continue;
			}

			$slug_parts = explode( '/', $plugin );
			$base_slug = isset( $slug_parts[0] ) ? $slug_parts[0] : '';

			if ( $this->specific_plugin_slug && $this->specific_plugin_slug !== $base_slug ) {
				continue;
			}

			$plugin_name = isset( $all_plugins[ $plugin ]['Name'] ) ? $all_plugins[ $plugin ]['Name'] : $plugin;
			$plugin_version = isset( $all_plugins[ $plugin ]['Version'] ) ? $all_plugins[ $plugin ]['Version'] : '';

			$this->metrics[ $plugin ] = array(
				'name' => $plugin_name,
				'version' => $plugin_version,
				'splitSlug' => $base_slug,
				'active' => true,
				'start_time' => null,
				'end_time' => null,
				'active_time' => 0,
				'memory_snapshots' => array(),
				'peak_memory' => 0,
				'queries' => array(),
				'hooks' => array(),
				'metrics' => array(),
				'errors' => array(),
				'http_requests' => array(),
				'deprecated_calls' => array(),
				'assets' => array(
					'scripts' => array(),
					'styles' => array(),
				),
			);
		}
	}


	/**
	 * Initialize and configure all metric tracking components.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function setup_hooks() {
		if ( empty( $this->metrics ) ) {
			return;
		}

		$tracker = new ExecutionTracker( $this->metrics );
		$tracker->setup_tracking();

		$memory_monitor = new MemoryMonitor( $this->metrics, $this->memory_threshold );
		$memory_monitor->start_monitoring();

		$hook_analyzer = new HookAnalyzer( $this->metrics );
		$hook_analyzer->analyze_hooks();

		$query_tracker = new QueryTracker( $this->metrics );
		$query_tracker->setup_tracking();

		$http_monitor = new HttpRequestMonitor( $this->metrics );
		$http_monitor->setup_monitoring();

		$asset_tracker = new AssetTracker( $this->metrics );
		$asset_tracker->setup_tracking();

		$metrics_reporter = new MetricsReporter( $this->metrics );
		$metrics_reporter->setup_reporting();

		$deprecated_tracker = new DeprecatedFunctionTracker( $this->metrics );
		$deprecated_tracker->setup_tracking();

		$error_tracker = new ErrorTracker( $this->metrics );
		$error_tracker->setup_tracking();
	}
}

/**
 * Class ExecutionTracker
 *
 * Tracks plugin execution boundaries and timing.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class ExecutionTracker {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Configure execution tracking for all monitored plugins.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_tracking() {
		foreach ( $this->metrics as $plugin => &$data ) {
			$plugin_dir = $this->get_plugin_dir( $plugin );
			$this->track_execution_boundaries( $data, $plugin_dir );
		}
	}


	/**
	 * Set up execution boundary tracking for a specific plugin.
	 *
	 * @since 2.0.0
	 * @param array  $data Reference to plugin metrics data.
	 * @param string $plugin_dir Plugin directory path.
	 * @return void
	 */
	private function track_execution_boundaries( array &$data, $plugin_dir ) {
		add_action(
			'all',
			function() use ( &$data, $plugin_dir ) {
				static $last_start = null;

				$backtrace = debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS );
				$in_plugin = $this->has_plugin_trace( $backtrace, $plugin_dir );

				if ( $in_plugin && null === $last_start ) {
					$last_start = microtime( true );

					if ( null === $data['start_time'] ) {
						$data['start_time'] = $last_start;
					}

					$data['memory_snapshots'][] = array(
						'time' => microtime( true ),
						'usage' => memory_get_usage( true ),
						'peak' => memory_get_peak_usage( true ),
						'hook' => current_filter(),
					);
				}

				if ( null !== $last_start && ! $in_plugin ) {
					$data['active_time'] += microtime( true ) - $last_start;
					$last_start = null;
				}
			},
			0
		);
	}


	/**
	 * Check whether the current backtrace belongs to the plugin.
	 *
	 * @since 2.0.0
	 * @param array  $backtrace Debug backtrace.
	 * @param string $plugin_dir Plugin directory path.
	 * @return bool
	 */
	private function has_plugin_trace( array $backtrace, $plugin_dir ) {
		foreach ( $backtrace as $trace ) {
			$file = isset( $trace['file'] ) ? $trace['file'] : '';

			if ( $file && 0 === strpos( $file, $plugin_dir ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get plugin directory path.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file path.
	 * @return string
	 */
	private function get_plugin_dir( $plugin ) {
		return plugin_dir_path( WP_PLUGIN_DIR . '/' . $plugin );
	}
}

/**
 * Class MemoryMonitor
 *
 * Monitors and records plugin memory usage during execution.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class MemoryMonitor {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;

	/**
	 * Memory threshold.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private $memory_threshold;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @param int   $memory_threshold Threshold to register snapshots.
	 * @return void
	 */
	public function __construct( array &$metrics, $memory_threshold ) {
		$this->metrics = &$metrics;
		$this->memory_threshold = (int) $memory_threshold;
	}


	/**
	 * Initiate memory monitoring for all tracked plugins.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function start_monitoring() {
		foreach ( $this->metrics as $plugin => &$data ) {
			$plugin_dir = $this->get_plugin_dir( $plugin );
			$this->monitor_memory( $data, $plugin_dir );
		}
	}


	/**
	 * Set up memory monitoring for a specific plugin.
	 *
	 * @since 2.0.0
	 * @param array  $data Reference to plugin metrics data.
	 * @param string $plugin_dir Plugin directory path.
	 * @return void
	 */
	private function monitor_memory( array &$data, $plugin_dir ) {
		add_action(
			'all',
			function() use ( &$data, $plugin_dir ) {
				if ( null === $data['start_time'] ) {
					return;
				}

				$backtrace = debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS );

				if ( $this->has_plugin_trace( $backtrace, $plugin_dir ) ) {
					$this->record_memory_snapshot( $data );
				}
			},
			999999
		);
	}


	/**
	 * Record a memory snapshot if usage exceeds threshold.
	 *
	 * @since 2.0.0
	 * @param array $data Reference to plugin metrics data.
	 * @return void
	 */
	private function record_memory_snapshot( array &$data ) {
		$current_usage = memory_get_usage( true );
		$current_peak = memory_get_peak_usage( true );
		$last_snapshot = ! empty( $data['memory_snapshots'] ) ? end( $data['memory_snapshots'] ) : false;

		if ( ! $last_snapshot || abs( $current_usage - $last_snapshot['usage'] ) >= $this->memory_threshold ) {
			$data['memory_snapshots'][] = array(
				'time' => microtime( true ),
				'usage' => $current_usage,
				'peak' => $current_peak,
				'hook' => current_filter(),
			);
		}

		$data['peak_memory'] = max( $data['peak_memory'], $current_peak );
		$data['end_time'] = microtime( true );
	}


	/**
	 * Check whether the current backtrace belongs to the plugin.
	 *
	 * @since 2.0.0
	 * @param array  $backtrace Debug backtrace.
	 * @param string $plugin_dir Plugin directory path.
	 * @return bool
	 */
	private function has_plugin_trace( array $backtrace, $plugin_dir ) {
		foreach ( $backtrace as $trace ) {
			$file = isset( $trace['file'] ) ? $trace['file'] : '';

			if ( $file && 0 === strpos( $file, $plugin_dir ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get plugin directory path.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file path.
	 * @return string
	 */
	private function get_plugin_dir( $plugin ) {
		return plugin_dir_path( WP_PLUGIN_DIR . '/' . $plugin );
	}
}

/**
 * Class HookAnalyzer
 *
 * Analyzes and records WordPress hooks used by plugins.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class HookAnalyzer {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Initiate hook analysis for all tracked plugins.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function analyze_hooks() {
		if ( empty( $GLOBALS['wp_filter'] ) || ! is_array( $GLOBALS['wp_filter'] ) ) {
			return;
		}

		foreach ( $this->metrics as $plugin => &$data ) {
			$plugin_dir = $this->get_plugin_dir( $plugin );
			$this->collect_hook_data( $data, $plugin_dir );
		}
	}


	/**
	 * Collect hook data for a specific plugin.
	 *
	 * @since 2.0.0
	 * @param array  $data Reference to plugin metrics data.
	 * @param string $plugin_dir Plugin directory path.
	 * @return void
	 */
	private function collect_hook_data( array &$data, $plugin_dir ) {
		foreach ( $GLOBALS['wp_filter'] as $hook_name => $hook_obj ) {
			if ( ! is_object( $hook_obj ) || ! isset( $hook_obj->callbacks ) || ! is_array( $hook_obj->callbacks ) ) {
				continue;
			}

			foreach ( $hook_obj->callbacks as $priority => $callbacks ) {
				foreach ( $callbacks as $callback_data ) {
					$this->analyze_callback( $callback_data, $plugin_dir, $hook_name, $priority, $data );
				}
			}
		}
	}


	/**
	 * Analyze a single callback for hook information.
	 *
	 * @since 2.0.0
	 * @param array  $callback_data Callback data.
	 * @param string $plugin_dir Plugin directory path.
	 * @param string $hook_name Hook name.
	 * @param int    $priority Hook priority.
	 * @param array  $data Reference to plugin metrics data.
	 * @return void
	 */
	private function analyze_callback( array $callback_data, $plugin_dir, $hook_name, $priority, array &$data ) {
		if ( ! isset( $callback_data['function'] ) ) {
			return;
		}

		if ( is_array( $callback_data['function'] ) ) {
			$this->analyze_object_callback( $callback_data['function'], $plugin_dir, $hook_name, $priority, $data );
			return;
		}

		if ( is_string( $callback_data['function'] ) && function_exists( $callback_data['function'] ) ) {
			$this->analyze_function_callback( $callback_data['function'], $plugin_dir, $hook_name, $priority, $data );
		}
	}


	/**
	 * Analyze object method callbacks.
	 *
	 * @since 2.0.0
	 * @param array  $callback Callback array.
	 * @param string $plugin_dir Plugin directory path.
	 * @param string $hook_name Hook name.
	 * @param int    $priority Hook priority.
	 * @param array  $data Reference to plugin metrics data.
	 * @return void
	 */
	private function analyze_object_callback( array $callback, $plugin_dir, $hook_name, $priority, array &$data ) {
		if ( ! isset( $callback[0] ) || ! isset( $callback[1] ) || ! is_object( $callback[0] ) ) {
			return;
		}

		try {
			$reflection = new ReflectionClass( $callback[0] );
			$file_name = $reflection->getFileName();

			if ( $file_name && 0 === strpos( $file_name, $plugin_dir ) ) {
				$data['hooks'][] = array(
					'priority' => $priority,
					'name' => $hook_name,
					'callback' => $callback[1],
					'file' => str_replace( $plugin_dir, '', $file_name ),
				);
			}
		} catch ( Exception $e ) {
			return;
		}
	}


	/**
	 * Analyze function callbacks.
	 *
	 * @since 2.0.0
	 * @param string $callback Function name.
	 * @param string $plugin_dir Plugin directory path.
	 * @param string $hook_name Hook name.
	 * @param int    $priority Hook priority.
	 * @param array  $data Reference to plugin metrics data.
	 * @return void
	 */
	private function analyze_function_callback( $callback, $plugin_dir, $hook_name, $priority, array &$data ) {
		try {
			$reflection = new ReflectionFunction( $callback );
			$file_name = $reflection->getFileName();

			if ( $file_name && 0 === strpos( $file_name, $plugin_dir ) ) {
				$data['hooks'][] = array(
					'priority' => $priority,
					'name' => $hook_name,
					'callback' => $callback,
					'file' => str_replace( $plugin_dir, '', $file_name ),
				);
			}
		} catch ( Exception $e ) {
			return;
		}
	}


	/**
	 * Get plugin directory path.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file path.
	 * @return string
	 */
	private function get_plugin_dir( $plugin ) {
		return plugin_dir_path( WP_PLUGIN_DIR . '/' . $plugin );
	}
}

/**
 * Class QueryTracker
 *
 * Tracks and analyzes database queries made by plugins.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class QueryTracker {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Set up query tracking filters.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_tracking() {
		add_filter( 'query', array( $this, 'track_query' ) );
	}


	/**
	 * Track individual database queries.
	 *
	 * @since 2.0.0
	 * @param string $query SQL query string.
	 * @return string
	 */
	public function track_query( $query ) {
		$start_time = microtime( true );
		$backtrace = debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS );

		foreach ( $this->metrics as $plugin => &$data ) {
			$plugin_dir = $this->get_plugin_dir( $plugin );

			if ( $this->has_plugin_trace( $backtrace, $plugin_dir ) ) {
				$data['queries'][] = array(
					'query' => $query,
					'time' => microtime( true ) - $start_time,
					'hook' => current_filter(),
				);
			}
		}

		return $query;
	}


	/**
	 * Check whether the current backtrace belongs to the plugin.
	 *
	 * @since 2.0.0
	 * @param array  $backtrace Debug backtrace.
	 * @param string $plugin_dir Plugin directory path.
	 * @return bool
	 */
	private function has_plugin_trace( array $backtrace, $plugin_dir ) {
		foreach ( $backtrace as $trace ) {
			$file = isset( $trace['file'] ) ? $trace['file'] : '';

			if ( $file && 0 === strpos( $file, $plugin_dir ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get plugin directory path.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file path.
	 * @return string
	 */
	private function get_plugin_dir( $plugin ) {
		return plugin_dir_path( WP_PLUGIN_DIR . '/' . $plugin );
	}
}

/**
 * Class HttpRequestMonitor
 *
 * Monitors and records HTTP requests made by plugins.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class HttpRequestMonitor {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Set up HTTP request monitoring.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_monitoring() {
		add_filter( 'pre_http_request', array( $this, 'track_request' ), 10, 3 );
	}


	/**
	 * Track individual HTTP requests.
	 *
	 * @since 2.0.0
	 * @param mixed  $preempt Whether to preempt the request.
	 * @param array  $args Request arguments.
	 * @param string $url Request URL.
	 * @return mixed
	 */
	public function track_request( $preempt, $args, $url ) {
		$start_time = microtime( true );
		$backtrace = debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS );
		$method = isset( $args['method'] ) ? $args['method'] : 'GET';

		foreach ( $this->metrics as $plugin => &$data ) {
			$plugin_dir = $this->get_plugin_dir( $plugin );

			if ( $this->has_plugin_trace( $backtrace, $plugin_dir ) ) {
				$data['http_requests'][] = array(
					'url' => $url,
					'method' => $method,
					'start_time' => $start_time,
					'hook' => current_filter(),
				);
			}
		}

		return $preempt;
	}


	/**
	 * Check whether the current backtrace belongs to the plugin.
	 *
	 * @since 2.0.0
	 * @param array  $backtrace Debug backtrace.
	 * @param string $plugin_dir Plugin directory path.
	 * @return bool
	 */
	private function has_plugin_trace( array $backtrace, $plugin_dir ) {
		foreach ( $backtrace as $trace ) {
			$file = isset( $trace['file'] ) ? $trace['file'] : '';

			if ( $file && 0 === strpos( $file, $plugin_dir ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get plugin directory path.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file path.
	 * @return string
	 */
	private function get_plugin_dir( $plugin ) {
		return plugin_dir_path( WP_PLUGIN_DIR . '/' . $plugin );
	}
}

/**
 * Class AssetTracker
 *
 * Tracks plugin enqueued scripts and styles.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class AssetTracker {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Set up asset tracking hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_tracking() {
		add_action( 'wp_enqueue_scripts', array( $this, 'track_assets' ), 999999 );
		add_action( 'admin_enqueue_scripts', array( $this, 'track_assets' ), 999999 );
	}


	/**
	 * Track all enqueued assets.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function track_assets() {
		global $wp_scripts, $wp_styles;

		foreach ( $this->metrics as &$data ) {
			$temp_path = 'plugins/' . $data['splitSlug'] . '/';

			$this->track_scripts( $wp_scripts, $temp_path, $data );
			$this->track_styles( $wp_styles, $temp_path, $data );
		}
	}


	/**
	 * Track enqueued scripts.
	 *
	 * @since 2.0.0
	 * @param object $wp_scripts WordPress scripts object.
	 * @param string $temp_path Plugin path.
	 * @param array  $data Reference to plugin metrics data.
	 * @return void
	 */
	private function track_scripts( $wp_scripts, $temp_path, array &$data ) {
		if ( ! is_object( $wp_scripts ) || ! isset( $wp_scripts->registered ) || ! is_array( $wp_scripts->registered ) ) {
			return;
		}

		foreach ( $wp_scripts->registered as $handle => $script ) {
			if ( ! isset( $script->src ) || false === strpos( $script->src, $temp_path ) ) {
				continue;
			}

			$stripped_src = substr( $script->src, strpos( $script->src, $temp_path ) + strlen( $temp_path ) );

			$data['assets']['scripts'][] = array(
				'handle' => $handle,
				'src' => $temp_path . $stripped_src,
				'deps' => isset( $script->deps ) ? $script->deps : array(),
				'ver' => isset( $script->ver ) ? $script->ver : false,
				'size' => $this->get_asset_file_size( $script->src ),
			);
		}
	}


	/**
	 * Track enqueued styles.
	 *
	 * @since 2.0.0
	 * @param object $wp_styles WordPress styles object.
	 * @param string $temp_path Plugin path.
	 * @param array  $data Reference to plugin metrics data.
	 * @return void
	 */
	private function track_styles( $wp_styles, $temp_path, array &$data ) {
		if ( ! is_object( $wp_styles ) || ! isset( $wp_styles->registered ) || ! is_array( $wp_styles->registered ) ) {
			return;
		}

		foreach ( $wp_styles->registered as $handle => $style ) {
			if ( ! isset( $style->src ) || false === strpos( $style->src, $temp_path ) ) {
				continue;
			}

			$stripped_src = substr( $style->src, strpos( $style->src, $temp_path ) + strlen( $temp_path ) );

			$data['assets']['styles'][] = array(
				'handle' => $handle,
				'src' => $temp_path . $stripped_src,
				'deps' => isset( $style->deps ) ? $style->deps : array(),
				'ver' => isset( $style->ver ) ? $style->ver : false,
				'size' => $this->get_asset_file_size( $style->src ),
			);
		}
	}


	/**
	 * Get asset file size from source URL/path.
	 *
	 * @since 2.0.0
	 * @param string $src Asset source.
	 * @return int|false
	 */
	private function get_asset_file_size( $src ) {
		$path = parse_url( $src, PHP_URL_PATH );

		if ( empty( $path ) ) {
			return false;
		}

		$file_path = ABSPATH . ltrim( $path, '/' );

		if ( ! file_exists( $file_path ) ) {
			return false;
		}

		return filesize( $file_path );
	}
}

/**
 * Class MetricsReporter
 *
 * Generates and outputs final metrics report.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class MetricsReporter {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Set up metrics reporting hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_reporting() {
		add_action( 'wp_footer', array( $this, 'output_metrics' ), 999999 );
		add_action( 'admin_footer', array( $this, 'output_metrics' ), 999999 );
	}


	/**
	 * Output collected metrics as JSON.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function output_metrics() {
		foreach ( $this->metrics as &$data ) {
			if ( null === $data['start_time'] ) {
				continue;
			}

			$this->calculate_metrics( $data );
		}

		echo '<script id="plugin-metrics-data" type="application/json">';
		echo wp_json_encode( $this->metrics, JSON_PRETTY_PRINT );
		echo '</script>';
	}


	/**
	 * Calculate final metrics for a plugin.
	 *
	 * @since 2.0.0
	 * @param array $data Reference to plugin metrics data.
	 * @return void
	 */
	private function calculate_metrics( array &$data ) {
		$memory_metrics = $this->calculate_memory_metrics( $data );
		$query_metrics = $this->calculate_query_metrics( $data );
		$global_peak_memory = memory_get_peak_usage( true );

		$data['metrics'] = array_merge(
			$memory_metrics,
			$query_metrics,
			array(
				'hook_count' => count( $data['hooks'] ),
				'hooks' => $data['hooks'],
				'global_peak_memory' => $global_peak_memory,
			)
		);
	}


	/**
	 * Calculate memory-related metrics.
	 *
	 * @since 2.0.0
	 * @param array $data Plugin metrics data.
	 * @return array
	 */
	private function calculate_memory_metrics( array $data ) {
		$memory_growth = array();
		$total_allocated = 0;
		$snapshots = isset( $data['memory_snapshots'] ) ? $data['memory_snapshots'] : array();
		$snapshot_count = count( $snapshots );

		for ( $index = 1; $index < $snapshot_count; $index++ ) {
			$diff = $snapshots[ $index ]['usage'] - $snapshots[ $index - 1 ]['usage'];

			if ( $diff > 0 ) {
				$total_allocated += $diff;
				$memory_growth[] = array(
					'hook' => $snapshots[ $index ]['hook'],
					'amount' => $diff,
					'time' => $snapshots[ $index ]['time'] - $snapshots[ $index - 1 ]['time'],
				);
			}
		}

		return array(
			'execution_time' => $data['active_time'],
			'peak_memory' => $data['peak_memory'],
			'total_memory_allocated' => $total_allocated,
			'memory_growth' => $memory_growth,
		);
	}


	/**
	 * Calculate query-related metrics.
	 *
	 * @since 2.0.0
	 * @param array $data Plugin metrics data.
	 * @return array
	 */
	private function calculate_query_metrics( array $data ) {
		$total_query_time = 0;
		$queries_by_hook = array();

		foreach ( $data['queries'] as $query ) {
			$hook = isset( $query['hook'] ) ? $query['hook'] : 'unknown';
			$time = isset( $query['time'] ) ? (float) $query['time'] : 0;

			$total_query_time += $time;

			if ( ! isset( $queries_by_hook[ $hook ] ) ) {
				$queries_by_hook[ $hook ] = array(
					'count' => 0,
					'total_time' => 0,
				);
			}

			$queries_by_hook[ $hook ]['count']++;
			$queries_by_hook[ $hook ]['total_time'] += $time;
		}

		return array(
			'query_count' => count( $data['queries'] ),
			'query_time' => $total_query_time,
			'queries_by_hook' => $queries_by_hook,
		);
	}
}

/**
 * Class DeprecatedFunctionTracker
 *
 * Tracks deprecated function calls within plugins.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class DeprecatedFunctionTracker {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Set up deprecated function tracking.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_tracking() {
		add_action( 'deprecated_function_run', array( $this, 'track_deprecated_call' ), 10, 3 );
	}


	/**
	 * Track individual deprecated function calls.
	 *
	 * @since 2.0.0
	 * @param string $function Name of the deprecated function.
	 * @param string $replacement Suggested replacement function.
	 * @param string $version Version that marked the function as deprecated.
	 * @return void
	 */
	public function track_deprecated_call( $function, $replacement, $version ) {
		$backtrace = debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS );

		foreach ( $this->metrics as $plugin => &$data ) {
			$plugin_dir = $this->get_plugin_dir( $plugin );

			foreach ( $backtrace as $trace ) {
				$file = isset( $trace['file'] ) ? $trace['file'] : '';

				if ( $file && 0 === strpos( $file, $plugin_dir ) ) {
					$data['deprecated_calls'][] = array(
						'function' => $function,
						'replacement' => $replacement,
						'version' => $version,
						'file' => str_replace( $plugin_dir, '', $file ),
						'line' => isset( $trace['line'] ) ? (int) $trace['line'] : 0,
					);
					break;
				}
			}
		}
	}


	/**
	 * Get plugin directory path.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file path.
	 * @return string
	 */
	private function get_plugin_dir( $plugin ) {
		return plugin_dir_path( WP_PLUGIN_DIR . '/' . $plugin );
	}
}

/**
 * Class ErrorTracker
 *
 * Tracks PHP errors, warnings, and notices for plugins.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class ErrorTracker {

	/**
	 * Metrics reference.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $metrics;

	/**
	 * Previous PHP error handler.
	 *
	 * @since 2.0.0
	 * @var callable|null
	 */
	private $old_error_handler = null;

	/**
	 * Buffered errors before tracker is ready.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $error_buffer = array();

	/**
	 * Whether tracker is ready to persist errors.
	 *
	 * @since 2.0.0
	 * @var bool
	 */
	private $is_ready = false;


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @param array $metrics Metrics reference.
	 * @return void
	 */
	public function __construct( array &$metrics ) {
		$this->metrics = &$metrics;
	}


	/**
	 * Set up error tracking.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_tracking() {
		$this->old_error_handler = set_error_handler( array( $this, 'handle_error' ) );
		register_shutdown_function( array( $this, 'handle_fatal_error' ) );

		add_action(
			'plugins_loaded',
			function() {
				$this->is_ready = true;
				$this->process_error_buffer();
			},
			999999
		);
	}


	/**
	 * Process buffered errors.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function process_error_buffer() {
		foreach ( $this->error_buffer as $error ) {
			$this->store_error( $error['errno'], $error['errstr'], $error['errfile'], $error['errline'] );
		}

		$this->error_buffer = array();
	}


	/**
	 * Handle PHP errors.
	 *
	 * @since 2.0.0
	 * @param int    $errno Error number.
	 * @param string $errstr Error message.
	 * @param string $errfile Error file.
	 * @param int    $errline Error line.
	 * @return bool
	 */
	public function handle_error( $errno, $errstr, $errfile, $errline ) {
		if ( ! $this->is_ready ) {
			$this->error_buffer[] = compact( 'errno', 'errstr', 'errfile', 'errline' );
		} else {
			$this->store_error( $errno, $errstr, $errfile, $errline );
		}

		if ( $this->old_error_handler ) {
			return (bool) call_user_func( $this->old_error_handler, $errno, $errstr, $errfile, $errline );
		}

		return false;
	}


	/**
	 * Store an error for the related plugin.
	 *
	 * @since 2.0.0
	 * @param int    $errno Error number.
	 * @param string $errstr Error message.
	 * @param string $errfile Error file.
	 * @param int    $errline Error line.
	 * @return void
	 */
	private function store_error( $errno, $errstr, $errfile, $errline ) {
		foreach ( $this->metrics as $plugin => &$data ) {
			$plugin_dir = $this->get_plugin_dir( $plugin );

			if ( $errfile && 0 === strpos( $errfile, $plugin_dir ) ) {
				$data['errors'][] = array(
					'type' => $this->get_error_type( $errno ),
					'message' => $errstr,
					'file' => str_replace( $plugin_dir, '', $errfile ),
					'line' => $errline,
					'time' => microtime( true ),
					'hook' => current_filter(),
				);
			}
		}
	}


	/**
	 * Handle fatal errors.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_fatal_error() {
		$error = error_get_last();

		if ( ! $error || ! isset( $error['type'] ) ) {
			return;
		}

		$fatal_types = array(
			E_ERROR,
			E_PARSE,
			E_CORE_ERROR,
			E_COMPILE_ERROR,
		);

		if ( in_array( $error['type'], $fatal_types, true ) ) {
			$this->handle_error( $error['type'], $error['message'], $error['file'], $error['line'] );
		}
	}


	/**
	 * Convert PHP error number to readable type.
	 *
	 * @since 2.0.0
	 * @param int $errno Error number.
	 * @return string
	 */
	private function get_error_type( $errno ) {
		switch ( $errno ) {
			case E_ERROR:
				return 'Fatal Error';

			case E_WARNING:
				return 'Warning';

			case E_PARSE:
				return 'Parse Error';

			case E_NOTICE:
				return 'Notice';

			case E_CORE_ERROR:
				return 'Core Error';

			case E_CORE_WARNING:
				return 'Core Warning';

			case E_COMPILE_ERROR:
				return 'Compile Error';

			case E_COMPILE_WARNING:
				return 'Compile Warning';

			case E_USER_ERROR:
				return 'User Error';

			case E_USER_WARNING:
				return 'User Warning';

			case E_USER_NOTICE:
				return 'User Notice';

			case E_STRICT:
				return 'Strict Notice';

			case E_RECOVERABLE_ERROR:
				return 'Recoverable Error';

			case E_DEPRECATED:
				return 'Deprecated';

			case E_USER_DEPRECATED:
				return 'User Deprecated';

			default:
				return 'Unknown Error';
		}
	}


	/**
	 * Get plugin directory path.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file path.
	 * @return string
	 */
	private function get_plugin_dir( $plugin ) {
		return plugin_dir_path( WP_PLUGIN_DIR . '/' . $plugin );
	}
}