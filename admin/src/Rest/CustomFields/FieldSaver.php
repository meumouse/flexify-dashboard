<?php
namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class FieldSaver
 *
 * Handles saving custom field values.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class FieldSaver {

	/**
	 * Field group repository instance.
	 *
	 * @since 2.0.0
	 * @var FieldGroupRepository
	 */
	private $repository;

	/**
	 * Location rule evaluator instance.
	 *
	 * @since 2.0.0
	 * @var LocationRuleEvaluator
	 */
	private $evaluator;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @param FieldGroupRepository   $repository Repository instance.
	 * @param LocationRuleEvaluator  $evaluator Evaluator instance.
	 */
	public function __construct( FieldGroupRepository $repository, LocationRuleEvaluator $evaluator ) {
		$this->repository = $repository;
		$this->evaluator = $evaluator;
	}


	/**
	 * Save custom fields for a post.
	 *
	 * This method should be called on the `save_post` hook.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public function save_custom_fields( $post_id ) {
		if ( $this->should_abort_save( $post_id ) ) {
			return;
		}

		$custom_fields = isset( $_POST['flexify_dashboard_cf'] ) && is_array( $_POST['flexify_dashboard_cf'] )
			? wp_unslash( $_POST['flexify_dashboard_cf'] )
			: array();

		if ( empty( $custom_fields ) ) {
			return;
		}

		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) || empty( $field_groups ) ) {
			return;
		}

		$post = get_post( $post_id );

		if ( ! $post ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			if ( ! $this->should_save_group_for_post( $group, $post ) ) {
				continue;
			}

			if ( ! $this->verify_group_nonce( $group ) ) {
				continue;
			}

			$this->save_group_fields( $post_id, $group, $custom_fields );
		}
	}


	/**
	 * Check whether the save process should be aborted.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return bool True if the save should be aborted. False otherwise.
	 */
	private function should_abort_save( $post_id ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return true;
		}

		if ( wp_is_post_revision( $post_id ) ) {
			return true;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return true;
		}

		return false;
	}


	/**
	 * Check whether a field group structure is valid.
	 *
	 * @since 2.0.0
	 * @param mixed $group Field group data.
	 * @return bool True if the group is valid. False otherwise.
	 */
	private function is_valid_field_group( $group ) {
		return is_array( $group ) && ! empty( $group['id'] ) && ! empty( $group['active'] );
	}


	/**
	 * Check whether a field group should be saved for the current post.
	 *
	 * @since 2.0.0
	 * @param array    $group Field group data.
	 * @param \WP_Post $post Post object.
	 * @return bool True if the group should be saved. False otherwise.
	 */
	private function should_save_group_for_post( $group, $post ) {
		$location = isset( $group['location'] ) && is_array( $group['location'] )
			? $group['location']
			: array();

		if ( empty( $location ) ) {
			return true;
		}

		return LocationRuleEvaluator::should_show_for_post( $location, $post );
	}


	/**
	 * Verify the nonce for a field group.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @return bool True if nonce is valid. False otherwise.
	 */
	private function verify_group_nonce( $group ) {
		$nonce_name = 'flexify_dashboard_cf_nonce_' . $group['id'];
		$nonce      = isset( $_POST[ $nonce_name ] ) ? sanitize_text_field( wp_unslash( $_POST[ $nonce_name ] ) ) : '';

		if ( empty( $nonce ) ) {
			return false;
		}

		return wp_verify_nonce( $nonce, 'flexify_dashboard_custom_fields_' . $group['id'] );
	}


	/**
	 * Save all fields from a group.
	 *
	 * @since 2.0.0
	 * @param int   $post_id Post ID.
	 * @param array $group Field group data.
	 * @param array $custom_fields Submitted custom fields.
	 * @return void
	 */
	private function save_group_fields( $post_id, $group, $custom_fields ) {
		$fields = isset( $group['fields'] ) && is_array( $group['fields'] )
			? $group['fields']
			: array();

		foreach ( $fields as $field ) {
			if ( empty( $field['name'] ) || empty( $field['type'] ) ) {
				continue;
			}

			$field_name = $field['name'];

			if ( array_key_exists( $field_name, $custom_fields ) ) {
				$value = $this->sanitize_field_value( $custom_fields[ $field_name ], $field );
				update_post_meta( $post_id, $field_name, $value );
				continue;
			}

			$this->maybe_clear_empty_field( $post_id, $field );
		}
	}


	/**
	 * Sanitize a field value based on field type.
	 *
	 * @since 2.0.0
	 * @param mixed $value Field value.
	 * @param array $field Field configuration.
	 * @return mixed Sanitized value.
	 */
	private function sanitize_field_value( $value, $field ) {
		$field_type = $field['type'];

		if ( 'relationship' === $field_type ) {
			$value = $this->maybe_decode_json_value( $value );
			return $this->sanitize_relationship_value( $value, $field );
		}

		switch ( $field_type ) {
			case 'email':
				return sanitize_email( $value );

			case 'url':
			case 'oembed':
				return esc_url_raw( $value );

			case 'number':
			case 'range':
				return floatval( $value );

			case 'textarea':
				return sanitize_textarea_field( $value );

			case 'wysiwyg':
				return wp_kses_post( $value );

			case 'image':
			case 'file':
				$value = $this->maybe_decode_json_value( $value );
				return $this->sanitize_media_value( $value, $field );

			case 'date_picker':
				return $this->sanitize_date_value( $value );

			case 'repeater':
				return $this->sanitize_repeater_value( $value, $field );

			case 'select':
				return $this->sanitize_select_value( $value );

			case 'link':
				$value = $this->maybe_decode_json_value( $value );
				return $this->sanitize_link_value( $value );

			case 'color_picker':
				return sanitize_text_field( $value );

			case 'time_picker':
				return $this->sanitize_time_value( $value );

			case 'google_map':
				$value = $this->maybe_decode_json_value( $value );
				return $this->sanitize_google_map_value( $value );

			default:
				return $this->sanitize_default_value( $value );
		}
	}


	/**
	 * Decode JSON string values when applicable.
	 *
	 * @since 2.0.0
	 * @param mixed $value Raw value.
	 * @return mixed Decoded value when valid JSON, otherwise original value.
	 */
	private function maybe_decode_json_value( $value ) {
		if ( ! is_string( $value ) || '' === $value ) {
			return $value;
		}

		$decoded = json_decode( $value, true );

		if ( JSON_ERROR_NONE === json_last_error() ) {
			return $decoded;
		}

		return $value;
	}


	/**
	 * Sanitize date picker value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Date value.
	 * @return string Sanitized date value.
	 */
	private function sanitize_date_value( $value ) {
		$value = sanitize_text_field( $value );

		if ( '' !== $value && ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return '';
		}

		return $value;
	}


	/**
	 * Sanitize time picker value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Time value.
	 * @return string Sanitized time value.
	 */
	private function sanitize_time_value( $value ) {
		$value = sanitize_text_field( $value );

		if ( '' !== $value && ! preg_match( '/^(\d{1,2}:\d{2}(:\d{2})?( (am|pm))?)$/i', $value ) ) {
			return '';
		}

		return $value;
	}


	/**
	 * Sanitize select field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Select value.
	 * @return mixed Sanitized select value.
	 */
	private function sanitize_select_value( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'sanitize_text_field', $value );
		}

		return sanitize_text_field( $value );
	}


	/**
	 * Sanitize default field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Field value.
	 * @return mixed Sanitized value.
	 */
	private function sanitize_default_value( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'sanitize_text_field', $value );
		}

		return sanitize_text_field( $value );
	}


	/**
	 * Clear field values that are not sent when empty.
	 *
	 * @since 2.0.0
	 * @param int   $post_id Post ID.
	 * @param array $field Field configuration.
	 * @return void
	 */
	private function maybe_clear_empty_field( $post_id, $field ) {
		switch ( $field['type'] ) {
			case 'true_false':
				update_post_meta( $post_id, $field['name'], '0' );
				break;

			case 'relationship':
			case 'image':
			case 'file':
			case 'link':
				update_post_meta(
					$post_id,
					$field['name'],
					! empty( $field['multiple'] ) ? array() : null
				);
				break;

			case 'oembed':
			case 'color_picker':
			case 'range':
			case 'time_picker':
				update_post_meta( $post_id, $field['name'], '' );
				break;

			case 'google_map':
				update_post_meta( $post_id, $field['name'], null );
				break;
		}
	}


	/**
	 * Sanitize repeater field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Repeater value.
	 * @param array $field Field configuration.
	 * @return array Sanitized repeater value.
	 */
	private function sanitize_repeater_value( $value, $field ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized = array();
		$sub_fields = isset( $field['sub_fields'] ) && is_array( $field['sub_fields'] )
			? $field['sub_fields']
			: array();

		foreach ( $value as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$sanitized_row = array();

			foreach ( $sub_fields as $sub_field ) {
				if ( empty( $sub_field['name'] ) || ! isset( $row[ $sub_field['name'] ] ) ) {
					continue;
				}

				$sanitized_row[ $sub_field['name'] ] = sanitize_text_field( $row[ $sub_field['name'] ] );
			}

			if ( ! empty( $sanitized_row ) ) {
				$sanitized[] = $sanitized_row;
			}
		}

		return $sanitized;
	}


	/**
	 * Sanitize relationship field value.
	 *
	 * Stores full objects for UI display, with essential post or term data.
	 *
	 * @since 2.0.0
	 * @param mixed $value Relationship value.
	 * @param array $field Field configuration.
	 * @return mixed Sanitized value.
	 */
	private function sanitize_relationship_value( $value, $field ) {
		$is_multiple = ! empty( $field['multiple'] );

		if ( null === $value || '' === $value || ( is_array( $value ) && empty( $value ) ) ) {
			return $is_multiple ? array() : null;
		}

		if ( is_array( $value ) && isset( $value[0] ) && is_array( $value[0] ) ) {
			$sanitized = array_values( array_filter( array_map( array( $this, 'sanitize_relationship_item' ), $value ) ) );
			return $sanitized;
		}

		if ( is_array( $value ) && isset( $value['id'] ) ) {
			$sanitized = $this->sanitize_relationship_item( $value );
			return null !== $sanitized ? $sanitized : ( $is_multiple ? array() : null );
		}

		return $is_multiple ? array() : null;
	}


	/**
	 * Sanitize a single relationship item.
	 *
	 * @since 2.0.0
	 * @param mixed $item Relationship item.
	 * @return array|null Sanitized relationship item or null if invalid.
	 */
	private function sanitize_relationship_item( $item ) {
		if ( ! is_array( $item ) || empty( $item['id'] ) ) {
			return null;
		}

		return array(
			'id'           => absint( $item['id'] ),
			'title'        => isset( $item['title'] ) ? sanitize_text_field( $item['title'] ) : '',
			'type'         => isset( $item['type'] ) ? sanitize_key( $item['type'] ) : '',
			'type_label'   => isset( $item['type_label'] ) ? sanitize_text_field( $item['type_label'] ) : '',
			'status'       => isset( $item['status'] ) ? sanitize_key( $item['status'] ) : 'publish',
			'status_label' => isset( $item['status_label'] ) ? sanitize_text_field( $item['status_label'] ) : '',
			'thumbnail'    => isset( $item['thumbnail'] ) ? esc_url_raw( $item['thumbnail'] ) : null,
		);
	}


	/**
	 * Sanitize media field value.
	 *
	 * Handles both single media objects and arrays of media objects.
	 *
	 * @since 2.0.0
	 * @param mixed $value Media value.
	 * @param array $field Field configuration.
	 * @return mixed Sanitized media value.
	 */
	private function sanitize_media_value( $value, $field = array() ) {
		$is_multiple = ! empty( $field['multiple'] );

		if ( empty( $value ) || ! is_array( $value ) ) {
			return $is_multiple ? array() : null;
		}

		if ( isset( $value[0] ) && is_array( $value[0] ) ) {
			return array_values( array_filter( array_map( array( $this, 'sanitize_single_media_item' ), $value ) ) );
		}

		if ( isset( $value['id'] ) ) {
			$sanitized = $this->sanitize_single_media_item( $value );

			if ( $is_multiple ) {
				return $sanitized ? array( $sanitized ) : array();
			}

			return $sanitized;
		}

		return $is_multiple ? array() : null;
	}


	/**
	 * Sanitize a single media item.
	 *
	 * @since 2.0.0
	 * @param mixed $item Media item.
	 * @return array|null Sanitized media item or null if invalid.
	 */
	private function sanitize_single_media_item( $item ) {
		if ( ! is_array( $item ) || empty( $item['id'] ) ) {
			return null;
		}

		$sanitized = array(
			'id'         => absint( $item['id'] ),
			'title'      => isset( $item['title'] ) ? sanitize_text_field( $item['title'] ) : '',
			'source_url' => isset( $item['source_url'] ) ? esc_url_raw( $item['source_url'] ) : '',
			'mime_type'  => isset( $item['mime_type'] ) ? sanitize_mime_type( $item['mime_type'] ) : '',
			'alt_text'   => isset( $item['alt_text'] ) ? sanitize_text_field( $item['alt_text'] ) : '',
		);

		if ( isset( $item['media_details'] ) && is_array( $item['media_details'] ) ) {
			$sanitized['media_details'] = array(
				'width'    => isset( $item['media_details']['width'] ) ? absint( $item['media_details']['width'] ) : null,
				'height'   => isset( $item['media_details']['height'] ) ? absint( $item['media_details']['height'] ) : null,
				'filesize' => isset( $item['media_details']['filesize'] ) ? absint( $item['media_details']['filesize'] ) : null,
			);
		}

		return $sanitized;
	}


	/**
	 * Sanitize link field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Link value.
	 * @return mixed Sanitized link value.
	 */
	private function sanitize_link_value( $value ) {
		if ( empty( $value ) ) {
			return null;
		}

		if ( is_string( $value ) ) {
			return esc_url_raw( $value );
		}

		if ( is_array( $value ) ) {
			return array(
				'url'    => isset( $value['url'] ) ? esc_url_raw( $value['url'] ) : '',
				'title'  => isset( $value['title'] ) ? sanitize_text_field( $value['title'] ) : '',
				'target' => isset( $value['target'] ) ? sanitize_text_field( $value['target'] ) : '_self',
			);
		}

		return null;
	}


	/**
	 * Sanitize Google Map field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Google Map value.
	 * @return array|null Sanitized Google Map value or null if invalid.
	 */
	private function sanitize_google_map_value( $value ) {
		if ( empty( $value ) || ! is_array( $value ) ) {
			return null;
		}

		if ( ! isset( $value['lat'] ) || ! isset( $value['lng'] ) ) {
			return null;
		}

		$lat = floatval( $value['lat'] );
		$lng = floatval( $value['lng'] );

		if ( $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 ) {
			return null;
		}

		return array(
			'address' => isset( $value['address'] ) ? sanitize_text_field( $value['address'] ) : '',
			'lat'     => $lat,
			'lng'     => $lng,
			'zoom'    => isset( $value['zoom'] ) ? absint( $value['zoom'] ) : 13,
		);
	}
}