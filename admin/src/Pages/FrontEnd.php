<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use WP_Admin_Bar;

defined('ABSPATH') || exit;

/**
 * Class Frontend
 *
 * Main class for initialising the flexify-dashboard app.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class Frontend {

    /**
     * Class constructor.
     *
     * Initialises the main app.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'init', array( $this, 'maybe_load_actions' ) );
    }


    /**
     * Loads frontend hooks when applicable.
     *
     * @since 2.0.0
     * @return void
     */
    public function maybe_load_actions() {
        if ( $this->should_skip_frontend_actions() ) {
            return;
        }

        add_action( 'wp_enqueue_scripts', array( __CLASS__, 'load_toolbar_styles' ) );
        add_action( 'admin_bar_menu', array( $this, 'logo_actions' ) );
    }


    /**
     * Adds the custom logo to the admin bar.
     *
     * @since 2.0.0
     * @param WP_Admin_Bar $admin_bar The WordPress admin bar object.
     * @return void
     */
    public function logo_actions( $admin_bar ) {
        $dark_logo = Settings::get_setting( 'dark_logo', '' );
        $dark_logo = ! empty( $dark_logo ) ? esc_url( $dark_logo ) : '';

        if ( empty( $dark_logo ) ) {
            return;
        }

        $admin_bar->add_node( array(
            'id'    => 'app-logo',
            'title' => sprintf(
                '<img style="height:20px;max-height:20px;margin-top:6px;vertical-align:baseline;" src="%1$s" alt="%2$s">',
                $dark_logo,
                esc_attr__( 'Dashboard logo', 'flexify-dashboard' )
            ),
            'href'  => esc_url( admin_url() ),
        ) );
    }


    /**
     * Loads frontend toolbar styles.
     *
     * @since 2.0.0
     * @return void
     */
    public static function load_toolbar_styles() {
        if ( ! is_admin_bar_showing() ) {
            return;
        }

        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/frontend.css';

        wp_enqueue_style(
            'flexify-dashboard-frontend',
            esc_url( $style_src ),
            array(),
            defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : null
        );
    }


    /**
     * Checks whether frontend hooks should be skipped.
     *
     * @since 2.0.0
     * @return bool
     */
    private function should_skip_frontend_actions() {
        if ( is_admin() ) {
            return true;
        }

        $current_url = self::current_url();

        if ( empty( $current_url ) ) {
            return false;
        }

        if ( function_exists( 'is_login' ) && is_login() ) {
            return true;
        }

        if ( false !== stripos( $current_url, wp_login_url() ) ) {
            return true;
        }

        if ( false !== stripos( $current_url, admin_url() ) ) {
            return true;
        }

        return false;
    }


    /**
     * Returns the current URL.
     *
     * @since 2.0.0
     * @return string
     */
    private static function current_url() {
        if ( defined( 'WP_CLI' ) || ! isset( $_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI'] ) ) {
            return '';
        }

        $protocol = is_ssl() ? 'https://' : 'http://';
        $host = sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) );
        $request_uri = esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) );

        return $protocol . $host . $request_uri;
    }
}