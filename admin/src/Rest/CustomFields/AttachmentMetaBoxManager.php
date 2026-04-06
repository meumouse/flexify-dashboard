<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class AttachmentMetaBoxManager
 *
 * Handle custom field rendering and saving on attachment edit screens.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class AttachmentMetaBoxManager {

	/**
	 * Custom fields form wrapper class.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const APP_CONTAINER_CLASS = 'flexify-dashboard-custom-fields-app flexify-dashboard-attachment-fields';

	/**
	 * Attachment context slug.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const ATTACHMENT_CONTEXT = 'attachment';

	/**
	 * Attachment field key prefix.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const FIELD_KEY_PREFIX = 'flexify_dashboard_';

	/**
	 * Repository instance.
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
	 * @return void
	 */
	public function __construct( FieldGroupRepository $repository, LocationRuleEvaluator $evaluator ) {
		$this->repository = $repository;
		$this->evaluator  = $evaluator;
	}


	/**
	 * Register attachment hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_hooks() {
		add_filter( 'attachment_fields_to_edit', array( $this, 'add_attachment_fields' ), 10, 2 );
		add_filter( 'attachment_fields_to_save', array( $this, 'save_attachment_fields' ), 10, 2 );
		add_action( 'add_meta_boxes_attachment', array( $this, 'add_attachment_meta_box' ) );
	}


	/**
	 * Add custom fields to the attachment edit form.
	 *
	 * @since 2.0.0
	 * @param array    $form_fields Existing form fields.
	 * @param \WP_Post $post Attachment post object.
	 * @return array
	 */
	public function add_attachment_fields( $form_fields, $post ) {
		$field_groups = $this->get_field_groups_for_attachment( $post );

		if ( empty( $field_groups ) ) {
			return $form_fields;
		}

		foreach ( $field_groups as $group ) {
			$form_fields[ self::FIELD_KEY_PREFIX . $group['id'] ] = array(
				'label' => $group['title'],
				'input' => 'html',
				'html'  => $this->get_attachment_app_markup( $group, $post->ID ),
				'helps' => isset( $group['description'] ) ? $group['description'] : '',
			);
		}

		return $form_fields;
	}


	/**
	 * Add meta boxes to the attachment edit page.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Attachment post object.
	 * @return void
	 */
	public function add_attachment_meta_box( $post ) {
		$field_groups = $this->get_field_groups_for_attachment( $post );

		if ( empty( $field_groups ) ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			add_meta_box(
				self::FIELD_KEY_PREFIX . 'attachment_' . $group['id'],
				$group['title'],
				array( $this, 'render_attachment_meta_box' ),
				self::ATTACHMENT_CONTEXT,
				'normal',
				'high',
				array(
					'group' => $group,
				)
			);
		}
	}


	/**
	 * Render attachment meta box content.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Attachment post object.
	 * @param array    $args Meta box arguments.
	 * @return void
	 */
	public function render_attachment_meta_box( $post, $args ) {
		$group = isset( $args['args']['group'] ) && is_array( $args['args']['group'] ) ? $args['args']['group'] : array();

		if ( empty( $group ) ) {
			return;
		}

		wp_nonce_field(
			'flexify_dashboard_attachment_fields_' . $group['id'],
			'flexify_dashboard_attachment_nonce_' . $group['id']
		);

		echo $this->get_attachment_app_markup( $group, $post->ID ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}


	/**
	 * Save custom attachment fields.
	 *
	 * @since 2.0.0
	 * @param array $post Post data.
	 * @param array $attachment Attachment data.
	 * @return array
	 */
	public function save_attachment_fields( $post, $attachment ) {
		$custom_fields = isset( $attachment['flexify_dashboard_cf'] ) && is_array( $attachment['flexify_dashboard_cf'] )
			? $attachment['flexify_dashboard_cf']
			: array();

		if ( empty( $custom_fields ) ) {
			return $post;
		}

		$attachment_id = isset( $post['ID'] ) ? absint( $post['ID'] ) : 0;

		if ( empty( $attachment_id ) ) {
			return $post;
		}

		$attachment_post = get_post( $attachment_id );

		if ( ! $attachment_post instanceof \WP_Post ) {
			return $post;
		}

		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) ) {
			return $post;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			if ( ! $this->group_matches_attachment( $group, $attachment_post ) ) {
				continue;
			}

			$this->save_group_fields( $attachment_id, $group, $custom_fields );
		}

		return $post;
	}


	/**
	 * Get field groups for an attachment.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Attachment post object.
	 * @return array
	 */
	private function get_field_groups_for_attachment( $post ) {
		$field_groups     = $this->repository->read();
		$matching_groups  = array();

		if ( ! is_array( $field_groups ) ) {
			return $matching_groups;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			if ( ! $this->group_matches_attachment( $group, $post ) ) {
				continue;
			}

			$matching_groups[] = $group;
		}

		return $matching_groups;
	}


	/**
	 * Check if a field group is valid and active.
	 *
	 * @since 2.0.0
	 * @param mixed $group Field group data.
	 * @return bool
	 */
	private function is_valid_field_group( $group ) {
		if ( ! is_array( $group ) ) {
			return false;
		}

		if ( empty( $group['active'] ) ) {
			return false;
		}

		if ( empty( $group['id'] ) || empty( $group['title'] ) ) {
			return false;
		}

		if ( empty( $group['location'] ) || ! is_array( $group['location'] ) ) {
			return false;
		}

		return true;
	}


	/**
	 * Check whether a field group should be shown for an attachment.
	 *
	 * @since 2.0.0
	 * @param array    $group Field group data.
	 * @param \WP_Post $post Attachment post object.
	 * @return bool
	 */
	private function group_matches_attachment( $group, $post ) {
		if ( ! isset( $group['location'] ) || ! is_array( $group['location'] ) ) {
			return false;
		}

		if ( is_object( $this->evaluator ) && method_exists( $this->evaluator, 'should_show_for_attachment' ) ) {
			return (bool) $this->evaluator->should_show_for_attachment( $group['location'], $post );
		}

		return (bool) LocationRuleEvaluator::should_show_for_attachment( $group['location'], $post );
	}


	/**
	 * Build the Vue app markup for an attachment field group.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @param int   $attachment_id Attachment ID.
	 * @return string
	 */
	private function get_attachment_app_markup( $group, $attachment_id ) {
		$vue_group_data = FieldValueSanitizer::prepare_vue_group_data( $group );
		$saved_values   = $this->get_saved_values( $group, $attachment_id );

		return sprintf(
			'<div class="%1$s" data-field-group="%2$s" data-saved-values="%3$s" data-attachment-id="%4$d" data-context="%5$s"></div>',
			esc_attr( self::APP_CONTAINER_CLASS ),
			esc_attr( wp_json_encode( $vue_group_data ) ),
			esc_attr( wp_json_encode( $saved_values ) ),
			absint( $attachment_id ),
			esc_attr( self::ATTACHMENT_CONTEXT )
		);
	}


	/**
	 * Get saved values for a field group.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @param int   $attachment_id Attachment ID.
	 * @return array
	 */
	private function get_saved_values( $group, $attachment_id ) {
		$saved_values = array();
		$fields       = isset( $group['fields'] ) && is_array( $group['fields'] ) ? $group['fields'] : array();

		foreach ( $fields as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$saved_values[ $field['name'] ] = get_post_meta( $attachment_id, $field['name'], true );
		}

		return $saved_values;
	}


	/**
	 * Save all fields for a specific group.
	 *
	 * @since 2.0.0
	 * @param int   $attachment_id Attachment ID.
	 * @param array $group Field group data.
	 * @param array $custom_fields Submitted custom fields.
	 * @return void
	 */
	private function save_group_fields( $attachment_id, $group, $custom_fields ) {
		$fields = isset( $group['fields'] ) && is_array( $group['fields'] ) ? $group['fields'] : array();

		foreach ( $fields as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$field_name = $field['name'];

			if ( isset( $custom_fields[ $field_name ] ) ) {
				$value = FieldValueSanitizer::sanitize( $custom_fields[ $field_name ], $field );
				update_post_meta( $attachment_id, $field_name, $value );
				continue;
			}

			if ( isset( $field['type'] ) && 'true_false' === $field['type'] ) {
				update_post_meta( $attachment_id, $field_name, '0' );
			}
		}
	}
}