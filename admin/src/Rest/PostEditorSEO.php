<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

defined('ABSPATH') || exit;

/**
 * Class PostEditorSEO
 *
 * Output SEO meta tags for singular content and adjust document title when
 * custom SEO fields are available.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class PostEditorSEO {
	/**
	 * Meta key for custom title.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const META_TITLE = 'fd_meta_title';

	/**
	 * Meta key for custom description.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const META_DESCRIPTION = 'fd_meta_description';

	/**
	 * Meta key for custom canonical URL.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const META_CANONICAL_URL = 'fd_canonical_url';


	/**
	 * Class constructor.
	 *
	 * Register hooks for SEO output.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'wp_head', array( __CLASS__, 'output_seo_meta_tags' ), 1 );
		add_filter( 'document_title_parts', array( __CLASS__, 'modify_document_title' ), 10, 1 );
	}


	/**
	 * Output SEO meta tags in the frontend head.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function output_seo_meta_tags() {
		$post = self::get_current_singular_post();

		if ( ! $post ) {
			return;
		}

		$seo_data = self::get_post_seo_data( $post->ID );

		if ( ! empty( $seo_data['meta_description'] ) ) {
			echo '<meta name="description" content="' . esc_attr( $seo_data['meta_description'] ) . "\" />\n";
			echo '<meta property="og:description" content="' . esc_attr( $seo_data['meta_description'] ) . "\" />\n";
			echo '<meta name="twitter:description" content="' . esc_attr( $seo_data['meta_description'] ) . "\" />\n";
		}

		echo '<link rel="canonical" href="' . esc_url( $seo_data['canonical_url'] ) . "\" />\n";

		if ( ! empty( $seo_data['meta_title'] ) ) {
			echo '<meta property="og:title" content="' . esc_attr( $seo_data['meta_title'] ) . "\" />\n";
			echo '<meta name="twitter:title" content="' . esc_attr( $seo_data['meta_title'] ) . "\" />\n";
		}

		echo '<meta property="og:url" content="' . esc_url( $seo_data['canonical_url'] ) . "\" />\n";
		echo '<meta property="og:type" content="' . esc_attr( self::get_og_type( $post ) ) . "\" />\n";
		echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";

		$site_name = get_bloginfo( 'name' );

		if ( ! empty( $site_name ) ) {
			echo '<meta property="og:site_name" content="' . esc_attr( $site_name ) . "\" />\n";
		}

		self::output_featured_image_meta( $post->ID );
	}


	/**
	 * Modify the document title parts when a custom SEO title exists.
	 *
	 * @since 2.0.0
	 * @param array $title_parts Document title parts.
	 * @return array
	 */
	public static function modify_document_title( $title_parts ) {
		$post = self::get_current_singular_post();

		if ( ! $post ) {
			return $title_parts;
		}

		$meta_title = get_post_meta( $post->ID, self::META_TITLE, true );

		if ( ! empty( $meta_title ) ) {
			$title_parts['title'] = sanitize_text_field( $meta_title );
		}

		return $title_parts;
	}


	/**
	 * Get current singular post object when available.
	 *
	 * @since 2.0.0
	 * @return \WP_Post|null
	 */
	private static function get_current_singular_post() {
		if ( ! is_singular() ) {
			return null;
		}

		$post = get_queried_object();

		if ( ! $post instanceof \WP_Post ) {
			return null;
		}

		return $post;
	}


	/**
	 * Get SEO data for a post.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return array
	 */
	private static function get_post_seo_data( $post_id ) {
		$meta_title = get_post_meta( $post_id, self::META_TITLE, true );
		$meta_description = get_post_meta( $post_id, self::META_DESCRIPTION, true );
		$canonical_url = get_post_meta( $post_id, self::META_CANONICAL_URL, true );
		$post_url = get_permalink( $post_id );

		return array(
			'meta_title'       => ! empty( $meta_title ) ? sanitize_text_field( $meta_title ) : '',
			'meta_description' => ! empty( $meta_description ) ? sanitize_textarea_field( $meta_description ) : '',
			'canonical_url'    => ! empty( $canonical_url ) ? esc_url_raw( $canonical_url ) : $post_url,
		);
	}


	/**
	 * Output featured image SEO meta tags.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return void
	 */
	private static function output_featured_image_meta( $post_id ) {
		$featured_image_id = get_post_thumbnail_id( $post_id );

		if ( empty( $featured_image_id ) ) {
			return;
		}

		$featured_image_url = wp_get_attachment_image_url( $featured_image_id, 'large' );

		if ( empty( $featured_image_url ) ) {
			return;
		}

		echo '<meta property="og:image" content="' . esc_url( $featured_image_url ) . "\" />\n";
		echo '<meta name="twitter:image" content="' . esc_url( $featured_image_url ) . "\" />\n";

		$image_meta = wp_get_attachment_metadata( $featured_image_id );

		if ( empty( $image_meta ) || ! is_array( $image_meta ) ) {
			return;
		}

		if ( isset( $image_meta['width'] ) ) {
			echo '<meta property="og:image:width" content="' . esc_attr( absint( $image_meta['width'] ) ) . "\" />\n";
		}

		if ( isset( $image_meta['height'] ) ) {
			echo '<meta property="og:image:height" content="' . esc_attr( absint( $image_meta['height'] ) ) . "\" />\n";
		}
	}


	/**
	 * Get the appropriate Open Graph type for the current post.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @return string
	 */
	private static function get_og_type( $post ) {
		if ( 'post' === get_post_type( $post ) ) {
			return 'article';
		}

		return 'website';
	}
}