<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;
use WP_Query;

defined('ABSPATH') || exit;

/**
 * Class CustomMediaPage
 *
 * Handles the replacement of the default WordPress media library page with a custom implementation.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomMediaPage {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the media page.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'remove_default_media_submenu' ), 99 );
        add_action( 'load-upload.php', array( $this, 'init_media_page' ) );
    }


    /**
     * Removes the default WordPress media submenu when modern media page is enabled.
     *
     * @since 2.0.0
     * @return void
     */
    public function remove_default_media_submenu() {
        if ( ! current_user_can( 'upload_files' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'use_modern_media_page' ) ) {
            return;
        }

        remove_submenu_page( 'upload.php', 'media-new.php' );
    }


    /**
     * Initializes the custom media page implementation.
     *
     * @since 2.0.0
     * @return void
     */
    public function init_media_page() {
        if ( ! current_user_can( 'upload_files' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'use_modern_media_page' ) ) {
            return;
        }

        $screen = get_current_screen();

        if ( ! $screen || 'upload' !== $screen->base ) {
            return;
        }

        $this->prevent_default_loading();
        $this->setup_output_capture();

        add_action( 'admin_enqueue_scripts', array( $this, 'load_styles_and_scripts' ) );
    }


    /**
     * Loads media library styles and scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles_and_scripts() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/media.css';
        $script_name = Scripts::get_base_script_path( 'Media.js' );

        wp_enqueue_style(
            'flexify-dashboard-media',
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

        wp_print_script_tag( array(
            'id'   => 'fd-media-script',
            'src'  => esc_url( $base_url . 'app/dist/' . $script_name ),
            'type' => 'module',
        ) );
    }


    /**
     * Prevents WordPress from loading default media library components.
     *
     * @since 2.0.0
     * @return void
     */
    private function prevent_default_loading() {
        remove_action( 'admin_enqueue_scripts', 'wp_enqueue_media' );

        add_filter( 'pre_get_posts', array( $this, 'modify_media_query' ) );
    }


    /**
     * Modifies the media query to prevent default loading.
     *
     * @since 2.0.0
     * @param WP_Query $query The WordPress query object.
     * @return WP_Query
     */
    public function modify_media_query( $query ) {
        if ( ! $query instanceof WP_Query ) {
            return $query;
        }

        if ( ! is_admin() || ! $query->is_main_query() ) {
            return $query;
        }

        $screen = get_current_screen();

        if ( ! $screen || 'upload' !== $screen->base ) {
            return $query;
        }

        $query->set( 'posts_per_page', 0 );
        $query->set( 'no_found_rows', true );

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
     * Renders the custom content for the media library page.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_custom_content() {
        if ( ob_get_level() > 0 ) {
            ob_end_clean();
        }

        echo '<div id="fd-media-page"></div>';
    }
}