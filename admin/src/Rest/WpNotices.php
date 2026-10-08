<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\App\Plugin;

use DOMDocument;
use DOMElement;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class WpNotices
 *
 * The notices WordPress and other plugins print at the top of an admin screen, as data.
 *
 * They used to be left where WordPress put them, hidden, and then moved node by node into the
 * notifications panel. That is markup of someone else's inside our interface, and it only
 * looked right by accident.
 *
 * Here the `admin_notices` actions are captured instead of printed, split into one record per
 * notice, and handed to the panel, which draws them with the design system's own alert.
 *
 * The cost is stated rather than hidden: a plugin that wires a button inside its own notice
 * from a script at page load will not find it, because the notice is no longer in the page at
 * that moment. The dismiss button of a `is-dismissible` notice is ours now, and works. A
 * notice that is a form, which is most of them, posts as it always did.
 *
 * @since 4.1.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class WpNotices {

	/**
	 * REST namespace.
	 *
	 * @since 4.1.0
	 * @var string
	 */
	private const REST_NAMESPACE = 'flexify-dashboard/v1';

	/**
	 * Id of the script tag the notices are printed into.
	 *
	 * @since 4.1.0
	 * @var string
	 */
	public const SCRIPT_ID = 'fd-admin-notices';

	/**
	 * The actions WordPress prints notices through, in the order it fires them.
	 *
	 * @since 4.1.0
	 * @var array
	 */
	private const ACTIONS = array( 'network_admin_notices', 'user_admin_notices', 'admin_notices', 'all_admin_notices' );

	/**
	 * Captured HTML, one entry per action.
	 *
	 * @since 4.1.0
	 * @var array
	 */
	private $captured = array();


	/**
	 * Register hooks.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_action( 'admin_init', array( $this, 'capture_notices' ) );
		add_action( 'admin_print_footer_scripts', array( $this, 'print_notices' ), 1 );
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
			'/admin-notices',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_notices_response' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}


	/**
	 * Whether the current user may read the notices.
	 *
	 * @since 4.1.0
	 * @return bool
	 */
	public function check_permissions() {
		return current_user_can( 'read' );
	}


	/**
	 * Answer with what this screen captured.
	 *
	 * A REST request prints no notices of its own: nothing fires `admin_notices` there, and
	 * the ones that matter are about the screen the person is looking at. The route answers
	 * for completeness and for anything that captures on its own behalf.
	 *
	 * @since 4.1.0
	 * @return WP_REST_Response
	 */
	public function get_notices_response() {
		return rest_ensure_response( $this->get_notices() );
	}


	/**
	 * Take the notices out of the page instead of letting them print.
	 *
	 * Each action is buffered from before anything can write to it until after everything has.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function capture_notices() {
		if ( ! Plugin::is_shell_active() ) {
			return;
		}

		foreach ( self::ACTIONS as $action ) {
			add_action( $action, array( $this, 'start_capture' ), -PHP_INT_MAX );
			add_action( $action, array( $this, 'end_capture' ), PHP_INT_MAX );
		}
	}


	/**
	 * Start buffering one notice action.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function start_capture() {
		ob_start();
	}


	/**
	 * Keep what one notice action printed.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function end_capture() {
		$this->captured[] = (string) ob_get_clean();
	}


	/**
	 * Print the notices into the page as JSON.
	 *
	 * @since 4.1.0
	 * @return void
	 */
	public function print_notices() {
		if ( ! Plugin::is_shell_active() ) {
			return;
		}

		printf(
			'<script type="application/json" id="%s">%s</script>',
			esc_attr( self::SCRIPT_ID ),
			wp_json_encode( $this->get_notices() ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON inside a non-executed script tag.
		);
	}


	/**
	 * One record per notice.
	 *
	 * @since 4.1.0
	 * @return array
	 */
	public function get_notices() {
		$notices = array();

		foreach ( $this->captured as $index => $html ) {
			foreach ( self::split( $html ) as $position => $notice ) {
				$notice['id'] = $notice['id'] ? $notice['id'] : 'fd-notice-' . $index . '-' . $position;
				$notices[] = $notice;
			}
		}

		return $notices;
	}


	/**
	 * Split captured output into the notices it holds.
	 *
	 * What is not inside a notice is kept too, as an untyped record: a plugin that prints a
	 * bare `<div>` on `admin_notices` would otherwise vanish, and vanishing is worse than
	 * looking plain.
	 *
	 * @since 4.1.0
	 * @param string $html Captured output.
	 * @return array
	 */
	private static function split( $html ) {
		if ( '' === trim( $html ) ) {
			return array();
		}

		$document = new DOMDocument();
		$previous = libxml_use_internal_errors( true );

		// The fragment is not a document, and some of it is not valid HTML either; the parser
		// is told to keep going and its complaints are dropped.
		$document->loadHTML( '<?xml encoding="UTF-8"><div id="fd-notices-root">' . $html . '</div>', LIBXML_HTML_NODEFDTD | LIBXML_HTML_NOIMPLIED );

		libxml_clear_errors();
		libxml_use_internal_errors( $previous );

		$root = $document->getElementById( 'fd-notices-root' );

		if ( ! $root ) {
			return array();
		}

		$notices = array();
		$loose = '';

		foreach ( iterator_to_array( $root->childNodes ) as $node ) {
			if ( ! $node instanceof DOMElement ) {
				$loose .= $document->saveHTML( $node );
				continue;
			}

			$classes = explode( ' ', (string) $node->getAttribute( 'class' ) );

			if ( ! in_array( 'notice', $classes, true ) && ! in_array( 'updated', $classes, true ) && ! in_array( 'error', $classes, true ) ) {
				$loose .= $document->saveHTML( $node );
				continue;
			}

			$notices[] = array(
				'id' => (string) $node->getAttribute( 'id' ),
				'type' => self::type_of( $classes ),
				'dismissible' => in_array( 'is-dismissible', $classes, true ),
				'html' => self::inner_html( $document, $node ),
			);
		}

		if ( '' !== trim( wp_strip_all_tags( $loose ) ) ) {
			$notices[] = array(
				'id' => '',
				'type' => 'info',
				'dismissible' => false,
				'html' => $loose,
			);
		}

		return $notices;
	}


	/**
	 * Which kind of notice a set of classes describes.
	 *
	 * @since 4.1.0
	 * @param array $classes Class list.
	 * @return string success, error, warning or info.
	 */
	private static function type_of( $classes ) {
		$map = array(
			'notice-success' => 'success',
			'updated' => 'success',
			'notice-error' => 'error',
			'error' => 'error',
			'notice-warning' => 'warning',
		);

		foreach ( $map as $class => $type ) {
			if ( in_array( $class, $classes, true ) ) {
				return $type;
			}
		}

		return 'info';
	}


	/**
	 * The contents of a node, without the node itself.
	 *
	 * @since 4.1.0
	 * @param DOMDocument $document Owner document.
	 * @param DOMElement  $node     Node to read.
	 * @return string
	 */
	private static function inner_html( DOMDocument $document, DOMElement $node ) {
		$html = '';

		foreach ( $node->childNodes as $child ) {
			$html .= $document->saveHTML( $child );
		}

		return $html;
	}
}
