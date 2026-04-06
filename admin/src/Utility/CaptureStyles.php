<?php

namespace MeuMouse\Flexify_Dashboard\Utility;

defined('ABSPATH') || exit;

/**
 * Class CaptureStyles
 *
 * Capture and filter custom styles from the current WordPress admin page.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Utility
 * @author MeuMouse.com
 */
class CaptureStyles {

	/**
	 * Core style handles that should be ignored.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $core_handles = array(
		'common',
		'admin-menu',
		'dashboard',
		'list-tables',
		'edit',
		'revisions',
		'media',
		'themes',
		'about',
		'nav-menus',
		'widgets',
		'site-icon',
		'l10n',
		'wp-admin',
		'login',
		'install',
		'wp-color-picker',
		'customize-controls',
		'customize-widgets',
		'customize-nav-menus',
		'press-this',
		'buttons',
		'dashicons',
		'editor-buttons',
		'media-views',
		'wp-components',
		'wp-block-library',
		'wp-nux',
		'wp-block-editor',
		'wp-edit-post',
		'wp-format-library',
		'colors',
		'flexify-dashboard-theme',
	);

	/**
	 * Capture and filter registered styles from the current admin page.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public static function get_styles() {
		global $wp_styles;

		if ( ! isset( $wp_styles ) || ! is_object( $wp_styles ) || empty( $wp_styles->queue ) ) {
			return array();
		}

		$styles = array();

		foreach ( $wp_styles->queue as $handle ) {
			if ( self::should_skip_handle( $handle ) ) {
				continue;
			}

			if ( ! isset( $wp_styles->registered[ $handle ] ) || ! is_object( $wp_styles->registered[ $handle ] ) ) {
				continue;
			}

			$style = $wp_styles->registered[ $handle ];
			$src   = self::get_style_src( $style->src, $wp_styles->base_url );

			$styles[] = array(
				'handle'  => $handle,
				'src'     => $src,
				'deps'    => is_array( $style->deps ) ? $style->deps : array(),
				'version' => $style->ver,
				'media'   => $style->args,
				'before'  => $wp_styles->get_data( $handle, 'before' ),
				'after'   => $wp_styles->get_data( $handle, 'after' ),
			);
		}

		return $styles;
	}


	/**
	 * Check if a style handle should be skipped.
	 *
	 * @since 2.0.0
	 * @param string $handle Style handle.
	 * @return bool
	 */
	private static function should_skip_handle( $handle ) {
		if ( empty( $handle ) ) {
			return true;
		}

		if ( in_array( $handle, self::$core_handles, true ) ) {
			return true;
		}

		if ( 0 === strpos( $handle, 'wp-' ) || 0 === strpos( $handle, 'admin-' ) ) {
			return true;
		}

		return false;
	}


	/**
	 * Get the full style source URL.
	 *
	 * @since 2.0.0
	 * @param string $src      Style source.
	 * @param string $base_url Base URL from WP_Styles.
	 * @return string
	 */
	private static function get_style_src( $src, $base_url ) {
		if ( empty( $src ) ) {
			return '';
		}

		if ( preg_match( '|^(https?:)?//|', $src ) ) {
			return $src;
		}

		return trailingslashit( $base_url ) . ltrim( $src, '/' );
	}
}