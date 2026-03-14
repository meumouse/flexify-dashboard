<?php
namespace MeuMouse\Flexify_Dashboard\App;
use MeuMouse\Flexify_Dashboard\App\Plugin;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

// Prevent direct access to this file
defined("ABSPATH") || exit();

/**
 * Class flexify-dashboard
 *
 * Main class for initialising the flexify-dashboard app.
 */
class Frontend
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
    add_action("init", [$this, "maybe_load_actions"]);
  }

  /**
   * Outputs head actions for site settings
   *
   * @since 3.0.94
   */
  public function maybe_load_actions()
  {
    $currentURL = self::current_url();

    if (!is_admin_bar_showing()) {
      return;
    }

    if (!is_admin() && !is_login() && stripos($currentURL, wp_login_url()) === false && stripos($currentURL, admin_url()) === false) {
      add_action("wp_enqueue_scripts", ["MeuMouse\Flexify_Dashboard\App\Plugin", "output_script_attributes"]);
      add_action("wp_enqueue_scripts", [$this, "load_toolbar_script"]);
      add_action("wp_head", [$this, "push_temporary_css"]);
    }
  }

  /**
   * Returns the current URL
   *
   * @return string
   * @since 3.2.13
   */
  private static function current_url()
  {
    if (!defined("WP_CLI") && isset($_SERVER["HTTP_HOST"])) {
      $protocol = is_ssl() ? "https://" : "http://";
      return $protocol . $_SERVER["HTTP_HOST"] . $_SERVER["REQUEST_URI"];
    }
    return "";
  }

  /**
   * Loads the toolbar script
   *
   * @return string
   * @since 3.2.13
   */
  public static function load_toolbar_script()
  {
    // Get plugin url
    $plugin_url = plugins_url("flexify-dashboard/");
    $script_name = Scripts::get_base_script_path("Frontend.js");

    if (!$script_name) {
      return;
    }

    // Setup script object
    $builderScript = [
      "id" => "flexify-dashboard-app-js",
      "type" => "module",
      "src" => $plugin_url . "app/dist/{$script_name}",
    ];
    wp_print_script_tag($builderScript);

    // Set up translations
    wp_enqueue_script("flexify-dashboard", $plugin_url . "assets/js/translations.js", ["wp-i18n"], false);
    wp_set_script_translations("flexify-dashboard", "flexify-dashboard", FLEXIFY_DASHBOARD_PLUGIN_PATH . "/languages/");

    // Get plugin url
    $style = $plugin_url . "app/dist/assets/styles/frontend.css";
    wp_enqueue_style("flexify-dashboard-frontend", $style, [], FLEXIFY_DASHBOARD_VERSION);
  }

  /**
   * Returns the current URL
   *
   * @return string
   * @since 3.2.13
   */
  public static function push_temporary_css()
  {
    ?>
	  <style id="fd-temp-style">
	  #wpadminbar {
		  opacity: 0;
		}
	  </style>
	  <?php
  }
}
