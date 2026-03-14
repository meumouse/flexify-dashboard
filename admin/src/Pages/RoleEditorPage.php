<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

// Prevent direct access to this file
defined("ABSPATH") || exit();

/**
 * Class RoleEditorPage
 *
 * Handles the role editor page for WordPress user roles and capabilities
 */
class RoleEditorPage
{
  /**
   * RoleEditorPage constructor.
   *
   * Sets up the necessary hooks for the role editor page
   */
  public function __construct()
  {
    add_action("admin_menu", [$this, "setup_admin_page"]);
  }

  /**
   * Sets up the admin page by adding it to the uiXPress menu
   *
   * @return void
   */
  public function setup_admin_page()
  {
    if (!current_user_can("manage_options")) {
      return;
    }

    // Check if role editor is enabled
    if (!Settings::is_enabled("enable_role_editor")) {
      return;
    }

    $menu_name = __("Role Editor", "flexify-dashboard");
    $hook_suffix = add_submenu_page(
      "flexify-dashboard-settings",
      $menu_name,
      $menu_name,
      "manage_options",
      "flexify-dashboard-role-editor",
      [$this, "render_page"]
    );

    add_action("admin_head-{$hook_suffix}", [$this, "load_styles"]);
    add_action("admin_head-{$hook_suffix}", [$this, "load_scripts"]);
  }

  /**
   * Loads role editor styles
   *
   * @return void
   */
  public static function load_styles()
  {
    $url = plugins_url("flexify-dashboard/");
    $style = $url . "app/dist/assets/styles/role-editor.css";
    wp_enqueue_style("flexify-dashboard-role-editor", $style, [], FLEXIFY_DASHBOARD_VERSION);

    add_filter('flexify-dashboard/style-layering/exclude', function($excluded_patterns) use ($style) {
      $excluded_patterns[] = $style;
      return $excluded_patterns;
    });
  }

  /**
   * Loads role editor scripts
   *
   * @return void
   */
  public static function load_scripts()
  {
    $url = plugins_url("flexify-dashboard/");
    $script_name = Scripts::get_base_script_path("RoleEditor.js");

    if (!$script_name) {
      return;
    }

    // Get plugin settings
    $options = Settings::get();
    $plugin_name = Settings::get_setting("plugin_name", "uiXPress");
    $plugin_name = $plugin_name != "" ? esc_html($plugin_name) : "uiXPress";

    // Get current user and escape user data for security
    $current_user = wp_get_current_user();
    if (!$current_user || !$current_user->exists()) {
      return;
    }

    wp_print_script_tag([
      "id" => "fd-role-editor-script",
      "src" => $url . "app/dist/{$script_name}",
      "plugin-base" => esc_url($url),
      "rest-base" => esc_url(rest_url()),
      "rest-nonce" => wp_create_nonce("wp_rest"),
      "admin-url" => esc_url(admin_url()),
      "site-url" => esc_url(site_url()),
      "user-id" => absint($current_user->ID),
      "user-name" => esc_attr($current_user->display_name),
      "user-email" => esc_attr($current_user->user_email),
      "flexify-dashboard-settings" => wp_json_encode($options),
      "type" => "module",
    ]);
  }

  /**
   * Renders the role editor page content
   *
   * @return void
   */
  public function render_page()
  {
    if (!current_user_can("manage_options")) {
      wp_die(__("You do not have sufficient permissions to access this page."));
    }
    ?>
    <div id="fd-role-editor-page"></div>
    <?php
  }
}

