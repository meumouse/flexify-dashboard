<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Rest\CustomFields\CustomFieldsLoader;
use MeuMouse\Flexify_Dashboard\Rest\CustomPostTypes;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class CustomPostTypesPage
 *
 * Handles the custom post types page for managing custom post types.
 * Also initializes custom post types and custom fields functionality.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomPostTypesPage {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the custom post types page
     * and initializes custom post types and custom fields functionality.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'setup_admin_page' ) );

        $this->init_custom_post_types();
        $this->init_custom_fields();
    }


    /**
     * Initializes custom post types functionality.
     *
     * @since 2.0.0
     * @return void
     */
    private function init_custom_post_types() {
        add_action( 'init', array( CustomPostTypes::class, 'register_custom_post_types' ), 0 );
    }


    /**
     * Initializes custom fields functionality.
     *
     * This sets up all hooks for custom fields across all WordPress contexts.
     *
     * @since 2.0.0
     * @return void
     */
    private function init_custom_fields() {
        add_action( 'init', function() {
            $loader = CustomFieldsLoader::instance();
            $loader->init();
        }, 20 );
    }


    /**
     * Sets up the admin page by adding it to the Flexify Dashboard menu.
     *
     * @since 2.0.0
     * @return void
     */
    public function setup_admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'enable_custom_post_types' ) ) {
            return;
        }

        $menu_name = __( 'Post Types', 'flexify-dashboard' );

        $hook_suffix = add_submenu_page(
            'flexify-dashboard-settings',
            $menu_name,
            $menu_name,
            'manage_options',
            'flexify-dashboard-custom-post-types',
            array( $this, 'render_page' )
        );

        add_submenu_page(
            'flexify-dashboard-settings',
            __( 'Fields groups', 'flexify-dashboard' ),
            __( 'Fields groups', 'flexify-dashboard' ),
            'manage_options',
            'flexify-dashboard-custom-post-types#/custom-fields/',
            array( $this, 'render_page' )
        );

        if ( empty( $hook_suffix ) ) {
            return;
        }

        add_action( 'admin_head-' . $hook_suffix, array( $this, 'load_styles' ) );
        add_action( 'admin_head-' . $hook_suffix, array( $this, 'load_scripts' ) );
    }


    /**
     * Loads custom post types styles.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/custom-post-types.css';

        wp_enqueue_style(
            'flexify-dashboard-custom-post-types',
            esc_url( $style_src ),
            array(),
            defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : null
        );
    }


    /**
     * Loads custom post types scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_scripts() {
        $script_name = Scripts::get_base_script_path( 'CustomPostTypes.js' );

        if ( empty( $script_name ) ) {
            return;
        }

        $current_user = wp_get_current_user();

        if ( ! $current_user || ! $current_user->exists() ) {
            return;
        }

        $base_url = plugins_url( 'flexify-dashboard/' );
        $options = Settings::get();

        wp_print_script_tag( array(
            'id'                         => 'fd-custom-post-types-script',
            'src'                        => esc_url( $base_url . 'app/dist/' . $script_name ),
            'plugin-base'                => esc_url( $base_url ),
            'rest-base'                  => esc_url( rest_url() ),
            'rest-nonce'                 => wp_create_nonce( 'wp_rest' ),
            'admin-url'                  => esc_url( admin_url() ),
            'site-url'                   => esc_url( site_url() ),
            'user-id'                    => absint( $current_user->ID ),
            'user-name'                  => esc_attr( $current_user->display_name ),
            'user-email'                 => esc_attr( $current_user->user_email ),
            'flexify-dashboard-settings' => esc_attr( wp_json_encode( $options ) ),
            'type'                       => 'module',
        ) );
    }


    /**
     * Renders the custom post types page content.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( __( 'You do not have sufficient permissions to access this page.', 'flexify-dashboard' ) );
        }

        echo '<div id="fd-custom-post-types-page"></div>';
    }
}