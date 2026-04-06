<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class CustomUsersPage
 *
 * Handles the replacement of the default WordPress users page with a custom implementation.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomUsersPage {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the users page.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'load-users.php', array( $this, 'init_users_page' ) );
        add_action( 'load-user-edit.php', array( $this, 'init_users_page' ) );
        // add_action( 'load-profile.php', array( $this, 'init_users_page' ) );
    }


    /**
     * Initializes the custom users page implementation.
     *
     * @since 2.0.0
     * @return void
     */
    public function init_users_page() {
        if ( ! current_user_can( 'list_users' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'use_modern_users_page' ) ) {
            return;
        }

        $screen = get_current_screen();

        if ( ! $screen || ! in_array( $screen->base, array( 'users', 'user-edit', 'profile' ), true ) ) {
            return;
        }

        $this->prevent_default_loading();
        $this->setup_output_capture();

        add_action( 'admin_enqueue_scripts', array( $this, 'load_styles_and_scripts' ) );
    }


    /**
     * Loads users page styles and scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles_and_scripts() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/users.css';
        $script_name = Scripts::get_base_script_path( 'Users.js' );

        wp_enqueue_style(
            'flexify-dashboard-users',
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
            'id'   => 'fd-users-script',
            'src'  => esc_url( $base_url . 'app/dist/' . $script_name ),
            'type' => 'module',
        ) );
    }


    /**
     * Prevents WordPress from loading default users page components.
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
     * Renders the custom content for the users page.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_custom_content() {
        if ( ob_get_level() > 0 ) {
            ob_end_clean();
        }

        echo '<div id="fd-users-page"></div>';
    }
}