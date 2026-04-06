<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Options\GlobalOptions;
use MeuMouse\Flexify_Dashboard\Options\Settings;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit();

class SettingsManager
{
  public function __construct()
  {
    add_action("rest_api_init", [__CLASS__, "register_custom_endpoints"]);
  }

  public static function register_custom_endpoints()
  {
    register_rest_route("flexify-dashboard/v1", "/settings/reset", [
      "methods" => "POST",
      "callback" => [__CLASS__, "reset_settings"],
      "permission_callback" => function($request) {
        return RestPermissionChecker::check_permissions($request, "manage_options");
      },
    ]);
  }

  public static function reset_settings(WP_REST_Request $request)
  {
    $default_settings = GlobalOptions::get_default_settings();

    update_option("flexify_dashboard_settings", $default_settings);
    Settings::clear_cache();

    return new WP_REST_Response([
      "success" => true,
      "settings" => $default_settings,
      "message" => __("Settings reset to defaults.", "flexify-dashboard"),
    ], 200);
  }
}
