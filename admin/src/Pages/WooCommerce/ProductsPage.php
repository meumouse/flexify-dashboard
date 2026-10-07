<?php

namespace MeuMouse\Flexify_Dashboard\Pages\WooCommerce;

use MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce;

use WP_Screen;

defined('ABSPATH') || exit;

/**
 * Class ProductsPage
 *
 * Replaces the WooCommerce products list (edit.php?post_type=product) with the
 * React products manager.
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
		add_action( 'load-post.php', array( $this, 'maybe_redirect_to_editor' ) );
		add_action( 'load-post-new.php', array( $this, 'maybe_redirect_to_editor' ) );
		add_action( 'add_meta_boxes_product', array( $this, 'remember_extension_meta_boxes' ), PHP_INT_MAX );
	}


	/**
	 * Remember meta boxes added by extensions to the classic product editor.
	 *
	 * The product editor cannot render them, so it warns the user and links to the classic editor.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function remember_extension_meta_boxes() {
		global $wp_meta_boxes;

		$core = array(
			'submitdiv',
			'postexcerpt',
			'postimagediv',
			'product_catdiv',
			'tagsdiv-product_tag',
			'product_branddiv',
			'woocommerce-product-data',
			'woocommerce-product-images',
			'commentsdiv',
			'commentstatusdiv',
			'slugdiv',
			'authordiv',
			'postcustom',
			'pageparentdiv',
			'revisionsdiv',
			'trackbacksdiv',
		);

		$found = array();

		foreach ( (array) ( $wp_meta_boxes['product'] ?? array() ) as $context ) {
			foreach ( (array) $context as $priority ) {
				foreach ( (array) $priority as $id => $box ) {
					if ( empty( $box ) || in_array( $id, $core, true ) ) {
						continue;
					}

					$found[ $id ] = wp_strip_all_tags( is_array( $box ) && isset( $box['title'] ) ? (string) $box['title'] : (string) $id );
				}
			}
		}

		ksort( $found );

		if ( get_option( WooCommerce::EXTENSION_META_BOXES_OPTION ) !== $found ) {
			update_option( WooCommerce::EXTENSION_META_BOXES_OPTION, $found, false );
		}
	}


	/**
	 * Send product edit/create screens to the product editor when it is enabled.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function maybe_redirect_to_editor() {
		if ( $this->is_classic_requested() || ! WooCommerce::is_product_editor_enabled() || ! current_user_can( 'edit_products' ) ) {
			return;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		$action = isset( $_GET['action'] ) ? sanitize_key( wp_unslash( $_GET['action'] ) ) : '';
		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : '';
		// phpcs:enable

		if ( isset( $_SERVER['REQUEST_METHOD'] ) && 'GET' !== $_SERVER['REQUEST_METHOD'] ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			return;
		}

		$base = admin_url( 'edit.php?post_type=product' );

		if ( $post_id && 'edit' === $action && 'product' === get_post_type( $post_id ) ) {
			wp_safe_redirect( $base . '#/product/' . $post_id );
			exit;
		}

		if ( ! $post_id && 'product' === $post_type && false !== strpos( (string) $GLOBALS['pagenow'], 'post-new.php' ) ) {
			wp_safe_redirect( $base . '#/new' );
			exit;
		}
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
	 * Check whether the catalog screen should be rendered by the React app.
	 *
	 * The Vue screen is kept behind the filter as a fallback while the React one settles in.
	 *
	 * @since 4.0.0
	 * @return bool
	 */
	protected function use_react_app() {
		/**
		 * Filter whether the React catalog screen is used.
		 *
		 * @since 4.0.0
		 * @param bool $enabled Whether the React screen is used.
		 */
		return (bool) apply_filters( 'flexify-dashboard/woocommerce/react-products', true );
	}


	/**
	 * {@inheritdoc}
	 */
	protected function get_entry() {
		return $this->use_react_app() ? 'react/main/products.tsx' : 'Products.js';
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
