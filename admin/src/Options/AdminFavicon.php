<?php

namespace MeuMouse\Flexify_Dashboard\Options;

defined('ABSPATH') || exit;

/**
 * Class AdminFavicon
 *
 * Handle custom favicon rendering in the WordPress admin area.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Options
 * @author MeuMouse.com
 */
class AdminFavicon {

    /**
     * Cached custom favicon URL.
     *
     * @since 2.0.0
     * @var string|null
     */
    private static $favicon_url = null;


    /**
     * Class constructor.
     *
     * Register hooks for favicon replacement.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_head', array( $this, 'replace_favicon' ), 1 );
        add_action( 'init', array( $this, 'remove_default_favicon' ) );
    }


    /**
     * Get the custom favicon URL from plugin settings.
     *
     * @since 2.0.0
     * @return string|false Custom favicon URL on success. False otherwise.
     */
    private static function get_favicon_url() {
        if ( null !== self::$favicon_url ) {
            return self::$favicon_url;
        }

        $admin_favicon = Settings::get_setting( 'admin_favicon', '' );

        if ( empty( $admin_favicon ) ) {
            return false;
        }

        self::$favicon_url = esc_url( $admin_favicon );

        if ( empty( self::$favicon_url ) ) {
            return false;
        }

        return self::$favicon_url;
    }


    /**
     * Replace the default WordPress favicon in the admin area.
     *
     * @since 2.0.0
     * @return void
     */
    public function replace_favicon() {
        $favicon_url = self::get_favicon_url();

        if ( false === $favicon_url ) {
            return;
        }

        echo '<link rel="shortcut icon" id="flexify-dashboard-favicon" href="' . esc_url( $favicon_url ) . '" />';
    }


    /**
     * Remove the default WordPress favicon action from admin.
     *
     * @since 2.0.0
     * @return void
     */
    public function remove_default_favicon() {
        remove_action( 'admin_head', 'wp_favicon' );
    }
}