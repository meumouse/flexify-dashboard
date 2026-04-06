<?php

namespace MeuMouse\Flexify_Dashboard\Options;

defined('ABSPATH') || exit;

/**
 * Class TextReplacement
 *
 * Handles text replacement functionality in the WordPress admin area.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Options
 * @author MeuMouse.com
 */
class TextReplacement {

    /**
     * Stores the text replacement pairs.
     *
     * @since 2.0.0
     * @var array|null
     */
    private static $pairs = null;


    /**
     * Class constructor.
     *
     * Initializes the class and adds filters for text replacement.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_filter( 'gettext', array( $this, 'custom_replace_admin_text' ), 20 );
        add_filter( 'ngettext', array( $this, 'custom_replace_admin_text' ), 20 );
    }


    /**
     * Retrieves and processes the text replacement pairs.
     *
     * @since 2.0.0
     * @return array|false The processed text replacement pairs, or false if no valid pairs are found.
     */
    private static function replacement_pairs() {
        if ( is_array( self::$pairs ) ) {
            return self::$pairs;
        }

        $text_replacements = Settings::get_setting( 'text_replacements', array() );

        if ( ! is_array( $text_replacements ) || empty( $text_replacements ) ) {
            return false;
        }

        $cleaned_pairs = array();

        foreach ( $text_replacements as $pair ) {
            if ( ! is_array( $pair ) ) {
                continue;
            }

            $find = isset( $pair[0] ) ? sanitize_text_field( $pair[0] ) : '';
            $replace = isset( $pair[1] ) ? sanitize_text_field( $pair[1] ) : '';

            if ( '' === $find || '' === $replace ) {
                continue;
            }

            $cleaned_pairs[ $find ] = $replace;
        }

        if ( empty( $cleaned_pairs ) ) {
            return false;
        }

        self::$pairs = $cleaned_pairs;

        return self::$pairs;
    }


    /**
     * Performs the text replacement.
     *
     * @since 2.0.0
     * @param string $text The original text to be processed.
     * @return string The processed text with replacements applied.
     */
    public static function custom_replace_admin_text( $text ) {
        $pairs = self::replacement_pairs();

        if ( false === $pairs || empty( $text ) ) {
            return $text;
        }

        return str_replace( array_keys( $pairs ), array_values( $pairs ), $text );
    }
}