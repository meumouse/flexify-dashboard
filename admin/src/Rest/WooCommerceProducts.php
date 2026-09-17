<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce;

use WC_Product;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class WooCommerceProducts
 *
 * REST endpoints that complement `wc/v3/products` for the products page:
 * aggregated counters, bulk actions and duplication.
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class WooCommerceProducts {

	/**
	 * REST namespace.
	 *
	 * @since 3.0.0
	 * @var string
	 */
	const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Option used to invalidate cached counters.
	 *
	 * @since 3.0.0
	 * @var string
	 */
	const CACHE_VERSION_OPTION = 'flexify_dashboard_products_cache_version';

	/**
	 * Maximum number of products processed by a bulk request.
	 *
	 * @since 3.0.0
	 * @var int
	 */
	const BULK_LIMIT = 200;


	/**
	 * Constructor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );

		add_action( 'save_post_product', array( __CLASS__, 'flush_cache' ) );
		add_action( 'deleted_post', array( __CLASS__, 'flush_cache' ) );
		add_action( 'woocommerce_product_set_stock', array( __CLASS__, 'flush_cache' ) );
		add_action( 'woocommerce_variation_set_stock', array( __CLASS__, 'flush_cache' ) );
		add_action( 'woocommerce_product_set_stock_status', array( __CLASS__, 'flush_cache' ) );
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
			'/woocommerce/products/summary',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_summary' ),
				'permission_callback' => array( $this, 'can_edit_products' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/woocommerce/products/bulk',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'bulk_action' ),
				'permission_callback' => array( $this, 'can_edit_products' ),
				'args' => array(
					'ids' => array(
						'required' => true,
						'type' => 'array',
						'items' => array( 'type' => 'integer' ),
					),
					'action' => array(
						'required' => true,
						'type' => 'string',
						'enum' => array( 'trash', 'restore', 'delete', 'status', 'stock_status', 'featured', 'price', 'add_category', 'remove_category' ),
					),
					'value' => array(
						'required' => false,
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/woocommerce/products/(?P<id>\d+)/duplicate',
			array(
				'methods' => 'POST',
				'callback' => array( $this, 'duplicate_product' ),
				'permission_callback' => array( $this, 'can_edit_products' ),
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
	public function can_edit_products( WP_REST_Request $request ) {
		if ( ! WooCommerce::is_active() ) {
			return new WP_Error( 'woocommerce_inactive', __( 'WooCommerce is not active.', 'flexify-dashboard' ), array( 'status' => 400 ) );
		}

		return RestPermissionChecker::check_permissions( $request, 'edit_products' );
	}


	/**
	 * Invalidate cached counters.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public static function flush_cache() {
		update_option( self::CACHE_VERSION_OPTION, (string) microtime( true ), false );
	}


	/**
	 * Get product counters.
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function get_summary( WP_REST_Request $request ) {
		$cache_key = 'fd_products_summary_' . md5( (string) get_option( self::CACHE_VERSION_OPTION, '1' ) );
		$summary = get_transient( $cache_key );

		if ( false === $summary ) {
			$counts = wp_count_posts( 'product' );
			$visible_statuses = array( 'publish', 'draft', 'pending', 'private', 'future' );
			$total = 0;

			foreach ( $visible_statuses as $status ) {
				$total += isset( $counts->{$status} ) ? (int) $counts->{$status} : 0;
			}

			$summary = array(
				'total' => $total,
				'publish' => (int) ( $counts->publish ?? 0 ),
				'draft' => (int) ( $counts->draft ?? 0 ),
				'pending' => (int) ( $counts->pending ?? 0 ),
				'private' => (int) ( $counts->private ?? 0 ),
				'trash' => (int) ( $counts->trash ?? 0 ),
				'outofstock' => $this->count_products( array( 'stock_status' => 'outofstock' ) ),
				'onbackorder' => $this->count_products( array( 'stock_status' => 'onbackorder' ) ),
				'featured' => $this->count_products( array( 'featured' => true ) ),
				'lowstock' => $this->count_low_stock(),
			);

			set_transient( $cache_key, $summary, 5 * MINUTE_IN_SECONDS );
		}

		return new WP_REST_Response( $summary, 200 );
	}


	/**
	 * Count products matching query args.
	 *
	 * @since 3.0.0
	 * @param array $args wc_get_products args.
	 * @return int
	 */
	private function count_products( $args ) {
		$result = wc_get_products(
			array_merge(
				array(
					'status' => array( 'publish', 'draft', 'pending', 'private', 'future' ),
					'limit' => 1,
					'paginate' => true,
					'return' => 'ids',
				),
				$args
			)
		);

		return is_object( $result ) && isset( $result->total ) ? (int) $result->total : 0;
	}


	/**
	 * Count products (and variations) with low stock using the lookup table.
	 *
	 * @since 3.0.0
	 * @return int
	 */
	private function count_low_stock() {
		global $wpdb;

		$threshold = absint( get_option( 'woocommerce_notify_low_stock_amount', 2 ) );
		$table = $wpdb->prefix . 'wc_product_meta_lookup';

		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
			return 0;
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$sql = "SELECT COUNT(1) FROM {$table} lookup INNER JOIN {$wpdb->posts} posts ON posts.ID = lookup.product_id WHERE lookup.stock_quantity IS NOT NULL AND lookup.stock_quantity > 0 AND lookup.stock_quantity <= %d AND lookup.stock_status = 'instock' AND posts.post_status IN ('publish','private','draft','pending')";

		return (int) $wpdb->get_var( $wpdb->prepare( $sql, $threshold ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}


	/**
	 * Run a bulk action on products.
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function bulk_action( WP_REST_Request $request ) {
		$ids = array_slice( array_unique( array_filter( array_map( 'absint', (array) $request->get_param( 'ids' ) ) ) ), 0, self::BULK_LIMIT );
		$action = sanitize_key( (string) $request->get_param( 'action' ) );
		$value = $request->get_param( 'value' );

		if ( empty( $ids ) ) {
			return new WP_Error( 'no_products', __( 'No products selected.', 'flexify-dashboard' ), array( 'status' => 400 ) );
		}

		$updated = array();
		$failed = array();

		foreach ( $ids as $product_id ) {
			$result = $this->apply_action( $product_id, $action, $value );

			if ( is_wp_error( $result ) ) {
				$failed[] = array(
					'id' => $product_id,
					'message' => $result->get_error_message(),
				);
				continue;
			}

			$updated[] = $product_id;
		}

		self::flush_cache();

		return new WP_REST_Response(
			array(
				'updated' => $updated,
				'failed' => $failed,
			),
			200
		);
	}


	/**
	 * Apply a bulk action to a single product.
	 *
	 * @since 3.0.0
	 * @param int $product_id Product ID.
	 * @param string $action Action key.
	 * @param mixed $value Action value.
	 * @return true|WP_Error
	 */
	private function apply_action( $product_id, $action, $value ) {
		$post = get_post( $product_id );

		if ( ! $post || 'product' !== $post->post_type ) {
			return new WP_Error( 'invalid_product', __( 'Invalid product.', 'flexify-dashboard' ) );
		}

		if ( in_array( $action, array( 'trash', 'delete' ), true ) ) {
			if ( ! current_user_can( 'delete_post', $product_id ) ) {
				return new WP_Error( 'forbidden', __( 'You are not allowed to delete this product.', 'flexify-dashboard' ) );
			}

			if ( 'trash' === $action ) {
				return wp_trash_post( $product_id ) ? true : new WP_Error( 'trash_failed', __( 'Could not move the product to the trash.', 'flexify-dashboard' ) );
			}

			$product = wc_get_product( $product_id );

			if ( $product ) {
				$product->delete( true );
				return true;
			}

			return wp_delete_post( $product_id, true ) ? true : new WP_Error( 'delete_failed', __( 'Could not delete the product.', 'flexify-dashboard' ) );
		}

		if ( ! current_user_can( 'edit_post', $product_id ) ) {
			return new WP_Error( 'forbidden', __( 'You are not allowed to edit this product.', 'flexify-dashboard' ) );
		}

		if ( 'restore' === $action ) {
			return wp_untrash_post( $product_id ) ? true : new WP_Error( 'restore_failed', __( 'Could not restore the product.', 'flexify-dashboard' ) );
		}

		$product = wc_get_product( $product_id );

		if ( ! $product instanceof WC_Product ) {
			return new WP_Error( 'invalid_product', __( 'Invalid product.', 'flexify-dashboard' ) );
		}

		switch ( $action ) {
			case 'status':
				$status = sanitize_key( (string) $value );

				if ( ! in_array( $status, array( 'publish', 'draft', 'pending', 'private' ), true ) ) {
					return new WP_Error( 'invalid_status', __( 'Invalid status.', 'flexify-dashboard' ) );
				}

				if ( 'publish' === $status && ! current_user_can( 'publish_products' ) ) {
					return new WP_Error( 'forbidden', __( 'You are not allowed to publish products.', 'flexify-dashboard' ) );
				}

				$product->set_status( $status );
				break;

			case 'stock_status':
				$stock_status = sanitize_key( (string) $value );

				if ( ! array_key_exists( $stock_status, wc_get_product_stock_status_options() ) ) {
					return new WP_Error( 'invalid_stock_status', __( 'Invalid stock status.', 'flexify-dashboard' ) );
				}

				if ( $product->is_type( 'variable' ) ) {
					foreach ( $product->get_children() as $child_id ) {
						$variation = wc_get_product( $child_id );

						if ( $variation && ! $variation->get_manage_stock() ) {
							$variation->set_stock_status( $stock_status );
							$variation->save();
						}
					}
				} elseif ( ! $product->get_manage_stock() ) {
					$product->set_stock_status( $stock_status );
				}
				break;

			case 'featured':
				$product->set_featured( rest_sanitize_boolean( $value ) );
				break;

			case 'price':
				$result = $this->adjust_price( $product, is_array( $value ) ? $value : array() );

				if ( is_wp_error( $result ) ) {
					return $result;
				}
				break;

			case 'add_category':
			case 'remove_category':
				$term_id = absint( $value );
				$term = $term_id ? get_term( $term_id, 'product_cat' ) : null;

				if ( ! $term || is_wp_error( $term ) ) {
					return new WP_Error( 'invalid_category', __( 'Invalid category.', 'flexify-dashboard' ) );
				}

				$category_ids = array_map( 'absint', $product->get_category_ids() );

				if ( 'add_category' === $action ) {
					$category_ids[] = $term_id;
				} else {
					$category_ids = array_diff( $category_ids, array( $term_id ) );
				}

				$product->set_category_ids( array_values( array_unique( $category_ids ) ) );
				break;

			default:
				return new WP_Error( 'invalid_action', __( 'Invalid action.', 'flexify-dashboard' ) );
		}

		$product->save();

		return true;
	}


	/**
	 * Adjust product prices (simple products and variations).
	 *
	 * Value: { target: regular|sale, operation: set|increase|decrease, mode: fixed|percent, amount: float }
	 *
	 * @since 3.0.0
	 * @param WC_Product $product Product.
	 * @param array $value Adjustment options.
	 * @return true|WP_Error
	 */
	private function adjust_price( WC_Product $product, $value ) {
		$target = isset( $value['target'] ) && 'sale' === $value['target'] ? 'sale' : 'regular';
		$operation = isset( $value['operation'] ) ? sanitize_key( $value['operation'] ) : 'set';
		$mode = isset( $value['mode'] ) && 'percent' === $value['mode'] ? 'percent' : 'fixed';
		$amount = isset( $value['amount'] ) ? (float) wc_format_decimal( $value['amount'] ) : 0;

		if ( ! in_array( $operation, array( 'set', 'increase', 'decrease' ), true ) || $amount < 0 ) {
			return new WP_Error( 'invalid_price', __( 'Invalid price adjustment.', 'flexify-dashboard' ) );
		}

		$products = $product->is_type( 'variable' )
			? array_filter( array_map( 'wc_get_product', $product->get_children() ) )
			: array( $product );

		foreach ( $products as $item ) {
			$current = 'sale' === $target ? $item->get_sale_price( 'edit' ) : $item->get_regular_price( 'edit' );

			if ( 'set' !== $operation && '' === $current ) {
				continue;
			}

			$current = (float) $current;

			if ( 'set' === $operation ) {
				$new_price = $amount;
			} else {
				$delta = 'percent' === $mode ? $current * ( $amount / 100 ) : $amount;
				$new_price = 'increase' === $operation ? $current + $delta : $current - $delta;
			}

			$new_price = wc_format_decimal( max( 0, $new_price ), wc_get_price_decimals() );

			if ( 'sale' === $target ) {
				$regular = (float) $item->get_regular_price( 'edit' );

				if ( $regular > 0 && (float) $new_price >= $regular ) {
					continue;
				}

				$item->set_sale_price( $new_price );
			} else {
				$item->set_regular_price( $new_price );
			}

			if ( $item->get_id() !== $product->get_id() ) {
				$item->save();
			}
		}

		if ( $product->is_type( 'variable' ) && class_exists( 'WC_Product_Variable' ) ) {
			\WC_Product_Variable::sync( $product->get_id() );
		}

		return true;
	}


	/**
	 * Duplicate a product using the WooCommerce duplicator.
	 *
	 * @since 3.0.0
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function duplicate_product( WP_REST_Request $request ) {
		$product_id = absint( $request->get_param( 'id' ) );
		$product = wc_get_product( $product_id );

		if ( ! $product || ! current_user_can( 'edit_post', $product_id ) ) {
			return new WP_Error( 'invalid_product', __( 'Invalid product.', 'flexify-dashboard' ), array( 'status' => 404 ) );
		}

		if ( ! class_exists( 'WC_Admin_Duplicate_Product' ) ) {
			$file = WC_ABSPATH . 'includes/admin/class-wc-admin-duplicate-product.php';

			if ( file_exists( $file ) ) {
				include_once $file;
			}
		}

		if ( ! class_exists( 'WC_Admin_Duplicate_Product' ) ) {
			return new WP_Error( 'duplicate_unavailable', __( 'Product duplication is not available.', 'flexify-dashboard' ), array( 'status' => 500 ) );
		}

		$duplicator = new \WC_Admin_Duplicate_Product();
		$duplicate = $duplicator->product_duplicate( $product );

		self::flush_cache();

		return new WP_REST_Response(
			array(
				'id' => $duplicate->get_id(),
				'edit_url' => get_edit_post_link( $duplicate->get_id(), 'raw' ),
			),
			201
		);
	}
}
