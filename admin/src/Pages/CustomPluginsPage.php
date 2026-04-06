<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class CustomPluginsPage
 *
 * Handles the replacement of the default WordPress plugins page with a custom implementation.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomPluginsPage {

    /**
     * Class constructor.
     *
     * Initializes the custom plugins page functionality.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'setup_admin_page' ), 99 );
        // add_action( 'admin_init', array( $this, 'handle_redirects' ) );
    }


    /**
     * Sets up the admin page by removing the default plugins page and adding the custom one.
     *
     * @since 2.0.0
     * @return void
     */
    public function setup_admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'use_modern_plugin_page' ) ) {
            return;
        }

        remove_menu_page( 'plugins.php' );
        remove_submenu_page( 'plugins.php', 'plugin-install.php' );
        remove_submenu_page( 'plugins.php', 'plugins.php' );

        $update_count = count( get_plugin_updates() );
        $menu_title = __( 'Plugins', 'flexify-dashboard' );

        if ( $update_count > 0 ) {
            $menu_title .= sprintf(
                '<span class="update-plugins count-%1$d"><span class="plugin-count">%2$d</span></span>',
                absint( $update_count ),
                absint( $update_count )
            );
        }

        $hook_suffix = add_menu_page(
            __( 'Custom Plugins', 'flexify-dashboard' ),
            $menu_title,
            'manage_options',
            'plugin-manager',
            array( $this, 'render_page' ),
            'dashicons-admin-plugins',
            65
        );

        if ( empty( $hook_suffix ) ) {
            return;
        }

        add_action( 'admin_head-' . $hook_suffix, array( $this, 'load_styles' ) );
        add_action( 'admin_head-' . $hook_suffix, array( $this, 'load_scripts' ) );
    }


    /**
     * Loads plugins page styles.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/plugins.css';

        wp_enqueue_style(
            'flexify-dashboard-plugins',
            esc_url( $style_src ),
            array(),
            defined( 'FLEXIFY_DASHBOARD_VERSION' ) ? FLEXIFY_DASHBOARD_VERSION : null
        );

        add_filter( 'flexify-dashboard/style-layering/exclude', function( $excluded_patterns ) use ( $style_src ) {
            $excluded_patterns[] = $style_src;
            return $excluded_patterns;
        } );
    }


    /**
     * Loads plugins page scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_scripts() {
        $script_name = Scripts::get_base_script_path( 'Plugins.js' );

        if ( empty( $script_name ) ) {
            return;
        }

        $base_url = plugins_url( 'flexify-dashboard/' );
        $formatted_plugins = $this->get_formatted_plugins();

        wp_print_script_tag( array(
            'id'      => 'fd-plugins-script',
            'src'     => esc_url( $base_url . 'app/dist/' . $script_name ),
            'plugins' => esc_attr( wp_json_encode( $formatted_plugins ) ),
            'type'    => 'module',
        ) );
    }


    /**
     * Retrieves and formats installed plugins data.
     *
     * @since 2.0.0
     * @return array
     */
    private function get_formatted_plugins() {
        $installed_plugins = get_plugins();
        $plugin_updates = get_plugin_updates();
        $auto_updates = (array) get_site_option( 'auto_update_plugins', array() );
        $formatted_plugins = array();

        foreach ( $installed_plugins as $plugin_path => $plugin_data ) {
            $formatted_plugins[ $plugin_path ] = $this->prepare_plugin_data(
                $plugin_path,
                $plugin_data,
                $plugin_updates,
                $auto_updates
            );
        }

        return $formatted_plugins;
    }


    /**
     * Prepares plugin data for frontend consumption.
     *
     * @since 2.0.0
     * @param string $plugin_path Plugin file path.
     * @param array  $plugin_data Plugin data.
     * @param array  $plugin_updates Available plugin updates.
     * @param array  $auto_updates Plugins with auto updates enabled.
     * @return array
     */
    private function prepare_plugin_data( $plugin_path, $plugin_data, $plugin_updates, $auto_updates ) {
        $is_active = is_plugin_active( $plugin_path );
        $slug_parts = explode( '/', $plugin_path );
        $base_slug = isset( $slug_parts[0] ) ? $slug_parts[0] : $plugin_path;

        $plugin_data['active'] = $is_active;
        $plugin_data['has_update'] = array_key_exists( $plugin_path, $plugin_updates );
        $plugin_data['auto_update_enabled'] = in_array( $plugin_path, $auto_updates, true );
        $plugin_data['splitSlug'] = sanitize_key( $base_slug );
        $plugin_data['slug'] = $plugin_path;
        $plugin_data['action_links'] = array();

        if ( $plugin_data['has_update'] && isset( $plugin_updates[ $plugin_path ]->update->new_version ) ) {
            $plugin_data['new_version'] = sanitize_text_field( $plugin_updates[ $plugin_path ]->update->new_version );
        }

        if ( $is_active ) {
            $plugin_data['action_links'] = $this->get_plugin_action_links( $plugin_path, $plugin_data );
        }

        return $plugin_data;
    }


    /**
     * Retrieves cleaned action links for a plugin.
     *
     * @since 2.0.0
     * @param string $plugin_path Plugin file path.
     * @param array  $plugin_data Plugin data.
     * @return array
     */
    private function get_plugin_action_links( $plugin_path, $plugin_data ) {
        $action_links = apply_filters( 'plugin_action_links_' . $plugin_path, array(), $plugin_path, $plugin_data, '' );
        $row_meta = apply_filters( 'plugin_row_meta', array(), $plugin_path, $plugin_data, '' );

        return array_reduce(
            array_merge( $action_links, $row_meta ),
            function( $links, $link ) {
                if ( ! is_string( $link ) ) {
                    return $links;
                }

                if ( preg_match( '/<a.*?href=["\'](.*?)["\'].*?>(.*?)<\/a>/i', $link, $matches ) ) {
                    $links[] = array(
                        'url'  => esc_url_raw( $matches[1] ),
                        'text' => wp_strip_all_tags( $matches[2] ),
                        'type' => $this->detect_link_type( $link ),
                    );
                }

                return $links;
            },
            array()
        );
    }


    /**
     * Detects the link type based on the anchor HTML.
     *
     * @since 2.0.0
     * @param string $link Raw link HTML.
     * @return string
     */
    private function detect_link_type( $link ) {
        if ( false !== strpos( $link, 'settings' ) ) {
            return 'settings';
        }

        if ( false !== strpos( $link, 'documentation' ) ) {
            return 'documentation';
        }

        return 'other';
    }


    /**
     * Handles redirects from the original plugins page to the custom page.
     *
     * @since 2.0.0
     * @return void
     */
    public function handle_redirects() {
        global $pagenow;

        if ( 'plugins.php' === $pagenow && ! isset( $_GET['action'] ) ) {
            wp_safe_redirect( admin_url( 'admin.php?page=plugin-manager' ) );
            exit;
        }
    }


    /**
     * Renders the custom plugins page content.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( __( 'You do not have sufficient permissions to access this page.', 'flexify-dashboard' ) );
        }

        echo '<div id="fd-plugins-page"></div>';
    }
}