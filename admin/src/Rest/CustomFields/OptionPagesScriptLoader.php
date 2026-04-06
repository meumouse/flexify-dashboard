<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class OptionPagesScriptLoader
 *
 * Handles loading scripts and styles for option pages.
 * Reuses the custom fields meta box scripts for field rendering.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class OptionPagesScriptLoader {

	/**
	 * Track if localized data has been output.
	 *
	 * @since 2.0.0
	 * @var bool
	 */
	private static $localized = false;


	/**
	 * Load all assets needed for option pages.
	 *
	 * @since 2.0.0
	 * @param array $page Option page data.
	 * @return bool
	 */
	public static function load_assets( $page ) {
		CustomFieldsScriptLoader::load_assets();
		wp_enqueue_media();

		if ( ! self::$localized ) {
			self::output_localized_data( $page );
			self::$localized = true;
		}

		return true;
	}


	/**
	 * Print inline script with option page context.
	 *
	 * Called in the page footer.
	 *
	 * @since 2.0.0
	 * @param array $page Option page data.
	 * @return void
	 */
	public static function print_option_page_context( $page ) {
		$page_slug  = isset( $page['slug'] ) ? sanitize_key( $page['slug'] ) : '';
		$page_title = isset( $page['title'] ) ? sanitize_text_field( $page['title'] ) : '';
		$nonce      = wp_create_nonce( 'flexify_dashboard_option_page_' . $page_slug );

		?>
		<script>
		if (typeof window.flexifyDashboardOptionPageContext === 'undefined') {
			window.flexifyDashboardOptionPageContext = {
				pageSlug: <?php echo wp_json_encode( $page_slug ); ?>,
				pageTitle: <?php echo wp_json_encode( $page_title ); ?>,
				context: 'option',
				nonce: <?php echo wp_json_encode( $nonce ); ?>
			};
		}
		</script>
		<?php
	}


	/**
	 * Reset localized state.
	 *
	 * Useful for testing.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function reset() {
		self::$localized = false;
	}


	/**
	 * Output localized data for option pages.
	 *
	 * @since 2.0.0
	 * @param array $page Option page data.
	 * @return void
	 */
	private static function output_localized_data( $page ) {
		$page_slug  = isset( $page['slug'] ) ? sanitize_key( $page['slug'] ) : '';
		$page_title = isset( $page['title'] ) ? sanitize_text_field( $page['title'] ) : '';

		$data = array(
			'pageSlug'  => $page_slug,
			'pageTitle' => $page_title,
			'nonce'     => wp_create_nonce( 'flexify_dashboard_option_page_' . $page_slug ),
			'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
			'restUrl'   => rest_url( 'flexify-dashboard/v1/' ),
			'restNonce' => wp_create_nonce( 'wp_rest' ),
			'context'   => 'option',
		);

		wp_localize_script( 'flexify-dashboard-custom-fields-meta-box', 'flexifyDashboardOptionPage', $data );
	}
}