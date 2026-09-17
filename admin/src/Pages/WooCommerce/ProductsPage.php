<?php

namespace MeuMouse\Flexify_Dashboard\Pages\WooCommerce;

use MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce;

use WP_Screen;

defined('ABSPATH') || exit;

/**
 * Class ProductsPage
 *
 * Replaces the WooCommerce products list (edit.php?post_type=product) with the
 * Vue products manager.
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages\WooCommerce
 * @author MeuMouse.com
 */
class ProductsPage extends ModernScreen {

	/**
	 * Constructor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'load-edit.php', array( $this, 'maybe_take_over' ) );
	}


	/**
	 * Replace the products list when enabled.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function maybe_take_over() {
		if ( $this->is_classic_requested() || ! WooCommerce::is_page_enabled( 'products' ) || ! current_user_can( 'edit_products' ) ) {
			return;
		}

		$screen = get_current_screen();

		if ( ! $screen instanceof WP_Screen || 'edit' !== $screen->base || 'product' !== $screen->post_type ) {
			return;
		}

		// Keep native bulk/row actions triggered by URL (e.g. trash links from other plugins).
		if ( isset( $_REQUEST['action'] ) && '-1' !== $_REQUEST['action'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$this->take_over();
	}


	/**
	 * {@inheritdoc}
	 */
	protected function get_entry() {
		return 'Products.js';
	}


	/**
	 * {@inheritdoc}
	 */
	protected function get_stylesheet() {
		return 'products.css';
	}


	/**
	 * {@inheritdoc}
	 */
	protected function get_mount_id() {
		return 'fd-products-page';
	}
}
