<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class RankMathDashboardWidget
 *
 * Exposes Rank Math dashboard widget data for the Flexify dashboard app.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class RankMathDashboardWidget {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * REST route base.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_BASE = 'rank-math/dashboard-widget';

	/**
	 * Widget ID.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const WIDGET_ID = 'rank_math_dashboard_widget';

	/**
	 * Widget container ID.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CONTAINER_ID = 'rank-math-dashboard-widget';

	/**
	 * Rank Math REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const RANK_MATH_REST_NAMESPACE = 'rankmath/v1';

	/**
	 * Feed cache key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const FEED_CACHE_KEY = 'rank_math_feed_posts_v2';

	/**
	 * Feed URL.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const FEED_URL = 'https://rankmath.com/wp-json/wp/v2/posts?dashboard_widget_feed=1';

	/**
	 * Initialize hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register REST routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE,
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_widget_details' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}


	/**
	 * Check endpoint permissions.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request instance.
	 * @return bool|WP_Error
	 */
	public function check_permissions( WP_REST_Request $request ) {
		unset( $request );

		return current_user_can( 'read' );
	}


	/**
	 * Get widget details.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response
	 */
	public function get_widget_details( WP_REST_Request $request ) {
		unset( $request );

		$is_rank_math_active = $this->is_rank_math_active();
		$sections = array(
			'analytics' => $this->get_analytics_section(),
			'404-monitor' => $this->get_404_monitor_section(),
			'redirections' => $this->get_redirections_section(),
			'feed' => $this->get_feed_section(),
			'footer' => $this->get_footer_section(),
		);

		$available_sections = array_values(
			array_filter(
				array(
					! empty( $sections['analytics']['enabled'] ) ? 'analytics' : '',
					! empty( $sections['404-monitor']['enabled'] ) ? '404-monitor' : '',
					! empty( $sections['redirections']['enabled'] ) ? 'redirections' : '',
					! empty( $sections['feed']['enabled'] ) ? 'feed' : '',
					! empty( $sections['footer']['enabled'] ) ? 'footer' : '',
				)
			)
		);

		return new WP_REST_Response(
			array(
				'success' => true,
				'plugin' => array(
					'active' => $is_rank_math_active,
					'pro_active' => defined( 'RANK_MATH_PRO_FILE' ),
					'version' => defined( 'RANK_MATH_VERSION' ) ? RANK_MATH_VERSION : '',
					'rest_namespace' => self::RANK_MATH_REST_NAMESPACE,
					'original_rest_route' => '/' . self::RANK_MATH_REST_NAMESPACE . '/dashboardWidget',
				),
				'widget' => array(
					'title' => __( 'Rank Math Overview', 'flexify-dashboard' ),
					'id' => self::WIDGET_ID,
					'container_id' => self::CONTAINER_ID,
					'icon' => $this->get_widget_icon_svg(),
					'loading_class' => 'rank-math-loading',
					'available' => $this->is_widget_available( $sections ),
					'composition_order' => array(
						'analytics',
						'404-monitor',
						'redirections',
						'feed',
						'footer',
					),
					'available_sections' => $available_sections,
				),
				'sections' => $sections,
			),
			200
		);
	}


	/**
	 * Check if Rank Math is active.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_rank_math_active() {
		return defined( 'RANK_MATH_VERSION' ) || class_exists( '\RankMath\Dashboard_Widget' );
	}


	/**
	 * Check if widget has available sections.
	 *
	 * @since 2.0.0
	 * @param array $sections Widget sections.
	 * @return bool
	 */
	private function is_widget_available( $sections ) {
		return ! empty( $sections['analytics']['enabled'] )
			|| ! empty( $sections['404-monitor']['enabled'] )
			|| ! empty( $sections['redirections']['enabled'] );
	}


	/**
	 * Get analytics section data.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_analytics_section() {
		$enabled = $this->is_rank_math_module_available( 'analytics', 'analytics' );
		$items = array(
			'search-traffic' => array(
				'key' => 'search-traffic',
				'label' => __( 'Search Traffic', 'flexify-dashboard' ),
				'description' => __( 'This is the number of pageviews carried out by visitors from Search Engines.', 'flexify-dashboard' ),
				'revert_trend' => false,
				'data' => array(
					'total' => 'n/a',
					'previous' => 'n/a',
					'difference' => 'n/a',
				),
				'trend' => 'no-diff',
			),
			'total-impressions' => array(
				'key' => 'total-impressions',
				'label' => __( 'Total Impressions', 'flexify-dashboard' ),
				'description' => __( 'How many times your site showed up in the search results.', 'flexify-dashboard' ),
				'revert_trend' => false,
				'data' => array(
					'total' => 'n/a',
					'previous' => 'n/a',
					'difference' => 'n/a',
				),
				'trend' => 'no-diff',
			),
			'total-clicks' => array(
				'key' => 'total-clicks',
				'label' => __( 'Total Clicks', 'flexify-dashboard' ),
				'description' => __( 'How many times your site was clicked on in the search results.', 'flexify-dashboard' ),
				'revert_trend' => false,
				'data' => array(
					'total' => 'n/a',
					'previous' => 'n/a',
					'difference' => 'n/a',
				),
				'trend' => 'no-diff',
			),
			'total-keywords' => array(
				'key' => 'total-keywords',
				'label' => __( 'Total Keywords', 'flexify-dashboard' ),
				'description' => __( 'Total number of keywords your site ranks for within top 100 positions.', 'flexify-dashboard' ),
				'revert_trend' => false,
				'data' => array(
					'total' => 'n/a',
					'previous' => 'n/a',
					'difference' => 'n/a',
				),
				'trend' => 'no-diff',
			),
			'average-position' => array(
				'key' => 'average-position',
				'label' => __( 'Average Position', 'flexify-dashboard' ),
				'description' => __( 'Average position of all the keywords ranking within top 100 positions.', 'flexify-dashboard' ),
				'revert_trend' => true,
				'data' => array(
					'total' => 'n/a',
					'previous' => 'n/a',
					'difference' => 'n/a',
				),
				'trend' => 'no-diff',
			),
		);

		$analytics_options = get_option( 'rank_math_google_analytic_options', array() );
		$is_connected = ! empty( $analytics_options['view_id'] );
		$widget_data = null;

		if ( $enabled && class_exists( '\RankMath\Analytics\Stats' ) ) {
			try {
				$widget_data = \RankMath\Analytics\Stats::get();
				$widget_data->set_date_range( '-30 days' );
				$widget_data = $widget_data->get_widget();
			} catch ( \Exception $exception ) {
				error_log( 'Rank Math widget analytics error: ' . $exception->getMessage() );
			}
		}

		if ( is_object( $widget_data ) ) {
			$items['search-traffic']['data'] = isset( $widget_data->pageviews ) ? $widget_data->pageviews : $items['search-traffic']['data'];
			$items['total-impressions']['data'] = isset( $widget_data->impressions ) ? $widget_data->impressions : $items['total-impressions']['data'];
			$items['total-clicks']['data'] = isset( $widget_data->clicks ) ? $widget_data->clicks : $items['total-clicks']['data'];
			$items['total-keywords']['data'] = isset( $widget_data->keywords ) ? $widget_data->keywords : $items['total-keywords']['data'];
			$items['average-position']['data'] = isset( $widget_data->position ) ? $widget_data->position : $items['average-position']['data'];
		}

		$items['search-traffic']['visible'] = $is_connected && defined( 'RANK_MATH_PRO_FILE' );
		$items['total-impressions']['visible'] = true;
		$items['total-clicks']['visible'] = ! $is_connected || ( $is_connected && ! defined( 'RANK_MATH_PRO_FILE' ) );
		$items['total-keywords']['visible'] = true;
		$items['average-position']['visible'] = true;

		foreach ( $items as $key => $item ) {
			$items[ $key ]['trend'] = $this->get_difference_class( $item['data'], ! empty( $item['revert_trend'] ) );
		}

		return array(
			'enabled' => $enabled,
			'slug' => 'analytics',
			'title' => __( 'Analytics', 'flexify-dashboard' ),
			'subtitle' => __( 'Last 30 Days', 'flexify-dashboard' ),
			'priority' => 10,
			'report_url' => $this->get_rank_math_admin_url( 'analytics' ),
			'view_report_label' => __( 'View Report', 'flexify-dashboard' ),
			'module_active' => $this->is_rank_math_module_active( 'analytics' ),
			'capability_granted' => $this->has_rank_math_cap( 'analytics' ),
			'is_connected' => $is_connected,
			'items' => array_values( array_filter( $items, array( $this, 'filter_visible_items' ) ) ),
		);
	}


	/**
	 * Get 404 monitor section data.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_404_monitor_section() {
		$enabled = $this->is_rank_math_module_available( '404-monitor', '404_monitor' );
		$stats = (object) array(
			'total' => 0,
			'hits' => 0,
		);

		if ( $enabled && class_exists( '\RankMath\Redirections\DB_404' ) ) {
			try {
				$stats = \RankMath\Redirections\DB_404::get_stats();
			} catch ( \Exception $exception ) {
				error_log( 'Rank Math 404 monitor error: ' . $exception->getMessage() );
			}
		} elseif ( $enabled && class_exists( '\RankMath\Monitor\DB' ) ) {
			try {
				$stats = \RankMath\Monitor\DB::get_stats();
			} catch ( \Exception $exception ) {
				error_log( 'Rank Math monitor stats error: ' . $exception->getMessage() );
			}
		}

		if ( $enabled && 0 === (int) $stats->total && 0 === (int) $stats->hits ) {
			$stats = $this->get_404_stats_from_table();
		}

		return array(
			'enabled' => $enabled,
			'slug' => '404-monitor',
			'title' => __( '404 Monitor', 'flexify-dashboard' ),
			'priority' => 11,
			'report_url' => $this->get_rank_math_admin_url( '404-monitor' ),
			'view_report_label' => __( 'View Report', 'flexify-dashboard' ),
			'module_active' => $this->is_rank_math_module_active( '404-monitor' ),
			'capability_granted' => $this->has_rank_math_cap( '404_monitor' ),
			'items' => array(
				array(
					'key' => 'log-count',
					'label' => __( 'Log Count', 'flexify-dashboard' ),
					'description' => __( 'Total number of 404 pages opened by the users.', 'flexify-dashboard' ),
					'total' => isset( $stats->total ) ? (int) $stats->total : 0,
					'formatted_total' => $this->human_number( isset( $stats->total ) ? $stats->total : 0 ),
				),
				array(
					'key' => 'url-hits',
					'label' => __( 'URL Hits', 'flexify-dashboard' ),
					'description' => __( 'Total number visits received on all the 404 pages.', 'flexify-dashboard' ),
					'total' => isset( $stats->hits ) ? (int) $stats->hits : 0,
					'formatted_total' => $this->human_number( isset( $stats->hits ) ? $stats->hits : 0 ),
				),
			),
		);
	}


	/**
	 * Get redirections section data.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_redirections_section() {
		$enabled = $this->is_rank_math_module_available( 'redirections', 'redirections' );
		$stats = (object) array(
			'total' => 0,
			'hits' => 0,
		);

		if ( $enabled && class_exists( '\RankMath\Redirections\DB' ) ) {
			try {
				$stats = \RankMath\Redirections\DB::get_stats();
			} catch ( \Exception $exception ) {
				error_log( 'Rank Math redirections stats error: ' . $exception->getMessage() );
			}
		} elseif ( $enabled ) {
			$stats = $this->get_redirections_stats_from_table();
		}

		return array(
			'enabled' => $enabled,
			'slug' => 'redirections',
			'title' => __( 'Redirections', 'flexify-dashboard' ),
			'priority' => 12,
			'report_url' => $this->get_rank_math_admin_url( 'redirections' ),
			'view_report_label' => __( 'View Report', 'flexify-dashboard' ),
			'module_active' => $this->is_rank_math_module_active( 'redirections' ),
			'capability_granted' => $this->has_rank_math_cap( 'redirections' ),
			'items' => array(
				array(
					'key' => 'redirection-count',
					'label' => __( 'Redirection Count', 'flexify-dashboard' ),
					'description' => __( 'Total number of Redirections created in Rank Math.', 'flexify-dashboard' ),
					'total' => isset( $stats->total ) ? (int) $stats->total : 0,
					'formatted_total' => $this->human_number( isset( $stats->total ) ? $stats->total : 0 ),
				),
				array(
					'key' => 'redirection-hits',
					'label' => __( 'Redirection Hits', 'flexify-dashboard' ),
					'description' => __( 'Total number of hits received by all redirections.', 'flexify-dashboard' ),
					'total' => isset( $stats->hits ) ? (int) $stats->hits : 0,
					'formatted_total' => $this->human_number( isset( $stats->hits ) ? $stats->hits : 0 ),
				),
			),
		);
	}


	/**
	 * Get feed section data.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_feed_section() {
		return array(
			'enabled' => true,
			'slug' => 'feed',
			'title' => __( 'Latest Blog Posts from Rank Math', 'flexify-dashboard' ),
			'priority' => 98,
			'items' => $this->get_feed_posts(),
		);
	}


	/**
	 * Get footer section data.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_footer_section() {
		return array(
			'enabled' => true,
			'slug' => 'footer',
			'priority' => 99,
			'links' => array_values(
				array_filter(
					array(
						array(
							'key' => 'blog',
							'label' => __( 'Blog', 'flexify-dashboard' ),
							'url' => 'https://rankmath.com/blog/',
							'external' => true,
						),
						array(
							'key' => 'help',
							'label' => __( 'Help', 'flexify-dashboard' ),
							'url' => 'https://rankmath.com/kb/',
							'external' => true,
						),
						array(
							'key' => 'go-pro',
							'label' => __( 'Go Pro', 'flexify-dashboard' ),
							'url' => 'https://rankmath.com/pricing/',
							'external' => true,
							'visible' => ! defined( 'RANK_MATH_PRO_FILE' ),
						),
					),
					array( $this, 'filter_visible_items' )
				)
			),
		);
	}


	/**
	 * Get feed posts.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_feed_posts() {
		$cache = get_transient( self::FEED_CACHE_KEY );

		if ( false === $cache ) {
			$response = wp_remote_get(
				self::FEED_URL,
				array(
					'timeout' => 10,
				)
			);

			if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
				set_transient( self::FEED_CACHE_KEY, array(), 2 * HOUR_IN_SECONDS );
				return array();
			}

			$cache = json_decode( wp_remote_retrieve_body( $response ), true );

			if ( empty( $cache ) || ! is_array( $cache ) ) {
				set_transient( self::FEED_CACHE_KEY, array(), 2 * HOUR_IN_SECONDS );
				return array();
			}

			set_transient( self::FEED_CACHE_KEY, $cache, 12 * HOUR_IN_SECONDS );
		}

		$posts = array_filter(
			$cache,
			function( $post ) {
				if ( isset( $post['condition'] ) && 'is_free' === $post['condition'] && defined( 'RANK_MATH_PRO_FILE' ) ) {
					return false;
				}

				return true;
			}
		);

		$posts = array_slice( array_values( $posts ), 0, 3 );

		foreach ( $posts as $index => $post ) {
			$label = '';
			$date = isset( $post['date'] ) ? strtotime( $post['date'] ) : false;

			if ( ! empty( $post['custom_label'] ) ) {
				$label = sanitize_text_field( $post['custom_label'] );
			} elseif ( 0 === $index && $date && ( time() - $date ) < ( 15 * DAY_IN_SECONDS ) ) {
				$label = __( 'NEW', 'flexify-dashboard' );
			}

			$posts[ $index ] = array(
				'title' => isset( $post['title']['rendered'] ) ? wp_strip_all_tags( $post['title']['rendered'] ) : '',
				'url' => $this->add_feed_utm_params( isset( $post['link'] ) ? $post['link'] : '', $index ),
				'date' => isset( $post['date'] ) ? $post['date'] : '',
				'label' => $label,
			);
		}

		return $posts;
	}


	/**
	 * Add UTM parameters to feed links.
	 *
	 * @since 2.0.0
	 * @param string $link Feed link.
	 * @param int    $index Post index.
	 * @return string
	 */
	private function add_feed_utm_params( $link, $index ) {
		if ( empty( $link ) || preg_match( '/[?&]utm_[a-z_]+=/', $link ) ) {
			return $link;
		}

		return add_query_arg(
			array(
				'utm_source' => 'Plugin',
				'utm_medium' => 'Dashboard Widget Post ' . ( $index + 1 ),
				'utm_campaign' => 'WP',
			),
			$link
		);
	}


	/**
	 * Get Rank Math admin URL.
	 *
	 * @since 2.0.0
	 * @param string $path Admin path.
	 * @return string
	 */
	private function get_rank_math_admin_url( $path ) {
		if ( class_exists( '\RankMath\Helper' ) ) {
			return \RankMath\Helper::get_admin_url( $path );
		}

		return admin_url( 'admin.php?page=rank-math-' . sanitize_key( $path ) );
	}


	/**
	 * Check if Rank Math module is active.
	 *
	 * @since 2.0.0
	 * @param string $module Module slug.
	 * @return bool
	 */
	private function is_rank_math_module_active( $module ) {
		if ( class_exists( '\RankMath\Helper' ) ) {
			return \RankMath\Helper::is_module_active( $module );
		}

		return false;
	}


	/**
	 * Check if current user has Rank Math capability.
	 *
	 * @since 2.0.0
	 * @param string $cap Capability name.
	 * @return bool
	 */
	private function has_rank_math_cap( $cap ) {
		if ( class_exists( '\RankMath\Helper' ) ) {
			return \RankMath\Helper::has_cap( $cap );
		}

		return false;
	}


	/**
	 * Check if Rank Math module is available.
	 *
	 * @since 2.0.0
	 * @param string $module Module slug.
	 * @param string $cap Capability name.
	 * @return bool
	 */
	private function is_rank_math_module_available( $module, $cap ) {
		return $this->is_rank_math_active()
			&& $this->is_rank_math_module_active( $module )
			&& $this->has_rank_math_cap( $cap );
	}


	/**
	 * Filter items by visibility flag.
	 *
	 * @since 2.0.0
	 * @param array $item Item data.
	 * @return bool
	 */
	private function filter_visible_items( $item ) {
		return ! isset( $item['visible'] ) || ! empty( $item['visible'] );
	}


	/**
	 * Get difference class.
	 *
	 * @since 2.0.0
	 * @param array|object $item Item data.
	 * @param bool         $revert Reverse trend logic.
	 * @return string
	 */
	private function get_difference_class( $item, $revert = false ) {
		$difference = is_object( $item ) ? ( $item->difference ?? 'n/a' ) : ( $item['difference'] ?? 'n/a' );

		if ( 'n/a' === $difference || '' === $difference || null === $difference ) {
			return 'no-diff';
		}

		$difference = (float) $difference;

		if ( 0.0 === $difference ) {
			return 'no-diff';
		}

		$is_negative = $difference < 0;

		if ( ( ! $revert && $is_negative ) || ( $revert && ! $is_negative && $difference > 0 ) ) {
			return 'down';
		}

		return 'up';
	}


	/**
	 * Format number into human readable format.
	 *
	 * @since 2.0.0
	 * @param float|int $number Number value.
	 * @return string
	 */
	private function human_number( $number ) {
		if ( class_exists( '\RankMath\Helpers\Str' ) ) {
			return \RankMath\Helpers\Str::human_number( $number );
		}

		return number_format_i18n( (float) $number, 0 );
	}


	/**
	 * Get 404 stats directly from database table.
	 *
	 * @since 2.0.0
	 * @return object
	 */
	private function get_404_stats_from_table() {
		global $wpdb;

		$table_name = $wpdb->prefix . 'rank_math_404_logs';
		$exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) );

		if ( $exists !== $table_name ) {
			return (object) array(
				'total' => 0,
				'hits' => 0,
			);
		}

		$stats = $wpdb->get_row( "SELECT COUNT(*) AS total, COALESCE(SUM(times_accessed), 0) AS hits FROM {$table_name}" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return $stats ? $stats : (object) array(
			'total' => 0,
			'hits' => 0,
		);
	}


	/**
	 * Get redirections stats directly from database table.
	 *
	 * @since 2.0.0
	 * @return object
	 */
	private function get_redirections_stats_from_table() {
		global $wpdb;

		$table_name = $wpdb->prefix . 'rank_math_redirections';
		$exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) );

		if ( $exists !== $table_name ) {
			return (object) array(
				'total' => 0,
				'hits' => 0,
			);
		}

		$stats = $wpdb->get_row( "SELECT COUNT(*) AS total, COALESCE(SUM(hits), 0) AS hits FROM {$table_name}" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return $stats ? $stats : (object) array(
			'total' => 0,
			'hits' => 0,
		);
	}


	/**
	 * Get widget icon SVG markup.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_widget_icon_svg() {
		return '<span class="rank-math-icon"><svg viewBox="0 0 462.03 462.03" xmlns="http://www.w3.org/2000/svg" width="20"><g><path d="m462 234.84-76.17 3.43 13.43 21-127 81.18-126-52.93-146.26 60.97 10.14 24.34 136.1-56.71 128.57 54 138.69-88.61 13.43 21z"></path><path d="m54.1 312.78 92.18-38.41 4.49 1.89v-54.58h-96.67zm210.9-223.57v235.05l7.26 3 89.43-57.05v-181zm-105.44 190.79 96.67 40.62v-165.19h-96.67z"></path></g></svg></span>';
	}
}