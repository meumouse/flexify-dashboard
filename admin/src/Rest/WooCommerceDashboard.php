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

  private function get_previous_period($date_from, $date_to)
  {
    $period_span = max(DAY_IN_SECONDS, ($date_to - $date_from) + 1);
    $previous_date_to = $date_from - 1;
    $previous_date_from = $previous_date_to - $period_span + 1;

    return [
      "date_from" => $previous_date_from,
      "date_to" => $previous_date_to,
    ];
  }

  private function build_customer_key($order)
  {
    $customer_id = (int) $order->get_customer_id();

    if ($customer_id > 0) {
      return "user:" . $customer_id;
    }

    $billing_email = sanitize_email($order->get_billing_email());

    if (!empty($billing_email)) {
      return "email:" . strtolower($billing_email);
    }

    return "guest-order:" . $order->get_id();
  }

  private function calculate_percentage_change($current, $previous)
  {
    $current = (float) $current;
    $previous = (float) $previous;

    if ($previous <= 0) {
      return $current > 0 ? 100.0 : 0.0;
    }

    return (($current - $previous) / $previous) * 100;
  }

  private function get_order_source($order)
  {
    $source_type = (string) $order->get_meta("_wc_order_attribution_source_type", true);
    $utm_source = (string) $order->get_meta("_wc_order_attribution_utm_source", true);
    $referrer = (string) $order->get_meta("_wc_order_attribution_referrer", true);

    $icons = [
      "utm" => "bx bx-megaphone",
      "organic" => "bx bx-leaf",
      "referral" => "bx bx-link-alt",
      "typein" => "bx bx-subdirectory-right",
      "mobile_app" => "bx bx-mobile-alt",
      "admin" => "bx bx-laptop",
      "pos" => "bx bx-store-alt",
      "unknown" => "bx bx-shopping-bag",
    ];

    $source_value = $utm_source;

    if ($source_type === "referral" && !empty($referrer)) {
      $referrer_host = wp_parse_url($referrer, PHP_URL_HOST);
      $source_value = is_string($referrer_host) && !empty($referrer_host) ? $referrer_host : $referrer;
    }

    switch ($source_type) {
      case "utm":
        $label = sprintf(__("Source: %s", "woocommerce"), ucfirst(trim($source_value, "()")));
        break;
      case "organic":
        $label = sprintf(__("Organic: %s", "woocommerce"), ucfirst(trim($source_value, "()")));
        break;
      case "referral":
        $label = sprintf(__("Referral: %s", "woocommerce"), ucfirst(trim($source_value, "()")));
        break;
      case "typein":
        $label = __("Direct", "woocommerce");
        break;
      case "mobile_app":
        $label = __("Mobile app", "woocommerce");
        break;
      case "admin":
        $label = __("Web admin", "woocommerce");
        break;
      case "pos":
        $label = __("Point of Sale", "woocommerce");
        break;
      default:
        $created_via = $order->get_created_via();
        $fallback_map = [
          "admin" => __("Administrador", "flexify-dashboard"),
          "checkout" => __("Direto", "flexify-dashboard"),
          "store-api" => __("Direto", "flexify-dashboard"),
          "rest-api" => __("API", "flexify-dashboard"),
        ];

        $label = $fallback_map[$created_via] ?? ($created_via ? ucfirst($created_via) : __("Loja", "flexify-dashboard"));
        $source_type = $created_via ?: "unknown";
        break;
    }

    return [
      "label" => $label ?: __("Unknown", "woocommerce"),
      "icon" => $icons[$source_type] ?? $icons["unknown"],
      "type" => $source_type ?: "unknown",
    ];
  }

  private function get_order_status_data($order)
  {
    $status = (string) $order->get_status();
    $label = wc_get_order_status_name($status);

    return [
      "slug" => sanitize_key($status),
      "label" => $label ?: __("Unknown", "woocommerce"),
    ];
  }

  private function get_primary_category_name($product_id)
  {
    if (!$product_id) {
      return __("Sem categoria", "flexify-dashboard");
    }

    $terms = get_the_terms($product_id, "product_cat");

    if (empty($terms) || is_wp_error($terms)) {
      return __("Sem categoria", "flexify-dashboard");
    }

    usort($terms, function($a, $b) {
      return ((int) $a->parent <=> (int) $b->parent) ?: strcasecmp($a->name, $b->name);
    });

    return $terms[0]->name ?? __("Sem categoria", "flexify-dashboard");
  }

  private function get_primary_order_product($order)
  {
    foreach ($order->get_items() as $item) {
      $product = $item->get_product();

      if (!$product) {
        continue;
      }

      $product_id = $product->get_id();
      $image_id = $product->get_image_id();

      return [
        "id" => $product_id,
        "name" => $item->get_name(),
        "image" => $image_id ? wp_get_attachment_image_url($image_id, "woocommerce_thumbnail") : "",
        "category" => $this->get_primary_category_name($product_id),
      ];
    }

    return [
      "id" => 0,
      "name" => __("Pedido sem item", "flexify-dashboard"),
      "image" => "",
      "category" => __("Sem categoria", "flexify-dashboard"),
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
    $previous_period = $this->get_previous_period($date_from, $date_to);
    $previous_orders = wc_get_orders([
      "limit" => -1,
      "status" => ["wc-completed", "wc-processing"],
      "date_created" => ">=" . gmdate("Y-m-d", $previous_period["date_from"]) . "..." . gmdate("Y-m-d", $previous_period["date_to"]),
      "return" => "objects",
    ]);

    $revenue_net = 0;
    $revenue_gross = 0;
    $orders_received = 0;
    $customers = [];
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
      $customers[$this->build_customer_key($order)] = true;

      $order_total = (float) $order->get_total();
      $order_discount = (float) $order->get_total_discount();
      $order_source = $this->get_order_source($order);
      $order_status = $this->get_order_status_data($order);
      $primary_product = $this->get_primary_order_product($order);
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
        "status" => $order_status,
        "product" => $primary_product,
        "category" => $primary_product["category"],
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
          $image_id = get_post_thumbnail_id($product_id);

          $product_sales[$product_id] = [
            "product_id" => $product_id,
            "name" => $product_name,
            "image" => $image_id ? wp_get_attachment_image_url($image_id, "woocommerce_thumbnail") : "",
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
    $previous_customers = [];

    foreach ($previous_orders as $previous_order) {
      if (!($previous_order instanceof WC_Order)) {
        continue;
      }

      $previous_customers[$this->build_customer_key($previous_order)] = true;
    }

    $customers_count = count($customers);
    $previous_customers_count = count($previous_customers);
    $customers_change = $this->calculate_percentage_change($customers_count, $previous_customers_count);

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
        "customers" => [
          "total" => $customers_count,
          "previous_total" => $previous_customers_count,
          "change_percentage" => round($customers_change, 2),
          "trend" => $customers_change < 0 ? "down" : ($customers_change > 0 ? "up" : "neutral"),
        ],
        "currency" => get_woocommerce_currency(),
      ],
    ], 200);
  }
}
