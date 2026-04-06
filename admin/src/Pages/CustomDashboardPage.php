<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;
use WP_Query;

defined('ABSPATH') || exit;

/**
 * Class CustomDashboardPage
 *
 * Handles the custom implementation of the WordPress admin dashboard page.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomDashboardPage {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the dashboard page.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'load-index.php', array( $this, 'init_dashboard_page' ) );
    }


    /**
     * Initializes the custom dashboard page implementation.
     *
     * @since 2.0.0
     * @return void
     */
    public function init_dashboard_page() {
        if ( ! Settings::is_enabled( 'use_custom_dashboard' ) ) {
            return;
        }

        $screen = get_current_screen();

        if ( ! $screen || 'dashboard' !== $screen->base ) {
            return;
        }

        $this->prevent_default_loading();
        $this->setup_output_capture();

        add_action( 'admin_enqueue_scripts', array( $this, 'load_styles_and_scripts' ) );
    }


    /**
     * Loads dashboard styles and scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles_and_scripts() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/dashboard.css';
        $script_name = Scripts::get_base_script_path( 'Dashboard.js' );

        wp_enqueue_style(
            'flexify-dashboard-dashboard',
            esc_url( $style_src ),
            array(),
            defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : null
        );

        add_filter( 'flexify-dashboard/style-layering/exclude', function( $excluded_patterns ) use ( $style_src ) {
            $excluded_patterns[] = $style_src;
            return $excluded_patterns;
        } );

        if ( empty( $script_name ) ) {
            return;
        }

        $dashboard_data = self::get_dashboard_data();

        wp_print_script_tag( array(
            'id'             => 'fd-dashboard-script',
            'src'            => esc_url( $base_url . 'app/dist/' . $script_name ),
            'type'           => 'module',
            'dashboard-data' => esc_attr( wp_json_encode( $dashboard_data ) ),
        ) );
    }


    /**
     * Gets dashboard data including widgets and styles.
     *
     * @since 2.0.0
     * @return array Dashboard data with widgets and styles.
     */
    private static function get_dashboard_data() {
        $widgets = array(
            array(
                'id'      => 'welcome-widget',
                'title'   => __( 'Welcome to WordPress', 'flexify-dashboard' ),
                'content' => '<p>' . __( 'Welcome to your WordPress dashboard! This is your site management hub.', 'flexify-dashboard' ) . '</p>',
            ),
            array(
                'id'      => 'quick-draft-widget',
                'title'   => __( 'Quick Draft', 'flexify-dashboard' ),
                'content' => '<p>' . __( 'Create a new post quickly from here.', 'flexify-dashboard' ) . '</p>',
            ),
            array(
                'id'      => 'activity-widget',
                'title'   => __( 'Activity', 'flexify-dashboard' ),
                'content' => '<p>' . __( 'Recent activity on your site.', 'flexify-dashboard' ) . '</p>',
            ),
        );

        return array(
            'widgets' => $widgets,
            'styles'  => array(),
        );
    }


    /**
     * Prevents WordPress from loading default dashboard components.
     *
     * @since 2.0.0
     * @return void
     */
    private function prevent_default_loading() {
        remove_action( 'admin_init', '_wp_admin_bar_init' );
        remove_action( 'admin_init', 'wp_admin_bar_init' );
        remove_action( 'wp_dashboard_setup', 'wp_dashboard_setup' );

        add_filter( 'pre_get_posts', array( $this, 'modify_main_query' ) );
    }


    /**
     * Modifies the main query to prevent post loading.
     *
     * @since 2.0.0
     * @param WP_Query $query The WordPress query object.
     * @return WP_Query
     */
    public function modify_main_query( $query ) {
        if ( ! $query instanceof WP_Query ) {
            return $query;
        }

        if ( $query->is_main_query() && is_admin() ) {
            $query->set( 'posts_per_page', 0 );
            $query->set( 'no_found_rows', true );
        }

        return $query;
    }


    /**
     * Sets up output buffering and custom content display.
     *
     * @since 2.0.0
     * @return void
     */
    private function setup_output_capture() {
        add_action( 'in_admin_header', array( $this, 'start_output_buffer' ), 999 );
        add_action( 'admin_footer', array( $this, 'render_custom_content' ), 0 );
    }


    /**
     * Starts the output buffer.
     *
     * @since 2.0.0
     * @return void
     */
    public function start_output_buffer() {
        ob_start();
    }


    /**
     * Renders the custom content for the dashboard page.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_custom_content() {
        if ( ob_get_level() > 0 ) {
            ob_end_clean();
        }

        echo '<div id="fd-dashboard-page"></div>';
    }
}