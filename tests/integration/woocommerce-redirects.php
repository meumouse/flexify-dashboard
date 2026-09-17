<?php
/**
 * Integration test of the redirects from the native WooCommerce screens to the Vue pages.
 *
 * Usage (WooCommerce active, HPOS enabled): wp eval-file wp-content/plugins/flexify-dashboard/tests/integration/woocommerce-redirects.php
 * Runs inside a database transaction that is rolled back at the end.
 */

defined( 'ABSPATH' ) || exit;

use MeuMouse\Flexify_Dashboard\Pages\WooCommerce\OrdersPage;
use MeuMouse\Flexify_Dashboard\Pages\WooCommerce\ProductsPage;

global $wpdb;
wp_set_current_user( 1 );
$wpdb->query( 'START TRANSACTION' );

class FD_Redirect_Captured extends Exception {}

add_filter(
	'wp_redirect',
	function ( $location ) {
		throw new FD_Redirect_Captured( $location );
	},
	PHP_INT_MAX
);

function fd_capture( callable $callback, array $get ) {
	$_GET = $get;
	$_REQUEST = $get;
	$_SERVER['REQUEST_METHOD'] = 'GET';

	try {
		$callback();
		return 'no redirect';
	} catch ( FD_Redirect_Captured $redirect ) {
		return $redirect->getMessage();
	}
}

$orders = ( new ReflectionClass( OrdersPage::class ) )->newInstanceWithoutConstructor();
$products = ( new ReflectionClass( ProductsPage::class ) )->newInstanceWithoutConstructor();

$product = new WC_Product_Simple();
$product->set_name( 'FD redirect test' );
$product->save();

$pass = 0;
$fail = 0;
$check = function ( $label, $actual, $expected ) use ( &$pass, &$fail ) {
	$ok = is_callable( $expected ) ? $expected( $actual ) : $actual === $expected;
	$ok ? $pass++ : $fail++;
	echo ( $ok ? '  PASS ' : '  FAIL ' ) . $label . ' => ' . $actual . "\n";
};

$check( 'HPOS edit order → Vue details', fd_capture( array( $orders, 'maybe_take_over_hpos' ), array( 'page' => 'wc-orders', 'action' => 'edit', 'id' => '123' ) ), admin_url( 'admin.php?page=wc-orders' ) . '#/order/123' );
$check( 'HPOS new order → Vue editor', fd_capture( array( $orders, 'maybe_take_over_hpos' ), array( 'page' => 'wc-orders', 'action' => 'new' ) ), admin_url( 'admin.php?page=wc-orders' ) . '#/new' );
$check( 'HPOS new order with fd_classic stays native', fd_capture( array( $orders, 'maybe_take_over_hpos' ), array( 'page' => 'wc-orders', 'action' => 'new', 'fd_classic' => '1' ) ), 'no redirect' );
$check( 'HPOS edit with fd_classic stays native', fd_capture( array( $orders, 'maybe_take_over_hpos' ), array( 'page' => 'wc-orders', 'action' => 'edit', 'id' => '123', 'fd_classic' => '1' ) ), 'no redirect' );
$check( 'legacy post-new ignored while HPOS is on', fd_capture( array( $orders, 'maybe_redirect_legacy_new' ), array( 'post_type' => 'shop_order' ) ), 'no redirect' );

add_filter( 'flexify-dashboard/woocommerce/product-editor-enabled', '__return_false' );
$check( 'product edit with editor disabled stays native', fd_capture( array( $products, 'maybe_redirect_to_editor' ), array( 'post' => (string) $product->get_id(), 'action' => 'edit' ) ), 'no redirect' );
remove_filter( 'flexify-dashboard/woocommerce/product-editor-enabled', '__return_false' );

add_filter( 'flexify-dashboard/woocommerce/product-editor-enabled', '__return_true' );

$check( 'product edit → Vue editor', fd_capture( array( $products, 'maybe_redirect_to_editor' ), array( 'post' => (string) $product->get_id(), 'action' => 'edit' ) ), admin_url( 'edit.php?post_type=product' ) . '#/product/' . $product->get_id() );
$GLOBALS['pagenow'] = 'post-new.php';
$check( 'new product → Vue editor', fd_capture( array( $products, 'maybe_redirect_to_editor' ), array( 'post_type' => 'product' ) ), admin_url( 'edit.php?post_type=product' ) . '#/new' );
$check( 'new product with fd_classic stays native', fd_capture( array( $products, 'maybe_redirect_to_editor' ), array( 'post_type' => 'product', 'fd_classic' => '1' ) ), 'no redirect' );
$check( 'new post (not product) untouched', fd_capture( array( $products, 'maybe_redirect_to_editor' ), array( 'post_type' => 'post' ) ), 'no redirect' );
$_SERVER['REQUEST_METHOD'] = 'POST';
$_GET = array( 'post' => (string) $product->get_id(), 'action' => 'edit' );
try {
	$products->maybe_redirect_to_editor();
	$check( 'POST save on classic editor untouched', 'no redirect', 'no redirect' );
} catch ( FD_Redirect_Captured $redirect ) {
	$check( 'POST save on classic editor untouched', $redirect->getMessage(), 'no redirect' );
}

add_filter( 'flexify-dashboard/woocommerce/page-enabled', '__return_false' );
$_SERVER['REQUEST_METHOD'] = 'GET';
$check( 'orders page disabled stays native', fd_capture( array( $orders, 'maybe_take_over_hpos' ), array( 'page' => 'wc-orders', 'action' => 'edit', 'id' => '5' ) ), 'no redirect' );

$wpdb->query( 'ROLLBACK' );
echo "Result: {$pass} passed, {$fail} failed\n";
