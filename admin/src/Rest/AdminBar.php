<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\App\Plugin;

use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class AdminBar
 *
 * The WordPress toolbar as data.
 *
 * The shell used to move `#wpadminbar` bodily into its own top bar, because other plugins
 * hook those selectors. That left the one part of the interface we did not control sitting in
 * the middle of it. Now the nodes are read from `WP_Admin_Bar` and the bar is drawn by a
 * component like everything else.
 *
 * The cost is known and accepted: a plugin that finds `#wp-admin-bar-…` from JavaScript, to
 * add an item after the page has loaded, will not find it. What such a plugin registered
 * through `admin_bar_menu`, which is nearly all of them, is here. Styling hooks still work,
 * because the component gives each item the id and the classes WordPress would have.
 *
 * @since 4.1.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class AdminBar {

	/**
	 * REST namespace.
	 *
	 * @since 4.1.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Id of the script tag the toolbar is printed into.
	 *
	 * @since 4.1.0
	 * @var string
	 */
	public const SCRIPT_ID = 'fd-admin-bar';

	/**
	 * Nodes collected from the toolbar.
	 *
	 * @since 4.1.0
	 * @var array|null
	 */
	private $nodes = null;


	/**
	 * Register hooks.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_action( 'in_admin_header', array( $this, 'take_over_rendering' ), -1 );
		add_action( 'admin_print_footer_scripts', array( $this, 'print_bar' ), 1 );
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
			'/admin-bar',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_bar_response' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}


	/**
	 * Whether the current user may read the toolbar.
	 *
	 * @since 4.1.0
	 * @return bool
	 */
	public function check_permissions() {
		return current_user_can( 'read' );
	}


	/**
	 * Answer with the toolbar.
	 *
	 * @since 4.1.0
	 * @return WP_REST_Response
	 */
	public function get_bar_response() {
		return rest_ensure_response( $this->get_bar() );
	}


	/**
	 * Collect the toolbar instead of letting WordPress print it.
	 *
	 * `wp_admin_bar_render()` is where `admin_bar_menu` fires, so the hook cannot simply be
	 * removed: no plugin would get the chance to add anything. It is replaced by the same
	 * sequence, minus the call that writes the markup.
	 *
	 * This runs on `in_admin_header` and not on `admin_init` because the decision depends on
	 * the screen, and at `admin_init` there is no screen yet — on the block editor and the
	 * site editor the shell does not draw, and taking the toolbar away there would leave the
	 * page with none at all. Core renders at priority 0 on this same hook, so -1 is in time.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function take_over_rendering() {
		if ( ! Plugin::is_shell_active() ) {
			return;
		}

		remove_action( 'in_admin_header', 'wp_admin_bar_render', 0 );
		$this->collect();
	}


	/**
	 * Run the toolbar's own build, and keep the nodes.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function collect() {
		global $wp_admin_bar;

		if ( ! is_admin_bar_showing() || ! is_object( $wp_admin_bar ) ) {
			return;
		}

		do_action_ref_array( 'admin_bar_menu', array( &$wp_admin_bar ) );
		do_action( 'wp_before_admin_bar_render' );

		$this->nodes = $wp_admin_bar->get_nodes();

		do_action( 'wp_after_admin_bar_render' );
	}


	/**
	 * Print the toolbar into the page as JSON.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function print_bar() {
		if ( ! Plugin::is_shell_active() ) {
			return;
		}

		printf(
			'<script type="application/json" id="%s">%s</script>',
			esc_attr( self::SCRIPT_ID ),
			wp_json_encode( $this->get_bar() ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON inside a non-executed script tag.
		);
	}


	/**
	 * The toolbar, in the two halves it is drawn in.
	 *
	 * @since 4.1.0
	 * @return array {
	 *     @type array $primary   Items on the left.
	 *     @type array $secondary Items on the right.
	 * }
	 */
	public function get_bar() {
		$nodes = $this->get_nodes();

		return array(
			// `top-secondary` is itself a group sitting at the top, so the left side has to
			// leave it alone or everything on the right is drawn on both sides.
			'primary' => self::top_level( $nodes, array( '', 'root', 'root-default' ), array( 'top-secondary' ) ),
			'secondary' => self::top_level( $nodes, array( 'top-secondary' ), array() ),
		);
	}


	/**
	 * The items on one side of the bar.
	 *
	 * A node added without a parent only lands in the `root-default` group while WordPress is
	 * rendering — `_bind()` is called from `render()`, which is the one step this class skips.
	 * So the top of the bar is every node whose parent is one of the names that mean "the
	 * top", and nearly every node has none at all.
	 *
	 * @since 4.1.0
	 * @param array $nodes   Every node.
	 * @param array $parents Parent ids that count as this side of the bar.
	 * @param array $skip    Node ids to leave to the other side.
	 * @return array
	 */
	private static function top_level( $nodes, $parents, $skip ) {
		$items = array();

		foreach ( (array) $nodes as $node ) {
			$parent = isset( $node->parent ) && $node->parent ? (string) $node->parent : '';

			if ( ! in_array( $parent, $parents, true ) || 'root' === $node->id || in_array( $node->id, $skip, true ) ) {
				continue;
			}

			if ( ! empty( $node->group ) ) {
				$items = array_merge( $items, self::children_of( $node->id, $nodes ) );
				continue;
			}

			$items[] = self::format( $node, $nodes );
		}

		return $items;
	}


	/**
	 * The nodes, collected now if the page has not collected them.
	 *
	 * Outside an admin request nothing has built the toolbar, so it is built here. That is
	 * what lets the route answer the same thing the page prints.
	 *
	 * @since 4.1.0
	 * @return array
	 */
	private function get_nodes() {
		global $wp_admin_bar;

		if ( is_array( $this->nodes ) ) {
			return $this->nodes;
		}

		if ( ! is_object( $wp_admin_bar ) ) {
			require_once ABSPATH . WPINC . '/class-wp-admin-bar.php';

			_wp_admin_bar_init();
		}

		if ( ! is_object( $wp_admin_bar ) ) {
			return array();
		}

		do_action_ref_array( 'admin_bar_menu', array( &$wp_admin_bar ) );

		$this->nodes = $wp_admin_bar->get_nodes();

		return $this->nodes;
	}


	/**
	 * The items under one node, with their own children.
	 *
	 * A group is not an item: WordPress uses it to stack things inside a menu, so its children
	 * are lifted into the parent's list.
	 *
	 * @since 4.1.0
	 * @param string $parent Parent node id.
	 * @param array  $nodes  Every node.
	 * @return array
	 */
	private static function children_of( $parent, $nodes ) {
		$items = array();

		foreach ( (array) $nodes as $node ) {
			if ( ! isset( $node->parent ) || $node->parent !== $parent ) {
				continue;
			}

			if ( ! empty( $node->group ) ) {
				$items = array_merge( $items, self::children_of( $node->id, $nodes ) );
				continue;
			}

			$items[] = self::format( $node, $nodes );
		}

		return $items;
	}


	/**
	 * One node as an item.
	 *
	 * @since 4.1.0
	 * @param object $node  Node.
	 * @param array  $nodes Every node.
	 * @return array
	 */
	private static function format( $node, $nodes ) {
		$meta = isset( $node->meta ) ? (array) $node->meta : array();
		$title = self::split_title( isset( $node->title ) ? (string) $node->title : '' );

		return array(
			'id' => isset( $node->id ) ? 'wp-admin-bar-' . $node->id : '',
			'label' => $title['label'],
			'count' => $title['count'],
			'html' => $title['html'],
			'href' => isset( $node->href ) ? (string) $node->href : '',
			'target' => isset( $meta['target'] ) ? (string) $meta['target'] : '',
			'tooltip' => isset( $meta['title'] ) ? (string) $meta['title'] : '',
			'classes' => isset( $meta['class'] ) ? array_values( array_filter( explode( ' ', (string) $meta['class'] ) ) ) : array(),
			'children' => self::children_of( isset( $node->id ) ? $node->id : '', $nodes ),
		);
	}


	/**
	 * Pull a label and a number out of a toolbar title.
	 *
	 * WordPress writes them as markup — an `ab-icon` span the stylesheet turns into a glyph,
	 * and an `ab-label` span holding the text or the count. A title that is neither, such as
	 * the avatar of the account menu, is kept as it was so nothing is lost.
	 *
	 * @since 4.1.0
	 * @param string $title Raw title.
	 * @return array {
	 *     @type string   $label Text of the item.
	 *     @type int|null $count The number, when the label is one.
	 *     @type string   $html  The raw title, for an item that is neither.
	 * }
	 */
	private static function split_title( $title ) {
		$label = '';

		if ( preg_match( '/<span[^>]*class="[^"]*\bab-label\b[^"]*"[^>]*>(.*?)<\/span>/is', $title, $matches ) ) {
			$label = wp_strip_all_tags( $matches[1] );
		} else {
			$label = wp_strip_all_tags( $title );
		}

		$label = trim( html_entity_decode( $label, ENT_QUOTES, 'UTF-8' ) );
		$count = is_numeric( str_replace( array( '.', ',' ), '', $label ) ) ? (int) preg_replace( '/\D/', '', $label ) : null;

		return array(
			'label' => $label,
			'count' => $count,
			'html' => '' === $label ? $title : '',
		);
	}
}
