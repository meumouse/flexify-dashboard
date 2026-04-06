<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class FieldValueSanitizer
 *
 * Centralized field value sanitization for all custom field contexts.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class FieldValueSanitizer {

	/**
	 * Enable debug logging.
	 *
	 * @since 2.0.0
	 * @var bool
	 */
	private static $debug_enabled = false;

	/**
	 * Debug log file path.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private static $debug_log_path = __DIR__ . '/debug.log';


	/**
	 * Sanitize a field value based on its type.
	 *
	 * @since 2.0.0
	 * @param mixed $value Field value.
	 * @param array $field Field configuration.
	 * @return mixed
	 */
	public static function sanitize( $value, $field ) {
		$type = isset( $field['type'] ) ? $field['type'] : 'text';

		switch ( $type ) {
			case 'email':
				return sanitize_email( $value );

			case 'url':
				return esc_url_raw( $value );

			case 'number':
			case 'range':
				return floatval( $value );

			case 'textarea':
				return sanitize_textarea_field( $value );

			case 'wysiwyg':
				return wp_kses_post( $value );

			case 'repeater':
				return self::sanitize_repeater( $value, $field );

			case 'group':
				return self::sanitize_group( $value, $field );

			case 'true_false':
			case 'checkbox':
				return ! empty( $value ) ? '1' : '0';

			case 'select':
			case 'radio':
			case 'button_group':
				return self::sanitize_choice_value( $value );

			case 'image':
			case 'file':
			case 'gallery':
				return self::sanitize_media( $value );

			case 'post_object':
			case 'page_link':
				return self::sanitize_post_reference( $value );

			case 'relationship':
				return self::sanitize_relationship( $value, $field );

			case 'taxonomy':
				return self::sanitize_taxonomy_reference( $value );

			case 'user':
				return self::sanitize_user_reference( $value );

			case 'date_picker':
			case 'date_time_picker':
			case 'time_picker':
				return sanitize_text_field( $value );

			case 'color_picker':
				return self::sanitize_color_value( $value );

			case 'google_map':
			case 'oembed':
			case 'link':
				return self::sanitize_complex_value( $value );

			case 'password':
			case 'text':
			default:
				return self::sanitize_text_value( $value );
		}
	}


	/**
	 * Sanitize repeater field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Repeater value.
	 * @param array $field Field configuration.
	 * @return array
	 */
	public static function sanitize_repeater( $value, $field ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized  = array();
		$sub_fields = isset( $field['sub_fields'] ) && is_array( $field['sub_fields'] )
			? $field['sub_fields']
			: array();

		foreach ( $value as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$sanitized_row = array();

			foreach ( $sub_fields as $sub_field ) {
				$field_name = isset( $sub_field['name'] ) ? $sub_field['name'] : '';

				if ( '' === $field_name || ! array_key_exists( $field_name, $row ) ) {
					continue;
				}

				$sanitized_row[ $field_name ] = self::sanitize( $row[ $field_name ], $sub_field );
			}

			if ( ! empty( $sanitized_row ) ) {
				$sanitized[] = $sanitized_row;
			}
		}

		return $sanitized;
	}


	/**
	 * Sanitize group field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Group value.
	 * @param array $field Field configuration.
	 * @return array
	 */
	public static function sanitize_group( $value, $field ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized  = array();
		$sub_fields = isset( $field['sub_fields'] ) && is_array( $field['sub_fields'] )
			? $field['sub_fields']
			: array();

		foreach ( $sub_fields as $sub_field ) {
			$field_name = isset( $sub_field['name'] ) ? $sub_field['name'] : '';

			if ( '' === $field_name || ! array_key_exists( $field_name, $value ) ) {
				continue;
			}

			$sanitized[ $field_name ] = self::sanitize( $value[ $field_name ], $sub_field );
		}

		return $sanitized;
	}


	/**
	 * Sanitize media field value.
	 *
	 * Handles JSON-encoded objects from the frontend.
	 *
	 * @since 2.0.0
	 * @param mixed $value Media value.
	 * @return mixed
	 */
	public static function sanitize_media( $value ) {
		self::debug_log(
			'sanitize_media: input',
			array(
				'type'      => gettype( $value ),
				'is_string' => is_string( $value ),
				'value'     => is_string( $value ) ? substr( $value, 0, 500 ) : $value,
			)
		);

		$value = self::maybe_decode_json_value( $value );

		if ( empty( $value ) ) {
			self::debug_log( 'sanitize_media: empty value, returning null' );
			return null;
		}

		if ( is_array( $value ) && isset( $value[0] ) && is_array( $value[0] ) ) {
			self::debug_log( 'sanitize_media: array of objects detected' );

			$sanitized = array();

			foreach ( $value as $item ) {
				$sanitized_item = self::sanitize_media_item( $item );

				if ( null !== $sanitized_item ) {
					$sanitized[] = $sanitized_item;
				}
			}

			self::debug_log( 'sanitize_media: sanitized array result', $sanitized );

			return array_values( $sanitized );
		}

		if ( is_array( $value ) && isset( $value['id'] ) ) {
			self::debug_log( 'sanitize_media: single object detected' );

			$sanitized = self::sanitize_media_item( $value );

			self::debug_log( 'sanitize_media: sanitized single result', $sanitized );

			return $sanitized;
		}

		if ( is_array( $value ) ) {
			self::debug_log( 'sanitize_media: array of IDs (legacy)' );

			return array_map( 'absint', array_filter( $value ) );
		}

		self::debug_log( 'sanitize_media: single ID', absint( $value ) );

		return absint( $value );
	}


	/**
	 * Sanitize post reference field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Post ID or array of post IDs.
	 * @return mixed
	 */
	public static function sanitize_post_reference( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'absint', array_filter( $value ) );
		}

		return absint( $value );
	}


	/**
	 * Sanitize relationship field value.
	 *
	 * Handles JSON-encoded values and full objects with display data.
	 *
	 * @since 2.0.0
	 * @param mixed $value Relationship value.
	 * @param array $field Field configuration.
	 * @return mixed
	 */
	public static function sanitize_relationship( $value, $field ) {
		$value       = self::maybe_decode_json_value( $value );
		$is_multiple = ! empty( $field['multiple'] );

		if ( null === $value || '' === $value || ( is_array( $value ) && empty( $value ) ) ) {
			return $is_multiple ? array() : null;
		}

		if ( is_array( $value ) && isset( $value[0] ) && is_array( $value[0] ) ) {
			$sanitized = array();

			foreach ( $value as $item ) {
				$sanitized_item = self::sanitize_relationship_item( $item );

				if ( null !== $sanitized_item ) {
					$sanitized[] = $sanitized_item;
				}
			}

			return array_values( $sanitized );
		}

		if ( is_array( $value ) && isset( $value['id'] ) ) {
			$sanitized = self::sanitize_relationship_item( $value );

			return null !== $sanitized ? $sanitized : ( $is_multiple ? array() : null );
		}

		return $is_multiple ? array() : null;
	}


	/**
	 * Sanitize taxonomy reference field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Term ID or array of term IDs.
	 * @return mixed
	 */
	public static function sanitize_taxonomy_reference( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'absint', array_filter( $value ) );
		}

		return absint( $value );
	}


	/**
	 * Sanitize user reference field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value User ID or array of user IDs.
	 * @return mixed
	 */
	public static function sanitize_user_reference( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'absint', array_filter( $value ) );
		}

		return absint( $value );
	}


	/**
	 * Sanitize complex structured values.
	 *
	 * Used for maps, oembeds, and links.
	 *
	 * @since 2.0.0
	 * @param mixed $value Complex value.
	 * @return mixed
	 */
	public static function sanitize_complex_value( $value ) {
		if ( is_array( $value ) ) {
			$sanitized = array();

			foreach ( $value as $key => $item ) {
				$sanitized_key = is_string( $key ) ? sanitize_key( $key ) : absint( $key );

				if ( is_array( $item ) ) {
					$sanitized[ $sanitized_key ] = self::sanitize_complex_value( $item );
					continue;
				}

				if ( filter_var( $item, FILTER_VALIDATE_URL ) ) {
					$sanitized[ $sanitized_key ] = esc_url_raw( $item );
					continue;
				}

				$sanitized[ $sanitized_key ] = is_numeric( $item ) ? floatval( $item ) : sanitize_text_field( $item );
			}

			return $sanitized;
		}

		if ( filter_var( $value, FILTER_VALIDATE_URL ) ) {
			return esc_url_raw( $value );
		}

		return is_numeric( $value ) ? floatval( $value ) : sanitize_text_field( $value );
	}


	/**
	 * Prepare field group data for Vue rendering.
	 *
	 * @since 2.0.0
	 * @param array $group Field group configuration.
	 * @return array
	 */
	public static function prepare_vue_group_data( $group ) {
		return array(
			'id'                    => isset( $group['id'] ) ? $group['id'] : '',
			'title'                 => isset( $group['title'] ) ? $group['title'] : '',
			'description'           => isset( $group['description'] ) ? $group['description'] : '',
			'fields'                => isset( $group['fields'] ) && is_array( $group['fields'] ) ? $group['fields'] : array(),
			'style'                 => isset( $group['style'] ) ? $group['style'] : 'default',
			'label_placement'       => isset( $group['label_placement'] ) ? $group['label_placement'] : 'top',
			'instruction_placement' => isset( $group['instruction_placement'] ) ? $group['instruction_placement'] : 'label',
		);
	}


	/**
	 * Write a debug log entry.
	 *
	 * @since 2.0.0
	 * @param string $message Log message.
	 * @param mixed  $data Optional data to log.
	 * @return void
	 */
	private static function debug_log( $message, $data = null ) {
		if ( ! self::$debug_enabled ) {
			return;
		}

		$entry = array(
			'timestamp' => current_time( 'mysql' ),
			'message'   => $message,
		);

		if ( null !== $data ) {
			$entry['data'] = $data;
		}

		file_put_contents(
			self::$debug_log_path,
			wp_json_encode( $entry, JSON_UNESCAPED_SLASHES ) . PHP_EOL,
			FILE_APPEND
		);
	}


	/**
	 * Decode JSON value when applicable.
	 *
	 * @since 2.0.0
	 * @param mixed $value Raw value.
	 * @return mixed
	 */
	private static function maybe_decode_json_value( $value ) {
		if ( ! is_string( $value ) || '' === $value ) {
			return $value;
		}

		$unslashed = wp_unslash( $value );
		$decoded   = json_decode( $unslashed, true );

		self::debug_log(
			'maybe_decode_json_value: JSON decode attempt',
			array(
				'unslashed'      => substr( $unslashed, 0, 500 ),
				'json_error'     => json_last_error(),
				'json_error_msg' => json_last_error_msg(),
				'decoded_type'   => gettype( $decoded ),
			)
		);

		if ( JSON_ERROR_NONE === json_last_error() ) {
			return $decoded;
		}

		return $value;
	}


	/**
	 * Sanitize a simple text value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Field value.
	 * @return mixed
	 */
	private static function sanitize_text_value( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'sanitize_text_field', $value );
		}

		return sanitize_text_field( $value );
	}


	/**
	 * Sanitize choice-based field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Field value.
	 * @return mixed
	 */
	private static function sanitize_choice_value( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'sanitize_text_field', $value );
		}

		return sanitize_text_field( $value );
	}


	/**
	 * Sanitize a color field value.
	 *
	 * @since 2.0.0
	 * @param mixed $value Color value.
	 * @return string
	 */
	private static function sanitize_color_value( $value ) {
		$color = sanitize_hex_color( $value );

		if ( ! empty( $color ) ) {
			return $color;
		}

		return sanitize_text_field( $value );
	}


	/**
	 * Sanitize a single media item object.
	 *
	 * @since 2.0.0
	 * @param mixed $item Media item to sanitize.
	 * @return array|null
	 */
	private static function sanitize_media_item( $item ) {
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
	 * Sanitize a single relationship item object.
	 *
	 * @since 2.0.0
	 * @param mixed $item Relationship item to sanitize.
	 * @return array|null
	 */
	private static function sanitize_relationship_item( $item ) {
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
}