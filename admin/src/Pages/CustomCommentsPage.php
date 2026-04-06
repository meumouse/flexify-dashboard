<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class CustomCommentsPage
 *
 * Handles the replacement of the default WordPress comments page with a custom implementation.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomCommentsPage {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the comments page.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'load-edit-comments.php', array( $this, 'init_comments_page' ) );
    }


    /**
     * Initializes the custom comments page implementation.
     *
     * @since 2.0.0
     * @return void
     */
    public function init_comments_page() {
        if ( ! current_user_can( 'moderate_comments' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'use_modern_comments_page' ) ) {
            return;
        }

        $screen = get_current_screen();

        if ( ! $screen || 'edit-comments' !== $screen->base ) {
            return;
        }

        $this->prevent_default_loading();
        $this->setup_output_capture();

        add_action( 'admin_enqueue_scripts', array( $this, 'load_styles_and_scripts' ) );
    }


    /**
     * Loads comments page styles and scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles_and_scripts() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/comments.css';
        $script_name = Scripts::get_base_script_path( 'Comments.js' );

        wp_enqueue_style(
            'flexify-dashboard-comments',
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

        $current_user = wp_get_current_user();
        $options = Settings::get();

        wp_print_script_tag( array(
            'id'                         => 'fd-comments-script',
            'src'                        => esc_url( $base_url . 'app/dist/' . $script_name ),
            'plugin-base'                => esc_url( $base_url ),
            'rest-base'                  => esc_url( rest_url() ),
            'rest-nonce'                 => wp_create_nonce( 'wp_rest' ),
            'admin-url'                  => esc_url( admin_url() ),
            'site-url'                   => esc_url( site_url() ),
            'user-id'                    => absint( $current_user->ID ),
            'user-name'                  => esc_attr( $current_user->display_name ),
            'user-email'                 => esc_attr( $current_user->user_email ),
            'front-page'                 => is_front_page() ? 'true' : 'false',
            'flexify-dashboard-settings' => esc_attr( wp_json_encode( $options ) ),
            'type'                       => 'module',
        ) );
    }


    /**
     * Prevents WordPress from loading default comments page components.
     *
     * @since 2.0.0
     * @return void
     */
    private function prevent_default_loading() {
        // Intentionally left blank.
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
     * Renders the custom content for the comments page.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_custom_content() {
        if ( ob_get_level() > 0 ) {
            ob_end_clean();
        }

        echo '<div id="fd-comments-page"></div>';
    }
}