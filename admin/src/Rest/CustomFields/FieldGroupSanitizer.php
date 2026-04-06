<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class FieldGroupSanitizer
 *
 * Handle sanitization of field group data and field definitions.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class FieldGroupSanitizer {

	/**
	 * Repository instance.
	 *
	 * @since 2.0.0
	 * @var FieldGroupRepository
	 */
	private $repository;


	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @param FieldGroupRepository $repository Repository instance.
	 * @return void
	 */
	public function __construct( FieldGroupRepository $repository ) {
		$this->repository = $repository;
	}


	/**
	 * Validate field group ID format.
	 *
	 * @since 2.0.0
	 * @param string $id ID to validate.
	 * @return bool
	 */
	public function is_valid_id( $id ) {
		if ( empty( $id ) || ! is_string( $id ) ) {
			return false;
		}

		return (bool) preg_match( '/^[a-zA-Z0-9_-]+$/', $id );
	}


	/**
	 * Sanitize field group data.
	 *
	 * @since 2.0.0
	 * @param array $data Raw field group data.
	 * @return array
	 */
	public function sanitize_field_group_data( $data ) {
		$data = is_array( $data ) ? $data : array();

		return array(
			'id'                    => isset( $data['id'] ) ? sanitize_text_field( $data['id'] ) : '',
			'title'                 => isset( $data['title'] ) ? sanitize_text_field( $data['title'] ) : '',
			'description'           => isset( $data['description'] ) ? sanitize_textarea_field( $data['description'] ) : '',
			'active'                => isset( $data['active'] ) ? (bool) $data['active'] : true,
			'menu_order'            => isset( $data['menu_order'] ) ? absint( $data['menu_order'] ) : 0,
			'location'              => $this->sanitize_location_rules( isset( $data['location'] ) ? $data['location'] : array() ),
			'position'              => isset( $data['position'] ) ? sanitize_text_field( $data['position'] ) : 'normal',
			'style'                 => isset( $data['style'] ) ? sanitize_text_field( $data['style'] ) : 'default',
			'label_placement'       => isset( $data['label_placement'] ) ? sanitize_text_field( $data['label_placement'] ) : 'top',
			'instruction_placement' => isset( $data['instruction_placement'] ) ? sanitize_text_field( $data['instruction_placement'] ) : 'label',
			'hide_on_screen'        => $this->sanitize_array( isset( $data['hide_on_screen'] ) ? $data['hide_on_screen'] : array() ),
			'fields'                => $this->sanitize_fields( isset( $data['fields'] ) ? $data['fields'] : array() ),
			'created_at'            => isset( $data['created_at'] ) ? sanitize_text_field( $data['created_at'] ) : current_time( 'mysql' ),
			'updated_at'            => isset( $data['updated_at'] ) ? sanitize_text_field( $data['updated_at'] ) : current_time( 'mysql' ),
		);
	}


	/**
	 * Regenerate field IDs recursively.
	 *
	 * @since 2.0.0
	 * @param array $fields Array of fields.
	 * @return array
	 */
	public function regenerate_field_ids( $fields ) {
		if ( ! is_array( $fields ) ) {
			return array();
		}

		foreach ( $fields as &$field ) {
			if ( ! is_array( $field ) ) {
				continue;
			}

			$field['id'] = $this->repository->generate_field_id();

			if ( ! empty( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
				$field['sub_fields'] = $this->regenerate_field_ids( $field['sub_fields'] );
			}
		}

		unset( $field );

		return $fields;
	}


	/**
	 * Sanitize location rules.
	 *
	 * @since 2.0.0
	 * @param array $location Location rules array.
	 * @return array
	 */
	private function sanitize_location_rules( $location ) {
		if ( ! is_array( $location ) ) {
			return array();
		}

		$sanitized = array();

		foreach ( $location as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			$sanitized_group = array();

			foreach ( $group as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}

				$sanitized_group[] = array(
					'param'    => isset( $rule['param'] ) ? sanitize_text_field( $rule['param'] ) : '',
					'operator' => isset( $rule['operator'] ) ? sanitize_text_field( $rule['operator'] ) : '==',
					'value'    => isset( $rule['value'] ) ? sanitize_text_field( $rule['value'] ) : '',
				);
			}

			if ( ! empty( $sanitized_group ) ) {
				$sanitized[] = $sanitized_group;
			}
		}

		return $sanitized;
	}


	/**
	 * Sanitize fields recursively.
	 *
	 * @since 2.0.0
	 * @param array $fields Fields array.
	 * @return array
	 */
	private function sanitize_fields( $fields ) {
		if ( ! is_array( $fields ) ) {
			return array();
		}

		$sanitized = array();

		foreach ( $fields as $field ) {
			if ( ! is_array( $field ) ) {
				continue;
			}

			$sanitized_field = $this->get_base_sanitized_field( $field );
			$sanitized_field = $this->sanitize_field_type_settings( $sanitized_field, $field );

			$sanitized[] = $sanitized_field;
		}

		return $sanitized;
	}


	/**
	 * Get base sanitized field structure.
	 *
	 * @since 2.0.0
	 * @param array $field Raw field data.
	 * @return array
	 */
	private function get_base_sanitized_field( $field ) {
		return array(
			'id'                => isset( $field['id'] ) ? sanitize_text_field( $field['id'] ) : $this->repository->generate_field_id(),
			'key'               => isset( $field['key'] ) ? sanitize_key( $field['key'] ) : '',
			'label'             => isset( $field['label'] ) ? sanitize_text_field( $field['label'] ) : '',
			'name'              => isset( $field['name'] ) ? sanitize_key( $field['name'] ) : '',
			'type'              => isset( $field['type'] ) ? sanitize_text_field( $field['type'] ) : 'text',
			'instructions'      => isset( $field['instructions'] ) ? sanitize_textarea_field( $field['instructions'] ) : '',
			'required'          => isset( $field['required'] ) ? (bool) $field['required'] : false,
			'default_value'     => isset( $field['default_value'] ) ? sanitize_text_field( $field['default_value'] ) : '',
			'placeholder'       => isset( $field['placeholder'] ) ? sanitize_text_field( $field['placeholder'] ) : '',
			'wrapper'           => array(
				'width' => isset( $field['wrapper']['width'] ) ? sanitize_text_field( $field['wrapper']['width'] ) : '',
				'class' => isset( $field['wrapper']['class'] ) ? sanitize_text_field( $field['wrapper']['class'] ) : '',
				'id'    => isset( $field['wrapper']['id'] ) ? sanitize_text_field( $field['wrapper']['id'] ) : '',
			),
			'conditional_logic' => $this->sanitize_conditional_logic( isset( $field['conditional_logic'] ) ? $field['conditional_logic'] : array() ),
		);
	}


	/**
	 * Sanitize type-specific field settings.
	 *
	 * @since 2.0.0
	 * @param array $sanitized_field Base sanitized field.
	 * @param array $field Raw field data.
	 * @return array
	 */
	private function sanitize_field_type_settings( $sanitized_field, $field ) {
		switch ( $sanitized_field['type'] ) {
			case 'text':
			case 'textarea':
			case 'email':
			case 'url':
			case 'password':
				$sanitized_field['maxlength'] = isset( $field['maxlength'] ) ? absint( $field['maxlength'] ) : 0;
				$sanitized_field['prepend']   = isset( $field['prepend'] ) ? sanitize_text_field( $field['prepend'] ) : '';
				$sanitized_field['append']    = isset( $field['append'] ) ? sanitize_text_field( $field['append'] ) : '';
				break;

			case 'number':
				$sanitized_field['min']     = $this->sanitize_float_or_empty( isset( $field['min'] ) ? $field['min'] : '' );
				$sanitized_field['max']     = $this->sanitize_float_or_empty( isset( $field['max'] ) ? $field['max'] : '' );
				$sanitized_field['step']    = isset( $field['step'] ) ? floatval( $field['step'] ) : 1;
				$sanitized_field['prepend'] = isset( $field['prepend'] ) ? sanitize_text_field( $field['prepend'] ) : '';
				$sanitized_field['append']  = isset( $field['append'] ) ? sanitize_text_field( $field['append'] ) : '';
				break;

			case 'repeater':
				$sanitized_field['min']          = $this->sanitize_absint_or_empty( isset( $field['min'] ) ? $field['min'] : '' );
				$sanitized_field['max']          = $this->sanitize_absint_or_empty( isset( $field['max'] ) ? $field['max'] : '' );
				$sanitized_field['layout']       = isset( $field['layout'] ) ? sanitize_text_field( $field['layout'] ) : 'table';
				$sanitized_field['button_label'] = isset( $field['button_label'] ) ? sanitize_text_field( $field['button_label'] ) : __( 'Add Row', 'flexify-dashboard' );
				$sanitized_field['collapsed']    = isset( $field['collapsed'] ) ? sanitize_text_field( $field['collapsed'] ) : '';
				$sanitized_field['sub_fields']   = $this->sanitize_fields( isset( $field['sub_fields'] ) ? $field['sub_fields'] : array() );
				break;

			case 'select':
			case 'checkbox':
			case 'radio':
				$sanitized_field['choices']    = $this->sanitize_choices( isset( $field['choices'] ) ? $field['choices'] : array() );
				$sanitized_field['allow_null'] = isset( $field['allow_null'] ) ? (bool) $field['allow_null'] : false;
				$sanitized_field['multiple']   = isset( $field['multiple'] ) ? (bool) $field['multiple'] : false;
				$sanitized_field['ui']         = isset( $field['ui'] ) ? (bool) $field['ui'] : false;
				break;

			case 'true_false':
				$sanitized_field['default_value'] = isset( $field['default_value'] ) ? (bool) $field['default_value'] : false;
				$sanitized_field['message']       = isset( $field['message'] ) ? sanitize_text_field( $field['message'] ) : '';
				$sanitized_field['ui']            = isset( $field['ui'] ) ? (bool) $field['ui'] : true;
				break;

			case 'wysiwyg':
				$sanitized_field['tabs']         = isset( $field['tabs'] ) ? sanitize_text_field( $field['tabs'] ) : 'all';
				$sanitized_field['toolbar']      = isset( $field['toolbar'] ) ? sanitize_text_field( $field['toolbar'] ) : 'full';
				$sanitized_field['media_upload'] = isset( $field['media_upload'] ) ? (bool) $field['media_upload'] : true;
				break;

			case 'relationship':
				$sanitized_field['relation_type'] = isset( $field['relation_type'] ) ? sanitize_text_field( $field['relation_type'] ) : 'post';
				$sanitized_field['multiple']      = isset( $field['multiple'] ) ? (bool) $field['multiple'] : false;
				$sanitized_field['allow_null']    = isset( $field['allow_null'] ) ? (bool) $field['allow_null'] : false;
				$sanitized_field['return_format'] = isset( $field['return_format'] ) ? sanitize_text_field( $field['return_format'] ) : 'id';
				$sanitized_field['post_type']     = $this->sanitize_array( isset( $field['post_type'] ) ? $field['post_type'] : array() );
				$sanitized_field['taxonomy']      = $this->sanitize_array( isset( $field['taxonomy'] ) ? $field['taxonomy'] : array() );
				$sanitized_field['min']           = $this->sanitize_absint_or_zero( isset( $field['min'] ) ? $field['min'] : '' );
				$sanitized_field['max']           = $this->sanitize_absint_or_zero( isset( $field['max'] ) ? $field['max'] : '' );
				break;

			case 'image':
				$sanitized_field['multiple']      = isset( $field['multiple'] ) ? (bool) $field['multiple'] : false;
				$sanitized_field['min']           = $this->sanitize_absint_or_zero( isset( $field['min'] ) ? $field['min'] : '' );
				$sanitized_field['max']           = $this->sanitize_absint_or_zero( isset( $field['max'] ) ? $field['max'] : '' );
				$sanitized_field['return_format'] = isset( $field['return_format'] ) ? sanitize_text_field( $field['return_format'] ) : 'object';
				$sanitized_field['preview_size']  = isset( $field['preview_size'] ) ? sanitize_text_field( $field['preview_size'] ) : 'medium';
				break;

			case 'file':
				$sanitized_field['return_format'] = isset( $field['return_format'] ) ? sanitize_text_field( $field['return_format'] ) : 'object';
				$sanitized_field['mime_types']    = isset( $field['mime_types'] ) ? sanitize_text_field( $field['mime_types'] ) : '';
				break;

			case 'date_picker':
				$sanitized_field['display_format'] = isset( $field['display_format'] ) ? sanitize_text_field( $field['display_format'] ) : 'YYYY-MM-DD';
				$sanitized_field['first_day']      = isset( $field['first_day'] ) ? absint( $field['first_day'] ) : 1;
				break;

			case 'link':
				$sanitized_field['return_format'] = isset( $field['return_format'] ) ? sanitize_text_field( $field['return_format'] ) : 'object';
				break;

			case 'color_picker':
				$sanitized_field['default_value'] = isset( $field['default_value'] ) ? sanitize_text_field( $field['default_value'] ) : '';
				$sanitized_field['enable_alpha']  = isset( $field['enable_alpha'] ) ? (bool) $field['enable_alpha'] : false;
				$sanitized_field['return_format'] = isset( $field['return_format'] ) ? sanitize_text_field( $field['return_format'] ) : 'hex';
				break;

			case 'oembed':
				$sanitized_field['preview_width']  = $this->sanitize_absint_or_empty( isset( $field['preview_width'] ) ? $field['preview_width'] : '' );
				$sanitized_field['preview_height'] = $this->sanitize_absint_or_empty( isset( $field['preview_height'] ) ? $field['preview_height'] : '' );
				break;

			case 'range':
				$sanitized_field['default_value'] = $this->sanitize_float_or_empty( isset( $field['default_value'] ) ? $field['default_value'] : '' );
				$sanitized_field['min']           = isset( $field['min'] ) && '' !== $field['min'] ? floatval( $field['min'] ) : 0;
				$sanitized_field['max']           = isset( $field['max'] ) && '' !== $field['max'] ? floatval( $field['max'] ) : 100;
				$sanitized_field['step']          = isset( $field['step'] ) ? floatval( $field['step'] ) : 1;
				$sanitized_field['prepend']       = isset( $field['prepend'] ) ? sanitize_text_field( $field['prepend'] ) : '';
				$sanitized_field['append']        = isset( $field['append'] ) ? sanitize_text_field( $field['append'] ) : '';
				break;

			case 'time_picker':
				$sanitized_field['display_format'] = isset( $field['display_format'] ) ? sanitize_text_field( $field['display_format'] ) : '12h';
				$sanitized_field['return_format']  = isset( $field['return_format'] ) ? sanitize_text_field( $field['return_format'] ) : 'H:i:s';
				break;

			case 'google_map':
				$sanitized_field['center_lat'] = isset( $field['center_lat'] ) ? sanitize_text_field( $field['center_lat'] ) : '51.5074';
				$sanitized_field['center_lng'] = isset( $field['center_lng'] ) ? sanitize_text_field( $field['center_lng'] ) : '-0.1278';
				$sanitized_field['zoom']       = isset( $field['zoom'] ) && '' !== $field['zoom'] ? absint( $field['zoom'] ) : 13;
				$sanitized_field['height']     = isset( $field['height'] ) ? sanitize_text_field( $field['height'] ) : '400px';
				$sanitized_field['map_style']  = isset( $field['map_style'] ) ? sanitize_text_field( $field['map_style'] ) : 'streets-v12';
				break;
		}

		return $sanitized_field;
	}


	/**
	 * Sanitize conditional logic.
	 *
	 * @since 2.0.0
	 * @param array|bool $logic Conditional logic data.
	 * @return array|bool
	 */
	private function sanitize_conditional_logic( $logic ) {
		if ( false === $logic || empty( $logic ) || ! is_array( $logic ) ) {
			return false;
		}

		$sanitized = array();

		foreach ( $logic as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			$sanitized_group = array();

			foreach ( $group as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}

				$sanitized_group[] = array(
					'field'    => isset( $rule['field'] ) ? sanitize_text_field( $rule['field'] ) : '',
					'operator' => isset( $rule['operator'] ) ? sanitize_text_field( $rule['operator'] ) : '==',
					'value'    => isset( $rule['value'] ) ? sanitize_text_field( $rule['value'] ) : '',
				);
			}

			if ( ! empty( $sanitized_group ) ) {
				$sanitized[] = $sanitized_group;
			}
		}

		return ! empty( $sanitized ) ? $sanitized : false;
	}


	/**
	 * Sanitize field choices.
	 *
	 * @since 2.0.0
	 * @param array $choices Choices array.
	 * @return array
	 */
	private function sanitize_choices( $choices ) {
		if ( ! is_array( $choices ) ) {
			return array();
		}

		$sanitized = array();

		foreach ( $choices as $key => $value ) {
			if ( is_array( $value ) ) {
				$choice_key   = isset( $value['value'] ) ? sanitize_text_field( $value['value'] ) : sanitize_text_field( $key );
				$choice_label = isset( $value['label'] ) ? sanitize_text_field( $value['label'] ) : $choice_key;
				$sanitized[ $choice_key ] = $choice_label;
				continue;
			}

			$sanitized[ sanitize_text_field( $key ) ] = sanitize_text_field( $value );
		}

		return $sanitized;
	}


	/**
	 * Sanitize an array of strings.
	 *
	 * @since 2.0.0
	 * @param array $arr Array to sanitize.
	 * @return array
	 */
	private function sanitize_array( $arr ) {
		if ( ! is_array( $arr ) ) {
			return array();
		}

		return array_map( 'sanitize_text_field', $arr );
	}


	/**
	 * Sanitize float value or return empty string.
	 *
	 * @since 2.0.0
	 * @param mixed $value Value to sanitize.
	 * @return float|string
	 */
	private function sanitize_float_or_empty( $value ) {
		return '' !== $value && null !== $value ? floatval( $value ) : '';
	}


	/**
	 * Sanitize absint value or return empty string.
	 *
	 * @since 2.0.0
	 * @param mixed $value Value to sanitize.
	 * @return int|string
	 */
	private function sanitize_absint_or_empty( $value ) {
		return '' !== $value && null !== $value ? absint( $value ) : '';
	}


	/**
	 * Sanitize absint value or return zero.
	 *
	 * @since 2.0.0
	 * @param mixed $value Value to sanitize.
	 * @return int
	 */
	private function sanitize_absint_or_zero( $value ) {
		return '' !== $value && null !== $value ? absint( $value ) : 0;
	}
}