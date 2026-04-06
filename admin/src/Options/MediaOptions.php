<?php

namespace MeuMouse\Flexify_Dashboard\Options;

use enshrined\svgSanitize\Sanitizer;

use WP_Error;
use Exception;

defined('ABSPATH') || exit;

/**
 * Class MediaOptions
 *
 * Handle media-related options such as SVG and font uploads.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Options
 * @author MeuMouse.com
 */
class MediaOptions {

    /**
     * Allowed font mime types.
     *
     * @since 2.0.0
     * @var array
     */
    private static $font_types = array(
        'woff2' => 'font/woff2',
        'woff'  => 'font/woff',
        'ttf'   => 'font/ttf',
        'otf'   => 'font/otf',
        'eot'   => 'application/vnd.ms-fontobject',
    );


    /**
     * Class constructor.
     *
     * Register media-related hooks.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_filter( 'upload_mimes', array( $this, 'maybe_enable_svg_uploads' ), 10, 1 );
        add_filter( 'wp_check_filetype_and_ext', array( $this, 'fix_svg_filetype_check' ), 10, 5 );
        add_filter( 'wp_prepare_attachment_for_js', array( $this, 'fix_svg_media_thumbnails' ), 10, 3 );
        add_filter( 'wp_handle_upload_prefilter', array( $this, 'sanitize_svg_upload' ), 10, 1 );

        add_filter( 'upload_mimes', array( $this, 'maybe_enable_font_uploads' ), 10, 1 );
        add_filter( 'wp_check_filetype_and_ext', array( $this, 'fix_font_filetype_check' ), 10, 5 );
    }


    /**
     * Check if SVG uploads are enabled.
     *
     * @since 2.0.0
     * @return bool True if SVG uploads are enabled. Otherwise false.
     */
    private static function is_svg_uploads_enabled(): bool {
        return Settings::is_enabled( 'enable_svg_uploads' );
    }


    /**
     * Enable SVG uploads when the setting is active.
     *
     * @since 2.0.0
     * @param array $mimes Allowed mime types.
     * @return array Modified mime types.
     */
    public static function maybe_enable_svg_uploads( $mimes ): array {
        if ( ! self::is_svg_uploads_enabled() ) {
            return $mimes;
        }

        $mimes['svg'] = 'image/svg+xml';
        $mimes['svgz'] = 'image/svg+xml';

        return $mimes;
    }


    /**
     * Fix WordPress filetype validation for SVG files.
     *
     * @since 2.0.0
     * @param array       $data File data array.
     * @param string      $file Full path to the file.
     * @param string      $filename Uploaded filename.
     * @param array       $mimes Allowed mime types.
     * @param string|null $real_mime Detected mime type.
     * @return array Modified file data.
     */
    public static function fix_svg_filetype_check( $data, $file, $filename, $mimes, $real_mime = null ): array {
        if ( ! self::is_svg_uploads_enabled() ) {
            return $data;
        }

        $wp_filetype = wp_check_filetype( $filename, $mimes );
        $ext = isset( $wp_filetype['ext'] ) ? $wp_filetype['ext'] : '';
        $type = isset( $wp_filetype['type'] ) ? $wp_filetype['type'] : '';

        if ( 'svg' === $ext || 'image/svg+xml' === $type ) {
            return array(
                'ext'             => 'svg',
                'type'            => 'image/svg+xml',
                'proper_filename' => $filename,
            );
        }

        return $data;
    }


    /**
     * Fix SVG thumbnails in the WordPress media library.
     *
     * @since 2.0.0
     * @param array      $response Prepared attachment response.
     * @param \WP_Post   $attachment Attachment object.
     * @param array|bool $meta Attachment metadata.
     * @return array Modified response.
     */
    public static function fix_svg_media_thumbnails( $response, $attachment, $meta ): array {
        if ( ! self::is_svg_uploads_enabled() ) {
            return $response;
        }

        if ( ! isset( $response['mime'] ) || 'image/svg+xml' !== $response['mime'] ) {
            return $response;
        }

        $attachment_url = wp_get_attachment_url( $attachment->ID );

        if ( empty( $attachment_url ) ) {
            return $response;
        }

        $response['image'] = array(
            'src'    => $attachment_url,
            'width'  => 150,
            'height' => 150,
        );

        $response['sizes'] = array(
            'full' => array(
                'url'         => $attachment_url,
                'width'       => 150,
                'height'      => 150,
                'orientation' => 'landscape',
            ),
            'thumbnail' => array(
                'url'         => $attachment_url,
                'width'       => 150,
                'height'      => 150,
                'orientation' => 'landscape',
            ),
            'medium' => array(
                'url'         => $attachment_url,
                'width'       => 300,
                'height'      => 300,
                'orientation' => 'landscape',
            ),
            'large' => array(
                'url'         => $attachment_url,
                'width'       => 1024,
                'height'      => 1024,
                'orientation' => 'landscape',
            ),
        );

        return $response;
    }


    /**
     * Sanitize SVG files before upload.
     *
     * @since 2.0.0
     * @param array $file Uploaded file data.
     * @return array|WP_Error Sanitized file data on success. WP_Error on failure.
     */
    public static function sanitize_svg_upload( $file ) {
        if ( ! self::is_svg_uploads_enabled() ) {
            return $file;
        }

        if ( empty( $file['name'] ) || empty( $file['tmp_name'] ) ) {
            return $file;
        }

        $filetype = wp_check_filetype( $file['name'] );
        $ext = isset( $filetype['ext'] ) ? $filetype['ext'] : '';
        $type = isset( $filetype['type'] ) ? $filetype['type'] : '';

        if ( 'svg' !== $ext && 'image/svg+xml' !== $type ) {
            return $file;
        }

        if ( ! file_exists( $file['tmp_name'] ) || ! is_readable( $file['tmp_name'] ) ) {
            return $file;
        }

        $svg_content = file_get_contents( $file['tmp_name'] );

        if ( false === $svg_content ) {
            return new WP_Error(
                'svg_read_error',
                __( 'The SVG file could not be read for sanitization.', 'flexify-dashboard' )
            );
        }

        try {
            $sanitizer = new Sanitizer();
            $sanitized_svg = $sanitizer->sanitize( $svg_content );

            if ( false === $sanitized_svg ) {
                return new WP_Error(
                    'svg_sanitize_error',
                    __( 'The SVG file could not be sanitized. The file may be corrupted or contain invalid content.', 'flexify-dashboard' )
                );
            }

            $result = file_put_contents( $file['tmp_name'], $sanitized_svg );

            if ( false === $result ) {
                return new WP_Error(
                    'svg_write_error',
                    __( 'The sanitized SVG file could not be saved.', 'flexify-dashboard' )
                );
            }

            $filesize = filesize( $file['tmp_name'] );

            if ( false !== $filesize ) {
                $file['size'] = $filesize;
            }
        } catch ( Exception $e ) {
            error_log( 'SVG sanitize error: ' . $e->getMessage() );

            return new WP_Error(
                'svg_sanitize_exception',
                __( 'An error occurred while sanitizing the SVG file.', 'flexify-dashboard' )
            );
        }

        return $file;
    }


    /**
     * Check if font uploads are enabled.
     *
     * Defaults to true when the setting does not exist.
     *
     * @since 2.0.0
     * @return bool True if font uploads are enabled. Otherwise false.
     */
    private static function is_font_uploads_enabled(): bool {
        $settings = Settings::get();

        if ( ! isset( $settings['enable_font_uploads'] ) ) {
            return true;
        }

        return true === $settings['enable_font_uploads'];
    }


    /**
     * Enable font uploads when the setting is active.
     *
     * @since 2.0.0
     * @param array $mimes Allowed mime types.
     * @return array Modified mime types.
     */
    public static function maybe_enable_font_uploads( $mimes ): array {
        if ( ! self::is_font_uploads_enabled() ) {
            return $mimes;
        }

        foreach ( self::$font_types as $extension => $mime_type ) {
            $mimes[ $extension ] = $mime_type;
        }

        return $mimes;
    }


    /**
     * Fix WordPress filetype validation for font files.
     *
     * @since 2.0.0
     * @param array       $data File data array.
     * @param string      $file Full path to the file.
     * @param string      $filename Uploaded filename.
     * @param array       $mimes Allowed mime types.
     * @param string|null $real_mime Detected mime type.
     * @return array Modified file data.
     */
    public static function fix_font_filetype_check( $data, $file, $filename, $mimes, $real_mime = null ): array {
        if ( ! self::is_font_uploads_enabled() ) {
            return $data;
        }

        $ext = strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) );

        if ( ! isset( self::$font_types[ $ext ] ) ) {
            return $data;
        }

        return array(
            'ext'             => $ext,
            'type'            => self::$font_types[ $ext ],
            'proper_filename' => $filename,
        );
    }
}