<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class UserMetaBoxManager
 *
 * Handles custom field rendering and saving on user profile screens.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class UserMetaBoxManager {

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
	 * @return void
	 */
	public function __construct( FieldGroupRepository $repository, LocationRuleEvaluator $evaluator ) {
		$this->repository = $repository;
		$this->evaluator  = $evaluator;
	}


	/**
	 * Register user-related hooks for custom fields.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_hooks() {
		add_action( 'show_user_profile', array( $this, 'render_user_fields' ), 10, 1 );
		add_action( 'edit_user_profile', array( $this, 'render_user_fields' ), 10, 1 );
		add_action( 'user_new_form', array( $this, 'render_add_user_fields' ), 10, 1 );

		add_action( 'personal_options_update', array( $this, 'save_user_fields' ) );
		add_action( 'edit_user_profile_update', array( $this, 'save_user_fields' ) );
		add_action( 'user_register', array( $this, 'save_user_fields' ) );
	}


	/**
	 * Render custom fields on user profile and edit screens.
	 *
	 * @since 2.0.0
	 * @param \WP_User $user User object.
	 * @return void
	 */
	public function render_user_fields( $user ) {
		$context = 'edit';
		$field_groups = $this->get_field_groups_for_user( $user, $context );

		if ( empty( $field_groups ) ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			$this->render_fields( $group, $user, $context );
		}
	}


	/**
	 * Render custom fields on the add new user screen.
	 *
	 * @since 2.0.0
	 * @param string $operation Operation type.
	 * @return void
	 */
	public function render_add_user_fields( $operation ) {
		if ( 'add-new-user' !== $operation ) {
			return;
		}

		$context = 'add';
		$field_groups = $this->get_field_groups_for_user( null, $context );

		if ( empty( $field_groups ) ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			$this->render_fields( $group, null, $context );
		}
	}


	/**
	 * Save custom fields for a user.
	 *
	 * @since 2.0.0
	 * @param int $user_id User ID.
	 * @return void
	 */
	public function save_user_fields( $user_id ) {
		if ( ! current_user_can( 'edit_user', $user_id ) ) {
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

		$user    = get_user_by( 'ID', $user_id );
		$context = $user ? 'edit' : 'add';

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			$location = isset( $group['location'] ) && is_array( $group['location'] )
				? $group['location']
				: array();

			if ( ! empty( $location ) && ! $this->evaluator->should_show_for_user( $location, $user, $context ) ) {
				continue;
			}

			if ( ! $this->verify_group_nonce( $group ) ) {
				continue;
			}

			$this->save_group_fields( $user_id, $group, $custom_fields );
		}
	}


	/**
	 * Get field groups that should be displayed for a user context.
	 *
	 * @since 2.0.0
	 * @param \WP_User|null $user User object.
	 * @param string        $context Context type.
	 * @return array
	 */
	private function get_field_groups_for_user( $user, $context ) {
		$field_groups    = $this->repository->read();
		$matching_groups = array();

		if ( ! is_array( $field_groups ) || empty( $field_groups ) ) {
			return $matching_groups;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			$location = isset( $group['location'] ) && is_array( $group['location'] )
				? $group['location']
				: array();

			if ( empty( $location ) ) {
				continue;
			}

			if ( $this->evaluator->should_show_for_user( $location, $user, $context ) ) {
				$matching_groups[] = $group;
			}
		}

		return $matching_groups;
	}


	/**
	 * Render field group fields for a user.
	 *
	 * @since 2.0.0
	 * @param array         $group Field group.
	 * @param \WP_User|null $user User object.
	 * @param string        $context Context type.
	 * @return void
	 */
	private function render_fields( $group, $user, $context ) {
		if ( empty( $group['id'] ) || empty( $group['title'] ) ) {
			return;
		}

		wp_nonce_field( 'flexify_dashboard_user_fields_' . $group['id'], 'flexify_dashboard_user_nonce_' . $group['id'] );

		$saved_values   = $this->get_saved_user_values( $group, $user );
		$vue_group_data = FieldValueSanitizer::prepare_vue_group_data( $group );
		$user_id        = $user ? absint( $user->ID ) : 0;

		echo '<h2>' . esc_html( $group['title'] ) . '</h2>';

		if ( ! empty( $group['description'] ) ) {
			echo '<p class="description">' . esc_html( $group['description'] ) . '</p>';
		}

		echo '<table class="form-table" role="presentation">';
		echo '<tbody>';
		echo '<tr class="flexify-dashboard-user-fields-row">';
		echo '<th scope="row">' . esc_html__( 'Custom Fields', 'flexify-dashboard' ) . '</th>';
		echo '<td>';

		printf(
			'<div class="flexify-dashboard-custom-fields-app flexify-dashboard-user-fields" data-field-group="%s" data-saved-values="%s" data-user-id="%d" data-context="user"></div>',
			esc_attr( wp_json_encode( $vue_group_data ) ),
			esc_attr( wp_json_encode( $saved_values ) ),
			absint( $user_id )
		);

		echo '</td>';
		echo '</tr>';
		echo '</tbody>';
		echo '</table>';
	}


	/**
	 * Get saved values for all fields in a group.
	 *
	 * @since 2.0.0
	 * @param array         $group Field group.
	 * @param \WP_User|null $user User object.
	 * @return array
	 */
	private function get_saved_user_values( $group, $user ) {
		$saved_values = array();

		if ( ! $user || empty( $group['fields'] ) || ! is_array( $group['fields'] ) ) {
			return $saved_values;
		}

		foreach ( $group['fields'] as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$saved_values[ $field['name'] ] = get_user_meta( $user->ID, $field['name'], true );
		}

		return $saved_values;
	}


	/**
	 * Save all fields from a field group.
	 *
	 * @since 2.0.0
	 * @param int   $user_id User ID.
	 * @param array $group Field group.
	 * @param array $custom_fields Submitted custom fields.
	 * @return void
	 */
	private function save_group_fields( $user_id, $group, $custom_fields ) {
		$fields = isset( $group['fields'] ) && is_array( $group['fields'] )
			? $group['fields']
			: array();

		foreach ( $fields as $field ) {
			$field_name = isset( $field['name'] ) ? $field['name'] : '';
			$field_type = isset( $field['type'] ) ? $field['type'] : 'text';

			if ( empty( $field_name ) ) {
				continue;
			}

			if ( array_key_exists( $field_name, $custom_fields ) ) {
				$value = FieldValueSanitizer::sanitize( $custom_fields[ $field_name ], $field );
				update_user_meta( $user_id, $field_name, $value );
				continue;
			}

			$this->maybe_clear_empty_field( $user_id, $field_name, $field_type, $field );
		}
	}


	/**
	 * Clear empty fields that may not be submitted.
	 *
	 * @since 2.0.0
	 * @param int    $user_id User ID.
	 * @param string $field_name Field name.
	 * @param string $field_type Field type.
	 * @param array  $field Field configuration.
	 * @return void
	 */
	private function maybe_clear_empty_field( $user_id, $field_name, $field_type, $field ) {
		switch ( $field_type ) {
			case 'true_false':
				update_user_meta( $user_id, $field_name, '0' );
				break;

			case 'relationship':
			case 'repeater':
			case 'group':
				update_user_meta( $user_id, $field_name, array() );
				break;

			case 'image':
			case 'file':
			case 'gallery':
			case 'link':
			case 'google_map':
				update_user_meta( $user_id, $field_name, ! empty( $field['multiple'] ) ? array() : null );
				break;
		}
	}


	/**
	 * Verify the nonce for a field group.
	 *
	 * @since 2.0.0
	 * @param array $group Field group data.
	 * @return bool
	 */
	private function verify_group_nonce( $group ) {
		$nonce_name = 'flexify_dashboard_user_nonce_' . $group['id'];
		$nonce      = isset( $_POST[ $nonce_name ] ) ? sanitize_text_field( wp_unslash( $_POST[ $nonce_name ] ) ) : '';

		if ( empty( $nonce ) ) {
			return false;
		}

		return wp_verify_nonce( $nonce, 'flexify_dashboard_user_fields_' . $group['id'] );
	}


	/**
	 * Check whether a field group is valid.
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

		return true;
	}
}