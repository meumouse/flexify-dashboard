<?php

namespace MeuMouse\Flexify_Dashboard\App;

use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class Frontend
 *
 * Handle frontend assets and toolbar rendering for the plugin.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\App
 * @author MeuMouse.com
 */
class Frontend {

    /**
     * Current screen data.
     *
     * @since 2.0.0
     * @var mixed
     */
    private static $screen = null;

    /**
     * Frontend options.
     *
     * @since 2.0.0
     * @var array
     */
    private static $options = array();

    /**
     * Current script name.
     *
     * @since 2.0.0
     * @var bool|string
     */
    private static $script_name = false;

    /**
     * Plugin URL.
     *
     * @since 2.0.0
     * @var bool|string
     */
    private static $plugin_url = false;


    /**
     * Class constructor.
     *
     * Initialize frontend hooks.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'init', array( $this, 'maybe_load_actions' ) );
    }


    /**
     * Register frontend actions when toolbar rendering is allowed.
     *
     * @since 2.0.0
     * @return void
     */
    public function maybe_load_actions() {
        if ( ! is_admin_bar_showing() ) {
            return;
        }

        $current_url = self::get_current_url();

        if ( is_admin() || is_login() ) {
            return;
        }

        if ( false !== stripos( $current_url, wp_login_url() ) || false !== stripos( $current_url, admin_url() ) ) {
            return;
        }

        add_action( 'wp_enqueue_scripts', array( Plugin::class, 'output_script_attributes' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'load_toolbar_script' ) );
        add_action( 'wp_head', array( $this, 'push_temporary_css' ) );
    }


    /**
     * Get the current URL.
     *
     * @since 2.0.0
     * @return string Current URL on success. Empty string otherwise.
     */
    private static function get_current_url() {
        if ( defined( 'WP_CLI' ) ) {
            return '';
        }

        $http_host = isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '';
        $request_uri = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

        if ( empty( $http_host ) ) {
            return '';
        }

        $protocol = is_ssl() ? 'https://' : 'http://';

        return $protocol . $http_host . $request_uri;
    }


    /**
     * Load toolbar scripts and styles.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_toolbar_script() {
        self::$plugin_url = plugins_url( 'flexify-dashboard/' );
        self::$script_name = Scripts::get_base_script_path( 'Frontend.js' );

        if ( empty( self::$script_name ) ) {
            return;
        }

        wp_print_script_tag(
            array(
                'id'   => 'flexify-dashboard-app-js',
                'type' => 'module',
                'src'  => self::$plugin_url . 'app/dist/' . self::$script_name,
            )
        );

        wp_enqueue_script(
            'flexify-dashboard',
            self::$plugin_url . 'assets/js/translations.js',
            array( 'wp-i18n' ),
            FLEXIFY_DASHBOARD_VERSION,
            true
        );

        wp_set_script_translations(
            'flexify-dashboard',
            'flexify-dashboard',
            FLEXIFY_DASHBOARD_PLUGIN_PATH . '/languages/'
        );

        wp_enqueue_style(
            'flexify-dashboard-frontend',
            self::$plugin_url . 'app/dist/assets/styles/frontend.css',
            array(),
            FLEXIFY_DASHBOARD_VERSION
        );
    }


    /**
     * Output temporary CSS used before the frontend app finishes loading.
     *
     * @since 2.0.0
     * @return void
     */
    public function push_temporary_css() {
        ?>
        <style id="fd-temp-style">
            #wpadminbar {
                opacity: 0;
            }
        </style>
        <?php
    }
}