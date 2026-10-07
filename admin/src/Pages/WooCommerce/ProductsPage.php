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
		// Before priority 30, which is where WooCommerce's onboarding redirect sits.
		add_action( 'current_screen', array( $this, 'keep_onboarding_off_the_products_screen' ), 5 );
		add_action( 'load-edit.php', array( $this, 'maybe_take_over' ) );
		add_action( 'load-post.php', array( $this, 'maybe_redirect_to_editor' ) );
		add_action( 'load-post-new.php', array( $this, 'maybe_redirect_to_editor' ) );
		add_action( 'add_meta_boxes_product', array( $this, 'remember_extension_meta_boxes' ), PHP_INT_MAX );
	}


	/**
	 * Stop WooCommerce sending the products screen to its onboarding task list.
	 *
	 * While a store has no published products, WooCommerce redirects every visit to
	 * `edit.php?post_type=product` to `admin.php?page=wc-admin&task=products`. It does that on
	 * `current_screen` at priority 30, before the `load-edit.php` where this screen takes over,
	 * so the redirect wins and this screen is unreachable on a new store — including when the
	 * product editor sends someone to `edit.php?post_type=product#/product/123`, which lands on
	 * the task list with the route still in the address bar and nothing to answer it.
	 *
	 * The callback is registered on an instance WooCommerce keeps to itself and guarded by no
	 * filter, so it is removed by name, and only on the screen this plugin is replacing.
	 *
	 * @since 4.0.0
	 * @return void
	 */
	public function keep_onboarding_off_the_products_screen() {
		if ( $this->is_classic_requested() || ! WooCommerce::is_page_enabled( 'products' ) ) {
			return;
		}

		$screen = get_current_screen();

		if ( ! $screen instanceof \WP_Screen || 'edit' !== $screen->base || 'product' !== $screen->post_type ) {
			return;
		}

		$hook = isset( $GLOBALS['wp_filter']['current_screen'] ) ? $GLOBALS['wp_filter']['current_screen'] : null;

		if ( ! $hook instanceof \WP_Hook || empty( $hook->callbacks[30] ) ) {
			return;
		}

		foreach ( $hook->callbacks[30] as $registered ) {
			$callback = isset( $registered['function'] ) ? $registered['function'] : null;

			if ( is_array( $callback ) && isset( $callback[1] ) && 'maybe_redirect_to_add_product_tasklist' === $callback[1] ) {
				remove_action( 'current_screen', $callback, 30 );
			}
		}
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
	 * {@inheritdoc}
	 */
	protected function get_entry() {
		return 'react/main/products.tsx';
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
