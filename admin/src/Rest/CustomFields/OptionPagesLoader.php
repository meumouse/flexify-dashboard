<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class OptionPagesLoader
 *
 * Handles registering admin menu pages for custom option pages.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class OptionPagesLoader {

	/**
	 * Option pages repository instance.
	 *
	 * @since 2.0.0
	 * @var OptionPagesRepository
	 */
	private $repository;

	/**
	 * Option page renderer instance.
	 *
	 * @since 2.0.0
	 * @var OptionPageRenderer
	 */
	private $renderer;

	/**
	 * Registered page hooks for script enqueuing.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $page_hooks = array();


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 */
	public function __construct() {
		$this->repository = new OptionPagesRepository();
		$this->renderer   = new OptionPageRenderer();
	}


	/**
	 * Initialize hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'register_option_pages' ), 99 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
		add_action( 'admin_footer', array( $this, 'print_footer_scripts' ) );
	}


	/**
	 * Register all active option pages as admin menu pages.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_option_pages() {
		$option_pages = $this->repository->get_active_pages();

		if ( ! is_array( $option_pages ) || empty( $option_pages ) ) {
			return;
		}

		foreach ( $option_pages as $page ) {
			$this->register_single_page( $page );
		}
	}


	/**
	 * Render the option page content.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_option_page() {
		$page = $this->get_current_page_data();

		if ( empty( $page ) ) {
			echo '<div class="wrap"><h1>' . esc_html__( 'Option Page Not Found', 'flexify-dashboard' ) . '</h1></div>';
			return;
		}

		$this->renderer->render( $page );
	}


	/**
	 * Enqueue scripts for option pages.
	 *
	 * @since 2.0.0
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_scripts( $hook_suffix ) {
		if ( ! isset( $this->page_hooks[ $hook_suffix ] ) || ! is_array( $this->page_hooks[ $hook_suffix ] ) ) {
			return;
		}

		OptionPagesScriptLoader::load_assets( $this->page_hooks[ $hook_suffix ] );
	}


	/**
	 * Print footer scripts for option pages.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function print_footer_scripts() {
		$page = $this->get_current_page_data();

		if ( empty( $page ) ) {
			return;
		}

		OptionPagesScriptLoader::print_option_page_context( $page );
	}


	/**
	 * Get registered page hooks.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_page_hooks() {
		return $this->page_hooks;
	}


	/**
	 * Check if current page is an option page.
	 *
	 * @since 2.0.0
	 * @return bool|array False if not an option page, page data otherwise.
	 */
	public function is_option_page() {
		$page = $this->get_current_page_data();

		if ( empty( $page ) ) {
			return false;
		}

		return $page;
	}


	/**
	 * Register a single option page.
	 *
	 * @since 2.0.0
	 * @param array $page Option page data.
	 * @return void
	 */
	private function register_single_page( $page ) {
		if ( ! $this->is_valid_page( $page ) ) {
			return;
		}

		$menu_slug  = 'flexify-dashboard-options-' . $page['slug'];
		$capability = ! empty( $page['capability'] ) ? sanitize_text_field( $page['capability'] ) : 'manage_options';
		$page_title = $page['title'];
		$menu_title = $page['title'];
		$menu_type  = ! empty( $page['menu_type'] ) ? $page['menu_type'] : 'submenu';
		$hook       = false;

		if ( 'top_level' === $menu_type ) {
			$hook = $this->register_top_level_page( $page, $menu_slug, $page_title, $menu_title, $capability );
		} else {
			$hook = $this->register_submenu_page( $page, $menu_slug, $page_title, $menu_title, $capability );
		}

		if ( $hook ) {
			$this->page_hooks[ $hook ] = $page;
		}
	}


	/**
	 * Register a top-level admin page.
	 *
	 * @since 2.0.0
	 * @param array  $page Option page data.
	 * @param string $menu_slug Menu slug.
	 * @param string $page_title Page title.
	 * @param string $menu_title Menu title.
	 * @param string $capability Required capability.
	 * @return string|false
	 */
	private function register_top_level_page( $page, $menu_slug, $page_title, $menu_title, $capability ) {
		$icon_name = ! empty( $page['menu_icon'] ) ? sanitize_text_field( $page['menu_icon'] ) : 'settings';
		$icon      = $this->get_menu_icon_url( $icon_name );
		$position  = isset( $page['menu_position'] ) ? absint( $page['menu_position'] ) : 100;

		return add_menu_page(
			$page_title,
			$menu_title,
			$capability,
			$menu_slug,
			array( $this, 'render_option_page' ),
			$icon,
			$position
		);
	}


	/**
	 * Register a submenu admin page.
	 *
	 * @since 2.0.0
	 * @param array  $page Option page data.
	 * @param string $menu_slug Menu slug.
	 * @param string $page_title Page title.
	 * @param string $menu_title Menu title.
	 * @param string $capability Required capability.
	 * @return string|false
	 */
	private function register_submenu_page( $page, $menu_slug, $page_title, $menu_title, $capability ) {
		$parent_slug = ! empty( $page['parent_menu'] ) ? sanitize_text_field( $page['parent_menu'] ) : 'options-general.php';

		return add_submenu_page(
			$parent_slug,
			$page_title,
			$menu_title,
			$capability,
			$menu_slug,
			array( $this, 'render_option_page' )
		);
	}


	/**
	 * Check if option page data is valid.
	 *
	 * @since 2.0.0
	 * @param mixed $page Option page data.
	 * @return bool
	 */
	private function is_valid_page( $page ) {
		if ( ! is_array( $page ) ) {
			return false;
		}

		if ( empty( $page['slug'] ) || empty( $page['title'] ) ) {
			return false;
		}

		return true;
	}


	/**
	 * Get current option page data from the current screen.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_current_page_data() {
		$screen = get_current_screen();

		if ( ! $screen || empty( $this->page_hooks ) ) {
			return array();
		}

		foreach ( $this->page_hooks as $hook => $page_data ) {
			if ( $screen->id === $hook ) {
				return $page_data;
			}
		}

		return array();
	}


	/**
	 * Convert SVG icon name to a usable admin menu icon.
	 *
	 * @since 2.0.0
	 * @param string $icon_name Icon name.
	 * @return string
	 */
	private function get_menu_icon_url( $icon_name ) {
		if ( ! is_string( $icon_name ) || '' === $icon_name ) {
			return 'dashicons-admin-generic';
		}

		if ( 0 === strpos( $icon_name, 'dashicons-' ) || 0 === strpos( $icon_name, 'http' ) || 0 === strpos( $icon_name, 'data:' ) ) {
			return $icon_name;
		}

		$plugin_path = $this->get_plugin_path();
		$svg_path    = trailingslashit( $plugin_path ) . 'assets/icons/' . sanitize_file_name( $icon_name ) . '.svg';

		if ( ! file_exists( $svg_path ) || ! is_readable( $svg_path ) ) {
			return 'dashicons-admin-generic';
		}

		$svg_content = file_get_contents( $svg_path );

		if ( false === $svg_content || '' === $svg_content ) {
			return 'dashicons-admin-generic';
		}

		return 'data:image/svg+xml;base64,' . base64_encode( $svg_content );
	}


	/**
	 * Get the plugin base path.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function get_plugin_path() {
		if ( defined( 'FLEXIFY_DASHBOARD_PLUGIN_PATH' ) ) {
			return FLEXIFY_DASHBOARD_PLUGIN_PATH;
		}

		return plugin_dir_path( dirname( dirname( dirname( dirname( __FILE__ ) ) ) ) );
	}
}