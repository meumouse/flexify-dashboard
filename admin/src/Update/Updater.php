<?php

namespace MeuMouse\Flexify_Dashboard\Update;

use stdClass;

defined('ABSPATH') || exit;

/**
 * Handle plugin update requests against the MeuMouse packages repository.
 *
 * @since 1.0.0
 * @version 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Update
 * @author MeuMouse.com
 */
class Updater {

	/**
	 * Remote update endpoint.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const UPDATE_URL = 'https://packages.meumouse.com/v1/updates/flexify-dashboard?path=dist&file=update-checker.json';

	/**
	 * Repository slug returned by the remote API.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REMOTE_SLUG = 'flexify-dashboard';

	/**
	 * Plugin slug used locally.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const PLUGIN_SLUG = 'flexify-dashboard';

	/**
	 * Main plugin file.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const PLUGIN_FILE = 'flexify-dashboard/flexify-dashboard.php';

	/**
	 * Object cache key.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CACHE_KEY = 'flexify_dashboard_check_updates';

	/**
	 * Transient key for remote payload.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const CACHE_DATA_KEY = 'flexify_dashboard_remote_data';

	/**
	 * Cache lifetime.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private const CACHE_TTL = DAY_IN_SECONDS;

	/**
	 * Request timeout.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private const REQUEST_TIMEOUT = 10;

	/**
	 * Manual admin query arg.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const MANUAL_CHECK_QUERY_ARG = 'flexify_dashboard_check_updates';

	/**
	 * Runtime update payload.
	 *
	 * @since 2.0.0
	 * @var object|false
	 */
	private $update_available = false;


	/**
	 * Register updater hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		if ( defined( 'FLEXIFY_DASHBOARD_DEV_MODE' ) ) {
			add_filter( 'https_ssl_verify', '__return_false' );
			add_filter( 'https_local_ssl_verify', '__return_false' );
			add_filter( 'http_request_host_is_external', '__return_true' );
		}

		add_filter( 'plugins_api', array( $this, 'plugin_info' ), 20, 3 );
		add_filter( 'site_transient_update_plugins', array( $this, 'update_plugin' ) );
		add_action( 'upgrader_process_complete', array( $this, 'purge_cache' ), 10, 2 );
		add_filter( 'plugin_row_meta', array( $this, 'add_check_updates_link' ), 10, 2 );
		add_filter( 'all_admin_notices', array( $this, 'check_manual_update_query_arg' ) );
	}


	/**
	 * Get normalized remote data from the MeuMouse packages repository.
	 *
	 * @since 2.0.0
	 * @return object|false
	 */
	public function request() {
		$cached_data = wp_cache_get( self::CACHE_KEY );

		if ( false !== $cached_data ) {
			return $cached_data;
		}

		$remote_data = get_transient( self::CACHE_DATA_KEY );

		if ( false === $remote_data ) {
			$response = wp_remote_get(
				self::UPDATE_URL,
				array(
					'timeout' => self::REQUEST_TIMEOUT,
					'headers' => array(
						'Accept' => 'application/json',
					),
				)
			);

			if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
				return false;
			}

			$remote_data = json_decode( wp_remote_retrieve_body( $response ) );

			if ( ! is_object( $remote_data ) || empty( $remote_data->version ) ) {
				return false;
			}

			set_transient( self::CACHE_DATA_KEY, $remote_data, self::CACHE_TTL );
		}

		wp_cache_set( self::CACHE_KEY, $remote_data, '', self::CACHE_TTL );

		return $remote_data;
	}


	/**
	 * Provide plugin information for the update modal.
	 *
	 * @since 2.0.0
	 * @param object|false $response Existing response.
	 * @param string       $action API action.
	 * @param object       $args API arguments.
	 * @return object|false
	 */
	public function plugin_info( $response, $action, $args ) {
		if ( 'plugin_information' !== $action ) {
			return $response;
		}

		$requested_slug = isset( $args->slug ) ? (string) $args->slug : '';

		if ( ! in_array( $requested_slug, array( self::PLUGIN_SLUG, self::REMOTE_SLUG ), true ) ) {
			return $response;
		}

		$remote = $this->request();

		if ( ! $remote ) {
			return $response;
		}

		$plugin_info = new stdClass();
		$plugin_info->name = isset( $remote->name ) ? $remote->name : 'Flexify Dashboard';
		$plugin_info->slug = self::PLUGIN_SLUG;
		$plugin_info->version = isset( $remote->version ) ? $remote->version : FLEXIFY_DASHBOARD_VERSION;
		$plugin_info->tested = isset( $remote->tested ) ? $remote->tested : '';
		$plugin_info->requires = isset( $remote->requires ) ? $remote->requires : '';
		$plugin_info->author = isset( $remote->author ) ? $remote->author : '';
		$plugin_info->author_profile = isset( $remote->author_profile ) ? $remote->author_profile : '';
		$plugin_info->homepage = isset( $remote->homepage ) ? $remote->homepage : '';
		$plugin_info->download_link = isset( $remote->download_url ) ? $remote->download_url : '';
		$plugin_info->trunk = isset( $remote->download_url ) ? $remote->download_url : '';
		$plugin_info->requires_php = isset( $remote->requires_php ) ? $remote->requires_php : '';
		$plugin_info->last_updated = isset( $remote->last_updated ) ? $remote->last_updated : '';
		$plugin_info->sections = array(
			'description'  => isset( $remote->sections->description ) ? $remote->sections->description : '',
			'installation' => isset( $remote->sections->installation ) ? $remote->sections->installation : '',
			'changelog'    => isset( $remote->sections->changelog ) ? $remote->sections->changelog : '',
		);

		if ( ! empty( $remote->banners ) ) {
			$plugin_info->banners = array(
				'low'  => isset( $remote->banners->low ) ? $remote->banners->low : '',
				'high' => isset( $remote->banners->high ) ? $remote->banners->high : '',
			);
		}

		return $plugin_info;
	}


	/**
	 * Push update data into the WordPress update transient.
	 *
	 * @since 2.0.0
	 * @param object $transient Update transient.
	 * @return object
	 */
	public function update_plugin( $transient ) {
		if ( ! is_object( $transient ) || empty( $transient->checked ) ) {
			return $transient;
		}

		$remote = $this->request();

		if ( ! $remote ) {
			return $transient;
		}

		$current_version = defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : '0.0.0';
		$wp_version = get_bloginfo( 'version' );
		$requires = isset( $remote->requires ) ? (string) $remote->requires : '';
		$requires_php = isset( $remote->requires_php ) ? (string) $remote->requires_php : '';
		$remote_version = isset( $remote->version ) ? (string) $remote->version : '';

		$is_compatible = (
			'' !== $remote_version &&
			( '' === $requires || version_compare( $wp_version, $requires, '>=' ) ) &&
			( '' === $requires_php || version_compare( PHP_VERSION, $requires_php, '>=' ) )
		);

		if ( $is_compatible && version_compare( $current_version, $remote_version, '<' ) ) {
			$this->update_available = $remote;

			$response = new stdClass();
			$response->slug = self::PLUGIN_SLUG;
			$response->plugin = self::PLUGIN_FILE;
			$response->new_version = $remote_version;
			$response->tested = isset( $remote->tested ) ? $remote->tested : '';
			$response->package = isset( $remote->download_url ) ? $remote->download_url : '';
			$response->url = isset( $remote->homepage ) ? $remote->homepage : '';
			$response->requires = $requires;
			$response->requires_php = $requires_php;
			$response->icons = array();
			$response->banners = ! empty( $remote->banners ) ? (array) $remote->banners : array();

			$transient->response[ self::PLUGIN_FILE ] = $response;

			return $transient;
		}

		$transient->no_update[ self::PLUGIN_FILE ] = (object) array(
			'id'           => self::PLUGIN_FILE,
			'slug'         => self::PLUGIN_SLUG,
			'plugin'       => self::PLUGIN_FILE,
			'new_version'  => $current_version,
			'url'          => isset( $remote->homepage ) ? $remote->homepage : '',
			'package'      => '',
			'requires'     => $requires,
			'requires_php' => $requires_php,
			'tested'       => isset( $remote->tested ) ? $remote->tested : '',
			'icons'        => array(),
			'banners'      => ! empty( $remote->banners ) ? (array) $remote->banners : array(),
			'banners_rtl'  => array(),
			'compatibility' => new stdClass(),
		);

		return $transient;
	}


	/**
	 * Clear updater cache after plugin updates.
	 *
	 * @since 2.0.0
	 * @param object $upgrader Upgrader instance.
	 * @param array  $options Upgrade options.
	 * @return void
	 */
	public function purge_cache( $upgrader, $options ) {
		if ( empty( $options['action'] ) || empty( $options['type'] ) ) {
			return;
		}

		if ( 'update' !== $options['action'] || 'plugin' !== $options['type'] ) {
			return;
		}

		delete_transient( 'flexify_dashboard_api_request_cache' );
		delete_transient( 'flexify_dashboard_api_response_cache' );
		delete_transient( self::CACHE_DATA_KEY );
		wp_cache_delete( self::CACHE_KEY );
	}


	/**
	 * Add a manual update check link in the plugins table.
	 *
	 * @since 2.0.0
	 * @param array  $actions Existing plugin row actions.
	 * @param string $plugin_file Current plugin file.
	 * @return array
	 */
	public function add_check_updates_link( $actions, $plugin_file ) {
		if ( self::PLUGIN_FILE !== $plugin_file ) {
			return $actions;
		}

		$actions['flexify_dashboard_check_updates'] = sprintf(
			'<a href="%1$s">%2$s</a>',
			esc_url( add_query_arg( self::MANUAL_CHECK_QUERY_ARG, '1' ) ),
			esc_html__( 'Check updates', 'flexify-dashboard' )
		);

		return $actions;
	}


	/**
	 * Handle manual update checks from the plugins table.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function check_manual_update_query_arg() {
		$query_arg = isset( $_GET[ self::MANUAL_CHECK_QUERY_ARG ] )
			? sanitize_text_field( wp_unslash( $_GET[ self::MANUAL_CHECK_QUERY_ARG ] ) )
			: '';

		if ( '1' !== $query_arg ) {
			return;
		}

		delete_transient( 'flexify_dashboard_api_request_cache' );
		delete_transient( 'flexify_dashboard_api_response_cache' );
		delete_transient( self::CACHE_DATA_KEY );
		wp_cache_delete( self::CACHE_KEY );

		$remote_data = $this->request();

		if ( ! $remote_data ) {
			printf(
				'<div class="%1$s"><p>%2$s</p></div>',
				esc_attr( 'notice notice-error' ),
				__( 'We were unable to verify updates for the <strong>Flexify Dashboard</strong> plugin.', 'flexify-dashboard' )
			);

			return;
		}

		$current_version = defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : '0.0.0';
		$latest_version = isset( $remote_data->version ) ? (string) $remote_data->version : '';

		if ( '' !== $latest_version && version_compare( $current_version, $latest_version, '<' ) ) {
			printf(
				'<div class="%1$s"><p>%2$s</p></div>',
				esc_attr( 'notice notice-success' ),
				__( 'A new version of the <strong>Flexify Dashboard</strong> plugin is available.', 'flexify-dashboard' )
			); ?>

			<script type="text/javascript">
				if (!sessionStorage.getItem('reload_flexify_dashboard_update')) {
					sessionStorage.setItem('reload_flexify_dashboard_update', 'true');
					window.location.reload();
				}
			</script>
			<?php

			return;
		}

		printf(
			'<div class="%1$s"><p>%2$s</p></div>',
			esc_attr( 'notice notice-success' ),
			__( 'The Flexify Dashboard plugin version is the latest.', 'flexify-dashboard' )
		);
	}
}
