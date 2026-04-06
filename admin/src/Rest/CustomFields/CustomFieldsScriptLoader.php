<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

use MeuMouse\Flexify_Dashboard\Utility\Scripts;

defined('ABSPATH') || exit;

/**
 * Class CustomFieldsScriptLoader
 *
 * Centralized script and style loading for custom fields across all contexts.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class CustomFieldsScriptLoader {

	/**
	 * Script handle.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const SCRIPT_HANDLE = 'flexify-dashboard-custom-fields-meta-box-script';

	/**
	 * Style handle.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const STYLE_HANDLE = 'flexify-dashboard-custom-fields-meta-box';

	/**
	 * Styles asset path.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const STYLE_ASSET_PATH = 'app/dist/assets/styles/custom-fields-meta-box.css';

	/**
	 * Track if scripts have been loaded.
	 *
	 * @since 2.0.0
	 * @var bool
	 */
	private static $scripts_loaded = false;


	/**
	 * Track if styles have been loaded.
	 *
	 * @since 2.0.0
	 * @var bool
	 */
	private static $styles_loaded = false;


	/**
	 * Load the custom fields Vue script.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function load_script() {
		if ( self::$scripts_loaded ) {
			return true;
		}

		$script_name = Scripts::get_base_script_path( 'CustomFieldsMetaBox.js' );

		if ( empty( $script_name ) ) {
			return false;
		}

		wp_print_script_tag(
			array(
				'id'   => self::SCRIPT_HANDLE,
				'src'  => self::get_plugin_base_url() . 'app/dist/' . ltrim( $script_name, '/' ),
				'type' => 'module',
			)
		);

		self::$scripts_loaded = true;

		return true;
	}


	/**
	 * Load the custom fields stylesheet.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function load_styles() {
		if ( self::$styles_loaded ) {
			return true;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			self::get_plugin_base_url() . self::STYLE_ASSET_PATH,
			array(),
			null
		);

		self::$styles_loaded = true;

		return true;
	}


	/**
	 * Load both script and styles.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function load_assets() {
		self::load_styles();

		return self::load_script();
	}


	/**
	 * Check whether scripts have been loaded.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function scripts_loaded() {
		return self::$scripts_loaded;
	}


	/**
	 * Check whether styles have been loaded.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function styles_loaded() {
		return self::$styles_loaded;
	}


	/**
	 * Reset loading state.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function reset() {
		self::$scripts_loaded = false;
		self::$styles_loaded  = false;
	}


	/**
	 * Get the plugin base URL.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function get_plugin_base_url() {
		return trailingslashit( plugins_url( 'flexify-dashboard/' ) );
	}
}