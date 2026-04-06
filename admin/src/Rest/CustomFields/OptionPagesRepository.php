<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class OptionPagesRepository
 *
 * Handles JSON file operations and CRUD operations for option pages.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class OptionPagesRepository {

	/**
	 * Path to the JSON storage file.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $json_file_path;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @param string|null $json_file_path Path to the JSON file.
	 */
	public function __construct( $json_file_path = null ) {
		$this->json_file_path = $json_file_path ? $json_file_path : WP_CONTENT_DIR . '/flexify-dashboard-options-pages.json';
	}


	/**
	 * Read option pages from JSON file.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function read() {
		if ( ! $this->is_readable_json_file() ) {
			return array();
		}

		$json_content = file_get_contents( $this->json_file_path );

		if ( false === $json_content || '' === $json_content ) {
			return array();
		}

		$data = json_decode( $json_content, true );

		return is_array( $data ) ? $data : array();
	}


	/**
	 * Write option pages to JSON file.
	 *
	 * @since 2.0.0
	 * @param array $option_pages Array of option pages.
	 * @return bool
	 */
	public function write( $option_pages ) {
		if ( ! is_array( $option_pages ) ) {
			$option_pages = array();
		}

		$directory = dirname( $this->json_file_path );

		if ( ! file_exists( $directory ) ) {
			wp_mkdir_p( $directory );
		}

		$json_content = wp_json_encode( $option_pages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE );

		if ( false === $json_content ) {
			return false;
		}

		$result = file_put_contents( $this->json_file_path, $json_content );

		if ( false === $result ) {
			return false;
		}

		if ( function_exists( 'wp_cache_flush' ) ) {
			wp_cache_flush();
		}

		/**
		 * Fires after option pages are saved.
		 *
		 * @since 2.0.0
		 * @param array $option_pages Saved option pages.
		 */
		do_action( 'flexify_dashboard_option_pages_saved', $option_pages );

		return true;
	}


	/**
	 * Generate a unique slug from title.
	 *
	 * @since 2.0.0
	 * @param string     $title The title to generate slug from.
	 * @param array|null $existing_pages Existing pages to check against.
	 * @return string
	 */
	public function generate_slug( $title, $existing_pages = null ) {
		if ( null === $existing_pages || ! is_array( $existing_pages ) ) {
			$existing_pages = $this->read();
		}

		$slug = sanitize_title( $title );

		if ( empty( $slug ) ) {
			$slug = 'option_page_' . wp_generate_password( 8, false, false );
		}

		$original_slug = $slug;
		$counter       = 1;

		while ( $this->slug_exists( $slug, $existing_pages ) ) {
			$slug = $original_slug . '_' . $counter;
			++$counter;
		}

		return $slug;
	}


	/**
	 * Check if a slug exists in option pages array.
	 *
	 * @since 2.0.0
	 * @param string     $slug The slug to check.
	 * @param array|null $option_pages Array of option pages.
	 * @return bool
	 */
	public function slug_exists( $slug, $option_pages = null ) {
		if ( null === $option_pages || ! is_array( $option_pages ) ) {
			$option_pages = $this->read();
		}

		foreach ( $option_pages as $page ) {
			if ( isset( $page['slug'] ) && $page['slug'] === $slug ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Find option page by slug.
	 *
	 * @since 2.0.0
	 * @param string $slug Option page slug.
	 * @return array|null
	 */
	public function find_by_slug( $slug ) {
		$option_pages = $this->read();

		foreach ( $option_pages as $page ) {
			if ( isset( $page['slug'] ) && $page['slug'] === $slug ) {
				return $page;
			}
		}

		return null;
	}


	/**
	 * Find option page index by slug.
	 *
	 * @since 2.0.0
	 * @param string $slug Option page slug.
	 * @return int
	 */
	public function find_index_by_slug( $slug ) {
		$option_pages = $this->read();

		foreach ( $option_pages as $index => $page ) {
			if ( isset( $page['slug'] ) && $page['slug'] === $slug ) {
				return (int) $index;
			}
		}

		return -1;
	}


	/**
	 * Check if there are active option pages.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public function has_active_pages() {
		$option_pages = $this->read();

		if ( empty( $option_pages ) ) {
			return false;
		}

		foreach ( $option_pages as $page ) {
			if ( ! empty( $page['active'] ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get all active option pages.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_active_pages() {
		$option_pages = $this->read();
		$active_pages = array();

		foreach ( $option_pages as $page ) {
			if ( ! empty( $page['active'] ) ) {
				$active_pages[] = $page;
			}
		}

		return $active_pages;
	}


	/**
	 * Get default option page structure.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public static function get_defaults() {
		return array(
			'slug'          => '',
			'title'         => '',
			'description'   => '',
			'menu_type'     => 'submenu',
			'parent_menu'   => 'options-general.php',
			'menu_icon'     => 'settings',
			'menu_position' => 100,
			'capability'    => 'manage_options',
			'active'        => true,
			'created_at'    => '',
			'updated_at'    => '',
		);
	}


	/**
	 * Get available parent menus for submenu pages.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public static function get_parent_menus() {
		return array(
			array(
				'value' => 'options-general.php',
				'label' => __( 'Settings', 'flexify-dashboard' ),
			),
			array(
				'value' => 'tools.php',
				'label' => __( 'Tools', 'flexify-dashboard' ),
			),
			array(
				'value' => 'themes.php',
				'label' => __( 'Appearance', 'flexify-dashboard' ),
			),
			array(
				'value' => 'plugins.php',
				'label' => __( 'Plugins', 'flexify-dashboard' ),
			),
			array(
				'value' => 'users.php',
				'label' => __( 'Users', 'flexify-dashboard' ),
			),
			array(
				'value' => 'upload.php',
				'label' => __( 'Media', 'flexify-dashboard' ),
			),
			array(
				'value' => 'edit-comments.php',
				'label' => __( 'Comments', 'flexify-dashboard' ),
			),
			array(
				'value' => 'edit.php',
				'label' => __( 'Posts', 'flexify-dashboard' ),
			),
			array(
				'value' => 'edit.php?post_type=page',
				'label' => __( 'Pages', 'flexify-dashboard' ),
			),
			array(
				'value' => 'index.php',
				'label' => __( 'Dashboard', 'flexify-dashboard' ),
			),
		);
	}


	/**
	 * Get available capabilities.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public static function get_capabilities() {
		return array(
			array(
				'value' => 'manage_options',
				'label' => __( 'Administrator (manage_options)', 'flexify-dashboard' ),
			),
			array(
				'value' => 'edit_others_posts',
				'label' => __( 'Editor (edit_others_posts)', 'flexify-dashboard' ),
			),
			array(
				'value' => 'publish_posts',
				'label' => __( 'Author (publish_posts)', 'flexify-dashboard' ),
			),
			array(
				'value' => 'edit_posts',
				'label' => __( 'Contributor (edit_posts)', 'flexify-dashboard' ),
			),
			array(
				'value' => 'read',
				'label' => __( 'Subscriber (read)', 'flexify-dashboard' ),
			),
		);
	}


	/**
	 * Check if the JSON file exists and is readable.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_readable_json_file() {
		if ( empty( $this->json_file_path ) || ! is_string( $this->json_file_path ) ) {
			return false;
		}

		if ( ! file_exists( $this->json_file_path ) ) {
			return false;
		}

		if ( ! is_readable( $this->json_file_path ) ) {
			return false;
		}

		return true;
	}
}