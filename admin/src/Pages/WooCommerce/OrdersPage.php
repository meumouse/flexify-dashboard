<?php

namespace MeuMouse\Flexify_Dashboard\Pages\WooCommerce;

use MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce;

use WP_Screen;

defined('ABSPATH') || exit;

/**
 * Class OrdersPage
 *
 * Replaces the WooCommerce orders list and order edit screens with the Vue
 * orders manager. Supports High-Performance Order Storage
 * (admin.php?page=wc-orders) and the legacy posts storage
 * (edit.php?post_type=shop_order).
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages\WooCommerce
 * @author MeuMouse.com
 */
class OrdersPage extends ModernScreen {

	/**
	 * Constructor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'load-woocommerce_page_wc-orders', array( $this, 'maybe_take_over_hpos' ), 5 );
		add_action( 'load-edit.php', array( $this, 'maybe_take_over_legacy' ) );
		add_action( 'load-post.php', array( $this, 'maybe_redirect_legacy_edit' ) );
		add_action( 'load-post-new.php', array( $this, 'maybe_redirect_legacy_new' ) );
	}


	/**
	 * Redirect the legacy "Add order" screen to the Vue order editor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function maybe_redirect_legacy_new() {
		if ( WooCommerce::is_hpos_enabled() || ! $this->can_take_over() ) {
			return;
		}

		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 'shop_order' !== $post_type ) {
			return;
		}

		wp_safe_redirect( $this->get_modern_url( '/new' ) );
		exit;
	}


	/**
	 * Check whether the modern orders page can be used in this request.
	 *
	 * @since 3.0.0
	 * @return bool
	 */
	private function can_take_over() {
		return ! $this->is_classic_requested() && WooCommerce::is_page_enabled( 'orders' ) && current_user_can( 'edit_shop_orders' );
	}


	/**
	 * Get the URL of the modern orders page.
	 *
	 * @since 3.0.0
	 * @param string $route Hash route (e.g. /order/123).
	 * @return string
	 */
	private function get_modern_url( $route = '/' ) {
		$base = WooCommerce::is_hpos_enabled()
			? admin_url( 'admin.php?page=wc-orders' )
			: admin_url( 'edit.php?post_type=shop_order' );

		return $base . '#' . $route;
	}


	/**
	 * HPOS orders screen.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function maybe_take_over_hpos() {
		if ( ! $this->can_take_over() ) {
			return;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$action = isset( $_GET['action'] ) ? sanitize_key( wp_unslash( $_GET['action'] ) ) : '';
		$order_id = isset( $_GET['id'] ) ? absint( $_GET['id'] ) : 0;
		// phpcs:enable

		if ( 'new' === $action ) {
			wp_safe_redirect( $this->get_modern_url( '/new' ) );
			exit;
		}

		if ( 'edit' === $action && $order_id ) {
			wp_safe_redirect( $this->get_modern_url( '/order/' . $order_id ) );
			exit;
		}

		// Native bulk actions and filters submitted to the classic list keep working.
		if ( '' !== $action && '-1' !== $action ) {
			return;
		}

		if ( isset( $_REQUEST['order_type'] ) && 'shop_order' !== $_REQUEST['order_type'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$this->take_over( false );
	}


	/**
	 * Legacy orders list (edit.php?post_type=shop_order).
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function maybe_take_over_legacy() {
		if ( WooCommerce::is_hpos_enabled() || ! $this->can_take_over() ) {
			return;
		}

		$screen = get_current_screen();

		if ( ! $screen instanceof WP_Screen || 'edit' !== $screen->base || 'shop_order' !== $screen->post_type ) {
			return;
		}

		if ( isset( $_REQUEST['action'] ) && '-1' !== $_REQUEST['action'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$this->take_over();
	}


	/**
	 * Redirect the legacy order edit screen to the modern details view.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function maybe_redirect_legacy_edit() {
		if ( WooCommerce::is_hpos_enabled() || ! $this->can_take_over() ) {
			return;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		$action = isset( $_GET['action'] ) ? sanitize_key( wp_unslash( $_GET['action'] ) ) : '';
		// phpcs:enable

		if ( ! $post_id || 'edit' !== $action || 'shop_order' !== get_post_type( $post_id ) ) {
			return;
		}

		wp_safe_redirect( $this->get_modern_url( '/order/' . $post_id ) );
		exit;
	}


	/**
	 * {@inheritdoc}
	 */
	protected function get_entry() {
		return 'Orders.js';
	}


	/**
	 * {@inheritdoc}
	 */
	protected function get_stylesheet() {
		return 'orders.css';
	}


	/**
	 * {@inheritdoc}
	 */
	protected function get_mount_id() {
		return 'fd-orders-page';
	}
}
