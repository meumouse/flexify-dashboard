<?php

namespace MeuMouse\Flexify_Dashboard\Options;

defined('ABSPATH') || exit;

/**
 * Class Settings
 *
 * Provides centralized access to Flexify Dashboard settings.
 * This class handles retrieval and caching of the flexify_dashboard_settings option.
 *
 * IMPORTANT: This class uses static properties and methods, meaning the cache
 * is shared across the entire PHP request. All classes using Settings::get()
 * will share the same cached data, regardless of how many instances are created.
 * The cache persists for the duration of the request and is not affected by
 * creating new instances of other classes.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Options
 * @author MeuMouse.com
 */
class Settings {

    /**
     * Stores the cached settings.
     *
     * This is a static property, so it's shared across all instances and classes
     * that use this Settings class. The cache persists for the entire PHP request.
     *
     * @since 2.0.0
     * @var array|null
     */
    private static $settings = null;


    /**
     * Retrieves all Flexify Dashboard settings.
     *
     * Returns the cached settings if available, otherwise fetches from the database.
     * Settings are cached for the duration of the request to avoid multiple database calls.
     *
     * @since 2.0.0
     * @param bool $force_refresh Whether to force a refresh of the cached settings.
     * @return array Array of Flexify Dashboard settings, or empty array if not set.
     */
    public static function get( $force_refresh = false ) {
        if ( $force_refresh || null === self::$settings ) {
            $settings = get_option( 'flexify_dashboard_settings', array() );

            self::$settings = self::normalize_settings( $settings );
        }

        return self::$settings;
    }


    /**
     * Retrieves a specific setting value.
     *
     * @since 2.0.0
     * @param string $key The setting key to retrieve.
     * @param mixed  $default The default value to return if the setting is not found.
     * @return mixed The setting value or default if not found.
     */
    public static function get_setting( $key, $default = null ) {
        $settings = self::get();

        return isset( $settings[ $key ] ) ? $settings[ $key ] : $default;
    }


    /**
     * Checks if a boolean setting is enabled.
     *
     * @since 2.0.0
     * @param string $key The setting key to check.
     * @return bool True if the setting exists and is true, false otherwise.
     */
    public static function is_enabled( $key ) {
        return true === self::get_setting( $key, false );
    }


    /**
     * Clears the cached settings.
     *
     * Useful when settings are updated and you need to force a refresh.
     *
     * @since 2.0.0
     * @return void
     */
    public static function clear_cache() {
        self::$settings = null;
    }


    /**
     * Normalizes the settings value.
     *
     * Ensures the settings returned from the database are always a valid array.
     *
     * @since 2.0.0
     * @param mixed $settings Raw settings value from the database.
     * @return array Normalized settings array.
     */
    private static function normalize_settings( $settings ) {
        if ( ! is_array( $settings ) ) {
            return array();
        }

        return $settings;
    }
}