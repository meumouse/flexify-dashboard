<?php

namespace MeuMouse\Flexify_Dashboard\Pages\WooCommerce;

use MeuMouse\Flexify_Dashboard\Integrations\WooCommerce\WooCommerce;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

use WP_Query;

defined('ABSPATH') || exit;

/**
 * Class ModernScreen
 *
 * Base class that replaces a native WooCommerce admin screen with the plugin app.
 * The native screen stays available with the `fd_classic=1` query argument.
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages\WooCommerce
 * @author MeuMouse.com
 */
abstract class ModernScreen {

	/**
	 * Vite entry file (e.g. Products.js).
	 *
	 * @since 3.0.0
	 * @return string
	 */
	abstract protected function get_entry();

	/**
	 * CSS file name inside app/dist/assets/styles.
	 *
	 * @since 3.0.0
	 * @return string
	 */
	abstract protected function get_stylesheet();

	/**
	 * Mount element ID.
	 *
	 * @since 3.0.0
	 * @return string
	 */
	abstract protected function get_mount_id();


	/**
	 * Check whether the classic screen was explicitly requested.
	 *
	 * @since 3.0.0
	 * @return bool
	 */
	protected function is_classic_requested() {
		return isset( $_GET['fd_classic'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	}


	/**
	 * Take over the current screen.
	 *
	 * @since 3.0.0
	 * @param bool $disable_main_query Whether to stop WordPress from querying posts.
	 * @return void
	 */
	protected function take_over( $disable_main_query = true ) {
		if ( $disable_main_query ) {
			add_filter( 'pre_get_posts', array( $this, 'modify_main_query' ) );
		}

		add_filter( 'admin_body_class', array( $this, 'add_body_class' ) );
		add_action( 'in_admin_header', array( $this, 'start_output_buffer' ), 999 );
		add_action( 'admin_footer', array( $this, 'render_mount' ), 0 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}


	/**
	 * Stop the main list query (the app loads data through the REST API).
	 *
	 * @since 3.0.0
	 * @param WP_Query $query Query.
	 * @return WP_Query
	 */
	public function modify_main_query( $query ) {
		if ( $query instanceof WP_Query && $query->is_main_query() && is_admin() ) {
			$query->set( 'posts_per_page', 1 );
			$query->set( 'no_found_rows', true );
		}

		return $query;
	}


	/**
	 * Add body classes used by the admin shell.
	 *
	 * @since 3.0.0
	 * @param string $classes Body classes.
	 * @return string
	 */
	public function add_body_class( $classes ) {
		return $classes . ' flexify-dashboard-custom-page fd-woocommerce-page';
	}


	/**
	 * Start capturing the native screen output.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function start_output_buffer() {
		ob_start();
	}


	/**
	 * Discard the native output and print the mount point.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function render_mount() {
		if ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		printf( '<div id="%s"></div>', esc_attr( $this->get_mount_id() ) );
	}


	/**
	 * Enqueue the app assets and store data.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function enqueue_assets() {
		$base_url = plugins_url( 'flexify-dashboard/' );
		$script_name = Scripts::get_base_script_path( $this->get_entry() );

		// Prefer the stylesheet the manifest attaches to the entry; the declared name is the fallback.
		$stylesheet = Scripts::get_stylesheet_path( $this->get_entry() );

		if ( ! $stylesheet ) {
			$stylesheet = 'assets/styles/' . $this->get_stylesheet();
		}

		$style_path = $base_url . 'app/dist/' . $stylesheet;

		wp_enqueue_style( 'flexify-dashboard-' . sanitize_title( $this->get_mount_id() ), $style_path, array(), FLEXIFY_DASHBOARD_VERSION );
		wp_enqueue_media();

		add_filter(
			'flexify-dashboard/style-layering/exclude',
			function( $excluded_patterns ) use ( $style_path ) {
				$excluded_patterns[] = $style_path;

				return $excluded_patterns;
			}
		);

		if ( ! $script_name ) {
			return;
		}

		wp_print_script_tag(
			array(
				'id' => 'fd-woocommerce-script',
				'src' => $base_url . "app/dist/{$script_name}",
				'type' => 'module',
				'woocommerce-data' => esc_attr( wp_json_encode( WooCommerce::get_js_data() ) ),
			)
		);
	}
}
