<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsDatabase;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class Analytics
 *
 * Handles loading the analytics tracking script on frontend.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class Analytics {

    /**
     * Class constructor.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'wp_footer', array( $this, 'load_analytics_script' ), 1 );
    }


    /**
     * Loads the analytics tracking script in the frontend footer.
     *
     * Only loads if analytics is enabled and not in admin.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_analytics_script() {
        if ( ! $this->should_load_script() ) {
            return;
        }

        wp_enqueue_script( 'wp-api' );

        $script_src = $this->get_script_src();

        if ( empty( $script_src ) ) {
            return;
        }

        wp_print_script_tag( array(
            'id'    => 'flexify-dashboard-analytics-script',
            'src'   => esc_url( $script_src ),
            'type'  => 'module',
            'defer' => true,
        ) );
    }


    /**
     * Checks if the analytics script should be loaded.
     *
     * @since 2.0.0
     * @return bool
     */
    private function should_load_script() {
        if ( is_admin() ) {
            return false;
        }

        if ( ! AnalyticsDatabase::is_analytics_enabled() ) {
            return false;
        }

        return true;
    }


    /**
     * Builds the analytics script source URL.
     *
     * @since 2.0.0
     * @return string
     */
    private function get_script_src() {
        $script_name = Scripts::get_base_script_path( 'Analytics.js' );

        if ( empty( $script_name ) ) {
            return '';
        }

        $base_url = plugins_url( 'flexify-dashboard/' );

        return $base_url . 'app/dist/' . $script_name;
    }
}