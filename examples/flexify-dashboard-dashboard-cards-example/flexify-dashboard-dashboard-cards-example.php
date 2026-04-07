<?php
/**
 * Plugin Name: Flexify Dashboard Cards Example
 * Description: Example plugin that registers dashboard cards through the public Flexify Dashboard API.
 * Version: 1.0.0
 * Author: MeuMouse
 */

defined( 'ABSPATH' ) || exit;

add_action(
    'admin_enqueue_scripts',
    function() {
        $screen = get_current_screen();

        if ( ! $screen || 'dashboard' !== $screen->base ) {
            return;
        }

        wp_enqueue_script(
            'flexify-dashboard-dashboard-cards-example',
            plugins_url( 'assets/dashboard-example.js', __FILE__ ),
            array( 'flexify-dashboard-app-js', 'wp-i18n' ),
            '1.0.0',
            true
        );

        wp_script_add_data(
            'flexify-dashboard-dashboard-cards-example',
            'type',
            'module'
        );
    }
);
