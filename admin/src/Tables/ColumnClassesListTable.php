<?php

namespace MeuMouse\Flexify_Dashboard\Tables;

defined('ABSPATH') || exit;

require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
require_once ABSPATH . 'wp-admin/includes/class-wp-posts-list-table.php';

/**
 * Class ColumnClassesListTable
 *
 * Extend the WordPress posts list table with column class capture support.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Tables
 * @author MeuMouse.com
 */
class ColumnClassesListTable extends \WP_Posts_List_Table {

	/**
	 * Captured classes for each column.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	public $captured_classes = array();

	/**
	 * Print column headers and capture their classes.
	 *
	 * @since 2.0.0
	 * @param bool $with_id Whether to include column IDs in the header markup.
	 * @return void
	 */
	public function print_column_headers( $with_id = true ) {
		list( $columns, $hidden, $sortable, $primary ) = $this->get_column_info();

		foreach ( $columns as $column_key => $column_display_name ) {
			$classes = $this->get_header_classes( $column_key, $hidden, $sortable, $primary );

			$classes = apply_filters( "manage_{$this->screen->post_type}_posts_column_classes", $classes, $column_key, $column_display_name );
			$classes = apply_filters( 'manage_posts_column_classes', $classes, $column_key, $column_display_name );

			$this->captured_classes[ $column_key ] = array_values( array_unique( $classes ) );
		}

		parent::print_column_headers( $with_id );
	}


	/**
	 * Get the CSS classes for a specific table cell.
	 *
	 * @since 2.0.0
	 * @param string   $column_name The column name.
	 * @param \WP_Post $post        The current post object.
	 * @return array
	 */
	public function get_cell_classes( $column_name, $post ) {
		$classes = array(
			'column-' . sanitize_html_class( $column_name ),
		);

		list( $columns, $hidden ) = $this->get_column_info();

		if ( in_array( $column_name, $hidden, true ) ) {
			$classes[] = 'hidden';
		}

		switch ( $column_name ) {
			case 'cb':
				$classes[] = 'check-column';
				break;

			case 'comments':
				$classes[] = 'num';
				break;

			case 'title':
				if ( ! empty( $post->post_parent ) ) {
					$classes[] = 'has-parent';
				}

				if ( in_array( $post->post_status, array( 'pending', 'draft', 'future' ), true ) ) {
					$classes[] = 'status-' . sanitize_html_class( $post->post_status );
				}
				break;

			case 'date':
				$classes[] = 'date';
				$classes[] = 'column-date';
				break;
		}

		$classes = apply_filters( "manage_{$this->screen->post_type}_posts_column_cell_classes", $classes, $column_name, $post );
		$classes = apply_filters( 'manage_posts_column_cell_classes', $classes, $column_name, $post );

		return array_values( array_unique( $classes ) );
	}


	/**
	 * Determine the sort direction for a column.
	 *
	 * @since 2.0.0
	 * @param string $column Column name.
	 * @return string
	 */
	public function get_sort_direction( $column ) {
		$orderby = isset( $_GET['orderby'] ) ? sanitize_key( wp_unslash( $_GET['orderby'] ) ) : '';
		$order   = isset( $_GET['order'] ) ? sanitize_key( wp_unslash( $_GET['order'] ) ) : 'asc';
		$order   = in_array( strtolower( $order ), array( 'asc', 'desc' ), true ) ? strtolower( $order ) : 'asc';

		if ( $orderby === $column || $this->get_default_primary_column_name() === $column ) {
			return $order;
		}

		return 'asc';
	}


	/**
	 * Build header classes for a given column.
	 *
	 * @since 2.0.0
	 * @param string $column_key Column key.
	 * @param array  $hidden     Hidden columns.
	 * @param array  $sortable   Sortable columns.
	 * @param string $primary    Primary column.
	 * @return array
	 */
	private function get_header_classes( $column_key, $hidden, $sortable, $primary ) {
		$classes = array(
			'manage-column',
		);

		if ( in_array( $column_key, $hidden, true ) ) {
			$classes[] = 'hidden';
		}

		if ( 'cb' === $column_key ) {
			$classes[] = 'check-column';
		} elseif ( 'comments' === $column_key ) {
			$classes[] = 'num';
			$classes[] = 'comments';
			$classes[] = 'column-comments';
		} else {
			$classes[] = 'column-' . sanitize_html_class( $column_key );
		}

		if ( $column_key === $primary ) {
			$classes[] = 'column-primary';
		}

		if ( isset( $sortable[ $column_key ] ) ) {
			$classes[] = 'sortable';
			$classes[] = $this->get_sort_direction( $column_key );
		}

		return $classes;
	}
}