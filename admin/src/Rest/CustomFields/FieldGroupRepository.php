<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class FieldGroupRepository
 *
 * Handle JSON file operations and CRUD operations for field groups.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class FieldGroupRepository {

	/**
	 * Group ID prefix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const GROUP_ID_PREFIX = 'group_';

	/**
	 * Field ID prefix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const FIELD_ID_PREFIX = 'field_';

	/**
	 * Generated ID length.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const ID_HASH_LENGTH = 12;

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
	 * @param string $json_file_path Path to the JSON file.
	 * @return void
	 */
	public function __construct( $json_file_path ) {
		$this->json_file_path = (string) $json_file_path;
	}


	/**
	 * Read field groups from the JSON file.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function read() {
		if ( ! file_exists( $this->json_file_path ) || ! is_readable( $this->json_file_path ) ) {
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
	 * Write field groups to the JSON file.
	 *
	 * @since 2.0.0
	 * @param array $field_groups Array of field groups.
	 * @return bool
	 */
	public function write( $field_groups ) {
		if ( ! is_array( $field_groups ) ) {
			return false;
		}

		$this->maybe_create_directory();

		$json_content = wp_json_encode(
			$field_groups,
			JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
		);

		if ( false === $json_content ) {
			return false;
		}

		$result = file_put_contents( $this->json_file_path, $json_content, LOCK_EX );

		if ( false === $result ) {
			return false;
		}

		$this->flush_cache();
		$this->after_write( $field_groups );

		return true;
	}


	/**
	 * Generate a unique group ID.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function generate_id() {
		return self::GROUP_ID_PREFIX . $this->generate_hash();
	}


	/**
	 * Generate a unique field ID.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function generate_field_id() {
		return self::FIELD_ID_PREFIX . $this->generate_hash();
	}


	/**
	 * Check whether an ID exists in the field groups array.
	 *
	 * @since 2.0.0
	 * @param string $id Field group ID.
	 * @param array  $field_groups Array of field groups.
	 * @return bool
	 */
	public function id_exists( $id, $field_groups ) {
		if ( empty( $id ) || ! is_array( $field_groups ) ) {
			return false;
		}

		foreach ( $field_groups as $group ) {
			if ( ! is_array( $group ) || empty( $group['id'] ) ) {
				continue;
			}

			if ( $group['id'] === $id ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Find a field group by ID.
	 *
	 * @since 2.0.0
	 * @param string $id Field group ID.
	 * @return array|null
	 */
	public function find_by_id( $id ) {
		$field_groups = $this->read();

		foreach ( $field_groups as $group ) {
			if ( ! is_array( $group ) || empty( $group['id'] ) ) {
				continue;
			}

			if ( $group['id'] === $id ) {
				return $group;
			}
		}

		return null;
	}


	/**
	 * Find a field group index by ID.
	 *
	 * @since 2.0.0
	 * @param string $id Field group ID.
	 * @return int
	 */
	public function find_index_by_id( $id ) {
		$field_groups = $this->read();

		foreach ( $field_groups as $index => $group ) {
			if ( ! is_array( $group ) || empty( $group['id'] ) ) {
				continue;
			}

			if ( $group['id'] === $id ) {
				return (int) $index;
			}
		}

		return -1;
	}


	/**
	 * Check whether active field groups exist.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public function has_active_groups() {
		$field_groups = $this->read();

		if ( empty( $field_groups ) || ! is_array( $field_groups ) ) {
			return false;
		}

		foreach ( $field_groups as $group ) {
			if ( ! empty( $group['active'] ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get all active field groups.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_active_groups() {
		$field_groups = $this->read();
		$active_groups = array();

		if ( ! is_array( $field_groups ) ) {
			return $active_groups;
		}

		foreach ( $field_groups as $group ) {
			if ( empty( $group['active'] ) ) {
				continue;
			}

			$active_groups[] = $group;
		}

		return $active_groups;
	}


	/**
	 * Create the target directory when needed.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function maybe_create_directory() {
		$directory = dirname( $this->json_file_path );

		if ( file_exists( $directory ) ) {
			return;
		}

		wp_mkdir_p( $directory );
	}


	/**
	 * Flush WordPress cache after write.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function flush_cache() {
		if ( function_exists( 'wp_cache_flush' ) ) {
			wp_cache_flush();
		}
	}


	/**
	 * Run actions after saving field groups.
	 *
	 * @since 2.0.0
	 * @param array $field_groups Saved field groups.
	 * @return void
	 */
	private function after_write( $field_groups ) {
		/**
		 * Fires after field groups are saved.
		 *
		 * Used to clear cached field definitions in helper functions.
		 *
		 * @since 1.3.0
		 * @param array $field_groups The saved field groups.
		 */
		do_action( 'flexify_dashboard_field_groups_saved', $field_groups );
	}


	/**
	 * Generate a short unique hash.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	private function generate_hash() {
		return substr( md5( uniqid( (string) wp_rand(), true ) ), 0, self::ID_HASH_LENGTH );
	}
}