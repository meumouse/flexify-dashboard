<?php

namespace MeuMouse\Flexify_Dashboard\Integrations\WooCommerce;

use MeuMouse\Flexify_Dashboard\Options\Settings;

defined('ABSPATH') || exit;

/**
 * Class WooCommerce
 *
 * Shared helpers for the WooCommerce integration (products and orders pages).
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Integrations\WooCommerce
 * @author MeuMouse.com
 */
class WooCommerce {

	/**
	 * Constructor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'before_woocommerce_init', array( __CLASS__, 'declare_compatibility' ) );
	}


	/**
	 * Declare compatibility with WooCommerce features (HPOS).
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public static function declare_compatibility() {
		if ( ! class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			return;
		}

		$plugin_file = FLEXIFY_DASHBOARD_PLUGIN_PATH . 'flexify-dashboard.php';

		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', $plugin_file, true );
	}


	/**
	 * Check whether WooCommerce is loaded.
	 *
	 * @since 3.0.0
	 * @return bool
	 */
	public static function is_active() {
		return class_exists( 'WooCommerce' ) && function_exists( 'WC' );
	}


	/**
	 * Check whether High-Performance Order Storage is the authoritative store.
	 *
	 * @since 3.0.0
	 * @return bool
	 */
	public static function is_hpos_enabled() {
		if ( ! class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) ) {
			return false;
		}

		return \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
	}


	/**
	 * Check whether a modern WooCommerce page is enabled in the settings.
	 *
	 * @since 3.0.0
	 * @param string $page products|orders
	 * @return bool
	 */
	public static function is_page_enabled( $page ) {
		if ( ! self::is_active() ) {
			return false;
		}

		$key = 'orders' === $page ? 'use_modern_orders_page' : 'use_modern_products_page';
		$value = Settings::get_setting( $key, true );

		/**
		 * Filter whether a modern WooCommerce page is enabled.
		 *
		 * @since 3.0.0
		 * @param bool $enabled Whether the page is enabled.
		 * @param string $page products|orders
		 */
		return (bool) apply_filters( 'flexify-dashboard/woocommerce/page-enabled', false !== $value, $page );
	}


	/**
	 * Get the URL of the native orders screen.
	 *
	 * @since 3.0.0
	 * @param array $args Extra query args.
	 * @return string
	 */
	public static function get_native_orders_url( $args = array() ) {
		$base = self::is_hpos_enabled()
			? admin_url( 'admin.php?page=wc-orders' )
			: admin_url( 'edit.php?post_type=shop_order' );

		return add_query_arg( array_merge( array( 'fd_classic' => 1 ), $args ), $base );
	}


	/**
	 * Get the native edit URL of an order.
	 *
	 * @since 3.0.0
	 * @param int $order_id Order ID.
	 * @return string
	 */
	public static function get_native_order_edit_url( $order_id ) {
		if ( self::is_hpos_enabled() ) {
			return add_query_arg(
				array(
					'page' => 'wc-orders',
					'action' => 'edit',
					'id' => absint( $order_id ),
					'fd_classic' => 1,
				),
				admin_url( 'admin.php' )
			);
		}

		return add_query_arg(
			array(
				'post' => absint( $order_id ),
				'action' => 'edit',
				'fd_classic' => 1,
			),
			admin_url( 'post.php' )
		);
	}


	/**
	 * Get order statuses with a semantic color for badges.
	 *
	 * @since 3.0.0
	 * @return array
	 */
	public static function get_order_statuses() {
		if ( ! function_exists( 'wc_get_order_statuses' ) ) {
			return array();
		}

		$colors = array(
			'pending' => 'warning',
			'processing' => 'primary',
			'on-hold' => 'orange',
			'completed' => 'success',
			'cancelled' => 'light',
			'refunded' => 'purple',
			'failed' => 'error',
			'checkout-draft' => 'light',
			'trash' => 'dark',
		);

		$statuses = array();

		foreach ( wc_get_order_statuses() as $key => $label ) {
			$slug = 'wc-' === substr( $key, 0, 3 ) ? substr( $key, 3 ) : $key;

			$statuses[] = array(
				'value' => $slug,
				'label' => $label,
				'color' => isset( $colors[ $slug ] ) ? $colors[ $slug ] : 'info',
			);
		}

		/**
		 * Filter order statuses exposed to the orders page.
		 *
		 * @since 3.0.0
		 * @param array $statuses List of statuses (value, label, color).
		 */
		return apply_filters( 'flexify-dashboard/woocommerce/order-statuses', $statuses );
	}


	/**
	 * Get store data exposed to the Vue pages.
	 *
	 * @since 3.0.0
	 * @return array
	 */
	public static function get_js_data() {
		if ( ! self::is_active() ) {
			return array( 'active' => false );
		}

		$product_types = function_exists( 'wc_get_product_types' ) ? wc_get_product_types() : array();
		$stock_statuses = function_exists( 'wc_get_product_stock_status_options' ) ? wc_get_product_stock_status_options() : array();
		$gateways = array();

		if ( WC()->payment_gateways() ) {
			foreach ( WC()->payment_gateways()->payment_gateways() as $gateway ) {
				if ( 'yes' !== $gateway->enabled ) {
					continue;
				}

				$gateways[] = array(
					'value' => $gateway->id,
					'label' => wp_strip_all_tags( $gateway->get_title() ),
					'refunds' => $gateway->supports( 'refunds' ),
				);
			}
		}

		$shipping_methods = array();

		if ( WC()->shipping() ) {
			foreach ( WC()->shipping()->get_shipping_methods() as $method ) {
				$shipping_methods[] = array(
					'value' => $method->id,
					'label' => wp_strip_all_tags( $method->get_method_title() ),
				);
			}
		}

		$data = array(
			'active' => true,
			'version' => defined( 'WC_VERSION' ) ? WC_VERSION : '',
			'hpos' => self::is_hpos_enabled(),
			'currency' => array(
				'code' => get_woocommerce_currency(),
				'symbol' => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
				'position' => get_option( 'woocommerce_currency_pos', 'left' ),
				'thousand_separator' => wc_get_price_thousand_separator(),
				'decimal_separator' => wc_get_price_decimal_separator(),
				'decimals' => wc_get_price_decimals(),
			),
			'weight_unit' => get_option( 'woocommerce_weight_unit', 'kg' ),
			'dimension_unit' => get_option( 'woocommerce_dimension_unit', 'cm' ),
			'manage_stock' => 'yes' === get_option( 'woocommerce_manage_stock', 'yes' ),
			'low_stock_amount' => absint( get_option( 'woocommerce_notify_low_stock_amount', 2 ) ),
			'taxes_enabled' => wc_tax_enabled(),
			'coupons_enabled' => wc_coupons_enabled(),
			'product_types' => self::to_options( $product_types ),
			'stock_statuses' => self::to_options( $stock_statuses ),
			'order_statuses' => self::get_order_statuses(),
			'payment_gateways' => $gateways,
			'shipping_methods' => $shipping_methods,
			'capabilities' => array(
				'edit_products' => current_user_can( 'edit_products' ),
				'delete_products' => current_user_can( 'delete_products' ),
				'edit_shop_orders' => current_user_can( 'edit_shop_orders' ),
				'delete_shop_orders' => current_user_can( 'delete_shop_orders' ),
				'manage_woocommerce' => current_user_can( 'manage_woocommerce' ),
			),
			'urls' => array(
				'products' => admin_url( 'edit.php?post_type=product' ),
				'classic_products' => admin_url( 'edit.php?post_type=product&fd_classic=1' ),
				'new_product' => admin_url( 'post-new.php?post_type=product' ),
				'product_import' => admin_url( 'edit.php?post_type=product&page=product_importer' ),
				'product_export' => admin_url( 'edit.php?post_type=product&page=product_exporter' ),
				'product_categories' => admin_url( 'edit-tags.php?taxonomy=product_cat&post_type=product' ),
				'product_tags' => admin_url( 'edit-tags.php?taxonomy=product_tag&post_type=product' ),
				'orders' => self::is_hpos_enabled() ? admin_url( 'admin.php?page=wc-orders' ) : admin_url( 'edit.php?post_type=shop_order' ),
				'classic_orders' => self::get_native_orders_url(),
				'new_order' => self::is_hpos_enabled() ? admin_url( 'admin.php?page=wc-orders&action=new' ) : admin_url( 'post-new.php?post_type=shop_order' ),
				'settings' => admin_url( 'admin.php?page=wc-settings' ),
				'users' => admin_url( 'users.php' ),
			),
		);

		/**
		 * Filter WooCommerce data exposed to the Vue pages.
		 *
		 * @since 3.0.0
		 * @param array $data Store data.
		 */
		return apply_filters( 'flexify-dashboard/woocommerce/js-data', $data );
	}


	/**
	 * Convert an associative array into select options.
	 *
	 * @since 3.0.0
	 * @param array $items key => label.
	 * @return array
	 */
	private static function to_options( $items ) {
		$options = array();

		foreach ( (array) $items as $value => $label ) {
			$options[] = array(
				'value' => (string) $value,
				'label' => wp_strip_all_tags( (string) $label ),
			);
		}

		return $options;
	}
}
