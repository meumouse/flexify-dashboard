<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Rest\MenuCache;
use MeuMouse\Flexify_Dashboard\Utility\Scripts;

use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class MenuBuilder
 *
 * Handle admin menu builder registration, post type setup,
 * meta registration and assets loading.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class MenuBuilder {

	/**
	 * Constructor.
	 *
	 * Register hooks for menu builder initialization.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'admin_menu', array( __CLASS__, 'admin_settings_page' ) );
		add_action( 'init', array( __CLASS__, 'create_post_type' ) );
		add_action( 'init', array( __CLASS__, 'register_meta' ) );
		add_filter( 'rest_flexify-dashboard-menu_query', array( __CLASS__, 'rest_permission_callback' ), 10, 2 );

		new MenuCache();
	}


	/**
	 * Handle custom permission callback for REST API requests.
	 *
	 * @since 2.0.0
	 * @param array           $args    Query arguments.
	 * @param WP_REST_Request $request Full details about the request.
	 * @return array|WP_REST_Response Query args on success or REST response on failure.
	 */
	public static function rest_permission_callback( $args, WP_REST_Request $request ) {
		if ( ! is_user_logged_in() ) {
			return new WP_REST_Response( 'You must be logged in to access this endpoint.', 401 );
		}

		if ( 'GET' === $request->get_method() ) {
			return $args;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_REST_Response( 'You do not have permission to edit this resource.', 401 );
		}

		return $args;
	}


	/**
	 * Add the menu creator settings page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function admin_settings_page() {
		$menu_name = __( 'Menu Creator', 'flexify-dashboard' );

		$hook_suffix = add_submenu_page(
			'flexify-dashboard-settings',
			$menu_name,
			$menu_name,
			'manage_options',
			'flexify-dashboard-menucreator',
			array( __CLASS__, 'build_uipc_menu_creator' )
		);

		if ( ! $hook_suffix ) {
			return;
		}

		add_action( "admin_head-{$hook_suffix}", array( __CLASS__, 'load_styles' ) );
		add_action( "admin_head-{$hook_suffix}", array( __CLASS__, 'load_scripts' ) );
	}


	/**
	 * Register meta fields for the custom menu post type.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function register_meta() {
		foreach ( self::return_meta_types() as $type ) {
			register_meta(
				'post',
				$type['name'],
				array(
					'object_subtype'    => 'flexify-dashboard-menu',
					'single'            => true,
					'default'           => $type['default'],
					'show_in_rest'      => array(
						'schema' => array(
							'type'       => $type['type'],
							'default'    => $type['default'],
							'context'    => array( 'edit', 'view', 'embed' ),
							'properties' => isset( $type['properties'] ) ? $type['properties'] : null,
						),
					),
					'auth_callback'     => function() {
						return is_user_logged_in();
					},
					'sanitize_callback' => $type['sanitize'],
				)
			);
		}
	}


	/**
	 * Sanitize menu item fields.
	 *
	 * @since 2.0.0
	 * @param mixed  $meta_value     Meta value.
	 * @param string $meta_key       Meta key.
	 * @param string $object_type    Object type.
	 * @param string $object_subtype Object subtype.
	 * @return array Sanitized menu items.
	 */
	public static function sanitize_fields( $meta_value, $meta_key, $object_type, $object_subtype ) {
		$sanitized_value = array();

		if ( ! is_array( $meta_value ) ) {
			return $sanitized_value;
		}

		foreach ( $meta_value as $link ) {
			$sanitized_value[] = self::sanitize_menu_item( $link );
		}

		return $sanitized_value;
	}


	/**
	 * Sanitize a single menu item.
	 *
	 * @since 2.0.0
	 * @param array $link Menu item data.
	 * @return array Sanitized menu item.
	 */
	private static function sanitize_menu_item( $link ) {
		$sanitized_link = array(
			'id'           => isset( $link['id'] ) ? sanitize_text_field( $link['id'] ) : '',
			'custom'       => isset( $link['custom'] ) ? (bool) $link['custom'] : false,
			'name'         => isset( $link['name'] ) ? sanitize_text_field( $link['name'] ) : '',
			'url'          => isset( $link['url'] ) ? esc_url_raw( $link['url'] ) : '',
			'imageClasses' => isset( $link['imageClasses'] ) ? self::sanitize_array( $link['imageClasses'] ) : array(),
			'iconStyles'   => isset( $link['iconStyles'] ) ? sanitize_text_field( $link['iconStyles'] ) : '',
			'target'       => isset( $link['target'] ) ? sanitize_text_field( $link['target'] ) : '',
			'type'         => isset( $link['type'] ) ? sanitize_text_field( $link['type'] ) : '',
		);

		if ( isset( $link['settings'] ) && is_array( $link['settings'] ) ) {
			$sanitized_link['settings'] = array(
				'name'     => isset( $link['settings']['name'] ) ? sanitize_text_field( $link['settings']['name'] ) : '',
				'icon'     => isset( $link['settings']['icon'] ) ? sanitize_text_field( $link['settings']['icon'] ) : '',
				'open_new' => isset( $link['settings']['open_new'] ) ? (bool) $link['settings']['open_new'] : false,
				'hidden'   => isset( $link['settings']['hidden'] ) ? (bool) $link['settings']['hidden'] : false,
			);
		}

		if ( isset( $link['submenu'] ) && is_array( $link['submenu'] ) ) {
			$sanitized_link['submenu'] = array();

			foreach ( $link['submenu'] as $sublink ) {
				$sanitized_link['submenu'][] = self::sanitize_menu_item( $sublink );
			}
		}

		return $sanitized_link;
	}


	/**
	 * Sanitize an array of scalar values.
	 *
	 * @since 2.0.0
	 * @param mixed $items Array items.
	 * @return array Sanitized array.
	 */
	private static function sanitize_array( $items ) {
		$sanitized_value = array();

		if ( ! is_array( $items ) ) {
			return $sanitized_value;
		}

		foreach ( $items as $item ) {
			$sanitized_value[] = sanitize_text_field( $item );
		}

		return $sanitized_value;
	}


	/**
	 * Sanitize menu settings field.
	 *
	 * @since 2.0.0
	 * @param mixed  $meta_value     Meta value.
	 * @param string $meta_key       Meta key.
	 * @param string $object_type    Object type.
	 * @param string $object_subtype Object subtype.
	 * @return array Sanitized settings.
	 */
	public static function sanitize_settings( $meta_value, $meta_key, $object_type, $object_subtype ) {
		$sanitized_value = array();

		if ( ! is_array( $meta_value ) ) {
			return $sanitized_value;
		}

		if ( isset( $meta_value['applies_to_everyone'] ) ) {
			$sanitized_value['applies_to_everyone'] = (bool) $meta_value['applies_to_everyone'];
		}

		if ( isset( $meta_value['includes'] ) && is_array( $meta_value['includes'] ) ) {
			$sanitized_value['includes'] = self::sanitize_settings_groups( $meta_value['includes'] );
		}

		if ( isset( $meta_value['excludes'] ) && is_array( $meta_value['excludes'] ) ) {
			$sanitized_value['excludes'] = self::sanitize_settings_groups( $meta_value['excludes'] );
		}

		return $sanitized_value;
	}


	/**
	 * Sanitize include and exclude settings groups.
	 *
	 * @since 2.0.0
	 * @param array $items Settings items.
	 * @return array Sanitized settings items.
	 */
	private static function sanitize_settings_groups( $items ) {
		$formatted_types = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$formatted_types[] = array(
				'id'    => isset( $item['id'] ) ? absint( $item['id'] ) : 0,
				'value' => isset( $item['value'] ) ? sanitize_text_field( $item['value'] ) : '',
				'type'  => isset( $item['type'] ) ? sanitize_text_field( $item['type'] ) : '',
			);
		}

		return $formatted_types;
	}


	/**
	 * Return meta type definitions.
	 *
	 * @since 2.0.0
	 * @return array Meta type definitions.
	 */
	private static function return_meta_types() {
		return array(
			array(
				'name'       => 'menu_settings',
				'type'       => 'object',
				'default'    => new \stdClass(),
				'sanitize'   => array( __CLASS__, 'sanitize_settings' ),
				'properties' => array(
					'applies_to_everyone' => array(
						'type'    => 'boolean',
						'default' => false,
					),
					'includes'            => array(
						'type'    => 'array',
						'default' => array(),
					),
					'excludes'            => array(
						'type'    => 'array',
						'default' => array(),
					),
				),
			),
			array(
				'name'     => 'menu_items',
				'type'     => 'array',
				'default'  => array(),
				'sanitize' => array( __CLASS__, 'sanitize_fields' ),
			),
		);
	}


	/**
	 * Register the custom post type used by the menu builder.
	 *
	 * @since 3.2.13
	 * @return void
	 */
	public static function create_post_type() {
		register_post_type( 'flexify-dash-menu', self::return_post_type_args() );
	}


	/**
	 * Return post type arguments.
	 *
	 * @since 3.2.13
	 * @return array Post type arguments.
	 */
	private static function return_post_type_args() {
		$labels = array(
			'name'               => _x( 'Admin Menu', 'post type general name', 'flexify-dashboard' ),
			'singular_name'      => _x( 'Admin Menu', 'post type singular name', 'flexify-dashboard' ),
			'menu_name'          => _x( 'Admin Menus', 'admin menu', 'flexify-dashboard' ),
			'name_admin_bar'     => _x( 'Admin Menu', 'add new on admin bar', 'flexify-dashboard' ),
			'add_new'            => _x( 'Add New', 'Template', 'flexify-dashboard' ),
			'add_new_item'       => __( 'Add New Admin Menu', 'flexify-dashboard' ),
			'new_item'           => __( 'New Admin Menu', 'flexify-dashboard' ),
			'edit_item'          => __( 'Edit Admin Menu', 'flexify-dashboard' ),
			'view_item'          => __( 'View Admin Menu', 'flexify-dashboard' ),
			'all_items'          => __( 'All Admin Menus', 'flexify-dashboard' ),
			'search_items'       => __( 'Search Admin Menus', 'flexify-dashboard' ),
			'not_found'          => __( 'No Admin Menus found.', 'flexify-dashboard' ),
			'not_found_in_trash' => __( 'No Admin Menus found in Trash.', 'flexify-dashboard' ),
		);

		return array(
			'labels'             => $labels,
			'description'        => __( 'Post type used for the flexify-dashboards menus', 'flexify-dashboard' ),
			'public'             => false,
			'publicly_queryable' => false,
			'show_ui'            => false,
			'show_in_menu'       => false,
			'query_var'          => false,
			'has_archive'        => false,
			'hierarchical'       => false,
			'supports'           => array( 'title', 'custom-fields' ),
			'show_in_rest'       => true,
			'rest_base'          => 'flexify-dashboard-menus',
		);
	}


	/**
	 * Render the menu creator app container.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function build_uipc_menu_creator() {
		echo '<div id="fd-menu-creator-app"></div>';
	}


	/**
	 * Load menu creator styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_styles() {
		$base_url   = plugins_url( 'flexify-dashboard/' );
		$style_path = $base_url . 'app/dist/assets/styles/menu-creator.css';

		wp_enqueue_style( 'flexify-dashboard-menu-creator', $style_path, array(), FLEXIFY_DASHBOARD_VERSION );

		add_filter(
			'flexify-dashboard/style-layering/exclude',
			function( $excluded_patterns ) use ( $style_path ) {
				$excluded_patterns[] = $style_path;

				return $excluded_patterns;
			}
		);
	}


	/**
	 * Load menu creator scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load_scripts() {
		$base_url    = plugins_url( 'flexify-dashboard/' );
		$script_name = Scripts::get_base_script_path( 'MenuCreator.js' );

		wp_print_script_tag(
			array(
				'id'   => 'fd-menu-creator-script',
				'src'  => $base_url . "app/dist/{$script_name}",
				'type' => 'module',
			)
		);
	}
}