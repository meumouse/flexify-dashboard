<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class DatabaseExplorerPage
 *
 * Handles the database explorer admin page.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class DatabaseExplorerPage {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the database explorer page.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_admin_page' ), 99 );
    }


    /**
     * Adds the database explorer page to the admin menu.
     *
     * @since 2.0.0
     * @return void
     */
    public function add_admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'enable_database_explorer' ) ) {
            return;
        }

        $hook_suffix = add_submenu_page(
            'flexify-dashboard-settings',
            __( 'Database Explorer', 'flexify-dashboard' ),
            __( 'Database Explorer', 'flexify-dashboard' ),
            'manage_options',
            'flexify-dashboard-database-explorer',
            array( $this, 'render_page' )
        );

        if ( empty( $hook_suffix ) ) {
            return;
        }

        add_action( 'admin_head-' . $hook_suffix, array( $this, 'load_styles_and_scripts' ) );
    }


    /**
     * Loads database explorer styles and scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles_and_scripts() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/database.css';
        $script_name = Scripts::get_base_script_path( 'Database.js' );

        wp_enqueue_style(
            'flexify-dashboard-database',
            esc_url( $style_src ),
            array(),
            defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : null
        );

        add_filter( 'flexify-dashboard/style-layering/exclude', function( $excluded_patterns ) use ( $style_src ) {
            $excluded_patterns[] = $style_src;
            return $excluded_patterns;
        } );

        add_filter( 'style_loader_tag', array( $this, 'add_database_stylesheet_id' ), 10, 2 );

        if ( empty( $script_name ) ) {
            return;
        }

        wp_print_script_tag( array(
            'id'   => 'fd-database-script',
            'src'  => esc_url( $base_url . 'app/dist/' . $script_name ),
            'type' => 'module',
        ) );
    }


    /**
     * Adds a custom ID to the database explorer stylesheet tag.
     *
     * @since 2.0.0
     * @param string $tag The HTML link tag.
     * @param string $handle The style handle.
     * @return string
     */
    public function add_database_stylesheet_id( $tag, $handle ) {
        if ( 'flexify-dashboard-database' !== $handle ) {
            return $tag;
        }

        return str_replace( '<link ', '<link id="flexify-dashboard-database-css" ', $tag );
    }


    /**
     * Renders the database explorer page.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_page() {
        echo '<div id="fd-database-page"></div>';
    }
}