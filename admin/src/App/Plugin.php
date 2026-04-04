<?php

namespace MeuMouse\Flexify_Dashboard\App;

use MeuMouse\Flexify_Dashboard\Options\GlobalOptions;
use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Update\Updater;
use MeuMouse\Flexify_Dashboard\Rest\RestLogout;
use MeuMouse\Flexify_Dashboard\Rest\UserRoles;
use MeuMouse\Flexify_Dashboard\Rest\UserCapabilities;
use MeuMouse\Flexify_Dashboard\Rest\RoleEditor;
use MeuMouse\Flexify_Dashboard\Rest\ServerHealth;
use MeuMouse\Flexify_Dashboard\Rest\MediaAnalytics;
use MeuMouse\Flexify_Dashboard\Rest\UserAnalytics;
use MeuMouse\Flexify_Dashboard\Rest\SearchMeta;
use MeuMouse\Flexify_Dashboard\Rest\PostsTables;
use MeuMouse\Flexify_Dashboard\Rest\AdminNotices;
use MeuMouse\Flexify_Dashboard\Rest\PluginManager;
use MeuMouse\Flexify_Dashboard\Rest\MediaReplace;
use MeuMouse\Flexify_Dashboard\Rest\Media as RestMedia;
use MeuMouse\Flexify_Dashboard\Rest\MediaTags;
use MeuMouse\Flexify_Dashboard\Rest\MediaBulk;
use MeuMouse\Flexify_Dashboard\Rest\Analytics;
use MeuMouse\Flexify_Dashboard\Rest\GoogleAnalyticsOAuth;
use MeuMouse\Flexify_Dashboard\Pages\Settings as SettingsPage;
use MeuMouse\Flexify_Dashboard\Pages\Login;
use MeuMouse\Flexify_Dashboard\Rest\Login as RestLogin;
use MeuMouse\Flexify_Dashboard\Pages\MenuBuilder;
use MeuMouse\Flexify_Dashboard\Pages\CustomPluginsPage;
use MeuMouse\Flexify_Dashboard\Pages\FrontEnd;
use MeuMouse\Flexify_Dashboard\Pages\PostsList;
use MeuMouse\Flexify_Dashboard\Pages\CustomDashboardPage;
use MeuMouse\Flexify_Dashboard\Pages\UixAnalytics;
use MeuMouse\Flexify_Dashboard\Pages\CustomMediaPage;
use MeuMouse\Flexify_Dashboard\Pages\CustomUsersPage;
use MeuMouse\Flexify_Dashboard\Pages\CustomCommentsPage;
//use MeuMouse\Flexify_Dashboard\Pages\CustomPostEditor;
use MeuMouse\Flexify_Dashboard\Pages\CustomActivityLogPage;
use MeuMouse\Flexify_Dashboard\Pages\DatabaseExplorerPage;
use MeuMouse\Flexify_Dashboard\Pages\RoleEditorPage;
use MeuMouse\Flexify_Dashboard\Rest\DatabaseExplorer;
use MeuMouse\Flexify_Dashboard\Rest\ActivityLog as RestActivityLog;
use MeuMouse\Flexify_Dashboard\Rest\WooCommerceCustomer;
use MeuMouse\Flexify_Dashboard\Rest\WooCommerceDashboard;
use MeuMouse\Flexify_Dashboard\Rest\PostEditorMeta;
use MeuMouse\Flexify_Dashboard\Rest\PostEditorSEO;
use MeuMouse\Flexify_Dashboard\Rest\Collaboration;
/*use MeuMouse\Flexify_Dashboard\Rest\CustomPostTypes;
use MeuMouse\Flexify_Dashboard\Rest\CustomFields\CustomFields;
use MeuMouse\Flexify_Dashboard\Rest\CustomFields\RelationshipSearch;
use MeuMouse\Flexify_Dashboard\Rest\CustomFields\OptionPages;
use MeuMouse\Flexify_Dashboard\Rest\CustomFields\OptionPagesLoader;
use MeuMouse\Flexify_Dashboard\Rest\CustomFields\OptionPageSaver;
use MeuMouse\Flexify_Dashboard\Pages\CustomPostTypesPage;*/
use MeuMouse\Flexify_Dashboard\Utility\Scripts;
use MeuMouse\Flexify_Dashboard\App\PluginFrontEnd;
use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsDatabase;
use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsCron;
use MeuMouse\Flexify_Dashboard\Activity\ActivityDatabase;
use MeuMouse\Flexify_Dashboard\Activity\ActivityLogger;
use MeuMouse\Flexify_Dashboard\Activity\ActivityCron;
use MeuMouse\Flexify_Dashboard\Activity\ActivityHooks;
//use MeuMouse\Flexify_Dashboard\Pages\DummyDataPage;

// Prevent direct access to this file
defined("ABSPATH") || exit();

/**
 * Class flexify-dashboard
 *
 * Main class for initialising the flexify-dashboard app.
 */
class Plugin
{
  private static $screen = null;
  private static $options = [];
  private static $script_name = false;
  private static $plugin_url = false;

  /**
   * flexify-dashboard constructor.
   *
   * Initialises the main app.
   */
  public function __construct()
  {

    if ( self::should_stop_flexify_dashboard() ) {
		add_action("admin_enqueue_scripts", [$this, "load_styles"], 1);
		return;
    }

    add_action('admin_head', [$this, 'layer_wordpress_styles'], 1);
    add_action('admin_head', [$this, 'output_custom_font_css'], 2);
    add_action('login_head', [$this, 'output_custom_font_css'], 2);
    add_action('wp_head', [$this, 'output_custom_font_css'], 2);

    add_action("plugins_loaded", [$this, "languages_loader"]);

    add_action("admin_init", [$this, "get_global_options"], 0);
    add_action("admin_enqueue_scripts", [$this, "get_screen"], 0);

    add_action("admin_enqueue_scripts", [$this, "load_styles"], 1);
    add_action("admin_enqueue_scripts", [$this, "load_base_script"], 1);
    add_action("admin_head", [$this, "output_app"], 2);

    add_action("admin_print_styles", [$this, "output_temporary_body_hider"], 1);

    add_action("all_plugins", [$this, "change_plugin_name"]);

    add_action("admin_enqueue_scripts", [$this, "maybe_remove_assets"], 100);

    add_filter( 'admin_body_class', [$this, "flexify_dashboard_add_admin_body_class"] );
	add_filter("site_transient_update_plugins", [$this, "filter_hidden_plugin_update_notifications"], 20, 1);

    // Starts apps
    new GlobalOptions();
    new Updater();
    new RestLogout();
    new UserRoles();
    new UserCapabilities();
	new ServerHealth();
	new MediaAnalytics();
	new UserAnalytics();
    new SettingsPage();
    $login_page = new Login();
    new RestLogin($login_page);
    new SearchMeta();
    new MenuBuilder();
    new CustomPluginsPage();
    new Frontend();
    new PluginManager();
    new MediaReplace();
    new MediaTags();
    new MediaBulk();

    // Register REST media filters (e.g., unused attachments)
    RestMedia::init();
    new Analytics();
    new GoogleAnalyticsOAuth();
    new PostsList();
    new PostsTables();
    new AdminNotices();
    new CustomDashboardPage();
    
    // Conditionally load Role Editor if enabled
    if (Settings::is_enabled("enable_role_editor")) {
		new RoleEditor();
		new RoleEditorPage();
    }
    
    new AnalyticsDatabase();
    new AnalyticsCron();
    new UixAnalytics();
    new CustomMediaPage();
    new CustomUsersPage();
    new CustomCommentsPage();

    //new CustomPostEditor();
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
    //new DummyDataPage();

    //Mailpoet
    add_filter("mailpoet_conflict_resolver_whitelist_style", [$this, "handle_script_whitelist"]);
    add_filter("mailpoet_conflict_resolver_whitelist_script", [$this, "handle_script_whitelist"]);
  }

  /**
   * Check if UiXpress should be stopped from running
   *
   * Allows other plugins to stop UiXpress from running via filter.
   * 
   * Usage:
   * add_filter('flexify-dashboard/core/stop', '__return_true'); // Always stop
   * add_filter('flexify-dashboard/core/stop', function($should_stop, $action) {
   *   // Custom logic based on conditions
   *   return $should_stop || your_custom_condition();
   * }, 10, 2);
   *
   * @return boolean True to stop UiXpress from running, false to continue
   * @since 1.0.6
   */
  private static function should_stop_flexify_dashboard()
  {

    $breakdance = isset($_GET["breakdance_wpuiforbuilder_tinymce"]) ? sanitize_text_field($_GET["breakdance_wpuiforbuilder_tinymce"]) : '';
    $action = isset($_GET["action"]) ? sanitize_text_field($_GET["action"]) : '';
    
    $should_stop = $action === "update-selected-themes" || $action === "update-selected" || $breakdance === "true";
    
    /**
     * Filter to allow other plugins to stop UiXpress from running
     *
     * @param bool $should_stop Whether UiXpress should stop running
     * @param string $action Current action from $_GET
     * @return bool Modified stop condition
     * @since 1.0.6
     */
    return apply_filters('flexify-dashboard/core/stop', $should_stop, $action);
  }

  /**
   * Layers WordPress stylesheets using CSS layers
   *
   * Wraps existing stylesheet links into the wordpress-base CSS layer to prevent
   * style conflicts with UiXpress styles. Apps can opt out of layering using the
   * 'flexify-dashboard/style-layering/exclude' filter.
   *
   * Usage to opt out:
   * add_filter('flexify-dashboard/style-layering/exclude', function($excluded_patterns) {
   *   $excluded_patterns[] = 'my-plugin'; // Exclude stylesheets containing 'my-plugin'
   *   return $excluded_patterns;
   * });
   *
   * @since 1.0.0
   */
  public function layer_wordpress_styles()
  {
    // Get excluded patterns from filter
    $excluded_patterns = apply_filters('flexify-dashboard/style-layering/exclude', []);
    
    // Convert PHP array to JSON for JavaScript
    $excluded_json = json_encode($excluded_patterns);
    ?>
    <style>
        /* Declare layer order first */
        @layer wordpress-base, fd-theme;
    </style>
    <script>
    (function() {
        // Get excluded patterns from PHP
        const excludedPatterns = <?php echo $excluded_json; ?>;
        
        // Wrap all existing link tags in wordpress-base layer
        const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
        existingLinks.forEach(link => {
            const href = link.href;
            
            // Check if this stylesheet should be excluded from layering
            const shouldExclude = excludedPatterns.some(pattern => href.includes(pattern));
            if (shouldExclude) {
                return;
            }
            
            const style = document.createElement('style');
            style.textContent = ` @import url("${href}") layer(wordpress-base);`;
            link.replaceWith(style);
        });
    })();
    </script>
    <?php
  }

  /**
   * Outputs custom font CSS based on user settings
   *
   * Handles three font source types:
   * - system: Uses system font stack (default)
   * - google: Imports Google Fonts via @import
   * - url: Imports external stylesheet via @import
   * - upload: Generates @font-face rules for uploaded font files
   *
   * @since 1.0.0
   */
  public function output_custom_font_css()
  {
    // Don't output if theme is disabled
    if (!is_user_logged_in() && !is_login()) {
      return;
    }

    $options = self::return_global_options();
    
    // Check if custom font is configured
    $font_source = isset($options["custom_font_source"]) ? $options["custom_font_source"] : "system";
    $font_family = isset($options["custom_font_family"]) ? $options["custom_font_family"] : "";
    $font_url = isset($options["custom_font_url"]) ? $options["custom_font_url"] : "";
    $font_files = isset($options["custom_font_files"]) ? $options["custom_font_files"] : [];

    // System font stack fallback
    $system_fonts = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';

    $css_output = "";

    // Handle Google Fonts
    if ($font_source === "google" && !empty($font_url)) {
      $css_output .= "@import url('" . esc_url($font_url) . "');\n";
    }

    // Handle custom URL stylesheet
    if ($font_source === "url" && !empty($font_url)) {
      $css_output .= "@import url('" . esc_url($font_url) . "');\n";
    }

    // Handle uploaded font files
    if ($font_source === "upload" && !empty($font_files) && is_array($font_files)) {
      foreach ($font_files as $file) {
        if (empty($file["url"])) {
          continue;
        }
        
        $file_url = esc_url($file["url"]);
        $weight = isset($file["weight"]) ? esc_attr($file["weight"]) : "400";
        $style = isset($file["style"]) ? esc_attr($file["style"]) : "normal";
        
        // Determine font format from file extension
        $extension = strtolower(pathinfo($file_url, PATHINFO_EXTENSION));
        $format = "woff2";
        if ($extension === "woff") {
          $format = "woff";
        } elseif ($extension === "ttf") {
          $format = "truetype";
        }
        
        $css_output .= "@font-face {\n";
        $css_output .= "  font-family: '" . esc_attr($font_family) . "';\n";
        $css_output .= "  src: url('" . $file_url . "') format('" . $format . "');\n";
        $css_output .= "  font-weight: " . $weight . ";\n";
        $css_output .= "  font-style: " . $style . ";\n";
        $css_output .= "  font-display: swap;\n";
        $css_output .= "}\n";
      }
    }

    // Set the CSS variable - always output to ensure proper font stack
    $css_output .= ":root {\n";
    if ($font_source !== "system" && !empty($font_family)) {
      // Custom font with system fallbacks
      $safe_font_family = esc_attr($font_family);
      $css_output .= "  --fd-font-sans: \"" . $safe_font_family . "\", " . $system_fonts . ";\n";
    } else {
      // System default
      $css_output .= "  --fd-font-sans: " . $system_fonts . ";\n";
    }
    $css_output .= "}\n";

    // Output the CSS
    echo '<style id="flexify-dashboard-custom-font">' . "\n" . $css_output . '</style>' . "\n";
  }

  /**
   * Mailpoet white list functions
   *
   * @param array $scripts array of scripts / styles
   *
   * @return array
   * @since 3.2.13
   */
  public static function handle_script_whitelist($scripts)
  {
    $scripts[] = "flexify-dashboard"; // plugin name to whitelist
    return $scripts;
  }

  public static function flexify_dashboard_add_admin_body_class( $classes ) {
    $screen = get_current_screen();
    
    // Define array of page IDs where you want the class
    $flexify_dashboard_pages = array(
        'toplevel_page_flexify-dashboard-settings',
        'flexify_dashboard_page_flexify-dashboard-admin-notices',
        'flexify_dashboard_page_flexify-dashboard-menucreator',
        'flexify_dashboard_page_flexify-dashboard-database-explorer',
        'flexify_dashboard_page_flexify-dashboard-role-editor',
        'flexify_dashboard_page_flexify-dashboard-activity-log',
        'flexify_dashboard_page_flexify-dashboard-custom-post-types'
    );

    $flexifyDashboardOptions = self::return_global_options();
    if (isset($flexifyDashboardOptions["use_modern_users_page"]) && $flexifyDashboardOptions["use_modern_users_page"] === true) {
      $flexify_dashboard_pages[] = 'users';
    }

    if(isset($flexifyDashboardOptions["use_custom_dashboard"]) && $flexifyDashboardOptions["use_custom_dashboard"] === true) {
      $flexify_dashboard_pages[] = 'dashboard';
    }

    if (isset($flexifyDashboardOptions["use_modern_comments_page"]) && $flexifyDashboardOptions["use_modern_comments_page"] === true) {
      $flexify_dashboard_pages[] = 'edit-comments';
    }

    if (isset($flexifyDashboardOptions["use_modern_plugin_page"]) && $flexifyDashboardOptions["use_modern_plugin_page"] === true) {
      $flexify_dashboard_pages[] = 'toplevel_page_plugin-manager';
    }

    if (isset($flexifyDashboardOptions["use_modern_media_page"]) && $flexifyDashboardOptions["use_modern_media_page"] === true) {
      $flexify_dashboard_pages[] = 'upload';
    }
    



    
    if ( $screen && in_array( $screen->id, $flexify_dashboard_pages ) ) {
        $classes .= ' flexify-dashboard-custom-page';
    }

    
    return $classes;
}


  /**
   * Remove css that causes issues with flexify-dashboard
   *
   * @param array $scripts array of scripts / styles
   *
   * @return array
   * @since 3.2.13
   */
  public static function maybe_remove_assets()
  {
    $pageid = property_exists(self::$screen, "id") ? self::$screen->id : "";

    if ($pageid != "toplevel_page_latepoint") {
      wp_dequeue_style("latepoint-main-admin");
      wp_deregister_style("latepoint-main-admin");
    }
  }

  /**
   * Loads translation files
   *
   * @since 1.0.8
   */
  public static function languages_loader()
  {
    $domain = 'flexify-dashboard';
    $locale = function_exists('determine_locale') ? determine_locale() : get_locale();
    $mofile = WP_LANG_DIR . '/plugins/' . $domain . '-' . $locale . '.mo';

    load_plugin_textdomain($domain, false, dirname(dirname(dirname(dirname(plugin_basename(__FILE__))))) . '/languages');

    if (is_readable($mofile)) {
      load_textdomain($domain, $mofile);
    }
  }

  /**
   * Loads empty translation script
   *
   * @since 1.0.8
   */
  public static function load_base_script()
  {
    // Don't load on site-editor
    if (self::is_site_editor() || self::is_mainwp_page()) {
      return;
    }

    // Get plugin url
    self::$plugin_url = plugins_url("flexify-dashboard/");
    self::$script_name = Scripts::get_base_script_path("flexify-dashboard.js");



    if (!self::$script_name) {
      return;
    }

    self::output_script_attributes();

    if (self::is_theme_disabled()) {
      return;
    }

    $file = self::$script_name;
    $url = self::$plugin_url;

    wp_enqueue_script('wp-i18n');

    wp_add_inline_script(
      'wp-i18n',
      "const i18n = (window.wp && wp.i18n) ? wp.i18n : {};
      window.__ = i18n.__ || ((s)=>s);
      window._x = i18n._x || ((s)=>s);
      window._n = i18n._n || ((s)=>s);
      window.sprintf = i18n.sprintf || ((s)=>s);",
      'after'
    );

    add_filter('script_loader_tag', function($tag, $handle, $src) {
      if ($handle === 'flexify-dashboard-app-js') {
        // Garante type="module"
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
      }

      return $tag;

    }, 10, 3);

    wp_enqueue_script(
      'flexify-dashboard-app-js',
      $url . "app/dist/{$file}",
      ['wp-i18n'],
      FLEXIFY_DASHBOARD_VERSION,
      true
    );

    if (function_exists('wp_script_add_data')) {
      wp_script_add_data('flexify-dashboard-app-js', 'type', 'module');
    }

    wp_set_script_translations('flexify-dashboard-app-js', 'flexify-dashboard', FLEXIFY_DASHBOARD_PLUGIN_PATH . '/languages/');
  }

  /**
   * Check if the current user has access based on user ID or role.
   *
   * @param array $access_list An array of user IDs and roles to check against.
   * @return bool True if the current user has access, false otherwise.
   */
  private static function is_theme_disabled()
  {
    $access_list = isset(self::$options["disable_theme"]) && is_array(self::$options["disable_theme"]) ? self::$options["disable_theme"] : false;

    if (!$access_list) {
      return;
    }

    // Get the current user
    $current_user = wp_get_current_user();

    // Get the current user's ID and roles
    $current_user_id = $current_user->ID;
    $current_user_roles = $current_user->roles;

    foreach ($access_list as $item) {
      // Check user
      if ($item["type"] == "user") {
        if ($current_user_id == $item["id"]) {
          return true;
        }
      }
      // Check if role
      elseif ($item["type"] == "role") {
        if (in_array($item["value"], $current_user_roles)) {
          return true;
        }
      }
    }

    // If no match found, return false
    return false;
  }

	/**
	 * Hide plugin update notices for selected plugins.
	 *
	 * @param object|false $value Plugin update transient.
	 * @return object|false
	 */
	public function filter_hidden_plugin_update_notifications( $value ) {
		$is_rest_request = defined( 'REST_REQUEST' ) && REST_REQUEST;

		if ( ! ( is_admin() || wp_doing_ajax() || $is_rest_request ) || ! is_object( $value ) || get_current_user_id() === 0 ) {
			return $value;
		}

		$hidden_plugins = Settings::get_setting("hidden_plugin_update_notifications", []);
		
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
			if ( ! is_string( $plugin_file ) || $plugin_file === '' ) {
				continue;
			}

			$plugin_file = trim( $plugin_file );
			$possible_plugin_keys = [ $plugin_file ];

			if ( substr( $plugin_file, -4 ) !== '.php' ) {
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
   * Determines if current user should still see hidden plugin update notices.
   *
   * @return bool
   */
  private function should_show_hidden_plugin_updates_for_current_user()
  {
    $access_list = Settings::get_setting("show_hidden_plugin_update_notifications_for", []);
    if (!is_array($access_list) || empty($access_list)) {
      return false;
    }

    $current_user = wp_get_current_user();
    if (!$current_user || !$current_user->exists()) {
      return false;
    }

    $current_user_id = $current_user->ID;
    $current_user_roles = (array) $current_user->roles;

    foreach ($access_list as $item) {
      if (!is_array($item)) {
        continue;
      }

      $type = isset($item["type"]) ? strtolower((string) $item["type"]) : "";
      $value = isset($item["value"]) ? (string) $item["value"] : "";
      $id = isset($item["id"]) ? (int) $item["id"] : 0;

      if ($type === "user" && $id > 0 && $current_user_id === $id) {
        return true;
      }

      if ($type === "role" && $value !== "" && in_array($value, $current_user_roles, true)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Changes the name and description of a specific plugin in the WordPress plugins list.
   *
   * This function modifies the name and description of the 'flexify-dashboard' plugin
   * if a custom name is set in the site options. It replaces occurrences of 'flexify-dashboard'
   * in the plugin description with 'toast'.
   *
   * @param array $all_plugins An associative array of all WordPress plugins.
   *                           The keys are plugin paths and the values are plugin data.
   *
   * @return array The modified array of plugins. If no custom name is set or
   *               the custom name is empty, the original array is returned unchanged.
   */
  public static function change_plugin_name($all_plugins)
  {
    $options = self::$options;
    $menu_name = isset($options["plugin_name"]) && $options["plugin_name"] != "" ? esc_html($options["plugin_name"]) : false;

    // No custom name so bail
    if (!$menu_name || $menu_name == "") {
      return $all_plugins;
    }

    $slug = "flexify-dashboard/flexify-dashboard.php";

    // the & means we're modifying the original $all_plugins array
    foreach ($all_plugins as $plugin_file => &$plugin_data) {
      if ($slug === $plugin_file) {
        $plugin_data["Name"] = $menu_name;
        $plugin_data["Author"] = $menu_name;
        $plugin_data["Description"] = str_ireplace("flexify-dashboard", $menu_name, $plugin_data["Description"]);
      }
    }

    return $all_plugins;
  }

  /**
   * Saves the current screen
   *
   */
  public static function get_screen()
  {
    // Get screen
    self::$screen = get_current_screen();
  }

  /**
   * Saves the global options
   *
   */
  public static function get_global_options()
  {
    self::$options = Settings::get();
  }

  /**
   *Return global options
   *
   */
  public static function return_global_options()
  {
    if (empty(self::$options)) {
      self::$options = Settings::get();
    }

    self::$options['layout'] = 'rounded';

    return self::$options;
  }


  /**
   * Page holder.
   *
   * Outputs the app holder
   */
  public static function page_holder()
  {
   return;
  }

  /**
   * flexify-dashboard styles.
   *
   * Loads main lp styles
   */
  public static function output_app()
  {
    if (self::is_site_editor() || self::is_theme_disabled() || self::is_mainwp_page()) {
      return;
    }

    return;
    echo '<div id="fd-classic-app" class="bg-white dark:bg-zinc-900" style="position: fixed;
    inset: 0 0 0 0;
    height: 100dvh;
    width: 100dvw;
    z-index: 2;"></div>';
  }

  /**
   * flexify-dashboard styles.
   *
   * Loads main lp styles
   */
  public static function load_styles()
  {
    // Don't load anything on site editor page
    if (self::is_theme_disabled() || self::is_mainwp_page()) {
      return;
    }

    // Get plugin url
    $url = plugins_url("flexify-dashboard/");
    $stylesheet_path = Scripts::get_stylesheet_path("flexify-dashboard.js");
    $style = $stylesheet_path ? $url . "app/dist/{$stylesheet_path}" : $url . "app/dist/assets/styles/app.css";
    $options = self::get_global_options();

    // Load external styles
    if (is_array(self::$options) && isset(self::$options["external_stylesheets"]) && is_array(self::$options["external_stylesheets"])) {
      $index = 0;
      foreach (self::$options["external_stylesheets"] as $stylekey) {
        $index++;
        // Validate and sanitize URL to prevent XSS and SSRF
        $url = esc_url_raw($stylekey);
        $parsed = parse_url($url);
        // Only allow http and https schemes
        if (!isset($parsed['scheme']) || !in_array($parsed['scheme'], ['http', 'https'])) {
          continue;
        }
        wp_enqueue_style("fd-external-{$index}", $url, [], null);
      }
    }
    
    wp_enqueue_style("flexify-dashboard", $style, [], FLEXIFY_DASHBOARD_VERSION);

    // Always exclude the main flexify-dashboard stylesheet from wordpress-base layering
    // This must happen before the block editor check to prevent layer nesting issues
    add_filter('flexify-dashboard/style-layering/exclude', function($excluded_patterns) use ($style) {
      $excluded_patterns[] = $style;
      return $excluded_patterns;
    });
   
    // Check if we are on block editor page. Don't load theme if so
    if (self::is_block_editor()) {
      self::load_block_styles();
      return;
    }


    $theme = $url . "app/dist/assets/styles/theme.css";
    wp_enqueue_style("flexify-dashboard-theme", $theme, [], FLEXIFY_DASHBOARD_VERSION);


    add_filter('flexify-dashboard/style-layering/exclude', function($excluded_patterns) use ($theme) {
      $excluded_patterns[] = $theme;
      return $excluded_patterns;
    });
  }

  /**
   * loads block editor specific styles
   *
   */
  public static function load_block_styles()
  {
?>
    <style>
      body.is-fullscreen-mode.learndash-post-type #sfwd-header {
        left: 0 !important;
      }
    </style>
<?php
  }

  /**
   * flexify-dashboard page.
   *
   * Outputs the app holder
   */
  public static function output_temporary_body_hider()
  {
    // Don't run on site editor page
    if (self::is_site_editor() || self::is_theme_disabled() || self::is_mainwp_page()) {
      return;
    }
    ?>

    <style id='fd-temporary-body-hider'>
      @layer temporary-body-hider;
      @layer temporary-body-hider {
        body > *:not(#fd-classic-app) {
          opacity: 0;
        }
      }
    </style>
    <style id='fd-base'>
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
   * Checks if we should remove the theme css based on current page
   *
   * Some plugins are broken by the theme and in which case the theme needs to be removed.
   */
  private static function is_no_theme_page()
  {
    $page = isset($_GET["page"]) ? sanitize_text_field($_GET["page"]) : '';
    return $page === "gf_edit_forms";
  }

  /**
   * Returns whether we are on the block editor page
   *
   */
  private static function is_mainwp_page()
  {
    return is_object(self::$screen) && isset(self::$screen->id) && strpos(self::$screen->id, "mainwp") !== false;
  }

  /**
   * Returns whether we are on the block editor page
   *
   */
  private static function is_block_editor()
  {
    return is_object(self::$screen) && method_exists(self::$screen, "is_block_editor") && self::$screen->is_block_editor();
  }

  /**
   * Returns whether we are on the site editor page
   *
   */
  private static function is_site_editor()
  {
    return is_object(self::$screen) && isset(self::$screen->id) && (self::$screen->id == "site-editor" || self::$screen->id == "customize");
  }

  /**
   * flexify-dashboard scripts.
   *
   * Loads main lp scripts
   */
  public static function output_script_attributes()
  {
    // Don't load on site-editor
    if (self::is_site_editor()) {
      return;
    }

    $url = plugins_url("flexify-dashboard/");
    $rest_base = get_rest_url();
    $rest_nonce = wp_create_nonce("wp_rest");
    $admin_url = get_admin_url();
    $login_url = wp_login_url();
    global $wp_post_types;

    // Get the current user object
    $current_user = wp_get_current_user();
    $first_name = $current_user->first_name;
    $roles = (array) $current_user->roles;
    $options = self::return_global_options();
    $formatArgs = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK;
    $manageOptions = current_user_can("manage_options") ? "true" : "false";

    // Remove the 'license_key' key
    unset($options["license_key"]);
    unset($options["instance_id"]);
    unset($options["google_recaptcha_secret_key"]);
    unset($options["google_analytics_service_account"]);

    // Check if user has capability to access remote sites options
    // Prevents exposing passwords to unauthorized users
    $remote_site_capability = isset($options["remote_site_switcher_capability"]) && !empty($options["remote_site_switcher_capability"])
      ? $options["remote_site_switcher_capability"]
      : "manage_options";
    
    if (!current_user_can($remote_site_capability)) {
      unset($options["remote_sites"]);
      unset($options["remote_site_switcher_capability"]);
    }

    // If first name is empty, fall back to display name
    if (empty($first_name)) {
      $first_name = $current_user->display_name;
    }

    // Get the user's email
    $email = $current_user->user_email;

    $frontPage = is_admin() ? "false" : "true";
    $mime_types = array_values(get_allowed_mime_types());

    // Get active plugins list
    if (!function_exists('get_plugins')) {
      require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    $all_plugins = get_plugins();
    $active_plugins = [];
    foreach ($all_plugins as $plugin_path => $plugin_data) {
      if (is_plugin_active($plugin_path)) {
        // Store both the plugin path and the base slug for flexibility
        $slug_parts = explode('/', $plugin_path);
        $base_slug = $slug_parts[0];
        $active_plugins[] = [
          'path' => $plugin_path,
          'slug' => $base_slug,
          'name' => $plugin_data['Name'] ?? '',
        ];
      }
    }

    // Method 1: Using is_object_in_taxonomy()
    $post_type = !empty($_GET["post_type"]) ? sanitize_text_field($_GET["post_type"]) : "post";
    $supports_categories = false;
    if (is_object_in_taxonomy($post_type, "category")) {
      $supports_categories = true;
    }

    $supports_tags = false;
    if (is_object_in_taxonomy($post_type, "post_tag")) {
      $supports_tags = true;
    }

    // Get menu cache key
    $menu_cache_key = \MeuMouse\Flexify_Dashboard\Rest\MenuCache::get_or_create_cache_key();

    $colors = wp_get_global_settings(['color', 'palette']);
    $spacing = wp_get_global_settings(['spacing', 'spacingSizes']);
    

    // Setup script object
    $builderScript = [
      "id" => "fd-script",
      "type" => "module",
      "theme-colors" => esc_attr(json_encode($colors)),
      "theme-spacing" => esc_attr(json_encode($spacing)),
      "plugin-base" => esc_url($url),
      "rest-base" => esc_url($rest_base),
      "rest-nonce" => esc_attr($rest_nonce),
      "admin-url" => esc_url($admin_url),
      "login-url" => esc_url($login_url),
      "user-id" => esc_attr(get_current_user_id()),
      "user-roles" => esc_attr(json_encode($roles)),
      "flexify-dashboard-settings" => esc_attr(json_encode($options, $formatArgs)),
      "user-name" => esc_attr($first_name),
      "can-manage-options" => esc_attr($manageOptions),
      "user-email" => esc_attr($email),
      "site-url" => esc_url(get_home_url()),
      "front-page" => esc_attr($frontPage),
      "post_types" => esc_attr(json_encode($wp_post_types)),
      "mime_types" => esc_attr(json_encode($mime_types)),
      "active-plugins" => esc_attr(json_encode($active_plugins)),
      "current-user" => esc_attr(json_encode([
        'ID' => $current_user->ID,
        'display_name' => $current_user->display_name,
        'user_email' => $current_user->user_email,
        'roles' => $current_user->roles
      ], $formatArgs)),
      "user-allcaps" => esc_attr(json_encode($current_user->allcaps, $formatArgs)),
      "supports_categories" => esc_attr($supports_categories),
      "supports_tags" => esc_attr($supports_tags),
      "post_statuses" => esc_attr(json_encode(self::get_post_type_statuses($post_type))),
      "menu-cache-key" => esc_attr($menu_cache_key),
    ];

    // Print tag
    wp_print_script_tag($builderScript);
  }


   /**
   * Get unique available post statuses for a given post type formatted as label/value pairs,
   * filtered to only include statuses that can be set via the REST API.
   *
   * Retrieves post statuses that are:
   * 1. Publicly queryable or accessible to users with appropriate permissions
   * 2. Safe to use with the REST API
   * 3. Not internal-use statuses
   *
   * @since 1.0.0
   *
   * @param string $post_type The post type to check statuses for (e.g., 'post', 'page', 'product')
   *
   * @return array[] Array of status arrays, each containing:
   *                 {
   *                     @type string $label The human-readable status label
   *                     @type string $value The status slug/name
   *                 }
   */
  private static function get_post_type_statuses($post_type)
  {
    // Get all registered statuses
    $statuses = get_post_stati([], "objects");

    // Get the post type object to check supported features
    $post_type_object = get_post_type_object($post_type);

    // Define core statuses that are safe for REST API usage
    $rest_safe_statuses = ["publish", "future", "draft", "private"];

    $available_statuses = [];

    foreach ($statuses as $status) {
      // Skip if this is an internal status
      if (!empty($status->internal)) {
        continue;
      }

      // Skip if this is not a REST-safe status
      if (!in_array($status->name, $rest_safe_statuses) && (empty($status->show_in_rest) || !$status->show_in_rest)) {
        continue;
      }

      // Check if this status is publicly queryable or if the user can edit private posts
      if ($status->show_in_admin_all_list || current_user_can($post_type_object->cap->edit_private_posts)) {
        // Use status name as key to prevent duplicates
        $available_statuses[$status->name] = [
          "label" => $status->label,
          "value" => $status->name,
        ];
      }
    }

    // Reset array keys to return sequential numeric array
    return array_values($available_statuses);
  }
}
