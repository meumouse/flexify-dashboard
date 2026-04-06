<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class RoleEditorPage
 *
 * Handle the role editor admin page for WordPress roles and capabilities.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class RoleEditorPage {

	/**
	 * Constructor.
	 *
	 * Register hooks for the role editor page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'setup_admin_page' ) );
	}


	/**
	 * Set up the role editor admin page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_admin_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( ! Settings::is_enabled( 'enable_role_editor' ) ) {
			return;
		}

		$menu_name = __( 'Role Editor', 'flexify-dashboard' );

		$hook_suffix = add_submenu_page(
			'flexify-dashboard-settings',
			$menu_name,
			$menu_name,
			'manage_options',
			'flexify-dashboard-role-editor',
			array( $this, 'render_page' )
		);

		if ( ! $hook_suffix ) {
			return;
		}

		add_action( "admin_head-{$hook_suffix}", array( __CLASS__, 'load_styles' ) );
		add_action( "admin_head-{$hook_suffix}", array( __CLASS__, 'load_scripts' ) );
	}


	/**
	 * Load role editor styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_styles() {
		$base_url   = plugins_url( 'flexify-dashboard/' );
		$style_path = $base_url . 'app/dist/assets/styles/role-editor.css';

		wp_enqueue_style( 'flexify-dashboard-role-editor', $style_path, array(), FLEXIFY_DASHBOARD_VERSION );

		add_filter(
			'flexify-dashboard/style-layering/exclude',
			function( $excluded_patterns ) use ( $style_path ) {
				$excluded_patterns[] = $style_path;

				return $excluded_patterns;
			}
		);
	}


	/**
	 * Load role editor scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_scripts() {
		$base_url    = plugins_url( 'flexify-dashboard/' );
		$script_name = Scripts::get_base_script_path( 'RoleEditor.js' );

		if ( empty( $script_name ) ) {
			return;
		}

		$options = Settings::get();
		$current_user = wp_get_current_user();

		if ( ! $current_user || ! $current_user->exists() ) {
			return;
		}

		wp_print_script_tag(
			array(
				'id'                         => 'fd-role-editor-script',
				'src'                        => $base_url . "app/dist/{$script_name}",
				'plugin-base'                => esc_url( $base_url ),
				'rest-base'                  => esc_url( rest_url() ),
				'rest-nonce'                 => wp_create_nonce( 'wp_rest' ),
				'admin-url'                  => esc_url( admin_url() ),
				'site-url'                   => esc_url( site_url() ),
				'user-id'                    => absint( $current_user->ID ),
				'user-name'                  => esc_attr( $current_user->display_name ),
				'user-email'                 => esc_attr( $current_user->user_email ),
				'flexify-dashboard-settings' => esc_attr( wp_json_encode( $options ) ),
				'type'                       => 'module',
			)
		);
	}


	/**
	 * Render the role editor page content.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'flexify-dashboard' ) );
		}

		echo '<div id="fd-role-editor-page"></div>';
	}
}