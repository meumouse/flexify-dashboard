<?php

namespace MeuMouse\Flexify_Dashboard\Options;

defined('ABSPATH') || exit;

/**
 * Class Default_Options
 *
 * Register default plugin options.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Options
 * @author MeuMouse.com
 */
class Default_Options {
    
    /**
     * Get default plugin settings.
     *
     * @since 2.0.0
     * @return array Default settings.
     */
    public static function get_default_settings(): array {
        return array(
            'license_key'                                => '',
            'instance_id'                                => '',
            'plugin_name'                                => '',
            'logo'                                       => '',
            'dark_logo'                                  => '',
            'auto_dark'                                  => false,
            'hide_screenoptions'                         => false,
            'hide_help_toggle'                           => false,
            'style_login'                                => false,
            'login_image'                                => '',
            'modern_login_logo'                          => '',
            'disable_theme'                              => array(),
            'search_post_types'                          => array(),
            'disable_search'                             => false,
            'base_theme_color'                           => '#008aff',
            'base_theme_scale'                           => array(),
            'accent_theme_color'                         => '#008aff',
            'accent_theme_scale'                         => array(),
            'custom_css'                                 => '',
            'login_path'                                 => '',
            'text_replacements'                          => array(),
            'enable_turnstyle'                           => false,
            'turnstyle_site_key'                         => '',
            'turnstyle_secret_key'                       => '',
            'enable_google_recaptcha'                    => false,
            'google_recaptcha_site_key'                  => '',
            'google_recaptcha_secret_key'                => '',
            'layout'                                     => '',
            'admin_favicon'                              => '',
            'external_stylesheets'                       => array(),
            'force_global_theme'                         => 'off',
            'submenu_style'                              => 'click',
            'enable_admin_menu_search'                   => false,
            'hide_language_selector'                     => false,
            'use_classic_post_tables'                    => false,
            'use_modern_plugin_page'                     => false,
            'hidden_plugin_update_notifications'         => array(),
            'show_hidden_plugin_update_notifications_for'=> array(),
            'use_custom_dashboard'                       => true,
            'enable_flexify_dashboard_analytics'         => false,
            'analytics_provider'                         => 'flexify-dashboard',
            'google_analytics_service_account'           => '',
            'google_analytics_property_id'               => '',
            'mapbox_api_key'                             => '',
            'use_modern_media_page'                      => false,
            'use_modern_users_page'                      => false,
            'use_modern_comments_page'                   => false,
            'use_modern_post_editor'                     => false,
            'modern_post_editor_post_types'              => array(),
            'enable_realtime_collaboration'              => false,
            'enable_svg_uploads'                         => false,
            'enable_font_uploads'                        => true,
            'enable_database_explorer'                   => false,
            'enable_role_editor'                         => false,
            'enable_custom_post_types'                   => false,
            'enable_activity_logger'                     => false,
            'activity_log_retention_days'                => 90,
            'activity_log_level'                         => 'important',
            'activity_log_auto_cleanup'                  => true,
            'magic_dark_mode_pages'                      => array(),
            'remote_sites'                               => array(),
            'remote_site_switcher_capability'            => 'manage_options',
            'custom_font_source'                         => 'system',
            'custom_font_family'                         => '',
            'custom_font_url'                            => '',
            'custom_font_files'                          => array(),
        );
    }
}