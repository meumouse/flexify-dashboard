<?php
namespace MeuMouse\Flexify_Dashboard\Pages;
use MeuMouse\Flexify_Dashboard\Options\GlobalOptions;
use MeuMouse\Flexify_Dashboard\Options\Settings as SettingsOptions;
use MeuMouse\Flexify_Dashboard\Update\Updater;
use MeuMouse\Flexify_Dashboard\Rest\RestLogout;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

// Prevent direct access to this file
defined("ABSPATH") || exit();

/**
 * Class flexify-dashboard
 *
 * Main class for initialising the flexify-dashboard app.
 */
class Settings
{
  private static $screen = null;
  /**
   * flexify-dashboard constructor.
   *
   * Initialises the main app.
   */
  public function __construct()
  {
    add_action("admin_menu", ["MeuMouse\Flexify_Dashboard\Pages\Settings", "admin_settings_page"]);
  }

  /**
   * Adds settings page.
   *
   * Calls add_menu_page to add new page .
   */
  public static function admin_settings_page()
  {
    $plugin_name = SettingsOptions::get_setting("plugin_name", "Flexify Dashboard");
    $menu_name = $plugin_name != "" ? esc_html($plugin_name) : "Flexify Dashboard";

    $url = plugins_url("flexify-dashboard/assets/icons/flexify-dashboard-logo.svg");
    // Add top-level menu page - callback set to null to prevent default submenu
    add_menu_page($menu_name, $menu_name, "manage_options", "flexify-dashboard-settings", null, $url);
    
    // Replace the default submenu item by using the same slug as parent
    // This removes the duplicate "Flexify Dashboard" submenu item
    $hook_suffix = add_submenu_page('flexify-dashboard-settings', __("Settings", "flexify-dashboard"), __("Settings", "flexify-dashboard"), "manage_options", "flexify-dashboard-settings", ["MeuMouse\Flexify_Dashboard\Pages\Settings", "build_uipc"]);

    // Load styles for admin menu logo
    add_action('admin_head', ['MeuMouse\Flexify_Dashboard\Pages\Settings', 'load_admin_menu_logo']);
    add_action("admin_head-{$hook_suffix}", ["MeuMouse\Flexify_Dashboard\Pages\Settings", "load_styles"]);
    add_action("admin_head-{$hook_suffix}", ["MeuMouse\Flexify_Dashboard\Pages\Settings", "load_scripts"]);
  }

  /**
   * Loads admin menu logo css
   */
  public static function load_admin_menu_logo()
  {
    $css = "
    #adminmenu #toplevel_page_flexify-dashboard-settings .wp-menu-image img {
      width: 16px;
      height: 16px;
    } 
    ";
    echo '<style type="text/css">' . esc_html($css) . '</style>';
  }

  /**
   * flexify-dashboard settings page.
   *
   * Outputs the app holder
   */
  public static function build_uipc()
  {
    // Enqueue the media library
    wp_enqueue_media();
    // Output the app
    echo "<div id='fd-settings-app'></div>";
  }

  /**
   * flexify-dashboard styles.
   *
   * Loads main lp styles
   */
  public static function load_styles()
  {
    // Get plugin url
    $url = plugins_url("flexify-dashboard/");
    $style = $url . "app/dist/assets/styles/settings.css";
    wp_enqueue_style("flexify-dashboard-settings", $style, [], FLEXIFY_DASHBOARD_VERSION);

    add_filter('flexify-dashboard/style-layering/exclude', function($excluded_patterns) use ($style) {
      $excluded_patterns[] = $style;
      return $excluded_patterns;
    });
  }

  /**
   * flexify-dashboard scripts.
   *
   * Loads main lp scripts
   */
  public static function load_scripts()
  {
    // Get plugin url
    $url = plugins_url("flexify-dashboard/");
    $script_name = Scripts::get_base_script_path("Settings.js");

    // Setup script object
    $builderScript = [
      "id" => "fd-settings-script",
      "src" => $url . "app/dist/{$script_name}",
      "type" => "module",
    ];

    // Print tag
    wp_print_script_tag($builderScript);
  }
}
