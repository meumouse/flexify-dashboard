<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings as SettingsOptions;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class Settings
 *
 * Handle the main settings page initialization for Flexify Dashboard.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class Settings {

	/**
	 * Current screen hook suffix.
	 *
	 * @since 2.0.0
	 * @var string|null
	 */
	private static $screen = null;

	/**
	 * Constructor.
	 *
	 * Register hooks for the settings page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'admin_menu', array( __CLASS__, 'admin_settings_page' ) );
	}


	/**
	 * Add the main settings page and submenu.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function admin_settings_page() {
		$plugin_name = SettingsOptions::get_setting( 'plugin_name', 'Flexify Dashboard' );
		$menu_name = ! empty( $plugin_name ) ? esc_html( $plugin_name ) : 'Flexify Dashboard';
		$icon_url = plugins_url( 'flexify-dashboard/assets/icons/flexify-dashboard-logo.svg' );

		add_menu_page(
			$menu_name, // Page title
			$menu_name, // Menu title
			'manage_options', // capatibility
			'flexify-dashboard-settings', // menu slug
			null, // callback
			$icon_url, // icon
		);

		self::$screen = add_submenu_page(
			'flexify-dashboard-settings',
			__( 'Settings', 'flexify-dashboard' ),
			__( 'Settings', 'flexify-dashboard' ),
			'manage_options',
			'flexify-dashboard-settings',
			array( __CLASS__, 'render_settings' )
		);

		add_action( 'admin_head', array( __CLASS__, 'load_admin_menu_logo' ) );

		if ( ! self::$screen ) {
			return;
		}

		add_action( 'admin_head-' . self::$screen, array( __CLASS__, 'load_styles' ) );
		add_action( 'admin_head-' . self::$screen, array( __CLASS__, 'load_scripts' ) );
	}


	/**
	 * Load admin menu logo styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_admin_menu_logo() {
		?>
		<style type="text/css">
			#adminmenu #toplevel_page_flexify-dashboard-settings .wp-menu-image img {
				width: 16px;
				height: 16px;
			}
		</style>
		<?php
	}


	/**
	 * Render the settings app container.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function render_settings() {
		wp_enqueue_media();

		echo '<div id="fd-settings-app"></div>';
	}


	/**
	 * Load settings page styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_styles() {
		$base_url = plugins_url( 'flexify-dashboard/' );
		$style_path = $base_url . 'app/dist/assets/styles/settings.css';

		wp_enqueue_style( 'flexify-dashboard-settings', $style_path, array(), FLEXIFY_DASHBOARD_VERSION );

		add_filter(
			'flexify-dashboard/style-layering/exclude',
			function( $excluded_patterns ) use ( $style_path ) {
				$excluded_patterns[] = $style_path;

				return $excluded_patterns;
			}
		);
	}


	/**
	 * Load settings page scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_scripts() {
		$base_url = plugins_url( 'flexify-dashboard/' );
		$script_name = Scripts::get_base_script_path( 'Settings.js' );

		if ( empty( $script_name ) ) {
			return;
		}

		wp_print_script_tag(
			array(
				'id'   => 'fd-settings-script',
				'src'  => $base_url . "app/dist/{$script_name}",
				'type' => 'module',
			)
		);
	}
}