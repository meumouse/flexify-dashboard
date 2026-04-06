<?php

namespace MeuMouse\Flexify_Dashboard\Utility;

defined('ABSPATH') || exit;

/**
 * Class Scripts
 *
 * Handle Vite manifest lookups for built scripts and stylesheets.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Utility
 * @author MeuMouse.com
 */
class Scripts {

	/**
	 * Relative path to the Vite manifest file.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const MANIFEST_PATH = 'app/dist/.vite/manifest.json';

	/**
	 * Get the path of a Vite-built base script.
	 *
	 * @since 2.0.0
	 * @param string $filename Source entry filename.
	 * @return string|null
	 */
	public static function get_base_script_path( $filename ) {
		if ( empty( $filename ) || ! is_string( $filename ) ) {
			return null;
		}

		$manifest = self::get_manifest();

		if ( empty( $manifest ) ) {
			return null;
		}

		$target_src = 'apps/js/' . ltrim( $filename, '/' );

		foreach ( $manifest as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}

			if ( isset( $entry['src'] ) && $target_src === $entry['src'] && ! empty( $entry['file'] ) ) {
				return $entry['file'];
			}
		}

		return null;
	}


	/**
	 * Get the path of a Vite-built stylesheet.
	 *
	 * This method accepts either a JavaScript entry file or a CSS filename.
	 *
	 * @since 2.0.0
	 * @param string $filename JavaScript entry filename or stylesheet filename.
	 * @return string|null
	 */
	public static function get_stylesheet_path( $filename ) {
		if ( empty( $filename ) || ! is_string( $filename ) ) {
			return null;
		}

		$manifest = self::get_manifest();

		if ( empty( $manifest ) ) {
			return null;
		}

		if ( preg_match( '/\.js$/', $filename ) ) {
			return self::get_stylesheet_from_js_entry( $manifest, $filename );
		}

		return self::find_stylesheet_in_manifest( $manifest, $filename );
	}


	/**
	 * Get and decode the Vite manifest file.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_manifest() {
		static $manifest = null;

		if ( null !== $manifest ) {
			return $manifest;
		}

		$manifest = array();

		$manifest_path = self::get_manifest_path();

		if ( ! file_exists( $manifest_path ) || ! is_readable( $manifest_path ) ) {
			return $manifest;
		}

		$manifest_content = file_get_contents( $manifest_path );

		if ( false === $manifest_content || empty( $manifest_content ) ) {
			return $manifest;
		}

		$decoded_manifest = json_decode( $manifest_content, true );

		if ( ! is_array( $decoded_manifest ) ) {
			return $manifest;
		}

		$manifest = $decoded_manifest;

		return $manifest;
	}


	/**
	 * Get the absolute manifest file path.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function get_manifest_path() {
		return FLEXIFY_DASHBOARD_PLUGIN_PATH . self::MANIFEST_PATH;
	}


	/**
	 * Get the stylesheet attached to a JavaScript entry.
	 *
	 * @since 2.0.0
	 * @param array  $manifest Manifest data.
	 * @param string $filename JavaScript filename.
	 * @return string|null
	 */
	private static function get_stylesheet_from_js_entry( $manifest, $filename ) {
		$target_src = 'apps/js/' . ltrim( $filename, '/' );

		foreach ( $manifest as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}

			if ( ! isset( $entry['src'] ) || $target_src !== $entry['src'] ) {
				continue;
			}

			if ( isset( $entry['css'] ) && is_array( $entry['css'] ) && ! empty( $entry['css'][0] ) ) {
				return $entry['css'][0];
			}

			return null;
		}

		return null;
	}


	/**
	 * Find a stylesheet directly in the manifest.
	 *
	 * @since 2.0.0
	 * @param array  $manifest Manifest data.
	 * @param string $filename Stylesheet filename.
	 * @return string|null
	 */
	private static function find_stylesheet_in_manifest( $manifest, $filename ) {
		$search_filename = basename( $filename );
		$search_path     = str_replace( 'assets/styles/', '', $filename );

		foreach ( $manifest as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}

			$css_match = self::find_css_match_in_entry( $entry, $search_filename, $search_path );

			if ( ! empty( $css_match ) ) {
				return $css_match;
			}

			$file_match = self::find_file_match_in_entry( $entry, $search_filename, $search_path );

			if ( ! empty( $file_match ) ) {
				return $file_match;
			}

			$src_match = self::find_src_match_in_entry( $entry, $search_filename, $search_path );

			if ( ! empty( $src_match ) ) {
				return $src_match;
			}
		}

		return null;
	}


	/**
	 * Search CSS assets inside a manifest entry.
	 *
	 * @since 2.0.0
	 * @param array  $entry           Manifest entry.
	 * @param string $search_filename Stylesheet filename.
	 * @param string $search_path     Normalized stylesheet path.
	 * @return string|null
	 */
	private static function find_css_match_in_entry( $entry, $search_filename, $search_path ) {
		if ( empty( $entry['css'] ) || ! is_array( $entry['css'] ) ) {
			return null;
		}

		foreach ( $entry['css'] as $css_file ) {
			if ( self::matches_asset( $css_file, $search_filename, $search_path ) ) {
				return $css_file;
			}
		}

		return null;
	}


	/**
	 * Search direct file entries for CSS assets.
	 *
	 * @since 2.0.0
	 * @param array  $entry           Manifest entry.
	 * @param string $search_filename Stylesheet filename.
	 * @param string $search_path     Normalized stylesheet path.
	 * @return string|null
	 */
	private static function find_file_match_in_entry( $entry, $search_filename, $search_path ) {
		if ( empty( $entry['file'] ) || ! preg_match( '/\.css$/', $entry['file'] ) ) {
			return null;
		}

		if ( self::matches_asset( $entry['file'], $search_filename, $search_path ) ) {
			return $entry['file'];
		}

		return null;
	}


	/**
	 * Search source entries for CSS assets.
	 *
	 * @since 2.0.0
	 * @param array  $entry           Manifest entry.
	 * @param string $search_filename Stylesheet filename.
	 * @param string $search_path     Normalized stylesheet path.
	 * @return string|null
	 */
	private static function find_src_match_in_entry( $entry, $search_filename, $search_path ) {
		if ( empty( $entry['src'] ) || ! preg_match( '/\.css$/', $entry['src'] ) ) {
			return null;
		}

		if ( self::matches_asset( $entry['src'], $search_filename, $search_path ) ) {
			return ! empty( $entry['file'] ) ? $entry['file'] : $entry['src'];
		}

		return null;
	}


	/**
	 * Check whether an asset path matches the requested filename.
	 *
	 * @since 2.0.0
	 * @param string $asset_path      Asset path from manifest.
	 * @param string $search_filename Stylesheet filename.
	 * @param string $search_path     Normalized stylesheet path.
	 * @return bool
	 */
	private static function matches_asset( $asset_path, $search_filename, $search_path ) {
		if ( empty( $asset_path ) || ! is_string( $asset_path ) ) {
			return false;
		}

		if ( false !== strpos( $asset_path, $search_filename ) ) {
			return true;
		}

		if ( false !== strpos( $asset_path, $search_path ) ) {
			return true;
		}

		return false;
	}
}