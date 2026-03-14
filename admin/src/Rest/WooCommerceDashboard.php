<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_REST_Response;
use WC_Order;

// Prevent direct access to this file
defined("ABSPATH") || exit();

/**
 * Class WooCommerceDashboard
 *
 * Provides WooCommerce dashboard metrics filtered by date range.
 */
class WooCommerceDashboard
{
  private $namespace = "flexify-dashboard/v1";
  private $base = "woocommerce-dashboard";

  public function __construct()
  {
    add_action("rest_api_init", [$this, "register_routes"]);
  }

  public function register_routes()
  {
    register_rest_route($this->namespace, "/" . $this->base, [
      "methods" => "GET",
      "callback" => [$this, "get_dashboard_metrics"],
      "permission_callback" => [$this, "check_permissions"],
    ]);
  }

  public function check_permissions($request)
  {
    return RestPermissionChecker::check_permissions($request, "manage_woocommerce");
  }

  private function is_woocommerce_active()
  {
    if (!class_exists("WooCommerce")) {
      return false;
    }

    if (!function_exists("is_plugin_active")) {
      require_once ABSPATH . "wp-admin/includes/plugin.php";
    }

    return is_plugin_active("woocommerce/woocommerce.php");
  }

  private function parse_date_param($date, $end_of_day = false)
  {
    if (!$date) {
      return null;
    }

    $timestamp = strtotime($date);
    if (!$timestamp) {
      return null;
    }

    return $end_of_day ? strtotime("23:59:59", $timestamp) : strtotime("00:00:00", $timestamp);
  }

  public function get_dashboard_metrics($request)
  {
    if (!$this->is_woocommerce_active()) {
      return new WP_REST_Response([
        "success" => true,
        "woocommerce_active" => false,
        "metrics" => [],
      ], 200);
    }

    $date_from = $this->parse_date_param($request->get_param("date_from"));
    $date_to = $this->parse_date_param($request->get_param("date_to"), true);

    if (!$date_from || !$date_to) {
      $date_to = current_time("timestamp");
      $date_from = strtotime("-7 days", $date_to);
    }

    $orders = wc_get_orders([
      "limit" => -1,
      "status" => ["wc-completed", "wc-processing"],
      "date_created" => ">=" . gmdate("Y-m-d", $date_from) . "..." . gmdate("Y-m-d", $date_to),
      "return" => "objects",
    ]);

    $revenue_net = 0;
    $revenue_gross = 0;
    $orders_received = 0;
    $product_sales = [];

    foreach ($orders as $order) {
      if (!($order instanceof WC_Order)) {
        continue;
      }

      $orders_received++;
      $order_total = (float) $order->get_total();
      $order_discount = (float) $order->get_total_discount();

      $revenue_net += $order_total;
      $revenue_gross += ($order_total + $order_discount);

      foreach ($order->get_items() as $item) {
        $product_id = $item->get_product_id();
        $product_name = $item->get_name();
        $quantity = (int) $item->get_quantity();
        $line_total = (float) $item->get_total();

        if (!$product_id) {
          continue;
        }

        if (!isset($product_sales[$product_id])) {
          $product_sales[$product_id] = [
            "product_id" => $product_id,
            "name" => $product_name,
            "quantity" => 0,
            "revenue" => 0,
          ];
        }

        $product_sales[$product_id]["quantity"] += $quantity;
        $product_sales[$product_id]["revenue"] += $line_total;
      }
    }

    usort($product_sales, function($a, $b) {
      return $b["quantity"] <=> $a["quantity"];
    });

    $top_products = array_slice($product_sales, 0, 5);

    $average_ticket = $orders_received > 0 ? $revenue_gross / $orders_received : 0;

    return new WP_REST_Response([
      "success" => true,
      "woocommerce_active" => true,
      "metrics" => [
        "revenue" => [
          "gross" => round($revenue_gross, 2),
          "net" => round($revenue_net, 2),
        ],
        "sales_summary" => [
          "completed_processing_orders" => $orders_received,
          "period" => [
            "date_from" => gmdate("Y-m-d", $date_from),
            "date_to" => gmdate("Y-m-d", $date_to),
          ],
        ],
        "top_products" => $top_products,
        "average_ticket" => round($average_ticket, 2),
        "orders_received" => $orders_received,
      ],
    ], 200);
  }
}