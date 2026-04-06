<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class MetaBoxManager
 *
 * Handles meta box registration and rendering for post edit screens.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class MetaBoxManager {

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
	 * @param FieldGroupRepository  $repository Repository instance.
	 * @param LocationRuleEvaluator $evaluator Evaluator instance.
	 */
	public function __construct( FieldGroupRepository $repository, LocationRuleEvaluator $evaluator ) {
		$this->repository = $repository;
		$this->evaluator  = $evaluator;
	}


	/**
	 * Register custom fields meta boxes.
	 *
	 * This method should be called on the `add_meta_boxes` hook.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_meta_boxes() {
		$field_groups = $this->repository->read();

		if ( ! is_array( $field_groups ) || empty( $field_groups ) ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			$post_types = $this->evaluator->get_location_post_types(
				isset( $group['location'] ) && is_array( $group['location'] ) ? $group['location'] : array()
			);

			if ( empty( $post_types ) ) {
				continue;
			}

			$this->register_group_meta_boxes( $group, $post_types );
		}
	}


	/**
	 * Render meta box content.
	 *
	 * Outputs the Vue application container with the required data attributes.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param array    $args Meta box arguments.
	 * @return void
	 */
	public function render_meta_box( $post, $args ) {
		$group = isset( $args['args']['group'] ) && is_array( $args['args']['group'] )
			? $args['args']['group']
			: array();

		if ( empty( $group ) || empty( $group['id'] ) ) {
			return;
		}

		$location = isset( $group['location'] ) && is_array( $group['location'] )
			? $group['location']
			: array();

		if ( ! empty( $location ) && ! $this->evaluator->should_show_for_post( $location, $post ) ) {
			printf(
				'<style>#flexify_dashboard_%s { display: none !important; }</style>',
				esc_attr( $group['id'] )
			);

			return;
		}

		wp_nonce_field( 'flexify_dashboard_custom_fields_' . $group['id'], 'flexify_dashboard_cf_nonce_' . $group['id'] );

		$saved_values   = $this->get_saved_field_values( $post->ID, $group );
		$vue_group_data = FieldValueSanitizer::prepare_vue_group_data( $group );

		printf(
			'<div class="flexify-dashboard-custom-fields-app" data-field-group="%s" data-saved-values="%s" data-post-id="%d" data-context="post"></div>',
			esc_attr( wp_json_encode( $vue_group_data ) ),
			esc_attr( wp_json_encode( $saved_values ) ),
			absint( $post->ID )
		);
	}


	/**
	 * Check whether a field group is valid for registration.
	 *
	 * @since 2.0.0
	 * @param mixed $group Field group data.
	 * @return bool
	 */
	private function is_valid_field_group( $group ) {
		if ( ! is_array( $group ) ) {
			return false;
		}

		if ( empty( $group['id'] ) || empty( $group['active'] ) ) {
			return false;
		}

		if ( empty( $group['title'] ) ) {
			return false;
		}

		return true;
	}


	/**
	 * Register meta boxes for a field group across post types.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @param array $post_types Post types.
	 * @return void
	 */
	private function register_group_meta_boxes( $group, $post_types ) {
		foreach ( $post_types as $post_type ) {
			if ( ! is_string( $post_type ) || '' === $post_type ) {
				continue;
			}

			add_meta_box(
				'flexify_dashboard_' . $group['id'],
				$group['title'],
				array( $this, 'render_meta_box' ),
				$post_type,
				$this->get_meta_box_context( $group ),
				'default',
				array(
					'group' => $group,
				)
			);
		}
	}


	/**
	 * Get the meta box context position.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @return string
	 */
	private function get_meta_box_context( $group ) {
		$position = isset( $group['position'] ) ? sanitize_key( $group['position'] ) : 'normal';
		$allowed  = array( 'normal', 'side', 'advanced' );

		if ( ! in_array( $position, $allowed, true ) ) {
			return 'normal';
		}

		return $position;
	}


	/**
	 * Get saved meta values for the field group.
	 *
	 * @since 2.0.0
	 * @param int   $post_id Post ID.
	 * @param array $group Field group data.
	 * @return array
	 */
	private function get_saved_field_values( $post_id, $group ) {
		$saved_values = array();
		$fields       = isset( $group['fields'] ) && is_array( $group['fields'] ) ? $group['fields'] : array();

		foreach ( $fields as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$saved_values[ $field['name'] ] = get_post_meta( $post_id, $field['name'], true );
		}

		return $saved_values;
	}
}