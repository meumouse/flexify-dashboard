<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class LocationDataProvider
 *
 * Provides location data for the UI.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class LocationDataProvider {

	/**
	 * Custom post types JSON file path.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $custom_post_types_file;

	/**
	 * Options pages JSON file path.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $options_pages_file;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 */
	public function __construct() {
		$this->custom_post_types_file = WP_CONTENT_DIR . '/flexify-dashboard-custom-post-types.json';
		$this->options_pages_file     = WP_CONTENT_DIR . '/flexify-dashboard-options-pages.json';
	}


	/**
	 * Get available post types for location rules.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_post_types() {
		$post_types = get_post_types( array( 'public' => true ), 'objects' );
		$result     = array();

		foreach ( $post_types as $post_type ) {
			$result[] = array(
				'name'     => $post_type->name,
				'label'    => $post_type->label,
				'singular' => isset( $post_type->labels->singular_name ) ? $post_type->labels->singular_name : $post_type->label,
			);
		}

		foreach ( $this->get_custom_post_types() as $custom_post_type ) {
			if ( $this->item_exists_by_key( $result, 'name', $custom_post_type['slug'] ) ) {
				continue;
			}

			$result[] = array(
				'name'     => $custom_post_type['slug'],
				'label'    => $custom_post_type['name'],
				'singular' => ! empty( $custom_post_type['singular_name'] ) ? $custom_post_type['singular_name'] : $custom_post_type['name'],
			);
		}

		return $result;
	}


	/**
	 * Get available templates for location rules.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_templates() {
		$templates = wp_get_theme()->get_page_templates();
		$result    = array(
			array(
				'value' => 'default',
				'label' => __( 'Default Template', 'flexify-dashboard' ),
			),
		);

		foreach ( $templates as $filename => $name ) {
			$result[] = array(
				'value' => $filename,
				'label' => $name,
			);
		}

		return $result;
	}


	/**
	 * Get all location rule data for the UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_location_data() {
		return array(
			'post_types'     => $this->get_ui_post_types(),
			'taxonomies'     => $this->get_ui_taxonomies(),
			'taxonomy_terms' => $this->get_ui_taxonomy_terms(),
			'user_roles'     => $this->get_ui_user_roles(),
			'users'          => $this->get_ui_users(),
			'page_templates' => $this->get_ui_page_templates(),
			'post_formats'   => $this->get_ui_post_formats(),
			'nav_menus'      => $this->get_ui_nav_menus(),
			'nav_menu_items' => $this->get_ui_nav_menu_items(),
			'widgets'        => $this->get_ui_widgets(),
			'options_pages'  => $this->get_ui_options_pages(),
		);
	}


	/**
	 * Get post types for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_post_types() {
		$post_types = get_post_types( array( 'public' => true ), 'objects' );
		$result     = array(
			array(
				'value' => 'all',
				'label' => __( 'All', 'flexify-dashboard' ),
			),
		);

		foreach ( $post_types as $post_type ) {
			$result[] = array(
				'value' => $post_type->name,
				'label' => $post_type->label,
			);
		}

		foreach ( $this->get_custom_post_types() as $custom_post_type ) {
			if ( $this->item_exists_by_key( $result, 'value', $custom_post_type['slug'] ) ) {
				continue;
			}

			$result[] = array(
				'value' => $custom_post_type['slug'],
				'label' => $custom_post_type['name'],
			);
		}

		return $result;
	}


	/**
	 * Get taxonomies for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_taxonomies() {
		$taxonomies = get_taxonomies( array( 'public' => true ), 'objects' );
		$result     = array(
			array(
				'value' => 'all',
				'label' => __( 'All', 'flexify-dashboard' ),
			),
		);

		foreach ( $taxonomies as $taxonomy ) {
			$result[] = array(
				'value' => $taxonomy->name,
				'label' => $taxonomy->label,
			);
		}

		return $result;
	}


	/**
	 * Get taxonomy terms grouped by taxonomy for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_taxonomy_terms() {
		$taxonomies = get_taxonomies( array( 'public' => true ), 'objects' );
		$result     = array();

		foreach ( $taxonomies as $taxonomy ) {
			$terms = get_terms(
				array(
					'taxonomy'   => $taxonomy->name,
					'hide_empty' => false,
					'number'     => 100,
				)
			);

			if ( is_wp_error( $terms ) || empty( $terms ) ) {
				continue;
			}

			$taxonomy_terms = array();

			foreach ( $terms as $term ) {
				$taxonomy_terms[] = array(
					'value' => $term->term_id,
					'label' => $term->name,
					'slug'  => $term->slug,
				);
			}

			$result[ $taxonomy->name ] = array(
				'label' => $taxonomy->label,
				'terms' => $taxonomy_terms,
			);
		}

		return $result;
	}


	/**
	 * Get user roles for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_user_roles() {
		global $wp_roles;

		$result = array(
			array(
				'value' => 'all',
				'label' => __( 'All', 'flexify-dashboard' ),
			),
		);

		if ( ! isset( $wp_roles ) || empty( $wp_roles->roles ) || ! is_array( $wp_roles->roles ) ) {
			return $result;
		}

		foreach ( $wp_roles->roles as $role_slug => $role ) {
			$result[] = array(
				'value' => $role_slug,
				'label' => isset( $role['name'] ) ? $role['name'] : $role_slug,
			);
		}

		return $result;
	}


	/**
	 * Get users for location rules UI.
	 *
	 * Limited for performance.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_users() {
		$users = get_users(
			array(
				'number'  => 100,
				'orderby' => 'display_name',
				'order'   => 'ASC',
			)
		);

		$result = array();

		foreach ( $users as $user ) {
			$result[] = array(
				'value' => $user->ID,
				'label' => $user->display_name . ' (' . $user->user_login . ')',
			);
		}

		return $result;
	}


	/**
	 * Get page templates for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_page_templates() {
		$templates = wp_get_theme()->get_page_templates();
		$result    = array(
			array(
				'value' => 'default',
				'label' => __( 'Default Template', 'flexify-dashboard' ),
			),
		);

		foreach ( $templates as $filename => $name ) {
			$result[] = array(
				'value' => $filename,
				'label' => $name,
			);
		}

		return $result;
	}


	/**
	 * Get post formats for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_post_formats() {
		$result = array(
			array(
				'value' => 'all',
				'label' => __( 'All', 'flexify-dashboard' ),
			),
			array(
				'value' => 'standard',
				'label' => __( 'Standard', 'flexify-dashboard' ),
			),
		);

		if ( ! current_theme_supports( 'post-formats' ) ) {
			return $result;
		}

		$formats = get_theme_support( 'post-formats' );

		if ( ! is_array( $formats ) || empty( $formats[0] ) ) {
			return $result;
		}

		foreach ( $formats[0] as $format ) {
			$result[] = array(
				'value' => $format,
				'label' => ucfirst( $format ),
			);
		}

		return $result;
	}


	/**
	 * Get navigation menus for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_nav_menus() {
		$menus  = wp_get_nav_menus();
		$result = array(
			array(
				'value' => 'all',
				'label' => __( 'All', 'flexify-dashboard' ),
			),
		);

		foreach ( $menus as $menu ) {
			$result[] = array(
				'value' => $menu->term_id,
				'label' => $menu->name,
			);
		}

		return $result;
	}


	/**
	 * Get navigation menu items for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_nav_menu_items() {
		$menus  = wp_get_nav_menus();
		$result = array();

		foreach ( $menus as $menu ) {
			$items = wp_get_nav_menu_items( $menu->term_id );

			if ( empty( $items ) ) {
				continue;
			}

			$menu_items = array();

			foreach ( $items as $item ) {
				$menu_items[] = array(
					'value' => $item->ID,
					'label' => $item->title,
				);
			}

			$result[ $menu->term_id ] = array(
				'label' => $menu->name,
				'items' => $menu_items,
			);
		}

		return $result;
	}


	/**
	 * Get widget areas for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_widgets() {
		global $wp_registered_sidebars;

		$result = array(
			array(
				'value' => 'all',
				'label' => __( 'All', 'flexify-dashboard' ),
			),
		);

		if ( empty( $wp_registered_sidebars ) || ! is_array( $wp_registered_sidebars ) ) {
			return $result;
		}

		foreach ( $wp_registered_sidebars as $sidebar_id => $sidebar ) {
			$result[] = array(
				'value' => $sidebar_id,
				'label' => isset( $sidebar['name'] ) ? $sidebar['name'] : $sidebar_id,
			);
		}

		return $result;
	}


	/**
	 * Get options pages for location rules UI.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_ui_options_pages() {
		$result        = array();
		$options_pages = $this->read_json_file( $this->options_pages_file );

		if ( ! is_array( $options_pages ) ) {
			return $result;
		}

		foreach ( $options_pages as $page ) {
			if ( empty( $page['slug'] ) || empty( $page['active'] ) ) {
				continue;
			}

			$result[] = array(
				'value' => $page['slug'],
				'label' => ! empty( $page['title'] ) ? $page['title'] : $page['slug'],
			);
		}

		return $result;
	}


	/**
	 * Get custom post types from JSON file.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_custom_post_types() {
		$custom_post_types = $this->read_json_file( $this->custom_post_types_file );
		$result            = array();

		if ( ! is_array( $custom_post_types ) ) {
			return $result;
		}

		foreach ( $custom_post_types as $post_type ) {
			if ( empty( $post_type['slug'] ) || empty( $post_type['active'] ) || empty( $post_type['name'] ) ) {
				continue;
			}

			$result[] = $post_type;
		}

		return $result;
	}


	/**
	 * Read and decode a JSON file.
	 *
	 * @since 2.0.0
	 * @param string $file_path File path.
	 * @return array
	 */
	private function read_json_file( $file_path ) {
		if ( ! is_string( $file_path ) || '' === $file_path || ! file_exists( $file_path ) || ! is_readable( $file_path ) ) {
			return array();
		}

		$json_content = file_get_contents( $file_path );

		if ( false === $json_content || '' === $json_content ) {
			return array();
		}

		$decoded = json_decode( $json_content, true );

		return is_array( $decoded ) ? $decoded : array();
	}


	/**
	 * Check if an item exists in an array by key and value.
	 *
	 * @since 2.0.0
	 * @param array  $items Items array.
	 * @param string $key Array key.
	 * @param mixed  $value Value to compare.
	 * @return bool
	 */
	private function item_exists_by_key( $items, $key, $value ) {
		foreach ( $items as $item ) {
			if ( isset( $item[ $key ] ) && $item[ $key ] === $value ) {
				return true;
			}
		}

		return false;
	}
}