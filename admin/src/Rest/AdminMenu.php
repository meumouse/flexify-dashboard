<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\App\Plugin;

use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class AdminMenu
 *
 * The WordPress admin menu as data.
 *
 * WordPress builds the menu in the `$menu` and `$submenu` globals and then prints it as
 * markup. The sidebar used to be rebuilt by walking that markup — reading the links, the
 * names, the notification bubbles and even the glyph out of a `:before` pseudo-element. This
 * reads the globals instead, which is where the menu actually is.
 *
 * The menu is printed into the page as JSON, because that is what it cost before: the markup
 * was already there and the sidebar drew without waiting. The route exists for anything that
 * needs the menu without being on an admin page.
 *
 * @since 4.1.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class AdminMenu {

	/**
	 * REST namespace.
	 *
	 * @since 4.1.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Id of the script tag the menu is printed into.
	 *
	 * @since 4.1.0
	 * @var string
	 */
	public const SCRIPT_ID = 'fd-admin-menu';


	/**
	 * Register hooks.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_action( 'admin_print_footer_scripts', array( $this, 'print_menu' ), 1 );
	}


	/**
	 * Register REST API routes.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin-menu',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_menu_response' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}


	/**
	 * Whether the current user may read the menu.
	 *
	 * The menu is the user's own: every item in it was already filtered by the capability
	 * WordPress recorded for it, so reading the dashboard is enough.
	 *
	 * @since 4.1.0
	 * @return bool
	 */
	public function check_permissions() {
		return current_user_can( 'read' );
	}


	/**
	 * Answer with the menu.
	 *
	 * @since 4.1.0
	 * @return WP_REST_Response
	 */
	public function get_menu_response() {
		return rest_ensure_response( self::get_menu() );
	}


	/**
	 * Print the menu into the admin page as JSON.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function print_menu() {
		// Printing a menu nothing reads is waste, and the shell uses this tag to know it is on
		// a screen it draws.
		if ( ! is_user_logged_in() || ! Plugin::is_shell_active() ) {
			return;
		}

		printf(
			'<script type="application/json" id="%s">%s</script>',
			esc_attr( self::SCRIPT_ID ),
			wp_json_encode( self::get_menu() ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON inside a non-executed script tag.
		);
	}


	/**
	 * The admin menu, as the current user sees it.
	 *
	 * Outside an admin request the globals are empty, so the menu is built first. That is what
	 * makes the REST route answer the same thing the page prints.
	 *
	 * @since 4.1.0
	 * @return array
	 */
	public static function get_menu() {
		global $menu, $submenu;

		if ( empty( $menu ) ) {
			self::build_menu();
		}

		$items = array();

		foreach ( (array) $menu as $entry ) {
			$item = self::format_item( $entry, $submenu );

			if ( $item ) {
				$items[] = $item;
			}
		}

		return $items;
	}


	/**
	 * Build the menu outside an admin request.
	 *
	 * `wp-admin/includes/menu.php` is what fires `admin_menu` and leaves the globals filled;
	 * it also calls functions from the admin includes, which REST has not loaded.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	private static function build_menu() {
		if ( ! function_exists( 'add_menu_page' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'get_admin_page_parent' ) ) {
			require_once ABSPATH . 'wp-admin/includes/screen.php';
		}

		require_once ABSPATH . 'wp-admin/includes/menu.php';
	}


	/**
	 * Turn one `$menu` entry into an item.
	 *
	 * The entry is a positional array: title, capability, file, page title, classes, id, icon.
	 *
	 * @since 4.1.0
	 * @param array $entry   Menu entry.
	 * @param array $submenu Submenu global.
	 * @return array|null Null when the user cannot see it.
	 */
	private static function format_item( $entry, $submenu ) {
		$capability = isset( $entry[1] ) ? $entry[1] : '';
		$file = isset( $entry[2] ) ? $entry[2] : '';
		$classes = isset( $entry[4] ) ? explode( ' ', (string) $entry[4] ) : array();

		if ( in_array( 'wp-menu-separator', $classes, true ) ) {
			return array(
				'id' => isset( $entry[5] ) ? $entry[5] : $file,
				'type' => 'separator',
			);
		}

		if ( $capability && ! current_user_can( $capability ) ) {
			return null;
		}

		$title = self::split_title( isset( $entry[0] ) ? $entry[0] : '' );

		return array(
			'id' => isset( $entry[5] ) && '' !== $entry[5] ? $entry[5] : self::id_for( $file ),
			'name' => $title['name'],
			'url' => self::url_for( $file ),
			'notifications' => $title['count'],
			'icon' => self::icon_for( isset( $entry[6] ) ? $entry[6] : '' ),
			'classes' => array_values( array_filter( $classes ) ),
			'submenu' => self::format_submenu( $file, $submenu ),
		);
	}


	/**
	 * Turn the children of one menu file into submenu items.
	 *
	 * @since 4.1.0
	 * @param string $file    Parent file.
	 * @param array  $submenu Submenu global.
	 * @return array
	 */
	private static function format_submenu( $file, $submenu ) {
		$children = isset( $submenu[ $file ] ) ? (array) $submenu[ $file ] : array();
		$items = array();

		foreach ( $children as $child ) {
			$capability = isset( $child[1] ) ? $child[1] : '';

			if ( $capability && ! current_user_can( $capability ) ) {
				continue;
			}

			$classes = isset( $child[4] ) ? explode( ' ', (string) $child[4] ) : array();

			// WordPress hides these from anyone with JavaScript, and so does the sidebar.
			if ( in_array( 'hide-if-js', $classes, true ) ) {
				continue;
			}

			$slug = isset( $child[2] ) ? $child[2] : '';
			$title = self::split_title( isset( $child[0] ) ? $child[0] : '' );

			$items[] = array(
				'id' => self::id_for( $slug ),
				'name' => $title['name'],
				'url' => self::url_for( $slug, $file ),
				'notifications' => $title['count'],
				'classes' => array_values( array_filter( $classes ) ),
			);
		}

		return $items;
	}


	/**
	 * Separate a menu title from the bubble WordPress hides inside it.
	 *
	 * A title such as `Plugins <span class="update-plugins count-3">…</span>` carries the
	 * number of pending updates as markup. Reading it here is the whole reason the sidebar
	 * used to go looking in the DOM.
	 *
	 * @since 4.1.0
	 * @param string $title Raw menu title.
	 * @return array {
	 *     @type string   $name  Title without the bubble.
	 *     @type int|null $count The number, when there is one.
	 * }
	 */
	private static function split_title( $title ) {
		$count = null;

		if ( preg_match( '/<span[^>]*class="[^"]*count[^"]*"[^>]*>.*?(\d[\d.,]*).*?<\/span>/is', (string) $title, $matches ) ) {
			$count = (int) preg_replace( '/\D/', '', $matches[1] );
		}

		$name = wp_strip_all_tags( (string) $title );

		return array(
			'name' => trim( html_entity_decode( $name, ENT_QUOTES, 'UTF-8' ) ),
			'count' => $count ? $count : null,
		);
	}


	/**
	 * The icon of a top-level item.
	 *
	 * WordPress accepts four things in that slot: a dashicon class, an image URL, `none` and
	 * `div`. The last two mean the plugin paints the icon from its own stylesheet, which it
	 * can still do — our sidebar gives the item the same id and classes WordPress would.
	 *
	 * @since 4.1.0
	 * @param string $icon Raw icon value.
	 * @return array {
	 *     @type string $kind  dashicon, image or none.
	 *     @type string $value Class or URL.
	 * }
	 */
	private static function icon_for( $icon ) {
		$icon = (string) $icon;

		if ( '' === $icon || 'none' === $icon || 'div' === $icon ) {
			return array( 'kind' => 'none', 'value' => '' );
		}

		if ( 0 === strpos( $icon, 'dashicons-' ) ) {
			return array( 'kind' => 'dashicon', 'value' => $icon );
		}

		if ( 0 === strpos( $icon, 'data:image/svg+xml;base64,' ) || preg_match( '#^https?://#', $icon ) || 0 === strpos( $icon, '/' ) ) {
			return array( 'kind' => 'image', 'value' => $icon );
		}

		// Anything else is a class name a plugin styles itself.
		return array( 'kind' => 'dashicon', 'value' => $icon );
	}


	/**
	 * The URL a menu file points at.
	 *
	 * A file is either a real admin file (`edit.php?post_type=page`) or a page slug registered
	 * with `add_menu_page`, and the two are told apart the same way WordPress does it.
	 *
	 * @since 4.1.0
	 * @param string $file   Menu file or page slug.
	 * @param string $parent Parent file, for a submenu item.
	 * @return string
	 */
	private static function url_for( $file, $parent = '' ) {
		$file = (string) $file;

		if ( '' === $file ) {
			return '';
		}

		if ( preg_match( '#^(https?:)?//#', $file ) ) {
			return $file;
		}

		$base = strtok( $file, '?' );

		if ( '.php' === substr( $base, -4 ) ) {
			return admin_url( $file );
		}

		$parent_base = $parent ? strtok( (string) $parent, '?' ) : '';
		$host = $parent_base && '.php' === substr( $parent_base, -4 ) ? $parent : 'admin.php';

		return admin_url( add_query_arg( 'page', $file, $host ) );
	}


	/**
	 * The id WordPress gives a menu item, for stylesheets that target it.
	 *
	 * @since 4.1.0
	 * @param string $file Menu file or page slug.
	 * @return string
	 */
	private static function id_for( $file ) {
		return 'menu-' . sanitize_key( str_replace( array( '.php', '?', '=', '&' ), '-', (string) $file ) );
	}
}
