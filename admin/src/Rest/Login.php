<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Pages\Login as LoginPage;

// Prevent direct access to this file.
defined("ABSPATH") || exit();

/**
 * Registers login-related REST endpoints.
 */
class Login
{
  /**
   * REST namespace.
   *
   * @var string
   */
  private $namespace = "flexify-dashboard/v1";

  /**
   * Login page service.
   *
   * @var LoginPage
   */
  private $login_page;

  /**
   * Boot login REST routes.
   *
   * @param LoginPage $login_page Login page instance.
   */
  public function __construct(LoginPage $login_page)
  {
    $this->login_page = $login_page;

    add_action("rest_api_init", [$this, "register_routes"]);
  }

  /**
   * Register login-related routes.
   *
   * @return void
   */
  public function register_routes()
  {
    register_rest_route($this->namespace, "/login", [
      "methods" => "POST",
      "callback" => [$this->login_page, "handle_login_rest_request"],
      "permission_callback" => "__return_true",
      "args" => [
        "username" => [
          "type" => "string",
          "required" => true,
        ],
        "password" => [
          "type" => "string",
          "required" => true,
        ],
        "remember" => [
          "type" => "boolean",
          "required" => false,
        ],
        "redirect_to" => [
          "type" => "string",
          "required" => false,
        ],
        "login_nonce" => [
          "type" => "string",
          "required" => true,
        ],
        "g_recaptcha_response" => [
          "type" => "string",
          "required" => false,
        ],
      ],
    ]);

    register_rest_route($this->namespace, "/lostpassword", [
      "methods" => "POST",
      "callback" => [$this->login_page, "handle_lostpassword_rest_request"],
      "permission_callback" => "__return_true",
      "args" => [
        "user_login" => [
          "type" => "string",
          "required" => true,
        ],
        "lostpassword_nonce" => [
          "type" => "string",
          "required" => true,
        ],
        "g_recaptcha_response" => [
          "type" => "string",
          "required" => false,
        ],
      ],
    ]);

    register_rest_route($this->namespace, "/login/site-info", [
      "methods" => "GET",
      "callback" => [$this->login_page, "get_login_site_info_rest_response"],
      "permission_callback" => "__return_true",
    ]);

    register_rest_route($this->namespace, "/google-recaptcha/status", [
      "methods" => "GET",
      "callback" => [$this->login_page, "get_google_recaptcha_status"],
      "permission_callback" => [$this->login_page, "check_admin_permissions"],
    ]);

    register_rest_route($this->namespace, "/google-recaptcha/credentials", [
      "methods" => "POST",
      "callback" => [$this->login_page, "save_google_recaptcha_credentials"],
      "permission_callback" => [$this->login_page, "check_admin_permissions"],
      "args" => [
        "site_key" => [
          "type" => "string",
          "required" => true,
        ],
        "secret_key" => [
          "type" => "string",
          "required" => true,
        ],
      ],
    ]);

    register_rest_route($this->namespace, "/google-recaptcha/disconnect", [
      "methods" => "POST",
      "callback" => [$this->login_page, "disconnect_google_recaptcha"],
      "permission_callback" => [$this->login_page, "check_admin_permissions"],
    ]);
  }
}
