<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

use WP_Query;
use WP_Screen;

defined('ABSPATH') || exit;

/**
 * Class PostsList
 *
 * Handle the custom implementation of the WordPress admin posts list page.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class PostsList {

	/**
	 * Constructor.
	 *
	 * Register hooks for the posts list page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'load-edit.php', array( $this, 'init_posts_page' ) );
		// add_action( 'load-edit-comments.php', array( $this, 'init_comments_page' ) );
	}


	/**
	 * Initialize the custom posts page implementation.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init_posts_page() {
		if ( Settings::is_enabled( 'use_classic_post_tables' ) ) {
			return;
		}

		$screen = get_current_screen();

		if ( ! $screen instanceof WP_Screen ) {
			return;
		}

		global $wp_post_types;

		if ( in_array( $screen->post_type, array( 'product' ), true ) ) {
			return;
		}

		if (
			'edit' === $screen->base &&
			isset( $wp_post_types[ $screen->post_type ] ) &&
			! empty( $wp_post_types[ $screen->post_type ]->show_in_rest ) &&
			! empty( $wp_post_types[ $screen->post_type ]->rest_base )
		) {
			$this->prevent_default_loading();
			$this->setup_output_capture();

			add_action( 'admin_enqueue_scripts', array( __CLASS__, 'load_styles_and_scripts' ) );
		}
	}


	/**
	 * Initialize the custom comments page implementation.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init_comments_page() {
		$screen = get_current_screen();

		if ( ! $screen instanceof WP_Screen ) {
			return;
		}

		if ( 'edit-comments' === $screen->base ) {
			$this->prevent_default_loading();
			$this->setup_output_capture();

			add_action( 'admin_enqueue_scripts', array( __CLASS__, 'load_styles_and_scripts' ) );
		}
	}


	/**
	 * Load styles and scripts for the custom posts page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_styles_and_scripts() {
		$base_url   = plugins_url( 'flexify-dashboard/' );
		$style_path = $base_url . 'app/dist/assets/styles/posts.css';

		wp_enqueue_style( 'flexify-dashboard-posts', $style_path, array(), FLEXIFY_DASHBOARD_VERSION );

		add_filter(
			'flexify-dashboard/style-layering/exclude',
			function( $excluded_patterns ) use ( $style_path ) {
				$excluded_patterns[] = $style_path;

				return $excluded_patterns;
			}
		);

		$script_name = Scripts::get_base_script_path( 'Posts.js' );
		$post_type   = self::get_current_post_type();

		$supports_categories = is_object_in_taxonomy( $post_type, 'category' );
		$supports_tags       = is_object_in_taxonomy( $post_type, 'post_tag' );

		wp_print_script_tag(
			array(
				'id'                  => 'fd-posts-script',
				'src'                 => $base_url . "app/dist/{$script_name}",
				'type'                => 'module',
				'supports_categories' => esc_attr( $supports_categories ? 'true' : 'false' ),
				'supports_tags'       => esc_attr( $supports_tags ? 'true' : 'false' ),
				'post_statuses'       => esc_attr( wp_json_encode( self::get_post_type_statuses( $post_type ) ) ),
			)
		);
	}


	/**
	 * Get the current post type from the request.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private static function get_current_post_type() {
		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : 'post';

		return empty( $post_type ) ? 'post' : $post_type;
	}


	/**
	 * Get unique available post statuses for a given post type.
	 *
	 * Only statuses that are safe to use with the REST API
	 * and visible in the admin list are included.
	 *
	 * @since 2.0.0
	 * @param string $post_type The post type slug.
	 * @return array
	 */
	private static function get_post_type_statuses( $post_type ) {
		$statuses         = get_post_stati( array(), 'objects' );
		$post_type_object = get_post_type_object( $post_type );

		if ( ! $post_type_object || empty( $post_type_object->cap->edit_private_posts ) ) {
			return array();
		}

		$rest_safe_statuses = array( 'publish', 'future', 'draft', 'private' );
		$available_statuses = array();

		foreach ( $statuses as $status ) {
			if ( ! empty( $status->internal ) ) {
				continue;
			}

			if ( ! in_array( $status->name, $rest_safe_statuses, true ) && ( empty( $status->show_in_rest ) || ! $status->show_in_rest ) ) {
				continue;
			}

			if ( ! $status->show_in_admin_all_list && ! current_user_can( $post_type_object->cap->edit_private_posts ) ) {
				continue;
			}

			$available_statuses[ $status->name ] = array(
				'label' => $status->label,
				'value' => $status->name,
			);
		}

		return array_values( $available_statuses );
	}


	/**
	 * Prevent WordPress from loading default posts page components.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function prevent_default_loading() {
		remove_action( 'admin_init', '_wp_admin_bar_init' );
		remove_action( 'admin_init', 'wp_admin_bar_init' );

		add_filter( 'pre_get_posts', array( $this, 'modify_main_query' ) );
	}


	/**
	 * Modify the main query to prevent post loading.
	 *
	 * @since 2.0.0
	 * @param WP_Query $query The WordPress query object.
	 * @return WP_Query
	 */
	public function modify_main_query( $query ) {
		if ( $query instanceof WP_Query && $query->is_main_query() && is_admin() ) {
			$query->set( 'posts_per_page', 0 );
			$query->set( 'no_found_rows', true );
		}

		return $query;
	}


	/**
	 * Set up output buffering and custom content display.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function setup_output_capture() {
		add_action( 'in_admin_header', array( $this, 'start_output_buffer' ), 999 );
		add_action( 'admin_footer', array( $this, 'render_custom_content' ), 0 );
	}


	/**
	 * Start the output buffer.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function start_output_buffer() {
		ob_start();
	}


	/**
	 * Render the custom content for the posts page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_custom_content() {
		if ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		echo '<div id="fd-posts-page"></div>';
	}
}