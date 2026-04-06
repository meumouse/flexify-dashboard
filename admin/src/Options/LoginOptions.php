<?php

namespace MeuMouse\Flexify_Dashboard\Options;

defined('ABSPATH') || exit;

/**
 * Class LoginOptions
 *
 * Handle login page option customizations.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Options
 * @author MeuMouse.com
 */
class LoginOptions {

    /**
     * Class constructor.
     *
     * Register login-related hooks.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_filter( 'login_display_language_dropdown', array( $this, 'maybe_remove_language_switcher' ), 20 );
    }


    /**
     * Determine whether the language selector should be displayed on the login page.
     *
     * @since 2.0.0
     * @return bool False to hide the language selector. True to display it.
     */
    public static function maybe_remove_language_switcher(): bool {
        if ( Settings::is_enabled( 'hide_language_selector' ) ) {
            return false;
        }

        return true;
    }
}