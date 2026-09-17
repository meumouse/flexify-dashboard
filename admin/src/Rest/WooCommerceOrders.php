<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce;

use WC_Order;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class WooCommerceOrders
 *
 * REST endpoints that complement `wc/v3/orders` for the orders page:
 * counters, bulk actions, order context and order actions. Works with both
 * HPOS and the legacy posts storage because it only uses WooCommerce CRUD APIs.
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class WooCommerceOrders {

	/**
	 * REST namespace.
	 *
	 * @since 3.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Maximum number of orders processed by a bulk request.
	 *
	 * @since 3.0.0
	 * @var int
	 */
	const BULK_LIMIT = 200;

	/**
	 * Maximum number of orders summed when WooCommerce Analytics is unavailable.
	 *
	 * @since 3.0.0
	 * @var int
	 */
	const REVENUE_FALLBACK_LIMIT = 2000;


	/**
	 * Constructor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		// Runs after WooCommerce finished building the orders query (status, customer, search), so nothing overrides these filters.
		add_filter( 'woocommerce_rest_orders_prepare_object_query', array( $this, 'filter_orders_query' ), 10, 2 );
	}


	/**
	 * Add the orders page filters (payment method, creation channel and origin) to `wc/v3/orders`.
	 *
	 * The parameters are prefixed with `fd_` so they never collide with WooCommerce arguments.
	 *
	 * @since 3.0.0
	 * @param array $args Query arguments.
	 * @param WP_REST_Request $request Request.
	 * @return array
	 */
	public function filter_orders_query( $args, $request ) {
		$payment_method = sanitize_text_field( (string) $request->get_param( 'fd_payment_method' ) );
		$created_via = sanitize_key( (string) $request->get_param( 'fd_created_via' ) );
		$origin = sanitize_key( (string) $request->get_param( 'fd_origin' ) );

		if ( '' === $payment_method && '' === $created_via && '' === $origin ) {
			return $args;
		}

		$meta_query = isset( $args['meta_query'] ) && is_array( $args['meta_query'] ) ? $args['meta_query'] : array(); // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
		$hpos = WooCommerce::is_hpos_enabled();

		if ( '' !== $payment_method ) {
			if ( $hpos ) {
				$args['payment_method'] = $payment_method;
			} else {
				$meta_query[] = array(
					'key' => '_payment_method',
					'value' => $payment_method,
				);
			}
		}

		if ( '' !== $created_via ) {
			if ( $hpos ) {
				$args['created_via'] = $created_via;
			} else {
				$meta_query[] = array(
					'key' => '_created_via',
					'value' => $created_via,
				);
			}
		}

		if ( '' !== $origin ) {
			$meta_query[] = array(
				'key' => '_wc_order_attribution_source_type',
				'value' => $origin,
			);
		}

		if ( ! empty( $meta_query ) ) {
			$args['meta_query'] = $meta_query; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
		}

		return $args;
	}


	/**
	 * Register REST routes.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/woocommerce/orders/summary',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_summary' ),
				'permission_callback' => array( $this, 'can_edit_orders' ),
				'args' => array(
					'date_from' => array(
						'type' => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'date_to' => array(
						'type' => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/woocommerce/orders/bulk',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'bulk_action' ),
				'permission_callback' => array( $this, 'can_edit_orders' ),
				'args' => array(
					'ids' => array(
						'required' => true,
						'type' => 'array',
						'items' => array( 'type' => 'integer' ),
					),
					'action' => array(
						'required' => true,
						'type' => 'string',
						'enum' => array( 'status', 'trash', 'restore', 'delete' ),
					),
					'value' => array(
						'type' => 'string',
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/woocommerce/orders/(?P<id>\d+)/context',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_order_context' ),
				'permission_callback' => array( $this, 'can_edit_orders' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/woocommerce/orders/(?P<id>\d+)/action',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'run_order_action' ),
				'permission_callback' => array( $this, 'can_edit_orders' ),
				'args' => array(
					'action' => array(
						'required' => true,
						'type' => 'string',
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);
	}


	/**
	 * Permission callback.
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return bool|WP_Error
	 */
	public function can_edit_orders( WP_REST_Request $request ) {
		if ( ! WooCommerce::is_active() ) {
			return new WP_Error( 'woocommerce_inactive', __( 'WooCommerce is not active.', 'flexify-dashboard' ), array( 'status' => 400 ) );
		}

		return RestPermissionChecker::check_permissions( $request, 'edit_shop_orders' );
	}


	/**
	 * Get order counters by status and revenue for a period.
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function get_summary( WP_REST_Request $request ) {
		$counts = array();
		$total = 0;

		foreach ( WooCommerce::get_order_statuses() as $status ) {
			$count = function_exists( 'wc_orders_count' ) ? (int) wc_orders_count( $status['value'] ) : 0;
			$counts[ $status['value'] ] = $count;

			if ( ! in_array( $status['value'], array( 'trash', 'checkout-draft' ), true ) ) {
				$total += $count;
			}
		}

		// Trash is not a registered order status, but the list shows a tab for it.
		if ( function_exists( 'wc_orders_count' ) ) {
			$counts['trash'] = (int) wc_orders_count( 'trash' );
		}

		$date_to = $this->parse_date( $request->get_param( 'date_to' ), true );
		$date_from = $this->parse_date( $request->get_param( 'date_from' ) );

		if ( ! $date_to ) {
			$date_to = current_time( 'timestamp', true );
		}

		if ( ! $date_from ) {
			$date_from = $date_to - 30 * DAY_IN_SECONDS;
		}

		return new WP_REST_Response(
			array(
				'total' => $total,
				'counts' => $counts,
				'period' => array_merge(
					array(
						'date_from' => gmdate( 'c', $date_from ),
						'date_to' => gmdate( 'c', $date_to ),
					),
					$this->get_period_revenue( $date_from, $date_to )
				),
			),
			200
		);
	}


	/**
	 * Parse a date into a UTC timestamp.
	 *
	 * @since 3.0.0
	 * @param mixed $date Raw date (Y-m-d or ISO 8601).
	 * @param bool $end_of_day Use the end of the day when only a date is given.
	 * @return int|null
	 */
	private function parse_date( $date, $end_of_day = false ) {
		if ( empty( $date ) || ! is_string( $date ) ) {
			return null;
		}

		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			$date .= $end_of_day ? ' 23:59:59' : ' 00:00:00';

			$datetime = date_create_immutable( $date, wp_timezone() );

			return $datetime ? $datetime->getTimestamp() : null;
		}

		$timestamp = strtotime( $date );

		return false === $timestamp ? null : $timestamp;
	}


	/**
	 * Calculate revenue and orders for a period.
	 *
	 * Uses WooCommerce Analytics when available and falls back to summing orders.
	 *
	 * @since 3.0.0
	 * @param int $date_from Start timestamp (UTC).
	 * @param int $date_to End timestamp (UTC).
	 * @return array
	 */
	private function get_period_revenue( $date_from, $date_to ) {
		$cache_key = 'fd_orders_revenue_' . md5( $date_from . '|' . $date_to );
		$cached = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$result = null;

		if ( class_exists( '\Automattic\WooCommerce\Admin\API\Reports\Revenue\Query' ) ) {
			try {
				$query = new \Automattic\WooCommerce\Admin\API\Reports\Revenue\Query(
					array(
						'before' => wp_date( 'Y-m-d\TH:i:s', $date_to ),
						'after' => wp_date( 'Y-m-d\TH:i:s', $date_from ),
						'interval' => 'year',
						'fields' => array( 'net_revenue', 'total_sales', 'orders_count' ),
					)
				);

				$data = $query->get_data();

				if ( isset( $data->totals ) ) {
					$totals = (array) $data->totals;

					$result = array(
						'net_revenue' => (float) ( $totals['net_revenue'] ?? 0 ),
						'total_sales' => (float) ( $totals['total_sales'] ?? 0 ),
						'orders_count' => (int) ( $totals['orders_count'] ?? 0 ),
						'source' => 'analytics',
					);

					// Stores that never imported historical data into Analytics report zero; sum the orders instead.
					if ( 0 === $result['orders_count'] ) {
						$result = null;
					}
				}
			} catch ( \Throwable $exception ) {
				$result = null;
			}
		}

		if ( null === $result ) {
			$orders = wc_get_orders(
				array(
					'status' => array( 'wc-completed', 'wc-processing', 'wc-on-hold' ),
					'date_created' => $date_from . '...' . $date_to,
					'limit' => self::REVENUE_FALLBACK_LIMIT,
					'type' => 'shop_order',
				)
			);

			$total_sales = 0;
			$refunded = 0;

			foreach ( $orders as $order ) {
				if ( ! $order instanceof WC_Order ) {
					continue;
				}

				$total_sales += (float) $order->get_total();
				$refunded += (float) $order->get_total_refunded();
			}

			$result = array(
				'net_revenue' => $total_sales - $refunded,
				'total_sales' => $total_sales,
				'orders_count' => count( $orders ),
				'source' => 'orders',
			);
		}

		set_transient( $cache_key, $result, 5 * MINUTE_IN_SECONDS );

		return $result;
	}


	/**
	 * Run a bulk action on orders.
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function bulk_action( WP_REST_Request $request ) {
		$ids = array_slice( array_unique( array_filter( array_map( 'absint', (array) $request->get_param( 'ids' ) ) ) ), 0, self::BULK_LIMIT );
		$action = sanitize_key( (string) $request->get_param( 'action' ) );
		$value = sanitize_key( (string) $request->get_param( 'value' ) );

		if ( empty( $ids ) ) {
			return new WP_Error( 'no_orders', __( 'No orders selected.', 'flexify-dashboard' ), array( 'status' => 400 ) );
		}

		if ( 'status' === $action ) {
			$valid = wp_list_pluck( WooCommerce::get_order_statuses(), 'value' );

			if ( ! in_array( $value, $valid, true ) ) {
				return new WP_Error( 'invalid_status', __( 'Invalid order status.', 'flexify-dashboard' ), array( 'status' => 400 ) );
			}
		}

		$updated = array();
		$failed = array();

		foreach ( $ids as $order_id ) {
			$order = wc_get_order( $order_id );

			if ( ! $order instanceof WC_Order ) {
				$failed[] = array(
					'id' => $order_id,
					'message' => __( 'Invalid order.', 'flexify-dashboard' ),
				);
				continue;
			}

			$result = $this->apply_bulk_action( $order, $action, $value );

			if ( is_wp_error( $result ) ) {
				$failed[] = array(
					'id' => $order_id,
					'message' => $result->get_error_message(),
				);
				continue;
			}

			$updated[] = $order_id;
		}

		return new WP_REST_Response(
			array(
				'updated' => $updated,
				'failed' => $failed,
			),
			200
		);
	}


	/**
	 * Apply a bulk action to a single order.
	 *
	 * @since 3.0.0
	 * @param WC_Order $order Order.
	 * @param string $action Action key.
	 * @param string $value Action value.
	 * @return true|WP_Error
	 */
	private function apply_bulk_action( WC_Order $order, $action, $value ) {
		$order_id = $order->get_id();

		switch ( $action ) {
			case 'status':
				if ( ! current_user_can( 'edit_shop_order', $order_id ) ) {
					return new WP_Error( 'forbidden', __( 'You are not allowed to edit this order.', 'flexify-dashboard' ) );
				}

				$order->update_status( $value, __( 'Order status changed by bulk edit:', 'woocommerce' ), true );

				/** This action is documented in woocommerce/includes/admin/list-tables/class-wc-admin-list-table-orders.php */
				do_action( 'woocommerce_order_edit_status', $order_id, $value );

				return true;

			case 'trash':
			case 'delete':
				if ( ! current_user_can( 'delete_shop_order', $order_id ) ) {
					return new WP_Error( 'forbidden', __( 'You are not allowed to delete this order.', 'flexify-dashboard' ) );
				}

				$order->delete( 'delete' === $action );

				return true;

			case 'restore':
				if ( ! current_user_can( 'edit_shop_order', $order_id ) ) {
					return new WP_Error( 'forbidden', __( 'You are not allowed to edit this order.', 'flexify-dashboard' ) );
				}

				$restored = $this->untrash_order( $order );

				return $restored ? true : new WP_Error( 'restore_failed', __( 'Could not restore the order.', 'flexify-dashboard' ) );
		}

		return new WP_Error( 'invalid_action', __( 'Invalid action.', 'flexify-dashboard' ) );
	}


	/**
	 * Restore an order from the trash (HPOS and legacy).
	 *
	 * @since 3.0.0
	 * @param WC_Order $order Order.
	 * @return bool
	 */
	private function untrash_order( WC_Order $order ) {
		if ( WooCommerce::is_hpos_enabled() ) {
			$data_store = $order->get_data_store();

			// WC_Data_Store forwards calls through __call, so method_exists() cannot be used here.
			if ( is_object( $data_store ) && is_callable( array( $data_store, 'untrash_order' ) ) ) {
				return (bool) $data_store->untrash_order( $order );
			}
		}

		return (bool) wp_untrash_post( $order->get_id() );
	}


	/**
	 * Get extra order data not provided by wc/v3.
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_order_context( WP_REST_Request $request ) {
		$order = wc_get_order( absint( $request->get_param( 'id' ) ) );

		if ( ! $order instanceof WC_Order || ! current_user_can( 'edit_shop_order', $order->get_id() ) ) {
			return new WP_Error( 'invalid_order', __( 'Invalid order.', 'flexify-dashboard' ), array( 'status' => 404 ) );
		}

		$customer_id = (int) $order->get_customer_id();
		$gateway = wc_get_payment_gateway_by_order( $order );
		$items = array();

		foreach ( $order->get_items() as $item_id => $item ) {
			$product = is_callable( array( $item, 'get_product' ) ) ? $item->get_product() : null;
			$image_id = $product ? $product->get_image_id() : 0;

			$items[ $item_id ] = array(
				'image' => $image_id ? wp_get_attachment_image_url( $image_id, 'thumbnail' ) : '',
				'sku' => $product ? $product->get_sku() : '',
				'edit_url' => $product ? get_edit_post_link( $product->get_parent_id() ? $product->get_parent_id() : $product->get_id(), 'raw' ) : '',
				'meta' => $this->get_item_meta( $item ),
				'refunded_qty' => absint( $order->get_qty_refunded_for_item( $item_id ) ),
				'refunded_total' => (float) $order->get_total_refunded_for_item( $item_id ),
			);
		}

		$context = array(
			'id' => $order->get_id(),
			'native_edit_url' => WooCommerce::get_native_order_edit_url( $order->get_id() ),
			'customer' => array(
				'id' => $customer_id,
				'orders_count' => $customer_id ? wc_get_customer_order_count( $customer_id ) : $this->count_guest_orders( $order->get_billing_email() ),
				'total_spent' => $customer_id ? (float) wc_get_customer_total_spent( $customer_id ) : null,
				'avatar' => get_avatar_url( $customer_id ? $customer_id : $order->get_billing_email(), array( 'size' => 96 ) ),
				'profile_url' => $customer_id ? get_edit_user_link( $customer_id ) : '',
				'ip_address' => $order->get_customer_ip_address(),
				'user_agent' => $order->get_customer_user_agent(),
			),
			'payment' => array(
				'title' => $order->get_payment_method_title(),
				'transaction_id' => $order->get_transaction_id(),
				'transaction_url' => $gateway && method_exists( $gateway, 'get_transaction_url' ) ? $gateway->get_transaction_url( $order ) : '',
				'supports_refunds' => $gateway ? $gateway->supports( 'refunds' ) : false,
				'date_paid' => $order->get_date_paid() ? $order->get_date_paid()->date( 'c' ) : null,
			),
			'attribution' => $this->get_attribution( $order ),
			'created_via' => $order->get_created_via(),
			'actions' => $this->get_order_actions( $order ),
			'items' => $items,
			'formatted_billing_address' => $order->get_formatted_billing_address(),
			'formatted_shipping_address' => $order->get_formatted_shipping_address(),
			'shipping_lines' => array_values(
				array_map(
					function( $shipping ) {
						return array(
							'method_title' => $shipping->get_method_title(),
							'total' => (float) $shipping->get_total(),
						);
					},
					$order->get_shipping_methods()
				)
			),
			'custom_fields' => $this->get_custom_fields( $order ),
		);

		/**
		 * Filter the extra order context returned to the order details page.
		 *
		 * Extensions can add panels data (e.g. invoices, shipping labels, tracking).
		 *
		 * @since 3.0.0
		 * @param array $context Context data.
		 * @param WC_Order $order Order.
		 */
		$context = apply_filters( 'flexify-dashboard/woocommerce/order-context', $context, $order );

		return new WP_REST_Response( $context, 200 );
	}


	/**
	 * Count previous orders placed with the same billing email.
	 *
	 * @since 3.0.0
	 * @param string $email Billing email.
	 * @return int
	 */
	private function count_guest_orders( $email ) {
		if ( empty( $email ) ) {
			return 0;
		}

		$result = wc_get_orders(
			array(
				'billing_email' => $email,
				'limit' => 1,
				'paginate' => true,
				'return' => 'ids',
			)
		);

		return is_object( $result ) && isset( $result->total ) ? (int) $result->total : 0;
	}


	/**
	 * Get visible meta of an order item.
	 *
	 * @since 3.0.0
	 * @param \WC_Order_Item $item Order item.
	 * @return array
	 */
	private function get_item_meta( $item ) {
		$meta = array();

		if ( ! is_callable( array( $item, 'get_formatted_meta_data' ) ) ) {
			return $meta;
		}

		foreach ( $item->get_formatted_meta_data( '_', true ) as $meta_item ) {
			$meta[] = array(
				'key' => wp_strip_all_tags( $meta_item->display_key ),
				'value' => wp_strip_all_tags( $meta_item->display_value ),
			);
		}

		return $meta;
	}


	/**
	 * Get public custom fields (meta keys not starting with an underscore) for read-only display.
	 *
	 * @since 3.0.0
	 * @param WC_Order $order Order.
	 * @return array
	 */
	private function get_custom_fields( WC_Order $order ) {
		$fields = array();

		foreach ( $order->get_meta_data() as $meta ) {
			$data = $meta->get_data();
			$key = isset( $data['key'] ) ? (string) $data['key'] : '';

			if ( '' === $key || '_' === $key[0] || is_protected_meta( $key, 'post' ) ) {
				continue;
			}

			$value = $data['value'] ?? '';
			$value = is_scalar( $value ) ? (string) $value : wp_json_encode( $value );

			$fields[] = array(
				'key' => wp_strip_all_tags( $key ),
				'value' => wp_html_excerpt( wp_strip_all_tags( (string) $value ), 500, '…' ),
			);

			if ( count( $fields ) >= 50 ) {
				break;
			}
		}

		/**
		 * Filter the custom fields shown on the order details page.
		 *
		 * @since 3.0.0
		 * @param array $fields List of { key, value }.
		 * @param WC_Order $order Order.
		 */
		return apply_filters( 'flexify-dashboard/woocommerce/order-custom-fields', $fields, $order );
	}


	/**
	 * Get order attribution (origin) information.
	 *
	 * @since 3.0.0
	 * @param WC_Order $order Order.
	 * @return array
	 */
	private function get_attribution( WC_Order $order ) {
		$source_type = (string) $order->get_meta( '_wc_order_attribution_source_type' );
		$utm_source = (string) $order->get_meta( '_wc_order_attribution_utm_source' );
		$referrer = (string) $order->get_meta( '_wc_order_attribution_referrer' );
		$device = (string) $order->get_meta( '_wc_order_attribution_device_type' );

		$labels = array(
			'utm' => __( 'Campaign', 'flexify-dashboard' ),
			'organic' => __( 'Organic', 'flexify-dashboard' ),
			'referral' => __( 'Referral', 'flexify-dashboard' ),
			'typein' => __( 'Direct', 'flexify-dashboard' ),
			'admin' => __( 'Web admin', 'flexify-dashboard' ),
			'mobile_app' => __( 'Mobile app', 'flexify-dashboard' ),
			'pos' => __( 'Point of sale', 'flexify-dashboard' ),
		);

		$source = $utm_source;

		if ( 'referral' === $source_type && $referrer ) {
			$host = wp_parse_url( $referrer, PHP_URL_HOST );
			$source = $host ? $host : $referrer;
		}

		return array(
			'type' => $source_type ? $source_type : 'unknown',
			'label' => isset( $labels[ $source_type ] ) ? $labels[ $source_type ] : __( 'Unknown', 'flexify-dashboard' ),
			'source' => trim( $source, '()' ),
			'device' => $device,
		);
	}


	/**
	 * Get available order actions (same list as the native order actions metabox).
	 *
	 * @since 3.0.0
	 * @param WC_Order $order Order.
	 * @return array
	 */
	private function get_order_actions( WC_Order $order ) {
		$actions = array(
			'send_order_details' => __( 'Send order details to customer', 'woocommerce' ),
			'send_order_details_admin' => __( 'Resend new order notification', 'woocommerce' ),
			'regenerate_download_permissions' => __( 'Regenerate download permissions', 'woocommerce' ),
		);

		/** This filter is documented in woocommerce/includes/admin/meta-boxes/class-wc-meta-box-order-actions.php */
		$actions = apply_filters( 'woocommerce_order_actions', $actions, $order );

		$list = array();

		foreach ( $actions as $value => $label ) {
			$list[] = array(
				'value' => (string) $value,
				'label' => wp_strip_all_tags( (string) $label ),
			);
		}

		return $list;
	}


	/**
	 * Run an order action (emails, download permissions and extension actions).
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function run_order_action( WP_REST_Request $request ) {
		$order = wc_get_order( absint( $request->get_param( 'id' ) ) );
		$action = sanitize_key( (string) $request->get_param( 'action' ) );

		if ( ! $order instanceof WC_Order || ! current_user_can( 'edit_shop_order', $order->get_id() ) ) {
			return new WP_Error( 'invalid_order', __( 'Invalid order.', 'flexify-dashboard' ), array( 'status' => 404 ) );
		}

		$available = wp_list_pluck( $this->get_order_actions( $order ), 'value' );

		if ( ! in_array( $action, $available, true ) ) {
			return new WP_Error( 'invalid_action', __( 'Invalid order action.', 'flexify-dashboard' ), array( 'status' => 400 ) );
		}

		switch ( $action ) {
			case 'send_order_details':
				do_action( 'woocommerce_before_resend_order_emails', $order, 'customer_invoice' );
				WC()->payment_gateways();
				WC()->shipping();
				WC()->mailer()->customer_invoice( $order );
				$order->add_order_note( __( 'Order details manually sent to customer.', 'woocommerce' ), false, true );
				do_action( 'woocommerce_after_resend_order_email', $order, 'customer_invoice' );
				break;

			case 'send_order_details_admin':
				do_action( 'woocommerce_before_resend_order_emails', $order, 'new_order' );
				WC()->payment_gateways();
				WC()->shipping();
				add_filter( 'woocommerce_new_order_email_allows_resend', '__return_true' );
				WC()->mailer()->emails['WC_Email_New_Order']->trigger( $order->get_id(), $order, true );
				remove_filter( 'woocommerce_new_order_email_allows_resend', '__return_true' );
				do_action( 'woocommerce_after_resend_order_email', $order, 'new_order' );
				break;

			case 'regenerate_download_permissions':
				$data_store = \WC_Data_Store::load( 'customer-download' );
				$data_store->delete_by_order_id( $order->get_id() );
				wc_downloadable_product_permissions( $order->get_id(), true );
				break;

			default:
				/** This action is documented in woocommerce/includes/admin/meta-boxes/class-wc-meta-box-order-actions.php */
				do_action( 'woocommerce_order_action_' . $action, $order );
				break;
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'action' => $action,
			),
			200
		);
	}
}
