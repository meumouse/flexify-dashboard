<?php

namespace MeuMouse\Flexify_Dashboard\App;

use MeuMouse\Flexify_Dashboard\Activity\ActivityCron;
use MeuMouse\Flexify_Dashboard\Activity\ActivityDatabase;
use MeuMouse\Flexify_Dashboard\Activity\ActivityHooks;
use MeuMouse\Flexify_Dashboard\Activity\ActivityLogger;
use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsCron;
use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsDatabase;
use MeuMouse\Flexify_Dashboard\Options\GlobalOptions;
use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Pages\CustomActivityLogPage;
use MeuMouse\Flexify_Dashboard\Pages\CustomCommentsPage;
use MeuMouse\Flexify_Dashboard\Pages\CustomDashboardPage;
use MeuMouse\Flexify_Dashboard\Pages\CustomMediaPage;
use MeuMouse\Flexify_Dashboard\Pages\CustomPluginsPage;
use MeuMouse\Flexify_Dashboard\Pages\CustomUsersPage;
use MeuMouse\Flexify_Dashboard\Pages\DatabaseExplorerPage;
use MeuMouse\Flexify_Dashboard\Pages\Frontend;
use MeuMouse\Flexify_Dashboard\Pages\Login;
use MeuMouse\Flexify_Dashboard\Pages\MenuBuilder;
use MeuMouse\Flexify_Dashboard\Pages\PostsList;
use MeuMouse\Flexify_Dashboard\Pages\RoleEditorPage;
use MeuMouse\Flexify_Dashboard\Pages\Settings as SettingsPage;
use MeuMouse\Flexify_Dashboard\Pages\Analytics as AnalyticsPage;
use MeuMouse\Flexify_Dashboard\Rest\LicenseManager;
use MeuMouse\Flexify_Dashboard\Rest\ActivityLog as RestActivityLog;
use MeuMouse\Flexify_Dashboard\Rest\AdminNotices;
use MeuMouse\Flexify_Dashboard\Rest\Analytics;
use MeuMouse\Flexify_Dashboard\Rest\Collaboration;
use MeuMouse\Flexify_Dashboard\Rest\DatabaseExplorer;
use MeuMouse\Flexify_Dashboard\Rest\GoogleAnalyticsOAuth;
use MeuMouse\Flexify_Dashboard\Rest\Login as RestLogin;
use MeuMouse\Flexify_Dashboard\Rest\Media as RestMedia;
use MeuMouse\Flexify_Dashboard\Rest\MediaAnalytics;
use MeuMouse\Flexify_Dashboard\Rest\MediaBulk;
use MeuMouse\Flexify_Dashboard\Rest\MediaReplace;
use MeuMouse\Flexify_Dashboard\Rest\MediaTags;
use MeuMouse\Flexify_Dashboard\Rest\PluginManager;
use MeuMouse\Flexify_Dashboard\Rest\PostEditorMeta;
use MeuMouse\Flexify_Dashboard\Rest\PostEditorSEO;
use MeuMouse\Flexify_Dashboard\Rest\PostsTables;
use MeuMouse\Flexify_Dashboard\Rest\RankMathDashboardWidget;
use MeuMouse\Flexify_Dashboard\Rest\RestLogout;
use MeuMouse\Flexify_Dashboard\Rest\RoleEditor;
use MeuMouse\Flexify_Dashboard\Rest\SearchMeta;
use MeuMouse\Flexify_Dashboard\Rest\ServerHealth;
use MeuMouse\Flexify_Dashboard\Rest\SettingsManager;
use MeuMouse\Flexify_Dashboard\Rest\UserAnalytics;
use MeuMouse\Flexify_Dashboard\Rest\UserCapabilities;
use MeuMouse\Flexify_Dashboard\Rest\UserRoles;
use MeuMouse\Flexify_Dashboard\Rest\WooCommerceCustomer;
use MeuMouse\Flexify_Dashboard\Rest\WooCommerceDashboard;
use MeuMouse\Flexify_Dashboard\Update\Updater;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class Plugin
 *
 * Main class for initializing the plugin application.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\App
 * @author MeuMouse.com
 */
class Plugin {

    /**
     * Current admin screen.
     *
     * @since 2.0.0
     * @var object|null
     */
    private static $screen = null;

    /**
     * Global plugin options.
     *
     * @since 2.0.0
     * @var array
     */
    private static $options = array();

    /**
     * Base script filename.
     *
     * @since 2.0.0
     * @var bool|string
     */
    private static $script_name = false;

    /**
     * Plugin base URL.
     *
     * @since 2.0.0
     * @var bool|string
     */
    private static $plugin_url = false;


    /**
     * Class constructor.
     *
     * Initialize hooks and core classes.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        if ( self::should_stop_flexify_dashboard() ) {
            add_action( 'admin_enqueue_scripts', array( $this, 'load_styles' ), 1 );
            return;
        }

        add_action( 'admin_head', array( $this, 'layer_wordpress_styles' ), 1 );
        add_action( 'admin_head', array( $this, 'output_custom_font_css' ), 2 );
        add_action( 'login_head', array( $this, 'output_custom_font_css' ), 2 );
        add_action( 'wp_head', array( $this, 'output_custom_font_css' ), 2 );

        add_action( 'plugins_loaded', array( $this, 'languages_loader' ) );

        add_action( 'admin_init', array( $this, 'get_global_options' ), 0 );
        add_action( 'admin_enqueue_scripts', array( $this, 'get_screen' ), 0 );

        add_action( 'admin_enqueue_scripts', array( $this, 'load_styles' ), 1 );
        add_action( 'admin_enqueue_scripts', array( $this, 'load_base_script' ), 1 );
        add_action( 'admin_head', array( $this, 'output_app' ), 2 );

        add_action( 'admin_print_styles', array( $this, 'output_temporary_body_hider' ), 1 );

        add_filter( 'all_plugins', array( $this, 'change_plugin_name' ) );
        add_filter( 'admin_body_class', array( $this, 'flexify_dashboard_add_admin_body_class' ) );
        add_filter( 'site_transient_update_plugins', array( $this, 'filter_hidden_plugin_update_notifications' ), 20, 1 );

        add_action( 'admin_enqueue_scripts', array( $this, 'maybe_remove_assets' ), 100 );

        add_filter( 'mailpoet_conflict_resolver_whitelist_style', array( $this, 'handle_script_whitelist' ) );
        add_filter( 'mailpoet_conflict_resolver_whitelist_script', array( $this, 'handle_script_whitelist' ) );

        $this->boot_services();
    }


    /**
     * Boot plugin service classes.
     *
     * @since 2.0.0
     * @return void
     */
    private function boot_services() {
        new GlobalOptions();
        new Updater();
        new RestLogout();
        new UserRoles();
        new UserCapabilities();
        new ServerHealth();
        new MediaAnalytics();
        new UserAnalytics();
        new SettingsPage();
        new SettingsManager();
        new LicenseManager();

        $login_page = new Login();

        new RestLogin( $login_page );
        new SearchMeta();
        new MenuBuilder();
        new CustomPluginsPage();
        new Frontend();
        new PluginManager();
        new MediaReplace();
        new MediaTags();
        new MediaBulk();

        RestMedia::init();

        new AnalyticsPage();
        new GoogleAnalyticsOAuth();
        new PostsList();
        new PostsTables();
        new AdminNotices();
        new CustomDashboardPage();

        if ( Settings::is_enabled( 'enable_role_editor' ) ) {
            new RoleEditor();
            new RoleEditorPage();
        }

        new AnalyticsDatabase();
        new AnalyticsCron();
        new Analytics();
        new CustomMediaPage();
        new CustomUsersPage();
        new CustomCommentsPage();
        new CustomActivityLogPage();
        new DatabaseExplorerPage();
        new DatabaseExplorer();
        new ActivityDatabase();
        new ActivityLogger();
        new ActivityCron();
        new ActivityHooks();
        new RestActivityLog();
        new WooCommerceCustomer();
        new WooCommerceDashboard();
        new PostEditorMeta();
        new PostEditorSEO();
        new Collaboration();
        new RankMathDashboardWidget();
    }


    /**
     * Check whether the plugin should stop loading.
     *
     * Allows external plugins to stop execution through a filter.
     *
     * @since 1.0.6
     * @return bool True if the plugin should stop loading. Otherwise false.
     */
    private static function should_stop_flexify_dashboard() {
        $breakdance = isset( $_GET['breakdance_wpuiforbuilder_tinymce'] )
            ? sanitize_text_field( wp_unslash( $_GET['breakdance_wpuiforbuilder_tinymce'] ) )
            : '';

        $action = isset( $_GET['action'] )
            ? sanitize_text_field( wp_unslash( $_GET['action'] ) )
            : '';

        $should_stop = in_array(
            $action,
            array(
                'update-selected-themes',
                'update-selected',
            ),
            true
        ) || 'true' === $breakdance;

        /**
         * Filter whether the plugin should stop loading.
         *
         * @since 1.0.6
         * @param bool   $should_stop Whether the plugin should stop loading.
         * @param string $action Current action from request.
         */
        return apply_filters( 'flexify-dashboard/core/stop', $should_stop, $action );
    }


    /**
     * Layer WordPress stylesheets using CSS layers.
     *
     * @since 2.0.0
     * @return void
     */
    public function layer_wordpress_styles() {
        $excluded_patterns = apply_filters( 'flexify-dashboard/style-layering/exclude', array() );
        $excluded_json = wp_json_encode( $excluded_patterns );

        ?>
        <style>
            @layer wordpress-base, fd-theme;
        </style>
        <script>
            (function() {
                const excludedPatterns = <?php echo wp_kses_post( $excluded_json ); ?>;
                const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');

                existingLinks.forEach(function(link) {
                    const href = link.href || '';
                    const shouldExclude = excludedPatterns.some(function(pattern) {
                        return href.includes(pattern);
                    });

                    if (shouldExclude) {
                        return;
                    }

                    const style = document.createElement('style');
                    style.textContent = '@import url("' + href + '") layer(wordpress-base);';
                    link.replaceWith(style);
                });
            })();
        </script>
        <?php
    }


    /**
     * Output custom font CSS based on settings.
     *
     * @since 2.0.0
     * @return void
     */
    public function output_custom_font_css() {
        if ( ! is_user_logged_in() && ! is_login() ) {
            return;
        }

        $options = self::return_global_options();

        $font_source = isset( $options['custom_font_source'] ) ? $options['custom_font_source'] : 'system';
        $font_family = isset( $options['custom_font_family'] ) ? $options['custom_font_family'] : '';
        $font_url = isset( $options['custom_font_url'] ) ? $options['custom_font_url'] : '';
        $font_files = isset( $options['custom_font_files'] ) ? $options['custom_font_files'] : array();

        $system_fonts = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
        $css_output = '';

        if ( 'google' === $font_source && ! empty( $font_url ) ) {
            $css_output .= '@import url("' . esc_url( $font_url ) . '");' . "\n";
        }

        if ( 'url' === $font_source && ! empty( $font_url ) ) {
            $css_output .= '@import url("' . esc_url( $font_url ) . '");' . "\n";
        }

        if ( 'upload' === $font_source && ! empty( $font_files ) && is_array( $font_files ) ) {
            foreach ( $font_files as $file ) {
                if ( empty( $file['url'] ) ) {
                    continue;
                }

                $file_url = esc_url( $file['url'] );
                $weight = isset( $file['weight'] ) ? esc_attr( $file['weight'] ) : '400';
                $style = isset( $file['style'] ) ? esc_attr( $file['style'] ) : 'normal';
                $extension = strtolower( pathinfo( $file_url, PATHINFO_EXTENSION ) );
                $format = 'woff2';

                if ( 'woff' === $extension ) {
                    $format = 'woff';
                } elseif ( 'ttf' === $extension ) {
                    $format = 'truetype';
                }

                $css_output .= "@font-face {\n";
                $css_output .= "  font-family: '" . esc_attr( $font_family ) . "';\n";
                $css_output .= "  src: url('" . $file_url . "') format('" . $format . "');\n";
                $css_output .= "  font-weight: " . $weight . ";\n";
                $css_output .= "  font-style: " . $style . ";\n";
                $css_output .= "  font-display: swap;\n";
                $css_output .= "}\n";
            }
        }

        $css_output .= ":root {\n";

        if ( 'system' !== $font_source && ! empty( $font_family ) ) {
            $css_output .= '  --fd-font-sans: "' . esc_attr( $font_family ) . '", ' . $system_fonts . ";\n";
        } else {
            $css_output .= '  --fd-font-sans: ' . $system_fonts . ";\n";
        }

        $css_output .= "}\n";

        echo '<style id="flexify-dashboard-custom-font">' . "\n" . $css_output . '</style>' . "\n";
    }


    /**
     * Add plugin handles to MailPoet whitelist.
     *
     * @since 3.2.13
     * @param array $scripts Array of scripts or styles.
     * @return array Updated whitelist.
     */
    public static function handle_script_whitelist( $scripts ) {
        $scripts[] = 'flexify-dashboard';

        return $scripts;
    }


    /**
     * Add custom admin body class to selected pages.
     *
     * @since 2.0.0
     * @param string $classes Existing body classes.
     * @return string Updated body classes.
     */
    public static function flexify_dashboard_add_admin_body_class( $classes ) {
        $screen = get_current_screen();

        $flexify_dashboard_pages = array(
            'toplevel_page_flexify-dashboard-settings',
            'flexify_dashboard_page_flexify-dashboard-admin-notices',
            'flexify_dashboard_page_flexify-dashboard-menucreator',
            'flexify_dashboard_page_flexify-dashboard-database-explorer',
            'flexify_dashboard_page_flexify-dashboard-role-editor',
            'flexify_dashboard_page_flexify-dashboard-activity-log',
            'flexify_dashboard_page_flexify-dashboard-custom-post-types',
        );

        $flexify_dashboard_options = self::return_global_options();

        if ( isset( $flexify_dashboard_options['use_modern_users_page'] ) && true === $flexify_dashboard_options['use_modern_users_page'] ) {
            $flexify_dashboard_pages[] = 'users';
        }

        if ( isset( $flexify_dashboard_options['use_custom_dashboard'] ) && true === $flexify_dashboard_options['use_custom_dashboard'] ) {
            $flexify_dashboard_pages[] = 'dashboard';
        }

        if ( isset( $flexify_dashboard_options['use_modern_comments_page'] ) && true === $flexify_dashboard_options['use_modern_comments_page'] ) {
            $flexify_dashboard_pages[] = 'edit-comments';
        }

        if ( isset( $flexify_dashboard_options['use_modern_plugin_page'] ) && true === $flexify_dashboard_options['use_modern_plugin_page'] ) {
            $flexify_dashboard_pages[] = 'toplevel_page_plugin-manager';
        }

        if ( isset( $flexify_dashboard_options['use_modern_media_page'] ) && true === $flexify_dashboard_options['use_modern_media_page'] ) {
            $flexify_dashboard_pages[] = 'upload';
        }

        if ( $screen && in_array( $screen->id, $flexify_dashboard_pages, true ) ) {
            $classes .= ' flexify-dashboard-custom-page';
        }

        return $classes;
    }


    /**
     * Remove conflicting assets from specific admin pages.
     *
     * @since 3.2.13
     * @return void
     */
    public static function maybe_remove_assets() {
        $page_id = property_exists( self::$screen, 'id' ) ? self::$screen->id : '';

        if ( 'toplevel_page_latepoint' !== $page_id ) {
            wp_dequeue_style( 'latepoint-main-admin' );
            wp_deregister_style( 'latepoint-main-admin' );
        }
    }


    /**
     * Load translation files.
     *
     * @since 1.0.8
     * @return void
     */
    public static function languages_loader() {
        $domain = 'flexify-dashboard';
        $locale = function_exists( 'determine_locale' ) ? determine_locale() : get_locale();
        $mofile = WP_LANG_DIR . '/plugins/' . $domain . '-' . $locale . '.mo';

        load_plugin_textdomain(
            $domain,
            false,
            dirname( dirname( dirname( dirname( plugin_basename( __FILE__ ) ) ) ) ) . '/languages'
        );

        if ( is_readable( $mofile ) ) {
            load_textdomain( $domain, $mofile );
        }
    }


    /**
     * Load the base application script.
     *
     * @since 1.0.8
     * @return void
     */
    public static function load_base_script() {
        if ( self::is_site_editor() || self::is_mainwp_page() ) {
            return;
        }

        self::$plugin_url = plugins_url( 'flexify-dashboard/' );
        self::$script_name = Scripts::get_base_script_path( 'flexify-dashboard.js' );

        if ( ! self::$script_name ) {
            return;
        }

        self::output_script_attributes();

        if ( self::is_theme_disabled() ) {
            return;
        }

        wp_enqueue_script( 'wp-i18n' );

        wp_add_inline_script(
            'wp-i18n',
            "const i18n = (window.wp && wp.i18n) ? wp.i18n : {};
            window.__ = i18n.__ || ((s)=>s);
            window._x = i18n._x || ((s)=>s);
            window._n = i18n._n || ((s)=>s);
            window.sprintf = i18n.sprintf || ((s)=>s);",
            'after'
        );

        add_filter(
            'script_loader_tag',
            function( $tag, $handle, $src ) {
                if ( 'flexify-dashboard-app-js' === $handle ) {
                    $tag = '<script type="module" src="' . esc_url( $src ) . '"></script>';
                }

                return $tag;
            },
            10,
            3
        );

        wp_enqueue_script(
            'flexify-dashboard-app-js',
            self::$plugin_url . 'app/dist/' . self::$script_name,
            array( 'wp-i18n' ),
            FLEXIFY_DASHBOARD_VERSION,
            true
        );

        if ( function_exists( 'wp_script_add_data' ) ) {
            wp_script_add_data( 'flexify-dashboard-app-js', 'type', 'module' );
        }

        wp_set_script_translations(
            'flexify-dashboard-app-js',
            'flexify-dashboard',
            FLEXIFY_DASHBOARD_PLUGIN_PATH . '/languages/'
        );
    }


    /**
     * Check whether the theme UI is disabled for the current user.
     *
     * @since 2.0.0
     * @return bool True if disabled. Otherwise false.
     */
    private static function is_theme_disabled() {
        $access_list = isset( self::$options['disable_theme'] ) && is_array( self::$options['disable_theme'] )
            ? self::$options['disable_theme']
            : false;

        if ( ! $access_list ) {
            return false;
        }

        $current_user = wp_get_current_user();
        $current_user_id = $current_user->ID;
        $current_user_roles = $current_user->roles;

        foreach ( $access_list as $item ) {
            if ( ! is_array( $item ) ) {
                continue;
            }

            if ( isset( $item['type'] ) && 'user' === $item['type'] && isset( $item['id'] ) && (int) $item['id'] === $current_user_id ) {
                return true;
            }

            if ( isset( $item['type'] ) && 'role' === $item['type'] && isset( $item['value'] ) && in_array( $item['value'], $current_user_roles, true ) ) {
                return true;
            }
        }

        return false;
    }


    /**
     * Hide selected plugin update notices.
     *
     * @since 2.0.0
     * @param object|false $value Plugin update transient.
     * @return object|false Filtered transient.
     */
    public function filter_hidden_plugin_update_notifications( $value ) {
        $is_rest_request = defined( 'REST_REQUEST' ) && REST_REQUEST;

        if ( ! ( is_admin() || wp_doing_ajax() || $is_rest_request ) || ! is_object( $value ) || 0 === get_current_user_id() ) {
            return $value;
        }

        $hidden_plugins = Settings::get_setting( 'hidden_plugin_update_notifications', array() );

        if ( ! is_array( $hidden_plugins ) || empty( $hidden_plugins ) ) {
            return $value;
        }

        if ( $this->should_show_hidden_plugin_updates_for_current_user() ) {
            return $value;
        }

        if ( ! isset( $value->response ) || ! is_array( $value->response ) ) {
            return $value;
        }

        foreach ( $hidden_plugins as $plugin_file ) {
            if ( ! is_string( $plugin_file ) || '' === $plugin_file ) {
                continue;
            }

            $plugin_file = trim( $plugin_file );
            $possible_plugin_keys = array( $plugin_file );

            if ( '.php' !== substr( $plugin_file, -4 ) ) {
                $possible_plugin_keys[] = $plugin_file . '.php';
            }

            foreach ( $possible_plugin_keys as $plugin_key ) {
                if ( isset( $value->response[ $plugin_key ] ) ) {
                    unset( $value->response[ $plugin_key ] );
                }
            }
        }

        return $value;
    }


    /**
     * Determine if current user can view hidden plugin updates.
     *
     * @since 2.0.0
     * @return bool True if user should view hidden updates. Otherwise false.
     */
    private function should_show_hidden_plugin_updates_for_current_user() {
        $access_list = Settings::get_setting( 'show_hidden_plugin_update_notifications_for', array() );

        if ( ! is_array( $access_list ) || empty( $access_list ) ) {
            return false;
        }

        $current_user = wp_get_current_user();

        if ( ! $current_user || ! $current_user->exists() ) {
            return false;
        }

        $current_user_id = $current_user->ID;
        $current_user_roles = (array) $current_user->roles;

        foreach ( $access_list as $item ) {
            if ( ! is_array( $item ) ) {
                continue;
            }

            $type = isset( $item['type'] ) ? strtolower( (string) $item['type'] ) : '';
            $value = isset( $item['value'] ) ? (string) $item['value'] : '';
            $id = isset( $item['id'] ) ? (int) $item['id'] : 0;

            if ( 'user' === $type && $id > 0 && $current_user_id === $id ) {
                return true;
            }

            if ( 'role' === $type && '' !== $value && in_array( $value, $current_user_roles, true ) ) {
                return true;
            }
        }

        return false;
    }


    /**
     * Change plugin name and description in the plugins list.
     *
     * @since 2.0.0
     * @param array $all_plugins All installed plugins.
     * @return array Updated plugins array.
     */
    public static function change_plugin_name( $all_plugins ) {
        $options = self::$options;
        $menu_name = isset( $options['plugin_name'] ) && '' !== $options['plugin_name']
            ? esc_html( $options['plugin_name'] )
            : false;

        if ( ! $menu_name ) {
            return $all_plugins;
        }

        $slug = 'flexify-dashboard/flexify-dashboard.php';

        foreach ( $all_plugins as $plugin_file => &$plugin_data ) {
            if ( $slug === $plugin_file ) {
                $plugin_data['Name'] = $menu_name;
                $plugin_data['Author'] = $menu_name;
                $plugin_data['Description'] = str_ireplace( 'flexify-dashboard', $menu_name, $plugin_data['Description'] );
            }
        }

        return $all_plugins;
    }


    /**
     * Store the current screen object.
     *
     * @since 2.0.0
     * @return void
     */
    public static function get_screen() {
        self::$screen = get_current_screen();
    }


    /**
     * Store global options.
     *
     * @since 2.0.0
     * @return array
     */
    public static function get_global_options() {
        self::$options = Settings::get();

        return self::$options;
    }


    /**
     * Return global options.
     *
     * @since 2.0.0
     * @return array
     */
    public static function return_global_options() {
        if ( empty( self::$options ) ) {
            self::$options = Settings::get();
        }

        self::$options['layout'] = 'rounded';

        return self::$options;
    }


    /**
     * Placeholder for page holder output.
     *
     * @since 2.0.0
     * @return void
     */
    public static function page_holder() {
        return;
    }


    /**
     * Output the application holder.
     *
     * @since 2.0.0
     * @return void
     */
    public static function output_app() {
        if ( self::is_site_editor() || self::is_theme_disabled() || self::is_mainwp_page() ) {
            return;
        }

        return;
    }


    /**
     * Load admin styles.
     *
     * @since 2.0.0
     * @return void
     */
    public static function load_styles() {
        if ( self::is_theme_disabled() || self::is_mainwp_page() ) {
            return;
        }

        $plugin_url = plugins_url( 'flexify-dashboard/' );
        $stylesheet_path = Scripts::get_stylesheet_path( 'flexify-dashboard.js' );
        $main_style = $stylesheet_path
            ? $plugin_url . 'app/dist/' . $stylesheet_path
            : $plugin_url . 'app/dist/assets/styles/app.css';

        self::get_global_options();

        if ( is_array( self::$options ) && isset( self::$options['external_stylesheets'] ) && is_array( self::$options['external_stylesheets'] ) ) {
            $index = 0;

            foreach ( self::$options['external_stylesheets'] as $external_style ) {
                $index++;

                $external_url = esc_url_raw( $external_style );
                $parsed_url = wp_parse_url( $external_url );

                if ( ! isset( $parsed_url['scheme'] ) || ! in_array( $parsed_url['scheme'], array( 'http', 'https' ), true ) ) {
                    continue;
                }

                wp_enqueue_style( 'fd-external-' . $index, $external_url, array(), null );
            }
        }

        wp_enqueue_style( 'flexify-dashboard', $main_style, array(), FLEXIFY_DASHBOARD_VERSION );

        add_filter(
            'flexify-dashboard/style-layering/exclude',
            function( $excluded_patterns ) use ( $main_style ) {
                $excluded_patterns[] = $main_style;
                return $excluded_patterns;
            }
        );

        if ( self::is_block_editor() ) {
            self::load_block_styles();
            return;
        }

        $theme_style = $plugin_url . 'app/dist/assets/styles/theme.css';

        wp_enqueue_style( 'flexify-dashboard-theme', $theme_style, array(), FLEXIFY_DASHBOARD_VERSION );

        add_filter(
            'flexify-dashboard/style-layering/exclude',
            function( $excluded_patterns ) use ( $theme_style ) {
                $excluded_patterns[] = $theme_style;
                return $excluded_patterns;
            }
        );
    }


    /**
     * Load block editor specific styles.
     *
     * @since 2.0.0
     * @return void
     */
    public static function load_block_styles() {
        ?>
        <style>
            body.is-fullscreen-mode.learndash-post-type #sfwd-header {
                left: 0 !important;
            }
        </style>
        <?php
    }


    /**
     * Output temporary body hider styles.
     *
     * @since 2.0.0
     * @return void
     */
    public static function output_temporary_body_hider() {
        if ( self::is_site_editor() || self::is_theme_disabled() || self::is_mainwp_page() ) {
            return;
        }

        ?>
        <style id="fd-temporary-body-hider">
            @layer temporary-body-hider;
            @layer temporary-body-hider {
                body > *:not(#fd-classic-app) {
                    opacity: 0;
                }
            }
        </style>
        <style id="fd-base">
            @layer temporary-body-hider;
            @layer temporary-body-hider {
                html,
                body {
                    background: white !important;
                }

                @media (prefers-color-scheme: dark) {
                    html,
                    body {
                        background: black !important;
                    }
                }
            }
        </style>
        <?php
    }


    /**
     * Check whether the current page should not load theme CSS.
     *
     * @since 2.0.0
     * @return bool
     */
    private static function is_no_theme_page() {
        $page = isset( $_GET['page'] )
            ? sanitize_text_field( wp_unslash( $_GET['page'] ) )
            : '';

        return 'gf_edit_forms' === $page;
    }


    /**
     * Check whether current page belongs to MainWP.
     *
     * @since 2.0.0
     * @return bool
     */
    private static function is_mainwp_page() {
        return is_object( self::$screen ) && isset( self::$screen->id ) && false !== strpos( self::$screen->id, 'mainwp' );
    }


    /**
     * Check whether current screen is block editor.
     *
     * @since 2.0.0
     * @return bool
     */
    private static function is_block_editor() {
        return is_object( self::$screen ) && method_exists( self::$screen, 'is_block_editor' ) && self::$screen->is_block_editor();
    }


    /**
     * Check whether current screen is site editor or customizer.
     *
     * @since 2.0.0
     * @return bool
     */
    private static function is_site_editor() {
        return is_object( self::$screen ) && isset( self::$screen->id ) && ( 'site-editor' === self::$screen->id || 'customize' === self::$screen->id );
    }


    /**
     * Output script attributes used by the app.
     *
     * @since 2.0.0
     * @return void
     */
    public static function output_script_attributes() {
        global $wp_post_types;

        if ( self::is_site_editor() ) {
            return;
        }

        $plugin_url = plugins_url( 'flexify-dashboard/' );
        $rest_base = get_rest_url();
        $rest_nonce = wp_create_nonce( 'wp_rest' );
        $admin_url = get_admin_url();
        $login_url = wp_login_url();
        $current_user = wp_get_current_user();
        $first_name = $current_user->first_name;
        $roles = (array) $current_user->roles;
        $options = self::return_global_options();
        $format_args = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK;
        $manage_options = current_user_can( 'manage_options' ) ? 'true' : 'false';
        $front_page = is_admin() ? 'false' : 'true';
        $mime_types = array_values( get_allowed_mime_types() );

        unset( $options['license_key'] );
        unset( $options['instance_id'] );
        unset( $options['google_recaptcha_secret_key'] );
        unset( $options['google_analytics_service_account'] );

        $remote_site_capability = isset( $options['remote_site_switcher_capability'] ) && ! empty( $options['remote_site_switcher_capability'] )
            ? $options['remote_site_switcher_capability']
            : 'manage_options';

        if ( ! current_user_can( $remote_site_capability ) ) {
            unset( $options['remote_sites'] );
            unset( $options['remote_site_switcher_capability'] );
        }

        if ( empty( $first_name ) ) {
            $first_name = $current_user->display_name;
        }

        $email = $current_user->user_email;

        if ( ! function_exists( 'get_plugins' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $all_plugins = get_plugins();
        $active_plugins = array();

        foreach ( $all_plugins as $plugin_path => $plugin_data ) {
            if ( is_plugin_active( $plugin_path ) ) {
                $slug_parts = explode( '/', $plugin_path );
                $base_slug = $slug_parts[0];

                $active_plugins[] = array(
                    'path' => $plugin_path,
                    'slug' => $base_slug,
                    'name' => isset( $plugin_data['Name'] ) ? $plugin_data['Name'] : '',
                );
            }
        }

        $post_type = ! empty( $_GET['post_type'] )
            ? sanitize_text_field( wp_unslash( $_GET['post_type'] ) )
            : 'post';

        $supports_categories = is_object_in_taxonomy( $post_type, 'category' );
        $supports_tags = is_object_in_taxonomy( $post_type, 'post_tag' );

        $menu_cache_key = \MeuMouse\Flexify_Dashboard\Rest\MenuCache::get_or_create_cache_key();
        $colors = wp_get_global_settings( array( 'color', 'palette' ) );
        $spacing = wp_get_global_settings( array( 'spacing', 'spacingSizes' ) );

        $builder_script = array(
            'id'                        => 'fd-script',
            'type'                      => 'module',
            'theme-colors'              => esc_attr( wp_json_encode( $colors ) ),
            'theme-spacing'             => esc_attr( wp_json_encode( $spacing ) ),
            'plugin-base'               => esc_url( $plugin_url ),
            'rest-base'                 => esc_url( $rest_base ),
            'rest-nonce'                => esc_attr( $rest_nonce ),
            'admin-url'                 => esc_url( $admin_url ),
            'login-url'                 => esc_url( $login_url ),
            'user-id'                   => esc_attr( get_current_user_id() ),
            'user-roles'                => esc_attr( wp_json_encode( $roles ) ),
            'flexify-dashboard-settings'=> esc_attr( wp_json_encode( $options, $format_args ) ),
            'user-name'                 => esc_attr( $first_name ),
            'can-manage-options'        => esc_attr( $manage_options ),
            'user-email'                => esc_attr( $email ),
            'site-url'                  => esc_url( get_home_url() ),
            'front-page'                => esc_attr( $front_page ),
            'post_types'                => esc_attr( wp_json_encode( $wp_post_types ) ),
            'mime_types'                => esc_attr( wp_json_encode( $mime_types ) ),
            'active-plugins'            => esc_attr( wp_json_encode( $active_plugins ) ),
            'current-user'              => esc_attr(
                wp_json_encode(
                    array(
                        'ID'           => $current_user->ID,
                        'display_name' => $current_user->display_name,
                        'user_email'   => $current_user->user_email,
                        'roles'        => $current_user->roles,
                    ),
                    $format_args
                )
            ),
            'user-allcaps'              => esc_attr( wp_json_encode( $current_user->allcaps, $format_args ) ),
            'supports_categories'       => esc_attr( $supports_categories ),
            'supports_tags'             => esc_attr( $supports_tags ),
            'post_statuses'             => esc_attr( wp_json_encode( self::get_post_type_statuses( $post_type ) ) ),
            'menu-cache-key'            => esc_attr( $menu_cache_key ),
        );

        wp_print_script_tag( $builder_script );
    }


    /**
     * Get available post statuses for a post type.
     *
     * Only include statuses safe to expose through the REST API.
     *
     * @since 2.0.0
     * @param string $post_type Post type slug.
     * @return array
     */
    private static function get_post_type_statuses( $post_type ) {
        $statuses = get_post_stati( array(), 'objects' );
        $post_type_object = get_post_type_object( $post_type );
        $rest_safe_statuses = array(
            'publish',
            'future',
            'draft',
            'private',
        );
        $available_statuses = array();

        foreach ( $statuses as $status ) {
            if ( ! empty( $status->internal ) ) {
                continue;
            }

            if ( ! in_array( $status->name, $rest_safe_statuses, true ) && ( empty( $status->show_in_rest ) || ! $status->show_in_rest ) ) {
                continue;
            }

            if ( ! $post_type_object || ! isset( $post_type_object->cap->edit_private_posts ) ) {
                continue;
            }

            if ( $status->show_in_admin_all_list || current_user_can( $post_type_object->cap->edit_private_posts ) ) {
                $available_statuses[ $status->name ] = array(
                    'label' => $status->label,
                    'value' => $status->name,
                );
            }
        }

        return array_values( $available_statuses );
    }
}
