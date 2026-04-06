<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use DateTimeImmutable;
use WC_Order;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class WooCommerceDashboard
 *
 * Adds a REST API endpoint to return WooCommerce dashboard metrics.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class WooCommerceDashboard {

	/**
	 * REST namespace.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * REST route base.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private const REST_BASE = 'woocommerce-dashboard';

	/**
	 * Default period in days.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	private const DEFAULT_PERIOD_DAYS = 7;

	/**
	 * Initialize hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}


	/**
	 * Register REST routes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_BASE,
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_dashboard_metrics' ),
				'permission_callback' => array( $this, 'check_permissions' ),
				'args' => array(
					'date_from' => array(
						'required' => false,
						'type' => 'string',
						'sanitize_callback' => array( $this, 'sanitize_date_param' ),
					),
					'date_to' => array(
						'required' => false,
						'type' => 'string',
						'sanitize_callback' => array( $this, 'sanitize_date_param' ),
					),
				),
			)
		);
	}


	/**
	 * Check endpoint permissions.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request instance.
	 * @return bool|WP_Error
	 */
	public function check_permissions( WP_REST_Request $request ) {
		return RestPermissionChecker::check_permissions( $request, 'manage_woocommerce' );
	}


	/**
	 * Sanitize date parameter.
	 *
	 * @since 2.0.0
	 * @param mixed $date Raw date value.
	 * @return string
	 */
	public function sanitize_date_param( $date ) {
		return is_string( $date ) ? sanitize_text_field( $date ) : '';
	}


	/**
	 * Check if WooCommerce is active.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_woocommerce_active() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return false;
		}

		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		return is_plugin_active( 'woocommerce/woocommerce.php' );
	}


	/**
	 * Parse a date parameter into a timestamp.
	 *
	 * @since 2.0.0
	 * @param string $date Raw date.
	 * @param bool   $end_of_day Whether to use the end of the day.
	 * @return int|null
	 */
	private function parse_date_param( $date, $end_of_day = false ) {
		if ( empty( $date ) ) {
			return null;
		}

		$timestamp = strtotime( $date );

		if ( false === $timestamp ) {
			return null;
		}

		return $end_of_day
			? strtotime( '23:59:59', $timestamp )
			: strtotime( '00:00:00', $timestamp );
	}


	/**
	 * Get normalized period timestamps.
	 *
	 * @since 2.0.0
	 * @param string $date_from Raw start date.
	 * @param string $date_to Raw end date.
	 * @return array
	 */
	private function get_period_timestamps( $date_from, $date_to ) {
		$parsed_date_from = $this->parse_date_param( $date_from );
		$parsed_date_to   = $this->parse_date_param( $date_to, true );

		if ( empty( $parsed_date_from ) || empty( $parsed_date_to ) ) {
			$parsed_date_to   = current_time( 'timestamp' );
			$parsed_date_from = strtotime( '-' . self::DEFAULT_PERIOD_DAYS . ' days', $parsed_date_to );
		}

		if ( $parsed_date_from > $parsed_date_to ) {
			$temp             = $parsed_date_from;
			$parsed_date_from = $parsed_date_to;
			$parsed_date_to   = $temp;
		}

		return array(
			'date_from' => $parsed_date_from,
			'date_to'   => $parsed_date_to,
		);
	}


	/**
	 * Get chart interval from the selected period.
	 *
	 * @since 2.0.0
	 * @param int $date_from Start timestamp.
	 * @param int $date_to End timestamp.
	 * @return string
	 */
	private function get_chart_interval( $date_from, $date_to ) {
		$days = max( 1, (int) ceil( ( $date_to - $date_from ) / DAY_IN_SECONDS ) );

		if ( $days <= 31 ) {
			return 'day';
		}

		if ( $days <= 120 ) {
			return 'week';
		}

		return 'month';
	}


	/**
	 * Build empty chart buckets.
	 *
	 * @since 2.0.0
	 * @param int    $date_from Start timestamp.
	 * @param int    $date_to End timestamp.
	 * @param string $interval Bucket interval.
	 * @return array
	 */
	private function build_chart_buckets( $date_from, $date_to, $interval ) {
		$timezone = wp_timezone();
		$start    = ( new DateTimeImmutable( '@' . $date_from ) )->setTimezone( $timezone )->setTime( 0, 0, 0 );
		$end      = ( new DateTimeImmutable( '@' . $date_to ) )->setTimezone( $timezone )->setTime( 0, 0, 0 );

		if ( 'month' === $interval ) {
			$start = $start->modify( 'first day of this month' );
			$end   = $end->modify( 'first day of this month' );
		} elseif ( 'week' === $interval ) {
			$start = $start->modify( 'monday this week' );
			$end   = $end->modify( 'monday this week' );
		}

		$format       = 'Y-m-d';
		$label_format = 'd/m';
		$step         = '+1 day';

		if ( 'week' === $interval ) {
			$format       = 'o-W';
			$label_format = 'd/m';
			$step         = '+1 week';
		} elseif ( 'month' === $interval ) {
			$format       = 'Y-m';
			$label_format = 'm/Y';
			$step         = '+1 month';
		}

		$buckets = array();
		$cursor  = $start;

		while ( $cursor <= $end ) {
			$key = $cursor->format( $format );

			$buckets[ $key ] = array(
				'label' => $cursor->format( $label_format ),
				'gross' => 0,
				'net'   => 0,
			);

			$cursor = $cursor->modify( $step );
		}

		return $buckets;
	}


	/**
	 * Get bucket key for a given order date.
	 *
	 * @since 2.0.0
	 * @param object $date WC_DateTime object.
	 * @param string $interval Bucket interval.
	 * @return string
	 */
	private function get_bucket_key( $date, $interval ) {
		if ( 'month' === $interval ) {
			return $date->date( 'Y-m' );
		}

		if ( 'week' === $interval ) {
			return $date->date( 'o-W' );
		}

		return $date->date( 'Y-m-d' );
	}


	/**
	 * Get previous period timestamps.
	 *
	 * @since 2.0.0
	 * @param int $date_from Start timestamp.
	 * @param int $date_to End timestamp.
	 * @return array
	 */
	private function get_previous_period( $date_from, $date_to ) {
		$period_span         = max( DAY_IN_SECONDS, ( $date_to - $date_from ) + 1 );
		$previous_date_to    = $date_from - 1;
		$previous_date_from  = $previous_date_to - $period_span + 1;

		return array(
			'date_from' => $previous_date_from,
			'date_to'   => $previous_date_to,
		);
	}


	/**
	 * Build a unique customer key for counting unique customers.
	 *
	 * @since 2.0.0
	 * @param WC_Order $order Order object.
	 * @return string
	 */
	private function build_customer_key( WC_Order $order ) {
		$customer_id = (int) $order->get_customer_id();

		if ( $customer_id > 0 ) {
			return 'user:' . $customer_id;
		}

		$billing_email = sanitize_email( $order->get_billing_email() );

		if ( ! empty( $billing_email ) ) {
			return 'email:' . strtolower( $billing_email );
		}

		return 'guest-order:' . $order->get_id();
	}


	/**
	 * Calculate percentage change between current and previous values.
	 *
	 * @since 2.0.0
	 * @param float|int $current Current value.
	 * @param float|int $previous Previous value.
	 * @return float
	 */
	private function calculate_percentage_change( $current, $previous ) {
		$current  = (float) $current;
		$previous = (float) $previous;

		if ( $previous <= 0 ) {
			return $current > 0 ? 100.0 : 0.0;
		}

		return ( ( $current - $previous ) / $previous ) * 100;
	}


	/**
	 * Get order source details.
	 *
	 * @since 2.0.0
	 * @param WC_Order $order Order object.
	 * @return array
	 */
	private function get_order_source( WC_Order $order ) {
		$source_type = (string) $order->get_meta( '_wc_order_attribution_source_type', true );
		$utm_source  = (string) $order->get_meta( '_wc_order_attribution_utm_source', true );
		$referrer    = (string) $order->get_meta( '_wc_order_attribution_referrer', true );

		$icons = array(
			'utm'        => 'bx bx-megaphone',
			'organic'    => 'bx bx-leaf',
			'referral'   => 'bx bx-link-alt',
			'typein'     => 'bx bx-subdirectory-right',
			'mobile_app' => 'bx bx-mobile-alt',
			'admin'      => 'bx bx-laptop',
			'pos'        => 'bx bx-store-alt',
			'unknown'    => 'bx bx-shopping-bag',
		);

		$source_value = $utm_source;

		if ( 'referral' === $source_type && ! empty( $referrer ) ) {
			$referrer_host = wp_parse_url( $referrer, PHP_URL_HOST );
			$source_value  = is_string( $referrer_host ) && ! empty( $referrer_host ) ? $referrer_host : $referrer;
		}

		switch ( $source_type ) {
			case 'utm':
				$label = sprintf( __( 'Source: %s', 'woocommerce' ), ucfirst( trim( $source_value, '()' ) ) );
				break;

			case 'organic':
				$label = sprintf( __( 'Organic: %s', 'woocommerce' ), ucfirst( trim( $source_value, '()' ) ) );
				break;

			case 'referral':
				$label = sprintf( __( 'Referral: %s', 'woocommerce' ), ucfirst( trim( $source_value, '()' ) ) );
				break;

			case 'typein':
				$label = __( 'Direct', 'woocommerce' );
				break;

			case 'mobile_app':
				$label = __( 'Mobile app', 'woocommerce' );
				break;

			case 'admin':
				$label = __( 'Web admin', 'woocommerce' );
				break;

			case 'pos':
				$label = __( 'Point of Sale', 'woocommerce' );
				break;

			default:
				$created_via = $order->get_created_via();
				$fallback_map = array(
					'admin'    => __( 'Administrador', 'flexify-dashboard' ),
					'checkout' => __( 'Direto', 'flexify-dashboard' ),
					'store-api'=> __( 'Direto', 'flexify-dashboard' ),
					'rest-api' => __( 'API', 'flexify-dashboard' ),
				);

				$label       = isset( $fallback_map[ $created_via ] ) ? $fallback_map[ $created_via ] : ( $created_via ? ucfirst( $created_via ) : __( 'Loja', 'flexify-dashboard' ) );
				$source_type = $created_via ? $created_via : 'unknown';
				break;
		}

		return array(
			'label' => ! empty( $label ) ? $label : __( 'Unknown', 'woocommerce' ),
			'icon'  => isset( $icons[ $source_type ] ) ? $icons[ $source_type ] : $icons['unknown'],
			'type'  => ! empty( $source_type ) ? $source_type : 'unknown',
		);
	}


	/**
	 * Get order status data.
	 *
	 * @since 2.0.0
	 * @param WC_Order $order Order object.
	 * @return array
	 */
	private function get_order_status_data( WC_Order $order ) {
		$status = (string) $order->get_status();
		$label  = wc_get_order_status_name( $status );

		return array(
			'slug'  => sanitize_key( $status ),
			'label' => $label ? $label : __( 'Unknown', 'woocommerce' ),
		);
	}


	/**
	 * Get primary category name from product.
	 *
	 * @since 2.0.0
	 * @param int $product_id Product ID.
	 * @return string
	 */
	private function get_primary_category_name( $product_id ) {
		if ( empty( $product_id ) ) {
			return __( 'Sem categoria', 'flexify-dashboard' );
		}

		$terms = get_the_terms( $product_id, 'product_cat' );

		if ( empty( $terms ) || is_wp_error( $terms ) ) {
			return __( 'Sem categoria', 'flexify-dashboard' );
		}

		usort(
			$terms,
			function( $first_term, $second_term ) {
				$parent_compare = ( (int) $first_term->parent <=> (int) $second_term->parent );

				if ( 0 !== $parent_compare ) {
					return $parent_compare;
				}

				return strcasecmp( $first_term->name, $second_term->name );
			}
		);

		return isset( $terms[0]->name ) ? $terms[0]->name : __( 'Sem categoria', 'flexify-dashboard' );
	}


	/**
	 * Get primary product from order.
	 *
	 * @since 2.0.0
	 * @param WC_Order $order Order object.
	 * @return array
	 */
	private function get_primary_order_product( WC_Order $order ) {
		foreach ( $order->get_items() as $item ) {
			$product = $item->get_product();

			if ( ! $product ) {
				continue;
			}

			$product_id = $product->get_id();
			$image_id   = $product->get_image_id();

			return array(
				'id'       => $product_id,
				'name'     => $item->get_name(),
				'image'    => $image_id ? wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) : '',
				'category' => $this->get_primary_category_name( $product_id ),
			);
		}

		return array(
			'id'       => 0,
			'name'     => __( 'Pedido sem item', 'flexify-dashboard' ),
			'image'    => '',
			'category' => __( 'Sem categoria', 'flexify-dashboard' ),
		);
	}


	/**
	 * Get WooCommerce orders for a period.
	 *
	 * @since 2.0.0
	 * @param int $date_from Start timestamp.
	 * @param int $date_to End timestamp.
	 * @return array
	 */
	private function get_orders_by_period( $date_from, $date_to ) {
		return wc_get_orders(
			array(
				'limit'        => -1,
				'status'       => array( 'wc-completed', 'wc-processing' ),
				'date_created' => '>=' . gmdate( 'Y-m-d', $date_from ) . '...' . gmdate( 'Y-m-d', $date_to ),
				'return'       => 'objects',
			)
		);
	}


	/**
	 * Get customer display name from order.
	 *
	 * @since 2.0.0
	 * @param WC_Order $order Order object.
	 * @return string
	 */
	private function get_customer_name( WC_Order $order ) {
		$customer_name = trim( $order->get_formatted_billing_full_name() );

		if ( empty( $customer_name ) ) {
			$customer_name = $order->get_billing_company();
		}

		if ( empty( $customer_name ) ) {
			$customer_name = __( 'Cliente não identificado', 'flexify-dashboard' );
		}

		return $customer_name;
	}


	/**
	 * Sort product sales by quantity.
	 *
	 * @since 2.0.0
	 * @param array $product_sales Product sales list.
	 * @return array
	 */
	private function sort_product_sales( $product_sales ) {
		usort(
			$product_sales,
			function( $first_item, $second_item ) {
				return $second_item['quantity'] <=> $first_item['quantity'];
			}
		);

		return $product_sales;
	}


	/**
	 * Sort recent orders by creation date.
	 *
	 * @since 2.0.0
	 * @param array $recent_orders Orders list.
	 * @return array
	 */
	private function sort_recent_orders( $recent_orders ) {
		usort(
			$recent_orders,
			function( $first_order, $second_order ) {
				return strtotime( $second_order['created_at'] ? $second_order['created_at'] : '' ) <=> strtotime( $first_order['created_at'] ? $first_order['created_at'] : '' );
			}
		);

		return $recent_orders;
	}


	/**
	 * Prepare chart datasets from revenue buckets.
	 *
	 * @since 2.0.0
	 * @param array $revenue_chart Revenue chart buckets.
	 * @return array
	 */
	private function prepare_chart_datasets( $revenue_chart ) {
		$chart_labels = array_column( $revenue_chart, 'label' );

		$gross_dataset = array_map(
			function( $item ) {
				return round( $item['gross'], 2 );
			},
			$revenue_chart
		);

		$net_dataset = array_map(
			function( $item ) {
				return round( $item['net'], 2 );
			},
			$revenue_chart
		);

		return array(
			'labels' => $chart_labels,
			'gross'  => array_values( $gross_dataset ),
			'net'    => array_values( $net_dataset ),
		);
	}


	/**
	 * Get trend label based on percentage change.
	 *
	 * @since 2.0.0
	 * @param float $change_percentage Change percentage.
	 * @return string
	 */
	private function get_trend_label( $change_percentage ) {
		if ( $change_percentage < 0 ) {
			return 'down';
		}

		if ( $change_percentage > 0 ) {
			return 'up';
		}

		return 'neutral';
	}


	/**
	 * Get dashboard metrics response.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response
	 */
	public function get_dashboard_metrics( WP_REST_Request $request ) {
		if ( ! $this->is_woocommerce_active() ) {
			return new WP_REST_Response(
				array(
					'success'            => true,
					'woocommerce_active' => false,
					'metrics'            => array(),
				),
				200
			);
		}

		$period         = $this->get_period_timestamps( $request->get_param( 'date_from' ), $request->get_param( 'date_to' ) );
		$date_from      = $period['date_from'];
		$date_to        = $period['date_to'];
		$previous_period = $this->get_previous_period( $date_from, $date_to );

		$orders         = $this->get_orders_by_period( $date_from, $date_to );
		$previous_orders = $this->get_orders_by_period( $previous_period['date_from'], $previous_period['date_to'] );

		$revenue_net     = 0;
		$revenue_gross   = 0;
		$orders_received = 0;
		$customers       = array();
		$product_sales   = array();
		$recent_orders   = array();
		$chart_interval  = $this->get_chart_interval( $date_from, $date_to );
		$revenue_chart   = $this->build_chart_buckets( $date_from, $date_to, $chart_interval );
		$timezone        = wp_timezone();

		foreach ( $orders as $order ) {
			if ( ! ( $order instanceof WC_Order ) ) {
				continue;
			}

			++$orders_received;
			$customers[ $this->build_customer_key( $order ) ] = true;

			$order_total     = (float) $order->get_total();
			$order_discount  = (float) $order->get_total_discount();
			$order_source    = $this->get_order_source( $order );
			$order_status    = $this->get_order_status_data( $order );
			$primary_product = $this->get_primary_order_product( $order );
			$order_id        = $order->get_id();
			$customer_name   = $this->get_customer_name( $order );

			$revenue_net   += $order_total;
			$revenue_gross += ( $order_total + $order_discount );

			$created_at = $order->get_date_created();

			if ( $created_at ) {
				$bucket_key = $this->get_bucket_key( $created_at->setTimezone( $timezone ), $chart_interval );

				if ( isset( $revenue_chart[ $bucket_key ] ) ) {
					$revenue_chart[ $bucket_key ]['net']   += $order_total;
					$revenue_chart[ $bucket_key ]['gross'] += ( $order_total + $order_discount );
				}
			}

			$recent_orders[] = array(
				'id'            => $order_id,
				'customer_name' => $customer_name,
				'total'         => round( $order_total, 2 ),
				'edit_url'      => admin_url( 'admin.php?page=wc-orders&action=edit&id=' . $order_id ),
				'source'        => $order_source,
				'status'        => $order_status,
				'product'       => $primary_product,
				'category'      => $primary_product['category'],
				'created_at'    => $created_at ? $created_at->date( 'c' ) : null,
			);

			foreach ( $order->get_items() as $item ) {
				$product_id   = $item->get_product_id();
				$product_name = $item->get_name();
				$quantity     = (int) $item->get_quantity();
				$line_total   = (float) $item->get_total();

				if ( empty( $product_id ) ) {
					continue;
				}

				if ( ! isset( $product_sales[ $product_id ] ) ) {
					$image_id = get_post_thumbnail_id( $product_id );

					$product_sales[ $product_id ] = array(
						'product_id' => $product_id,
						'name'       => $product_name,
						'image'      => $image_id ? wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) : '',
						'quantity'   => 0,
						'revenue'    => 0,
						'edit_url'   => get_edit_post_link( $product_id, '' ),
					);
				}

				$product_sales[ $product_id ]['quantity'] += $quantity;
				$product_sales[ $product_id ]['revenue']  += $line_total;
			}
		}

		$product_sales  = $this->sort_product_sales( array_values( $product_sales ) );
		$recent_orders  = $this->sort_recent_orders( $recent_orders );
		$top_products   = array_slice( $product_sales, 0, 5 );
		$recent_orders  = array_slice( $recent_orders, 0, 5 );
		$average_ticket = $orders_received > 0 ? $revenue_gross / $orders_received : 0;
		$previous_customers = array();

		foreach ( $previous_orders as $previous_order ) {
			if ( ! ( $previous_order instanceof WC_Order ) ) {
				continue;
			}

			$previous_customers[ $this->build_customer_key( $previous_order ) ] = true;
		}

		$customers_count          = count( $customers );
		$previous_customers_count = count( $previous_customers );
		$customers_change         = $this->calculate_percentage_change( $customers_count, $previous_customers_count );
		$chart_datasets           = $this->prepare_chart_datasets( $revenue_chart );

		return new WP_REST_Response(
			array(
				'success'            => true,
				'woocommerce_active' => true,
				'metrics'            => array(
					'revenue' => array(
						'gross' => round( $revenue_gross, 2 ),
						'net'   => round( $revenue_net, 2 ),
						'chart_data' => array(
							'interval' => $chart_interval,
							'labels'   => $chart_datasets['labels'],
							'datasets' => array(
								array(
									'label'       => __( 'Faturamento bruto', 'flexify-dashboard' ),
									'data'        => $chart_datasets['gross'],
									'borderColor' => '#339AF0',
								),
								array(
									'label'       => __( 'Faturamento líquido', 'flexify-dashboard' ),
									'data'        => $chart_datasets['net'],
									'borderColor' => '#20C997',
								),
							),
						),
					),
					'sales_summary' => array(
						'completed_processing_orders' => $orders_received,
						'period' => array(
							'date_from' => gmdate( 'Y-m-d', $date_from ),
							'date_to'   => gmdate( 'Y-m-d', $date_to ),
						),
					),
					'top_products'    => $top_products,
					'recent_orders'   => $recent_orders,
					'average_ticket'  => round( $average_ticket, 2 ),
					'orders_received' => $orders_received,
					'customers'       => array(
						'total'             => $customers_count,
						'previous_total'    => $previous_customers_count,
						'change_percentage' => round( $customers_change, 2 ),
						'trend'             => $this->get_trend_label( $customers_change ),
					),
					'currency'        => get_woocommerce_currency(),
				),
			),
			200
		);
	}
}