<?php

namespace MeuMouse\Flexify_Dashboard\Options;

defined('ABSPATH') || exit;

/**
 * Class GlobalOptions
 *
 * Register and sanitize global plugin options.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Options
 * @author MeuMouse.com
 */
class GlobalOptions {

    /**
     * Class constructor.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_init', array( __CLASS__, 'create_global_option' ) );
        add_action( 'rest_api_init', array( __CLASS__, 'create_global_option' ) );

        new TextReplacement();
        new AdminFavicon();
        new LoginOptions();
        new MediaOptions();
    }


    /**
     * Register global settings.
     *
     * @since 2.0.0
     * @return void
     */
    public static function create_global_option(): void {
        $args = array(
            'type'              => 'object',
            'sanitize_callback' => array( __CLASS__, 'sanitize_global_settings' ),
            'default'           => Default_Options::get_default_settings(),
            'capability'        => 'manage_options',
            'show_in_rest'      => array(
                'schema' => self::get_rest_schema(),
            ),
        );

        register_setting( 'flexify-dashboard', 'flexify_dashboard_settings', $args );
    }


    /**
     * Get REST schema for settings.
     *
     * @since 2.0.0
     * @return array
     */
    private static function get_rest_schema(): array {
        return array(
            'type'                 => 'object',
            'additionalProperties' => true,
            'properties'           => array(
                'license_key' => array(
                    'type' => 'string',
                ),
                'instance_id' => array(
                    'type' => 'string',
                ),
                'plugin_name' => array(
                    'type' => 'string',
                ),
                'logo' => array(
                    'type' => 'string',
                ),
                'dark_logo' => array(
                    'type' => 'string',
                ),
                'auto_dark' => array(
                    'type' => 'boolean',
                ),
                'hide_screenoptions' => array(
                    'type' => 'boolean',
                ),
                'hide_help_toggle' => array(
                    'type' => 'boolean',
                ),
                'style_login' => array(
                    'type' => 'boolean',
                ),
                'login_image' => array(
                    'type' => 'string',
                ),
                'modern_login_logo' => array(
                    'type' => 'string',
                ),
                'disable_theme' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'search_post_types' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'disable_search' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'base_theme_color' => array(
                    'type'    => 'string',
                    'default' => '#008aff',
                ),
                'base_theme_scale' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'accent_theme_color' => array(
                    'type'    => 'string',
                    'default' => '#008aff',
                ),
                'accent_theme_scale' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'custom_css' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'login_path' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'text_replacements' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'enable_turnstyle' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'turnstyle_site_key' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'turnstyle_secret_key' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'enable_google_recaptcha' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'google_recaptcha_site_key' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'google_recaptcha_secret_key' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'layout' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'admin_favicon' => array(
                    'type' => 'string',
                ),
                'external_stylesheets' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'force_global_theme' => array(
                    'type'    => 'string',
                    'default' => 'off',
                ),
                'submenu_style' => array(
                    'type'    => 'string',
                    'default' => 'click',
                ),
                'enable_admin_menu_search' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'hide_language_selector' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'use_classic_post_tables' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'use_modern_plugin_page' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'hidden_plugin_update_notifications' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'show_hidden_plugin_update_notifications_for' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'use_custom_dashboard' => array(
                    'type'    => 'boolean',
                    'default' => true,
                ),
                'enable_flexify_dashboard_analytics' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'analytics_provider' => array(
                    'type'    => 'string',
                    'default' => 'flexify-dashboard',
                ),
                'google_analytics_service_account' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'google_analytics_property_id' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'mapbox_api_key' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'use_modern_media_page' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'use_modern_users_page' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'use_modern_comments_page' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'use_modern_post_editor' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'modern_post_editor_post_types' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'enable_realtime_collaboration' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'enable_svg_uploads' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'enable_font_uploads' => array(
                    'type'    => 'boolean',
                    'default' => true,
                ),
                'enable_database_explorer' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'enable_role_editor' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'enable_custom_post_types' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'enable_activity_logger' => array(
                    'type'    => 'boolean',
                    'default' => false,
                ),
                'activity_log_retention_days' => array(
                    'type'    => 'integer',
                    'default' => 90,
                ),
                'activity_log_level' => array(
                    'type'    => 'string',
                    'default' => 'important',
                ),
                'activity_log_auto_cleanup' => array(
                    'type'    => 'boolean',
                    'default' => true,
                ),
                'magic_dark_mode_pages' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'remote_sites' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
                'remote_site_switcher_capability' => array(
                    'type'    => 'string',
                    'default' => 'manage_options',
                ),
                'custom_font_source' => array(
                    'type'    => 'string',
                    'default' => 'system',
                ),
                'custom_font_family' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'custom_font_url' => array(
                    'type'    => 'string',
                    'default' => '',
                ),
                'custom_font_files' => array(
                    'type'    => 'array',
                    'default' => array(),
                ),
            ),
        );
    }


    /**
     * Sanitize global settings.
     *
     * @since 2.0.0
     * @param array $value Raw option values.
     * @return array Sanitized option values.
     */
    public static function sanitize_global_settings( $value ): array {
        $sanitized_value = array();
        $options = get_option( 'flexify_dashboard_settings', false );
        $options = ! $options ? array() : $options;
        $value = is_array( $value ) ? $value : array();

        $string_fields = array(
            'license_key',
            'instance_id',
            'plugin_name',
            'logo',
            'dark_logo',
            'login_image',
            'modern_login_logo',
            'base_theme_color',
            'accent_theme_color',
            'login_path',
            'layout',
            'submenu_style',
            'google_analytics_property_id',
            'mapbox_api_key',
            'turnstyle_site_key',
            'turnstyle_secret_key',
            'google_recaptcha_site_key',
            'google_recaptcha_secret_key',
            'admin_favicon',
            'force_global_theme',
            'remote_site_switcher_capability',
            'custom_font_family',
        );

        foreach ( $string_fields as $field ) {
            if ( isset( $value[ $field ] ) ) {
                $sanitized_value[ $field ] = sanitize_text_field( $value[ $field ] );
            }
        }

        $boolean_fields = array(
            'enable_admin_menu_search',
            'auto_dark',
            'use_classic_post_tables',
            'use_modern_plugin_page',
            'use_custom_dashboard',
            'enable_flexify_dashboard_analytics',
            'use_modern_media_page',
            'use_modern_users_page',
            'use_modern_comments_page',
            'use_modern_post_editor',
            'enable_realtime_collaboration',
            'enable_svg_uploads',
            'enable_font_uploads',
            'enable_database_explorer',
            'enable_role_editor',
            'enable_custom_post_types',
            'enable_activity_logger',
            'activity_log_auto_cleanup',
            'hide_language_selector',
            'disable_search',
            'hide_screenoptions',
            'hide_help_toggle',
            'style_login',
            'enable_turnstyle',
            'enable_google_recaptcha',
        );

        foreach ( $boolean_fields as $field ) {
            if ( isset( $value[ $field ] ) ) {
                $sanitized_value[ $field ] = (bool) $value[ $field ];
            }
        }

        if ( isset( $value['analytics_provider'] ) ) {
            $allowed_providers = array(
                'flexify-dashboard',
                'google_analytics',
            );

            $sanitized_value['analytics_provider'] = in_array( $value['analytics_provider'], $allowed_providers, true )
                ? sanitize_text_field( $value['analytics_provider'] )
                : 'flexify-dashboard';
        }

        if ( isset( $value['activity_log_retention_days'] ) ) {
            $sanitized_value['activity_log_retention_days'] = absint( $value['activity_log_retention_days'] );
        }

        if ( isset( $value['activity_log_level'] ) ) {
            $allowed_levels = array(
                'all',
                'important',
            );

            $sanitized_value['activity_log_level'] = in_array( $value['activity_log_level'], $allowed_levels, true )
                ? sanitize_text_field( $value['activity_log_level'] )
                : 'important';
        }

        if ( isset( $value['google_analytics_service_account'] ) ) {
            $sanitized_value['google_analytics_service_account'] = $value['google_analytics_service_account'];
        }

        if ( isset( $value['custom_css'] ) ) {
            $sanitized_value['custom_css'] = wp_filter_nohtml_kses( $value['custom_css'] );
        }

        if ( isset( $value['custom_font_source'] ) ) {
            $allowed_sources = array(
                'system',
                'google',
                'url',
                'upload',
            );

            $sanitized_value['custom_font_source'] = in_array( $value['custom_font_source'], $allowed_sources, true )
                ? sanitize_text_field( $value['custom_font_source'] )
                : 'system';
        }

        if ( isset( $value['custom_font_url'] ) ) {
            $sanitized_value['custom_font_url'] = sanitize_url( $value['custom_font_url'] );
        }

        if ( isset( $value['modern_post_editor_post_types'] ) && is_array( $value['modern_post_editor_post_types'] ) ) {
            $sanitized_value['modern_post_editor_post_types'] = self::sanitize_post_type_objects( $value['modern_post_editor_post_types'] );
        }

        if ( isset( $value['disable_theme'] ) && is_array( $value['disable_theme'] ) ) {
            $sanitized_value['disable_theme'] = self::sanitize_access_rules( $value['disable_theme'] );
        }

        if ( isset( $value['show_hidden_plugin_update_notifications_for'] ) && is_array( $value['show_hidden_plugin_update_notifications_for'] ) ) {
            $sanitized_value['show_hidden_plugin_update_notifications_for'] = self::sanitize_access_rules( $value['show_hidden_plugin_update_notifications_for'] );
        }

        if ( isset( $value['hidden_plugin_update_notifications'] ) && is_array( $value['hidden_plugin_update_notifications'] ) ) {
            $sanitized_plugins = array();

            foreach ( $value['hidden_plugin_update_notifications'] as $plugin_file ) {
                if ( is_string( $plugin_file ) && '' !== $plugin_file ) {
                    $sanitized_plugins[] = sanitize_text_field( $plugin_file );
                }
            }

            $sanitized_value['hidden_plugin_update_notifications'] = $sanitized_plugins;
        }

        if ( isset( $value['search_post_types'] ) && is_array( $value['search_post_types'] ) ) {
            $sanitized_value['search_post_types'] = self::sanitize_post_type_objects( $value['search_post_types'] );
        }

        if ( isset( $value['base_theme_scale'] ) && is_array( $value['base_theme_scale'] ) ) {
            $sanitized_value['base_theme_scale'] = self::sanitize_color_scale( $value['base_theme_scale'] );
        }

        if ( isset( $value['accent_theme_scale'] ) && is_array( $value['accent_theme_scale'] ) ) {
            $sanitized_value['accent_theme_scale'] = self::sanitize_color_scale( $value['accent_theme_scale'] );
        }

        if ( isset( $value['text_replacements'] ) && is_array( $value['text_replacements'] ) ) {
            $cleaned_pairs = array();

            foreach ( $value['text_replacements'] as $pair ) {
                if ( ! is_array( $pair ) ) {
                    continue;
                }

                $find = isset( $pair[0] ) && '' !== $pair[0] ? sanitize_text_field( $pair[0] ) : false;
                $replace = isset( $pair[1] ) && '' !== $pair[1] ? sanitize_text_field( $pair[1] ) : false;

                if ( $find && $replace ) {
                    $cleaned_pairs[] = array( $find, $replace );
                }
            }

            $sanitized_value['text_replacements'] = $cleaned_pairs;
        }

        if ( isset( $value['external_stylesheets'] ) && is_array( $value['external_stylesheets'] ) ) {
            $formatted_sheets = array();

            foreach ( $value['external_stylesheets'] as $link ) {
                $formatted_sheets[] = sanitize_url( $link );
            }

            $sanitized_value['external_stylesheets'] = $formatted_sheets;
        }

        if ( isset( $value['magic_dark_mode_pages'] ) && is_array( $value['magic_dark_mode_pages'] ) ) {
            $sanitized_pages = array();

            foreach ( $value['magic_dark_mode_pages'] as $page ) {
                if ( is_string( $page ) ) {
                    $sanitized_pages[] = sanitize_text_field( $page );
                }
            }

            $sanitized_value['magic_dark_mode_pages'] = $sanitized_pages;
        }

        if ( isset( $value['remote_sites'] ) && is_array( $value['remote_sites'] ) ) {
            $sanitized_sites = array();

            foreach ( $value['remote_sites'] as $site ) {
                if ( ! is_array( $site ) || ! isset( $site['url'] ) ) {
                    continue;
                }

                $sanitized_sites[] = array(
                    'url'          => sanitize_url( $site['url'] ),
                    'username'     => isset( $site['username'] ) ? sanitize_text_field( $site['username'] ) : '',
                    'app_password' => isset( $site['app_password'] ) ? sanitize_text_field( $site['app_password'] ) : '',
                );
            }

            $sanitized_value['remote_sites'] = $sanitized_sites;
        }

        if ( isset( $value['custom_font_files'] ) && is_array( $value['custom_font_files'] ) ) {
            $sanitized_files = array();

            foreach ( $value['custom_font_files'] as $file ) {
                if ( ! is_array( $file ) ) {
                    continue;
                }

                $sanitized_file = array(
                    'url'    => isset( $file['url'] ) ? sanitize_url( $file['url'] ) : '',
                    'weight' => isset( $file['weight'] ) ? sanitize_text_field( $file['weight'] ) : '400',
                    'style'  => isset( $file['style'] ) ? sanitize_text_field( $file['style'] ) : 'normal',
                );

                if ( ! empty( $sanitized_file['url'] ) ) {
                    $sanitized_files[] = $sanitized_file;
                }
            }

            $sanitized_value['custom_font_files'] = $sanitized_files;
        }

        return array_merge( $options, $sanitized_value );
    }


    /**
     * Sanitize post type object arrays.
     *
     * @since 2.0.0
     * @param array $items Raw items.
     * @return array
     */
    private static function sanitize_post_type_objects( array $items ): array {
        $formatted_items = array();

        foreach ( $items as $item ) {
            if ( ! is_array( $item ) ) {
                continue;
            }

            $formatted_items[] = array(
                'slug'      => isset( $item['slug'] ) ? sanitize_text_field( $item['slug'] ) : '',
                'name'      => isset( $item['name'] ) ? sanitize_text_field( $item['name'] ) : '',
                'rest_base' => isset( $item['rest_base'] ) ? sanitize_text_field( $item['rest_base'] ) : '',
            );
        }

        return $formatted_items;
    }


    /**
     * Sanitize access rule arrays.
     *
     * @since 2.0.0
     * @param array $items Raw access rules.
     * @return array
     */
    private static function sanitize_access_rules( array $items ): array {
        $formatted_items = array();

        foreach ( $items as $item ) {
            if ( ! is_array( $item ) ) {
                continue;
            }

            $formatted_items[] = array(
                'id'    => isset( $item['id'] ) ? (int) sanitize_text_field( $item['id'] ) : '',
                'value' => isset( $item['value'] ) ? sanitize_text_field( $item['value'] ) : '',
                'type'  => isset( $item['type'] ) ? sanitize_text_field( $item['type'] ) : '',
            );
        }

        return $formatted_items;
    }


    /**
     * Sanitize color scale arrays.
     *
     * @since 2.0.0
     * @param array $items Raw color scale items.
     * @return array
     */
    private static function sanitize_color_scale( array $items ): array {
        $formatted_scale = array();

        foreach ( $items as $color ) {
            if ( ! is_array( $color ) ) {
                continue;
            }

            $formatted_scale[] = array(
                'step'  => isset( $color['step'] ) ? sanitize_text_field( $color['step'] ) : '',
                'color' => isset( $color['color'] ) ? sanitize_text_field( $color['color'] ) : '',
            );
        }

        return $formatted_scale;
    }
}