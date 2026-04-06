<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;
use WP_Post;

defined('ABSPATH') || exit;

/**
 * Class CustomPostEditor
 *
 * Handles the replacement of the default WordPress post editor with a custom implementation.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class CustomPostEditor {

    /**
     * Class constructor.
     *
     * Sets up the necessary hooks for the post editor page.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'load-post.php', array( $this, 'init_post_editor' ) );
        add_action( 'load-post-new.php', array( $this, 'init_post_editor' ) );
    }


    /**
     * Initializes the custom post editor implementation.
     *
     * @since 2.0.0
     * @return void
     */
    public function init_post_editor() {
        if ( ! current_user_can( 'edit_posts' ) ) {
            return;
        }

        if ( ! Settings::is_enabled( 'use_modern_post_editor' ) ) {
            return;
        }

        $screen = get_current_screen();

        if ( ! $screen || ( 'post' !== $screen->base && 'post-new' !== $screen->base ) ) {
            return;
        }

        $post_type = $screen->post_type;
        $allowed_slugs = $this->get_allowed_post_type_slugs();

        if ( ! in_array( $post_type, $allowed_slugs, true ) ) {
            return;
        }

        $this->suppress_warnings();
        $this->prevent_default_loading();
        $this->setup_output_capture();

        add_action( 'admin_enqueue_scripts', array( $this, 'load_styles_and_scripts' ) );
    }


    /**
     * Loads post editor styles and scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function load_styles_and_scripts() {
        $base_url = plugins_url( 'flexify-dashboard/' );
        $style_src = $base_url . 'app/dist/assets/styles/post-editor.css';
        $script_name = Scripts::get_base_script_path( 'PostEditor.js' );

        wp_enqueue_style(
            'flexify-dashboard-post-editor',
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

        $post_data = $this->get_current_post_data();

        wp_print_script_tag( array(
            'id'                  => 'fd-post-editor-script',
            'src'                 => esc_url( $base_url . 'app/dist/' . $script_name ),
            'type'                => 'module',
            'data-post-id'        => absint( $post_data['post_id'] ),
            'data-post-type'      => esc_attr( $post_data['post_type'] ),
            'data-post-type-name' => esc_attr( $post_data['post_type_name'] ),
        ) );
    }


    /**
     * Retrieves the allowed post type slugs from settings.
     *
     * @since 2.0.0
     * @return array
     */
    private function get_allowed_post_type_slugs() {
        $allowed_post_types = Settings::get_setting( 'modern_post_editor_post_types', array() );

        if ( empty( $allowed_post_types ) || ! is_array( $allowed_post_types ) ) {
            $allowed_post_types = array(
                array(
                    'slug' => 'post',
                ),
            );
        }

        return array_filter( array_map( function( $post_type ) {
            return isset( $post_type['slug'] ) ? sanitize_key( $post_type['slug'] ) : '';
        }, $allowed_post_types ) );
    }


    /**
     * Retrieves the current post data for script attributes.
     *
     * @since 2.0.0
     * @return array
     */
    private function get_current_post_data() {
        $post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
        $post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : '';

        if ( empty( $post_type ) && $post_id > 0 ) {
            $post_type = get_post_type( $post_id );
        }

        if ( empty( $post_type ) ) {
            $post_type = 'post';
        }

        $post_type_object = get_post_type_object( $post_type );
        $post_type_name = '';

        if ( $post_type_object && isset( $post_type_object->labels->singular_name ) ) {
            $post_type_name = $post_type_object->labels->singular_name;
        }

        return array(
            'post_id'        => $post_id,
            'post_type'      => $post_type,
            'post_type_name' => $post_type_name,
        );
    }


    /**
     * Suppresses PHP warnings on the post editor page.
     *
     * @since 2.0.0
     * @return void
     */
    private function suppress_warnings() {
        error_reporting( E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR );

        set_error_handler( function( $errno ) {
            if ( in_array( $errno, array( E_WARNING, E_NOTICE, E_USER_WARNING, E_USER_NOTICE ), true ) ) {
                return true;
            }

            return false;
        }, E_WARNING | E_NOTICE | E_USER_WARNING | E_USER_NOTICE );
    }


    /**
     * Prevents WordPress from loading default post editor components.
     *
     * @since 2.0.0
     * @return void
     */
    private function prevent_default_loading() {
        remove_action( 'admin_enqueue_scripts', 'wp_enqueue_media' );

        // add_filter( 'replace_editor', array( $this, 'replace_editor' ), 10, 2 );

        add_filter( 'admin_body_class', array( $this, 'remove_fullscreen_mode_class' ), 999 );
        add_action( 'add_meta_boxes', array( $this, 'remove_editor_meta_boxes' ), 999 );
        add_action( 'admin_enqueue_scripts', array( $this, 'remove_editor_scripts' ), 999 );
    }


    /**
     * Removes the is-fullscreen-mode class from admin body.
     *
     * @since 2.0.0
     * @param string $classes Space-separated list of CSS classes.
     * @return string
     */
    public function remove_fullscreen_mode_class( $classes ) {
        $classes = str_replace( 'is-fullscreen-mode', '', $classes );
        $classes = preg_replace( '/\s+/', ' ', $classes );

        return trim( $classes );
    }


    /**
     * Replaces the default editor with custom implementation.
     *
     * @since 2.0.0
     * @param bool    $replace Whether to replace the editor.
     * @param WP_Post $post The post object.
     * @return bool
     */
    public function replace_editor( $replace, $post ) {
        return true;
    }


    /**
     * Removes editor meta boxes.
     *
     * @since 2.0.0
     * @return void
     */
    public function remove_editor_meta_boxes() {
        global $wp_meta_boxes;

        $screen = get_current_screen();

        if ( ! $screen || ! isset( $wp_meta_boxes[ $screen->id ] ) ) {
            return;
        }

        unset( $wp_meta_boxes[ $screen->id ] );
    }


    /**
     * Removes editor-related scripts.
     *
     * @since 2.0.0
     * @return void
     */
    public function remove_editor_scripts() {
        wp_dequeue_script( 'editor' );
        wp_deregister_script( 'editor' );

        wp_dequeue_script( 'word-count' );
        wp_deregister_script( 'word-count' );

        wp_dequeue_script( 'post' );
        wp_deregister_script( 'post' );
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
     * Renders the custom content for the post editor page.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_custom_content() {
        if ( ob_get_level() > 0 ) {
            ob_end_clean();
        }

        echo '<div id="fd-post-editor"></div>';
    }
}