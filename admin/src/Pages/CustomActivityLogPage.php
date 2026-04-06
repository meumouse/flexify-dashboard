<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class CustomActivityLogPage
 *
 * Handles the custom Activity Log page implementation.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomActivityLogPage {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the activity log page.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_menu', array( __CLASS__, 'add_activity_log_menu' ) );
    }


    /**
     * Adds Activity Log menu item.
     *
     * @since 2.0.0
     * @return void
     */
    public static function add_activity_log_menu() {
        if ( ! Settings::is_enabled( 'enable_activity_logger' ) ) {
            return;
        }

        $hook_suffix = add_submenu_page(
            'flexify-dashboard-settings',
            __( 'Activity Log', 'flexify-dashboard' ),
            __( 'Activity Log', 'flexify-dashboard' ),
            'manage_options',
            'flexify-dashboard-activity-log',
            array( __CLASS__, 'render_activity_log_page' )
        );

        if ( empty( $hook_suffix ) ) {
            return;
        }

        add_action( 'admin_head-' . $hook_suffix, array( __CLASS__, 'load_styles' ) );
        add_action( 'admin_head-' . $hook_suffix, array( __CLASS__, 'load_scripts' ) );
    }


    /**
     * Renders the activity log page.
     *
     * @since 2.0.0
     * @return void
     */
    public static function render_activity_log_page() {
        echo '<div id="fd-activity-log-page"></div>';
    }


    /**
     * Loads activity log page styles.
     *
     * @since 2.0.0
     * @return void
     */
    public static function load_styles() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/activity-log.css';

        wp_enqueue_style(
            'flexify-dashboard-activity-log',
            esc_url( $style_src ),
            array(),
            defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : null
        );

        add_filter( 'flexify-dashboard/style-layering/exclude', function( $excluded_patterns ) use ( $style_src ) {
            $excluded_patterns[] = $style_src;
            return $excluded_patterns;
        } );
    }


    /**
     * Loads activity log page scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public static function load_scripts() {
        $script_name = Scripts::get_base_script_path( 'ActivityLog.js' );

        if ( empty( $script_name ) ) {
            return;
        }

        $base_url = plugins_url( 'flexify-dashboard/' );
        $current_user = wp_get_current_user();
        $options = Settings::get();

        wp_print_script_tag( array(
            'id'                           => 'fd-activity-log-script',
            'src'                          => esc_url( $base_url . 'app/dist/' . $script_name ),
            'plugin-base'                  => esc_url( $base_url ),
            'rest-base'                    => esc_url( rest_url() ),
            'rest-nonce'                   => wp_create_nonce( 'wp_rest' ),
            'admin-url'                    => esc_url( admin_url() ),
            'site-url'                     => esc_url( site_url() ),
            'user-id'                      => absint( $current_user->ID ),
            'user-name'                    => esc_attr( $current_user->display_name ),
            'user-email'                   => esc_attr( $current_user->user_email ),
            'front-page'                   => is_front_page() ? 'true' : 'false',
            'flexify-dashboard-settings'   => esc_attr( wp_json_encode( $options ) ),
            'type'                         => 'module',
        ) );
    }
}