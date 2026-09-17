<?php
/**
 * Integration test of the Flexify Dashboard WooCommerce flows against the real WooCommerce REST API.
 *
 * Usage (WooCommerce active, InnoDB tables): wp eval-file wp-content/plugins/flexify-dashboard/tests/integration/woocommerce-rest.php
 * Everything runs inside a database transaction that is rolled back at the end; emails are blocked.
 * Runs as user ID 1, which must be an administrator.
 */

defined( 'ABSPATH' ) || exit;

global $wpdb;

add_filter( 'pre_wp_mail', '__return_false' );
wp_set_current_user( 1 );

// The Activity Log queue is written on shutdown, after the rollback, so keep it off during the test.
add_filter(
	'option_' . MeuMouse\Flexify_Dashboard\Activity\ActivityDatabase::SETTINGS_OPTION,
	function ( $settings ) {
		$settings = is_array( $settings ) ? $settings : array();
		$settings['enable_activity_logger'] = false;

		return $settings;
	},
	PHP_INT_MAX
);

$results = array( 'pass' => 0, 'fail' => 0 );

function fd_check( $label, $condition, $detail = '' ) {
	global $results;
	$results[ $condition ? 'pass' : 'fail' ]++;
	echo ( $condition ? '  PASS ' : '  FAIL ' ) . $label . ( $condition || '' === $detail ? '' : ' => ' . ( is_string( $detail ) ? $detail : wp_json_encode( $detail ) ) ) . "\n";
}

function fd_rest( $method, $route, $params = array() ) {
	$request = new WP_REST_Request( $method, $route );
	$request->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );

	if ( 'GET' === $method ) {
		$request->set_query_params( $params );
	} else {
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( wp_json_encode( $params ) );
	}

	$response = rest_do_request( $request );
	$data = rest_get_server()->response_to_data( $response, false );

	return array( $response->get_status(), $data, $response->get_headers() );
}

$wpdb->query( 'START TRANSACTION' );

try {
	do_action( 'rest_api_init', rest_get_server() );

	echo "== Store data ==\n";
	$js = \MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce::get_js_data();
	echo '  Order storage: ' . ( $js['hpos'] ? 'HPOS' : 'posts (legacy)' ) . "\n";
	fd_check( 'js data active + storage mode', $js['active'] && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() === $js['hpos'] );
	fd_check( 'order statuses have colors', ! empty( $js['order_statuses'] ) && isset( $js['order_statuses'][0]['color'] ), $js['order_statuses'][0] ?? null );
	fd_check( 'currency symbol decoded', 'R$' === $js['currency']['symbol'], $js['currency'] );

	echo "== Products ==\n";
	list( $status, $simple ) = fd_rest( 'POST', '/wc/v3/products', array( 'name' => 'FD Test Simple', 'type' => 'simple', 'status' => 'publish', 'regular_price' => '100', 'manage_stock' => true, 'stock_quantity' => 2, 'sku' => 'FD-TEST-1' ) );
	fd_check( 'create simple product', 201 === $status, $simple );

	list( $status, $variable ) = fd_rest(
		'POST',
		'/wc/v3/products',
		array(
			'name' => 'FD Test Variable',
			'type' => 'variable',
			'status' => 'publish',
			'attributes' => array( array( 'name' => 'Tamanho', 'position' => 0, 'visible' => true, 'variation' => true, 'options' => array( 'P', 'M' ) ) ),
		)
	);
	fd_check( 'create variable product', 201 === $status, $variable );

	list( $status, $batch ) = fd_rest(
		'POST',
		"/wc/v3/products/{$variable['id']}/variations/batch",
		array(
			'create' => array(
				array( 'attributes' => array( array( 'id' => 0, 'name' => 'Tamanho', 'option' => 'P' ) ), 'regular_price' => '50' ),
				array( 'attributes' => array( array( 'id' => 0, 'name' => 'Tamanho', 'option' => 'M' ) ), 'regular_price' => '60' ),
			),
		)
	);
	fd_check( 'batch create variations', 200 === $status && 2 === count( array_filter( $batch['create'], function ( $item ) { return empty( $item['error'] ); } ) ), $batch );
	$variation_id = $batch['create'][0]['id'];

	list( $status, $variationUpdate ) = fd_rest(
		'POST',
		"/wc/v3/products/{$variable['id']}/variations/batch",
		array(
			'update' => array(
				array(
					'id' => $variation_id,
					'virtual' => true,
					'downloadable' => true,
					'downloads' => array( array( 'name' => 'Guia', 'file' => home_url( '/wp-content/uploads/guia.pdf' ) ) ),
					'download_limit' => 3,
					'download_expiry' => -1,
				),
			),
		)
	);
	$saved_variation = $variationUpdate['update'][0] ?? array();
	fd_check( 'variation downloads saved', 200 === $status && ! empty( $saved_variation['downloadable'] ) && 1 === count( $saved_variation['downloads'] ) && 3 === (int) $saved_variation['download_limit'], $saved_variation );
	list( $status, $summary ) = fd_rest( 'GET', '/flexify-dashboard/v1/woocommerce/products/summary' );
	fd_check( 'products summary', 200 === $status && (int) $summary['publish'] >= 2, $summary );
	fd_check( 'summary low stock counts simple product', (int) $summary['lowstock'] >= 1, $summary );

	list( $status, $bulk ) = fd_rest( 'POST', '/flexify-dashboard/v1/woocommerce/products/bulk', array( 'ids' => array( $simple['id'] ), 'action' => 'price', 'value' => array( 'target' => 'regular', 'operation' => 'increase', 'mode' => 'percent', 'amount' => 10 ) ) );
	$price_after = wc_get_product( $simple['id'] )->get_regular_price();
	fd_check( 'bulk price +10%', 200 === $status && 110.0 === (float) $price_after, array( $bulk, $price_after ) );

	list( $status, $bulk ) = fd_rest( 'POST', '/flexify-dashboard/v1/woocommerce/products/bulk', array( 'ids' => array( $simple['id'] ), 'action' => 'featured', 'value' => true ) );
	fd_check( 'bulk featured', 200 === $status && wc_get_product( $simple['id'] )->get_featured(), $bulk );

	list( $status, $dup ) = fd_rest( 'POST', "/flexify-dashboard/v1/woocommerce/products/{$simple['id']}/duplicate" );
	fd_check( 'duplicate product as draft', 201 === $status && ! empty( $dup['id'] ) && 'draft' === get_post_status( $dup['id'] ), $dup );

	list( $status, $filtered ) = fd_rest( 'GET', '/wc/v3/products', array( 'min_price' => '105', 'max_price' => '200', 'status' => 'any' ) );
	fd_check( 'price range filter', 200 === $status && in_array( $simple['id'], wp_list_pluck( $filtered, 'id' ), true ), wp_list_pluck( $filtered, 'id' ) );

	list( $status, $updated ) = fd_rest(
		'PUT',
		"/wc/v3/products/{$simple['id']}",
		array(
			'upsell_ids' => array( $variable['id'] ),
			'downloadable' => true,
			'downloads' => array( array( 'name' => 'Manual', 'file' => home_url( '/wp-content/uploads/manual.pdf' ) ) ),
			'download_limit' => -1,
		)
	);
	fd_check( 'editor save upsells + downloads', 200 === $status && array( $variable['id'] ) === $updated['upsell_ids'] && 1 === count( $updated['downloads'] ), 200 === $status ? array( $updated['upsell_ids'], $updated['downloads'] ) : $updated );

	echo "== Orders ==\n";
	list( $status, $order ) = fd_rest(
		'POST',
		'/wc/v3/orders',
		array(
			'status' => 'pending',
			'customer_id' => 0,
			'billing' => array( 'first_name' => 'Ana', 'last_name' => 'Teste', 'email' => 'ana.teste@example.com', 'country' => 'BR', 'state' => 'SP', 'city' => 'São Paulo' ),
			'shipping' => array( 'first_name' => 'Ana', 'last_name' => 'Teste', 'country' => 'BR', 'state' => 'SP', 'city' => 'São Paulo' ),
			'payment_method' => 'bacs',
			'payment_method_title' => 'Transferência bancária',
			'set_paid' => false,
			'line_items' => array(
				array( 'product_id' => $simple['id'], 'quantity' => 1 ),
				array( 'product_id' => $variable['id'], 'variation_id' => $variation_id, 'quantity' => 2 ),
			),
			'shipping_lines' => array( array( 'method_id' => 'flat_rate', 'method_title' => 'Taxa fixa', 'total' => '20.00' ) ),
			'fee_lines' => array( array( 'name' => 'Embalagem', 'total' => '5.00', 'tax_status' => 'none' ) ),
		)
	);
	fd_check( 'create manual order', 201 === $status, $order );
	fd_check( 'order total computed (110 + 2x50 + 20 + 5 = 235)', 235.0 === (float) $order['total'], $order['total'] );
	$order_id = $order['id'];

	$wc_order = wc_get_order( $order_id );
	$wc_order->update_meta_data( 'nota_fiscal', 'NF-e 123' );
	$wc_order->update_meta_data( '_wc_order_attribution_source_type', 'organic' );
	$wc_order->save();

	list( $status, $list ) = fd_rest( 'GET', '/wc/v3/orders', array( 'fd_payment_method' => 'bacs', 'status' => 'any' ) );
	fd_check( 'filter payment method bacs', 200 === $status && in_array( $order_id, wp_list_pluck( $list, 'id' ), true ), $status . ' ' . wp_json_encode( wp_list_pluck( (array) $list, 'id' ) ) );

	list( $status, $list ) = fd_rest( 'GET', '/wc/v3/orders', array( 'fd_payment_method' => 'pix', 'status' => 'any' ) );
	fd_check( 'filter payment method pix excludes', 200 === $status && ! in_array( $order_id, wp_list_pluck( $list, 'id' ), true ), wp_list_pluck( (array) $list, 'id' ) );

	list( $status, $list ) = fd_rest( 'GET', '/wc/v3/orders', array( 'fd_created_via' => 'rest-api', 'status' => 'any' ) );
	fd_check( 'filter created via rest-api', 200 === $status && in_array( $order_id, wp_list_pluck( $list, 'id' ), true ), array( $status, wc_get_order( $order_id )->get_created_via(), wp_list_pluck( (array) $list, 'id' ) ) );

	list( $status, $list ) = fd_rest( 'GET', '/wc/v3/orders', array( 'fd_origin' => 'organic', 'status' => 'any' ) );
	fd_check( 'filter origin organic', 200 === $status && in_array( $order_id, wp_list_pluck( $list, 'id' ), true ), wp_list_pluck( (array) $list, 'id' ) );

	list( $status, $list ) = fd_rest( 'GET', '/wc/v3/orders', array( 'fd_origin' => 'referral', 'status' => 'any' ) );
	fd_check( 'filter origin referral excludes', 200 === $status && ! in_array( $order_id, wp_list_pluck( $list, 'id' ), true ), wp_list_pluck( (array) $list, 'id' ) );

	echo "== Order editing ==\n";
	$line_ids = wp_list_pluck( $order['line_items'], 'id' );
	list( $status, $edited ) = fd_rest(
		'PUT',
		"/wc/v3/orders/{$order_id}",
		array(
			'line_items' => array( array( 'id' => $line_ids[1], 'quantity' => 1, 'subtotal' => '50.00', 'total' => '50.00' ) ),
			'shipping_lines' => array( array( 'id' => $order['shipping_lines'][0]['id'], 'method_id' => null ) ),
			'fee_lines' => array( array( 'id' => $order['fee_lines'][0]['id'], 'name' => null ) ),
		)
	);
	fd_check( 'edit items (qty 2→1, remove shipping and fee)', 200 === $status && 160.0 === (float) $edited['total'] && empty( $edited['shipping_lines'] ) && empty( $edited['fee_lines'] ), 200 === $status ? array( 'total' => $edited['total'], 'shipping' => count( $edited['shipping_lines'] ), 'fees' => count( $edited['fee_lines'] ), 'lines' => wp_list_pluck( $edited['line_items'], 'quantity' ) ) : $edited );

	list( $status, $edited ) = fd_rest( 'PUT', "/wc/v3/orders/{$order_id}", array( 'line_items' => array( array( 'id' => $line_ids[1], 'quantity' => 0 ) ) ) );
	fd_check( 'remove line with quantity 0', 200 === $status && 1 === count( $edited['line_items'] ) && 110.0 === (float) $edited['total'], 200 === $status ? array( count( $edited['line_items'] ), $edited['total'] ) : $edited );

	list( $status, $edited ) = fd_rest( 'PUT', "/wc/v3/orders/{$order_id}", array( 'status' => 'processing' ) );
	fd_check( 'change status to processing', 200 === $status && 'processing' === $edited['status'], $edited['status'] ?? $edited );

	list( $status, $edited ) = fd_rest( 'PUT', "/wc/v3/orders/{$order_id}", array( 'shipping' => array( 'city' => 'Curitiba', 'state' => 'PR' ) ) );
	fd_check( 'edit shipping address', 200 === $status && 'Curitiba' === $edited['shipping']['city'], $edited['shipping'] ?? $edited );

	echo "== Order context, notes, refunds, actions ==\n";
	list( $status, $context ) = fd_rest( 'GET', "/flexify-dashboard/v1/woocommerce/orders/{$order_id}/context" );
	fd_check( 'order context', 200 === $status && isset( $context['items'], $context['payment'], $context['customer'] ), $context );
	fd_check( 'context custom fields', 200 === $status && in_array( 'nota_fiscal', wp_list_pluck( $context['custom_fields'], 'key' ), true ) && ! in_array( '_wc_order_attribution_source_type', wp_list_pluck( $context['custom_fields'], 'key' ), true ), $context['custom_fields'] ?? null );
	fd_check( 'context attribution organic', 'organic' === ( $context['attribution']['type'] ?? '' ), $context['attribution'] ?? null );
	fd_check( 'context actions list', ! empty( $context['actions'] ), $context['actions'] ?? null );
	fd_check( 'context guest orders count', 1 === (int) $context['customer']['orders_count'], $context['customer'] ?? null );

	list( $status, $note ) = fd_rest( 'POST', "/wc/v3/orders/{$order_id}/notes", array( 'note' => 'Nota <b>teste</b>', 'customer_note' => false, 'added_by_user' => true ) );
	fd_check( 'add order note', 201 === $status, $note );

	list( $status, $notes ) = fd_rest( 'GET', "/wc/v3/orders/{$order_id}/notes", array( 'type' => 'any' ) );
	fd_check( 'list notes includes status change + manual note', 200 === $status && count( $notes ) >= 2, count( (array) $notes ) );

	$line = $edited['line_items'][0];
	list( $status, $refund ) = fd_rest(
		'POST',
		"/wc/v3/orders/{$order_id}/refunds",
		array(
			'amount' => '110.00',
			'reason' => 'Teste',
			'api_refund' => false,
			'api_restock' => true,
			'line_items' => array( array( 'id' => $line['id'], 'quantity' => 1, 'refund_total' => 110, 'refund_tax' => array() ) ),
		)
	);
	fd_check( 'manual refund with restock', 201 === $status, $refund );

	list( $status, $context ) = fd_rest( 'GET', "/flexify-dashboard/v1/woocommerce/orders/{$order_id}/context" );
	fd_check( 'context refunded qty', 1 === (int) ( $context['items'][ $line['id'] ]['refunded_qty'] ?? 0 ), $context['items'] ?? null );
	fd_check( 'order fully refunded status', 'refunded' === wc_get_order( $order_id )->get_status(), wc_get_order( $order_id )->get_status() );

	list( $status, $action ) = fd_rest( 'POST', "/flexify-dashboard/v1/woocommerce/orders/{$order_id}/action", array( 'action' => 'regenerate_download_permissions' ) );
	fd_check( 'run order action', 200 === $status && ! empty( $action['success'] ), $action );

	list( $status, $action ) = fd_rest( 'POST', "/flexify-dashboard/v1/woocommerce/orders/{$order_id}/action", array( 'action' => 'not_registered_action' ) );
	fd_check( 'reject unknown order action', 400 === $status, array( $status, $action ) );

	echo "== Summary and bulk ==\n";
	list( $status, $osummary ) = fd_rest( 'GET', '/flexify-dashboard/v1/woocommerce/orders/summary', array( 'date_from' => gmdate( 'Y-m-d', strtotime( '-29 days' ) ), 'date_to' => gmdate( 'Y-m-d' ) ) );
	fd_check( 'orders summary', 200 === $status && (int) $osummary['total'] >= 1 && isset( $osummary['period']['net_revenue'] ), $osummary );

	list( $status, $order2 ) = fd_rest( 'POST', '/wc/v3/orders', array( 'status' => 'on-hold', 'line_items' => array( array( 'product_id' => $simple['id'], 'quantity' => 1 ) ) ) );
	list( $status, $bulk ) = fd_rest( 'POST', '/flexify-dashboard/v1/woocommerce/orders/bulk', array( 'ids' => array( $order2['id'] ), 'action' => 'status', 'value' => 'completed' ) );
	fd_check( 'bulk status completed', 200 === $status && 'completed' === wc_get_order( $order2['id'] )->get_status(), $bulk );

	// Analytics reports zero on stores that never imported historical data; the summary then sums the orders.
	list( $status, $revenue ) = fd_rest( 'GET', '/flexify-dashboard/v1/woocommerce/orders/summary', array( 'date_from' => gmdate( 'Y-m-d', strtotime( '-1 day' ) ), 'date_to' => gmdate( 'Y-m-d' ) ) );
	fd_check( 'period revenue is not zero while paid orders exist', (int) $revenue['period']['orders_count'] >= 1 && (float) $revenue['period']['net_revenue'] > 0, $revenue['period'] );

	list( $status, $bulk ) = fd_rest( 'POST', '/flexify-dashboard/v1/woocommerce/orders/bulk', array( 'ids' => array( $order2['id'] ), 'action' => 'trash' ) );
	fd_check( 'bulk trash', 200 === $status && 'trash' === wc_get_order( $order2['id'] )->get_status(), array( $bulk, wc_get_order( $order2['id'] ) ? wc_get_order( $order2['id'] )->get_status() : 'missing' ) );
	list( $status, $bulk ) = fd_rest( 'POST', '/flexify-dashboard/v1/woocommerce/orders/bulk', array( 'ids' => array( $order2['id'] ), 'action' => 'restore' ) );
	fd_check( 'bulk restore', 200 === $status && 'completed' === wc_get_order( $order2['id'] )->get_status(), array( $bulk, wc_get_order( $order2['id'] ) ? wc_get_order( $order2['id'] )->get_status() : 'missing' ) );

	list( $status, $counts ) = fd_rest( 'GET', '/flexify-dashboard/v1/woocommerce/orders/summary' );
	fd_check( 'summary counts match WooCommerce counts', (int) $counts['counts']['completed'] === (int) wc_orders_count( 'completed' ) && (int) $counts['counts']['refunded'] === (int) wc_orders_count( 'refunded' ) && isset( $counts['counts']['trash'] ), $counts['counts'] ?? $counts );
	fd_rest( 'POST', '/flexify-dashboard/v1/woocommerce/orders/bulk', array( 'ids' => array( $order2['id'] ), 'action' => 'trash' ) );
	list( $status, $counts ) = fd_rest( 'GET', '/flexify-dashboard/v1/woocommerce/orders/summary' );
	fd_check( 'summary counts trash', (int) $counts['counts']['trash'] === (int) wc_orders_count( 'trash' ) && (int) $counts['counts']['trash'] >= 1, $counts['counts'] );

	list( $status, $siblings ) = fd_rest( 'GET', '/wc/v3/orders', array( 'per_page' => 1, 'orderby' => 'date', 'status' => 'any', 'exclude' => (string) $order2['id'], 'dates_are_gmt' => 'true', 'after' => gmdate( 'Y-m-d\TH:i:s', strtotime( '-1 day' ) ), 'order' => 'asc', '_fields' => 'id,number' ) );
	fd_check( 'siblings query accepted', 200 === $status, $siblings );

	list( $status, $customers ) = fd_rest( 'GET', '/wc/v3/customers', array( 'search' => 'admin', 'per_page' => 6, 'role' => 'all' ) );
	fd_check( 'customer search (role all)', 200 === $status, $customers );

	list( $status, $countries ) = fd_rest( 'GET', '/wc/v3/data/countries', array( '_fields' => 'code,name,states' ) );
	fd_check( 'countries data', 200 === $status && count( $countries ) > 100, $status );

	echo "== Coupons, attributes, tags ==\n";
	list( $status, $coupon ) = fd_rest( 'POST', '/wc/v3/coupons', array( 'code' => 'fdtest10', 'discount_type' => 'percent', 'amount' => '10', 'date_expires' => null, 'minimum_amount' => '', 'maximum_amount' => '', 'usage_limit' => null, 'usage_limit_per_user' => null, 'email_restrictions' => array() ) );
	fd_check( 'create coupon with editor payload', 201 === $status, $coupon );

	list( $status, $order3 ) = fd_rest( 'POST', '/wc/v3/orders', array( 'status' => 'pending', 'line_items' => array( array( 'product_id' => $simple['id'], 'quantity' => 1 ) ), 'coupon_lines' => array( array( 'code' => 'fdtest10' ) ) ) );
	fd_check( 'order with coupon applies discount', 201 === $status && (float) $order3['discount_total'] > 0, 201 === $status ? array( $order3['discount_total'], $order3['total'] ) : $order3 );

	if ( 201 === $status ) {
		list( $status, $order3b ) = fd_rest( 'PUT', "/wc/v3/orders/{$order3['id']}", array( 'coupon_lines' => array() ) );
		fd_check( 'remove coupon from order', 200 === $status && empty( $order3b['coupon_lines'] ) && 0.0 === (float) $order3b['discount_total'], 200 === $status ? array( $order3b['coupon_lines'], $order3b['discount_total'] ) : $order3b );
	}

	list( $status, $attribute ) = fd_rest( 'POST', '/wc/v3/products/attributes', array( 'name' => 'FD Cor', 'order_by' => 'menu_order', 'has_archives' => false ) );
	fd_check( 'create global attribute', 201 === $status, $attribute );

	if ( 201 === $status ) {
		list( $status, $term ) = fd_rest( 'POST', "/wc/v3/products/attributes/{$attribute['id']}/terms", array( 'name' => 'Azul' ) );
		fd_check( 'create attribute term (taxonomy registers on the next request)', 201 === $status || 'woocommerce_rest_taxonomy_invalid' === ( $term['code'] ?? '' ), $term );
	}

	list( $status, $tag ) = fd_rest( 'POST', '/wc/v3/products/tags', array( 'name' => 'fd-teste' ) );
	fd_check( 'create tag', 201 === $status, $tag );

	list( $status, $tags ) = fd_rest( 'GET', '/wc/v3/products/tags', array( 'hide_empty' => 'false', 'search' => 'fd-teste' ) );
	fd_check( 'list tags with hide_empty false', 200 === $status && 1 === count( $tags ), $tags );

	list( $status, $batch ) = fd_rest( 'POST', '/wc/v3/products/tags/batch', array( 'delete' => array( $tag['id'] ) ) );
	fd_check( 'batch delete tags', 200 === $status && empty( $batch['delete'][0]['error'] ), $batch );

	echo "== Pages ==\n";
	$extensions = \MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce::get_product_editor_extensions();
	fd_check( 'product editor extensions readable', is_array( $extensions ), $extensions );
} catch ( Throwable $error ) {
	fd_check( 'no exceptions', false, get_class( $error ) . ': ' . $error->getMessage() . ' @ ' . $error->getFile() . ':' . $error->getLine() );
}

$wpdb->query( 'ROLLBACK' );

echo "\nResult: {$results['pass']} passed, {$results['fail']} failed\n";
echo 'After rollback — orders: ' . count( wc_get_orders( array( 'limit' => -1, 'return' => 'ids', 'status' => 'any' ) ) ) . ', FD test products: ' . (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_title LIKE 'FD Test%'" ) . "\n";
