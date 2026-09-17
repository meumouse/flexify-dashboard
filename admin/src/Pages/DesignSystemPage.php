<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class DesignSystemPage
 *
 * Internal page that renders every component of the design system kit for
 * visual QA. Only available when WP_DEBUG is enabled (or through the
 * `flexify-dashboard/design-system/enabled` filter).
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class DesignSystemPage {

	/**
	 * Page slug.
	 *
	 * @since 3.0.0
	 * @var string
	 */
	const SLUG = 'flexify-dashboard-design-system';


	/**
	 * Constructor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'admin_menu', array( __CLASS__, 'register_page' ), 20 );
	}


	/**
	 * Check whether the page is enabled.
	 *
	 * @since 3.0.0
	 * @return bool
	 */
	public static function is_enabled() {
		/**
		 * Filter whether the design system QA page is available.
		 *
		 * @since 3.0.0
		 * @param bool $enabled Defaults to WP_DEBUG.
		 */
		return (bool) apply_filters( 'flexify-dashboard/design-system/enabled', defined( 'WP_DEBUG' ) && WP_DEBUG );
	}


	/**
	 * Register the hidden admin page.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public static function register_page() {
		if ( ! self::is_enabled() ) {
			return;
		}

		$title = __( 'Design System', 'flexify-dashboard' );

		$hook_suffix = add_submenu_page(
			'flexify-dashboard-settings',
			$title,
			$title,
			'manage_options',
			self::SLUG,
			array( __CLASS__, 'render_page' )
		);

		if ( ! $hook_suffix ) {
			return;
		}

		add_action( "admin_head-{$hook_suffix}", array( __CLASS__, 'load_assets' ) );
	}


	/**
	 * Render the mount point.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public static function render_page() {
		echo '<div id="fd-design-system-app"></div>';
	}


	/**
	 * Enqueue the page assets.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public static function load_assets() {
		$base_url = plugins_url( 'flexify-dashboard/' );
		$style_path = $base_url . 'app/dist/assets/styles/design-system.css';
		$script_name = Scripts::get_base_script_path( 'DesignSystem.js' );

		wp_enqueue_style( 'flexify-dashboard-design-system', $style_path, array(), FLEXIFY_DASHBOARD_VERSION );

		add_filter(
			'flexify-dashboard/style-layering/exclude',
			function( $excluded_patterns ) use ( $style_path ) {
				$excluded_patterns[] = $style_path;

				return $excluded_patterns;
			}
		);

		if ( ! $script_name ) {
			return;
		}

		wp_print_script_tag(
			array(
				'id' => 'fd-design-system-script',
				'src' => $base_url . "app/dist/{$script_name}",
				'type' => 'module',
			)
		);
	}
}
