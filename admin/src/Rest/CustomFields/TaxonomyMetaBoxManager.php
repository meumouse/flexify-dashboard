<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class TaxonomyMetaBoxManager
 *
 * Handles custom field rendering and saving on taxonomy term edit screens.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class TaxonomyMetaBoxManager {

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
	 * Register taxonomy term hooks for custom fields.
	 *
	 * This method should be called during plugin initialization.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_taxonomy_hooks() {
		$taxonomies = $this->get_taxonomies_with_fields();

		if ( empty( $taxonomies ) ) {
			return;
		}

		foreach ( $taxonomies as $taxonomy ) {
			add_action( "{$taxonomy}_add_form_fields", array( $this, 'render_add_form_fields' ), 10, 1 );
			add_action( "{$taxonomy}_edit_form_fields", array( $this, 'render_edit_form_fields' ), 10, 2 );

			add_action( "created_{$taxonomy}", array( $this, 'save_term_fields' ), 10, 2 );
			add_action( "edited_{$taxonomy}", array( $this, 'save_term_fields' ), 10, 2 );
		}

		add_action( 'admin_footer', array( $this, 'print_taxonomy_scripts' ) );
	}


	/**
	 * Render custom fields on the add term form.
	 *
	 * @since 2.0.0
	 * @param string $taxonomy Taxonomy name.
	 * @return void
	 */
	public function render_add_form_fields( $taxonomy ) {
		$field_groups = $this->get_field_groups_for_taxonomy( $taxonomy, null );

		if ( empty( $field_groups ) ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			$this->render_term_fields( $group, null, 'add' );
		}
	}


	/**
	 * Render custom fields on the edit term form.
	 *
	 * @since 2.0.0
	 * @param \WP_Term $term Term object.
	 * @param string   $taxonomy Taxonomy name.
	 * @return void
	 */
	public function render_edit_form_fields( $term, $taxonomy ) {
		$field_groups = $this->get_field_groups_for_taxonomy( $taxonomy, $term );

		if ( empty( $field_groups ) ) {
			return;
		}

		foreach ( $field_groups as $group ) {
			$this->render_term_fields( $group, $term, 'edit' );
		}
	}


	/**
	 * Save custom fields for a term.
	 *
	 * @since 2.0.0
	 * @param int $term_id Term ID.
	 * @param int $tt_id Term taxonomy ID.
	 * @return void
	 */
	public function save_term_fields( $term_id, $tt_id ) {
		$term = get_term( $term_id );

		if ( ! $term || is_wp_error( $term ) ) {
			return;
		}

		$taxonomy     = $term->taxonomy;
		$taxonomy_obj = get_taxonomy( $taxonomy );

		if ( ! $taxonomy_obj || ! isset( $taxonomy_obj->cap->edit_terms ) || ! current_user_can( $taxonomy_obj->cap->edit_terms ) ) {
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

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			$location = isset( $group['location'] ) && is_array( $group['location'] )
				? $group['location']
				: array();

			if ( ! empty( $location ) && ! $this->evaluator->should_show_for_taxonomy( $location, $taxonomy, $term ) ) {
				continue;
			}

			if ( ! $this->verify_group_nonce( $group ) ) {
				continue;
			}

			$this->save_group_fields( $term_id, $group, $custom_fields );
		}
	}


	/**
	 * Print taxonomy scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function print_taxonomy_scripts() {
		$screen = get_current_screen();

		if ( ! $screen || empty( $screen->taxonomy ) ) {
			return;
		}

		if ( ! in_array( $screen->base, array( 'edit-tags', 'term' ), true ) ) {
			return;
		}

		?>
		<script>
		if (typeof window.flexifyDashboardTaxonomyContext === 'undefined') {
			window.flexifyDashboardTaxonomyContext = {
				context: 'taxonomy',
				taxonomy: <?php echo wp_json_encode( $screen->taxonomy ); ?>
			};
		}
		</script>
		<?php
	}


	/**
	 * Get all taxonomies that have field groups assigned to them.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_taxonomies_with_fields() {
		$field_groups = $this->repository->read();
		$taxonomies   = array();

		if ( ! is_array( $field_groups ) || empty( $field_groups ) ) {
			return $taxonomies;
		}

		foreach ( $field_groups as $group ) {
			if ( ! $this->is_valid_field_group( $group ) ) {
				continue;
			}

			$location          = isset( $group['location'] ) && is_array( $group['location'] ) ? $group['location'] : array();
			$group_taxonomies  = $this->evaluator->get_location_taxonomies( $location );
			$taxonomies        = array_merge( $taxonomies, $group_taxonomies );
		}

		return array_values( array_unique( array_filter( $taxonomies ) ) );
	}


	/**
	 * Get field groups that should be displayed for a taxonomy.
	 *
	 * @since 2.0.0
	 * @param string        $taxonomy Taxonomy name.
	 * @param \WP_Term|null $term Term object.
	 * @return array
	 */
	private function get_field_groups_for_taxonomy( $taxonomy, $term ) {
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

			if ( $this->evaluator->should_show_for_taxonomy( $location, $taxonomy, $term ) ) {
				$matching_groups[] = $group;
			}
		}

		return $matching_groups;
	}


	/**
	 * Render field group fields for a term.
	 *
	 * @since 2.0.0
	 * @param array         $group Field group.
	 * @param \WP_Term|null $term Term object.
	 * @param string        $context Context type.
	 * @return void
	 */
	private function render_term_fields( $group, $term, $context ) {
		if ( empty( $group['id'] ) ) {
			return;
		}

		wp_nonce_field( 'flexify_dashboard_taxonomy_fields_' . $group['id'], 'flexify_dashboard_tax_nonce_' . $group['id'] );

		$saved_values   = $this->get_saved_term_values( $group, $term );
		$vue_group_data = FieldValueSanitizer::prepare_vue_group_data( $group );
		$term_id        = $term ? absint( $term->term_id ) : 0;

		if ( 'edit' === $context ) {
			echo '<tr class="form-field">';
			echo '<th scope="row">';
			echo '<label>' . esc_html( $group['title'] ) . '</label>';
			echo '</th>';
			echo '<td>';

			$this->render_vue_container( $vue_group_data, $saved_values, $term_id );

			echo '</td>';
			echo '</tr>';

			return;
		}

		echo '<div class="form-field">';
		echo '<label>' . esc_html( $group['title'] ) . '</label>';

		$this->render_vue_container( $vue_group_data, $saved_values, $term_id );

		echo '</div>';
	}


	/**
	 * Render the Vue app container.
	 *
	 * @since 2.0.0
	 * @param array $vue_group_data Vue group data.
	 * @param array $saved_values Saved values.
	 * @param int   $term_id Term ID.
	 * @return void
	 */
	private function render_vue_container( $vue_group_data, $saved_values, $term_id ) {
		printf(
			'<div class="flexify-dashboard-custom-fields-app flexify-dashboard-taxonomy-fields" data-field-group="%s" data-saved-values="%s" data-term-id="%d" data-context="taxonomy"></div>',
			esc_attr( wp_json_encode( $vue_group_data ) ),
			esc_attr( wp_json_encode( $saved_values ) ),
			absint( $term_id )
		);
	}


	/**
	 * Get saved values for group fields.
	 *
	 * @since 2.0.0
	 * @param array         $group Field group.
	 * @param \WP_Term|null $term Term object.
	 * @return array
	 */
	private function get_saved_term_values( $group, $term ) {
		$saved_values = array();

		if ( ! $term || empty( $group['fields'] ) || ! is_array( $group['fields'] ) ) {
			return $saved_values;
		}

		foreach ( $group['fields'] as $field ) {
			if ( empty( $field['name'] ) ) {
				continue;
			}

			$saved_values[ $field['name'] ] = get_term_meta( $term->term_id, $field['name'], true );
		}

		return $saved_values;
	}


	/**
	 * Save all fields from a field group.
	 *
	 * @since 2.0.0
	 * @param int   $term_id Term ID.
	 * @param array $group Field group.
	 * @param array $custom_fields Submitted custom fields.
	 * @return void
	 */
	private function save_group_fields( $term_id, $group, $custom_fields ) {
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
				update_term_meta( $term_id, $field_name, $value );
				continue;
			}

			$this->maybe_clear_empty_field( $term_id, $field_name, $field_type, $field );
		}
	}


	/**
	 * Clear fields that may not be submitted when empty.
	 *
	 * @since 2.0.0
	 * @param int    $term_id Term ID.
	 * @param string $field_name Field name.
	 * @param string $field_type Field type.
	 * @param array  $field Field configuration.
	 * @return void
	 */
	private function maybe_clear_empty_field( $term_id, $field_name, $field_type, $field ) {
		switch ( $field_type ) {
			case 'true_false':
				update_term_meta( $term_id, $field_name, '0' );
				break;

			case 'relationship':
			case 'repeater':
			case 'group':
				update_term_meta( $term_id, $field_name, array() );
				break;

			case 'image':
			case 'file':
			case 'gallery':
			case 'link':
			case 'google_map':
				update_term_meta( $term_id, $field_name, ! empty( $field['multiple'] ) ? array() : null );
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
		$nonce_name = 'flexify_dashboard_tax_nonce_' . $group['id'];
		$nonce      = isset( $_POST[ $nonce_name ] ) ? sanitize_text_field( wp_unslash( $_POST[ $nonce_name ] ) ) : '';

		if ( empty( $nonce ) ) {
			return false;
		}

		return wp_verify_nonce( $nonce, 'flexify_dashboard_taxonomy_fields_' . $group['id'] );
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