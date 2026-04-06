<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

defined('ABSPATH') || exit;

/**
 * Class PostEditorMeta
 *
 * Register SEO meta fields for public post types in the WordPress REST API.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class PostEditorMeta {
	/**
	 * Meta key for title.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const META_TITLE = 'fd_meta_title';

	/**
	 * Meta key for description.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const META_DESCRIPTION = 'fd_meta_description';

	/**
	 * Meta key for canonical URL.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const META_CANONICAL_URL = 'fd_canonical_url';


	/**
	 * Class constructor.
	 *
	 * Register hooks for post meta fields.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_meta_fields' ) );
	}


	/**
	 * Register SEO meta fields for all public post types.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_meta_fields() {
		$post_types = get_post_types(
			array(
				'public' => true,
			),
			'names'
		);

		if ( empty( $post_types ) || ! is_array( $post_types ) ) {
			return;
		}

		$meta_fields = self::get_meta_fields();

		foreach ( $post_types as $post_type ) {
			foreach ( $meta_fields as $meta_key => $args ) {
				register_meta(
					'post',
					$meta_key,
					array_merge(
						$args,
						array(
							'object_subtype' => $post_type,
						)
					)
				);
			}
		}
	}


	/**
	 * Get meta field definitions.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private static function get_meta_fields() {
		return array(
			self::META_TITLE => array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => array( __CLASS__, 'can_edit_post_meta' ),
			),
			self::META_DESCRIPTION => array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_textarea_field',
				'auth_callback'     => array( __CLASS__, 'can_edit_post_meta' ),
			),
			self::META_CANONICAL_URL => array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'esc_url_raw',
				'auth_callback'     => array( __CLASS__, 'can_edit_post_meta' ),
			),
		);
	}


	/**
	 * Check if the current user can edit the requested post meta.
	 *
	 * @since 2.0.0
	 * @param bool   $allowed   Whether the user can add the post meta. Default false.
	 * @param string $meta_key  The meta key.
	 * @param int    $post_id   Post object ID.
	 * @param int    $user_id   User ID.
	 * @param string $cap       Capability name.
	 * @param array  $caps      User capabilities.
	 * @return bool
	 */
	public static function can_edit_post_meta( $allowed, $meta_key, $post_id, $user_id, $cap, $caps ) {
		unset( $allowed, $meta_key, $user_id, $cap, $caps );

		if ( empty( $post_id ) ) {
			return current_user_can( 'edit_posts' );
		}

		return current_user_can( 'edit_post', $post_id );
	}
}