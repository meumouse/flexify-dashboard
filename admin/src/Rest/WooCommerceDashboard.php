<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WC_Order;
use WP_REST_Response;

defined("ABSPATH") || exit();

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

  private function get_chart_interval($date_from, $date_to)
  {
    $days = max(1, (int) ceil(($date_to - $date_from) / DAY_IN_SECONDS));

    if ($days <= 31) {
      return "day";
    }

    if ($days <= 120) {
      return "week";
    }

    return "month";
  }

  private function build_chart_buckets($date_from, $date_to, $interval)
  {
    $timezone = wp_timezone();
    $start = (new \DateTimeImmutable("@" . $date_from))->setTimezone($timezone)->setTime(0, 0, 0);
    $end = (new \DateTimeImmutable("@" . $date_to))->setTimezone($timezone)->setTime(0, 0, 0);

    if ($interval === "month") {
      $start = $start->modify("first day of this month");
      $end = $end->modify("first day of this month");
    } elseif ($interval === "week") {
      $start = $start->modify("monday this week");
      $end = $end->modify("monday this week");
    }

    $format = "Y-m-d";
    $label_format = "d/m";
    $step = "+1 day";

    if ($interval === "week") {
      $format = "o-W";
      $label_format = "d/m";
      $step = "+1 week";
    } elseif ($interval === "month") {
      $format = "Y-m";
      $label_format = "m/Y";
      $step = "+1 month";
    }

    $buckets = [];
    $cursor = $start;

    while ($cursor <= $end) {
      $key = $cursor->format($format);

      $buckets[$key] = [
        "label" => $cursor->format($label_format),
        "gross" => 0,
        "net" => 0,
      ];

      $cursor = $cursor->modify($step);
    }

    return $buckets;
  }

  private function get_bucket_key($date, $interval)
  {
    if ($interval === "month") {
      return $date->date("Y-m");
    }

    if ($interval === "week") {
      return $date->date("o-W");
    }

    return $date->date("Y-m-d");
  }

  private function get_order_source($order)
  {
    $created_via = $order->get_created_via();

    $map = [
      "admin" => [
        "label" => __("Administrador", "flexify-dashboard"),
        "icon" => "bx bx-laptop",
      ],
      "checkout" => [
        "label" => __("Direto", "flexify-dashboard"),
        "icon" => "bx bx-subdirectory-right",
      ],
      "store-api" => [
        "label" => __("Direto", "flexify-dashboard"),
        "icon" => "bx bx-subdirectory-right",
      ],
      "rest-api" => [
        "label" => __("API", "flexify-dashboard"),
        "icon" => "bx bx-code-alt",
      ],
    ];

    if (isset($map[$created_via])) {
      return $map[$created_via];
    }

    return [
      "label" => $created_via ? ucfirst($created_via) : __("Loja", "flexify-dashboard"),
      "icon" => "bx bx-shopping-bag",
    ];
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
    $recent_orders = [];
    $chart_interval = $this->get_chart_interval($date_from, $date_to);
    $revenue_chart = $this->build_chart_buckets($date_from, $date_to, $chart_interval);
    $timezone = wp_timezone();

    foreach ($orders as $order) {
      if (!($order instanceof WC_Order)) {
        continue;
      }

      $orders_received++;

      $order_total = (float) $order->get_total();
      $order_discount = (float) $order->get_total_discount();
      $order_source = $this->get_order_source($order);
      $order_id = $order->get_id();
      $customer_name = trim($order->get_formatted_billing_full_name());

      if (empty($customer_name)) {
        $customer_name = $order->get_billing_company();
      }

      if (empty($customer_name)) {
        $customer_name = __("Cliente não identificado", "flexify-dashboard");
      }

      $revenue_net += $order_total;
      $revenue_gross += ($order_total + $order_discount);

      $created_at = $order->get_date_created();

      if ($created_at) {
        $bucket_key = $this->get_bucket_key($created_at->setTimezone($timezone), $chart_interval);

        if (isset($revenue_chart[$bucket_key])) {
          $revenue_chart[$bucket_key]["net"] += $order_total;
          $revenue_chart[$bucket_key]["gross"] += ($order_total + $order_discount);
        }
      }

      $recent_orders[] = [
        "id" => $order_id,
        "customer_name" => $customer_name,
        "total" => round($order_total, 2),
        "edit_url" => admin_url("admin.php?page=wc-orders&action=edit&id=" . $order_id),
        "source" => $order_source,
        "created_at" => $created_at ? $created_at->date("c") : null,
      ];

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
            "edit_url" => get_edit_post_link($product_id, ""),
          ];
        }

        $product_sales[$product_id]["quantity"] += $quantity;
        $product_sales[$product_id]["revenue"] += $line_total;
      }
    }

    usort($product_sales, function($a, $b) {
      return $b["quantity"] <=> $a["quantity"];
    });

    usort($recent_orders, function($a, $b) {
      return strtotime($b["created_at"] ?? "") <=> strtotime($a["created_at"] ?? "");
    });

    $top_products = array_slice($product_sales, 0, 5);
    $recent_orders = array_slice($recent_orders, 0, 5);
    $average_ticket = $orders_received > 0 ? $revenue_gross / $orders_received : 0;

    $chart_labels = array_column($revenue_chart, "label");
    $gross_dataset = array_map(function($item) {
      return round($item["gross"], 2);
    }, $revenue_chart);
    $net_dataset = array_map(function($item) {
      return round($item["net"], 2);
    }, $revenue_chart);

    return new WP_REST_Response([
      "success" => true,
      "woocommerce_active" => true,
      "metrics" => [
        "revenue" => [
          "gross" => round($revenue_gross, 2),
          "net" => round($revenue_net, 2),
          "chart_data" => [
            "interval" => $chart_interval,
            "labels" => $chart_labels,
            "datasets" => [
              [
                "label" => __("Faturamento bruto", "flexify-dashboard"),
                "data" => array_values($gross_dataset),
                "borderColor" => "#339AF0",
              ],
              [
                "label" => __("Faturamento líquido", "flexify-dashboard"),
                "data" => array_values($net_dataset),
                "borderColor" => "#20C997",
              ],
            ],
          ],
        ],
        "sales_summary" => [
          "completed_processing_orders" => $orders_received,
          "period" => [
            "date_from" => gmdate("Y-m-d", $date_from),
            "date_to" => gmdate("Y-m-d", $date_to),
          ],
        ],
        "top_products" => $top_products,
        "recent_orders" => $recent_orders,
        "average_ticket" => round($average_ticket, 2),
        "orders_received" => $orders_received,
        "currency" => get_woocommerce_currency(),
      ],
    ], 200);
  }
}
