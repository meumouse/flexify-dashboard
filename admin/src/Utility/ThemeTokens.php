<?php

namespace MeuMouse\Flexify_Dashboard\Utility;

defined('ABSPATH') || exit;

/**
 * Class ThemeTokens
 *
 * Build the runtime design tokens (neutral and accent palettes) that power the
 * Tailwind theme. Palettes are exposed as CSS custom properties holding space
 * separated RGB channels, e.g. `--fd-accent-500: 0 138 255`.
 *
 * @since 3.0.0
 * @package MeuMouse\Flexify_Dashboard\Utility
 * @author MeuMouse.com
 */
class ThemeTokens {

	/**
	 * Default accent palette (brand color #008aff).
	 *
	 * @since 3.0.0
	 * @return array
	 */
	public static function get_default_accent_scale() {
		return array(
			array( 'step' => '25', 'color' => '#f5faff' ),
			array( 'step' => '50', 'color' => '#eff8ff' ),
			array( 'step' => '100', 'color' => '#d9efff' ),
			array( 'step' => '200', 'color' => '#bce2ff' ),
			array( 'step' => '300', 'color' => '#8fd0ff' ),
			array( 'step' => '400', 'color' => '#59b6ff' ),
			array( 'step' => '500', 'color' => '#008aff' ),
			array( 'step' => '600', 'color' => '#0070db' ),
			array( 'step' => '700', 'color' => '#0059ad' ),
			array( 'step' => '800', 'color' => '#004a8f' ),
			array( 'step' => '900', 'color' => '#063f76' ),
			array( 'step' => '950', 'color' => '#04284c' ),
		);
	}


	/**
	 * Default neutral palette (TailAdmin gray scale).
	 *
	 * @since 3.0.0
	 * @return array
	 */
	public static function get_default_base_scale() {
		return array(
			array( 'step' => '0', 'color' => '#ffffff' ),
			array( 'step' => '25', 'color' => '#fcfcfd' ),
			array( 'step' => '50', 'color' => '#f9fafb' ),
			array( 'step' => '100', 'color' => '#f2f4f7' ),
			array( 'step' => '200', 'color' => '#e4e7ec' ),
			array( 'step' => '300', 'color' => '#d0d5dd' ),
			array( 'step' => '400', 'color' => '#98a2b3' ),
			array( 'step' => '500', 'color' => '#667085' ),
			array( 'step' => '600', 'color' => '#475467' ),
			array( 'step' => '700', 'color' => '#344054' ),
			array( 'step' => '800', 'color' => '#1d2939' ),
			array( 'step' => '900', 'color' => '#101828' ),
			array( 'step' => '950', 'color' => '#0c111d' ),
		);
	}


	/**
	 * Merge a saved scale over the default scale.
	 *
	 * Steps missing from the saved scale keep their default value, so older
	 * settings (without the 25 step, for example) still produce a full palette.
	 *
	 * @since 3.0.0
	 * @param mixed $saved Saved scale from settings.
	 * @param array $defaults Default scale.
	 * @return array Associative array step => hex color.
	 */
	public static function merge_scale( $saved, $defaults ) {
		$scale = array();

		foreach ( $defaults as $item ) {
			$scale[ (string) $item['step'] ] = $item['color'];
		}

		if ( ! is_array( $saved ) ) {
			return $scale;
		}

		foreach ( $saved as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['step'], $item['color'] ) ) {
				continue;
			}

			$color = sanitize_hex_color( (string) $item['color'] );

			if ( $color ) {
				$scale[ sanitize_key( (string) $item['step'] ) ] = $color;
			}
		}

		return $scale;
	}


	/**
	 * Convert a HEX color to RGB channels.
	 *
	 * @since 3.0.0
	 * @param string $hex HEX color.
	 * @return array|null
	 */
	public static function hex_to_rgb( $hex ) {
		$hex = ltrim( (string) $hex, '#' );

		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}

		if ( 6 !== strlen( $hex ) || ! ctype_xdigit( $hex ) ) {
			return null;
		}

		return array(
			hexdec( substr( $hex, 0, 2 ) ),
			hexdec( substr( $hex, 2, 2 ) ),
			hexdec( substr( $hex, 4, 2 ) ),
		);
	}


	/**
	 * Build the `:root` declarations for both palettes.
	 *
	 * @since 3.0.0
	 * @param array $options Plugin settings.
	 * @return string
	 */
	public static function get_css( $options = array() ) {
		$palettes = array(
			'base' => self::merge_scale( $options['base_theme_scale'] ?? array(), self::get_default_base_scale() ),
			'accent' => self::merge_scale( $options['accent_theme_scale'] ?? array(), self::get_default_accent_scale() ),
		);

		$declarations = '';

		foreach ( $palettes as $name => $scale ) {
			foreach ( $scale as $step => $color ) {
				$rgb = self::hex_to_rgb( $color );

				if ( ! $rgb ) {
					continue;
				}

				$declarations .= sprintf( '--fd-%s-%s:%s;', $name, $step, implode( ' ', $rgb ) );
			}
		}

		/**
		 * Filter the runtime design tokens CSS declarations.
		 *
		 * @since 3.0.0
		 * @param string $declarations CSS declarations placed inside :root.
		 * @param array $options Plugin settings.
		 */
		$declarations = apply_filters( 'flexify-dashboard/theme/tokens', $declarations, $options );

		return ':root{' . $declarations . '}';
	}


	/**
	 * Print the tokens style tag.
	 *
	 * @since 3.0.0
	 * @param array $options Plugin settings.
	 * @return void
	 */
	public static function print_style_tag( $options = array() ) {
		echo '<style id="flexify-dashboard-theme-tokens">' . wp_strip_all_tags( self::get_css( $options ) ) . '</style>' . "\n";
	}
}
