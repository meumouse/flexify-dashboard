<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use MeuMouse\Flexify_Dashboard\Tables\ColumnClassesListTable;
use MeuMouse\Flexify_Dashboard\Utility\CaptureStyles;
use MeuMouse\Flexify_Dashboard\Utility\ExtendSearchToMeta;

use WP_Post;
use WP_Query;
use WP_Screen;

defined('ABSPATH') || exit;

/**
 * Class PostsTables
 *
 * Create a hidden admin page that outputs posts table data as JSON.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class PostsTables {

	/**
	 * Hidden page slug.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const PAGE_SLUG = 'flexify-dashboard-posts-data';

	/**
	 * Default posts per page.
	 *
	 * @since 2.0.0
	 * @var int
	 */
	const DEFAULT_PER_PAGE = 20;

	/**
	 * Captured admin styles.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $captured_styles = array();

	/**
	 * Current post type.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	private $post_type = 'post';

	/**
	 * Class constructor.
	 *
	 * Register admin hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_hidden_page' ) );
		add_action( 'plugins_loaded', array( $this, 'handle_ajax_request' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'capture_styles' ), 9999 );
	}


	/**
	 * Register the hidden admin page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_hidden_page() {
		add_submenu_page(
			'',
			__( 'Posts Data', 'flexify-dashboard' ),
			__( 'Posts Data', 'flexify-dashboard' ),
			'edit_posts',
			self::PAGE_SLUG,
			array( $this, 'render_page' )
		);
	}


	/**
	 * Capture styles from the current admin page.
	 *
	 * @since 2.0.0
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public function capture_styles( $hook ) {
		unset( $hook );

		if ( ! $this->is_posts_data_page() ) {
			return;
		}

		$this->captured_styles = CaptureStyles::get_styles();
	}


	/**
	 * Handle request bootstrap for the hidden page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_ajax_request() {
		if ( ! $this->is_posts_data_page() ) {
			return;
		}

		$this->validate_ajax_request();
		$this->setup_post_type_globals();
	}


	/**
	 * Validate the request and user capabilities.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function validate_ajax_request() {
		if ( ! is_user_logged_in() ) {
			wp_die( __( 'You must be logged in to access this page.', 'flexify-dashboard' ) );
		}

		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		$nonce_valid = false;

		if ( ! empty( $nonce ) ) {
			if ( wp_verify_nonce( $nonce, 'wp_rest' ) ) {
				$nonce_valid = true;
			} elseif ( wp_verify_nonce( $nonce, 'flexify-dashboard-posts-data' ) ) {
				$nonce_valid = true;
			}
		}

		if ( ! $nonce_valid ) {
			wp_die( __( 'Invalid request. Please refresh the page and try again.', 'flexify-dashboard' ) );
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( __( 'You do not have sufficient permissions to access this page.', 'flexify-dashboard' ) );
		}
	}


	/**
	 * Setup global post type values for the list table screen.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function setup_post_type_globals() {
		global $pagenow, $typenow;

		$this->post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : 'post';

		$pagenow = 'edit.php';
		$typenow = $this->post_type;
	}


	/**
	 * Get normalized query parameters from the request.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	private function get_query_parameters() {
		$post_status = isset( $_GET['post_status'] ) ? sanitize_text_field( wp_unslash( $_GET['post_status'] ) ) : 'any';
		$order = isset( $_GET['order'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_GET['order'] ) ) ) : 'DESC';
		$orderby = isset( $_GET['orderby'] ) ? sanitize_key( wp_unslash( $_GET['orderby'] ) ) : 'date';
		$search = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		$start_date = isset( $_GET['start_date'] ) ? sanitize_text_field( wp_unslash( $_GET['start_date'] ) ) : '';
		$end_date = isset( $_GET['end_date'] ) ? sanitize_text_field( wp_unslash( $_GET['end_date'] ) ) : '';
		$categories = isset( $_GET['categories'] ) ? sanitize_text_field( wp_unslash( $_GET['categories'] ) ) : '';
		$author = isset( $_GET['author'] ) ? absint( $_GET['author'] ) : 0;
		$per_page = isset( $_GET['per_page'] ) ? absint( $_GET['per_page'] ) : self::DEFAULT_PER_PAGE;
		$paged = isset( $_GET['paged'] ) ? absint( $_GET['paged'] ) : 1;

		return array(
			'post_type'   => $this->post_type,
			'per_page'    => $per_page > 0 ? $per_page : self::DEFAULT_PER_PAGE,
			'paged'       => $paged > 0 ? $paged : 1,
			'orderby'     => $this->sanitize_orderby( $orderby ),
			'order'       => in_array( $order, array( 'ASC', 'DESC' ), true ) ? $order : 'DESC',
			's'           => $search,
			'post_status' => $post_status,
			'start_date'  => ! empty( $start_date ) ? $start_date : false,
			'end_date'    => ! empty( $end_date ) ? $end_date : false,
			'categories'  => ! empty( $categories ) ? $categories : false,
			'author'      => ! empty( $author ) ? $author : false,
		);
	}


	/**
	 * Sanitize allowed orderby values.
	 *
	 * @since 2.0.0
	 * @param string $orderby Requested orderby.
	 * @return string
	 */
	private function sanitize_orderby( $orderby ) {
		$allowed_orderby = array(
			'ID',
			'author',
			'title',
			'name',
			'type',
			'date',
			'modified',
			'menu_order',
			'comment_count',
		);

		if ( in_array( $orderby, $allowed_orderby, true ) ) {
			return $orderby;
		}

		return 'date';
	}


	/**
	 * Build query arguments for posts retrieval.
	 *
	 * @since 2.0.0
	 * @param array $params Normalized query parameters.
	 * @return array
	 */
	private function build_query_args( $params ) {
		$args = array(
			'post_type'      => $params['post_type'],
			'posts_per_page' => $params['per_page'],
			'paged'          => $params['paged'],
			'orderby'        => $params['orderby'],
			'order'          => $params['order'],
			'post_status'    => array_map( 'sanitize_key', explode( ',', $params['post_status'] ) ),
		);

		if ( $params['start_date'] && $params['end_date'] ) {
			$args['date_query'] = array(
				array(
					'after'     => $params['start_date'],
					'before'    => $params['end_date'],
					'inclusive' => true,
				),
			);
		}

		if ( $params['author'] ) {
			$args['author'] = $params['author'];
		}

		if ( $params['categories'] ) {
			$args['cat'] = $params['categories'];
		}

		if ( ! empty( $params['s'] ) ) {
			$args['s'] = $params['s'];
			new ExtendSearchToMeta( $args, $params['s'] );
		}

		if ( 'page' === $params['post_type'] && 'trash' !== $params['post_status'] ) {
			$args['post_parent'] = 0;
		}

		return $args;
	}


	/**
	 * Setup the list table instance.
	 *
	 * @since 2.0.0
	 * @param string $post_type Post type slug.
	 * @return ColumnClassesListTable
	 */
	private function setup_list_table( $post_type ) {
		global $typenow;

		$typenow = $post_type;

		set_current_screen( 'edit-' . $post_type );

		$screen = get_current_screen();

		$wp_list_table = new ColumnClassesListTable(
			array(
				'screen' => $screen,
			)
		);

		$wp_list_table->prepare_items();

		return $wp_list_table;
	}


	/**
	 * Process list table views.
	 *
	 * @since 2.0.0
	 * @param array $views Raw views.
	 * @return array
	 */
	private function process_views( $views ) {
		$processed_views = array();

		foreach ( $views as $key => $view ) {
			preg_match( '/\((\d+)\)/', $view, $matches );

			$count = isset( $matches[1] ) ? absint( $matches[1] ) : 0;
			$label = preg_replace( '/\s*\(\d+\)/', '', wp_strip_all_tags( $view ) );

			$processed_views[ $key ] = array(
				'label'        => sprintf( '%1$s (%2$s)', $label, $count ),
				'count'        => $count,
				'value'        => $key,
				'current'      => false !== strpos( $view, 'class="current"' ),
				'query_params' => $this->get_view_query_params( $key ),
			);
		}

		return $processed_views;
	}


	/**
	 * Get query parameters for a specific view.
	 *
	 * @since 2.0.0
	 * @param string $view_key View key.
	 * @return array
	 */
	private function get_view_query_params( $view_key ) {
		if ( 'mine' === $view_key ) {
			return array(
				'author' => get_current_user_id(),
			);
		}

		if ( 'all' === $view_key ) {
			return array(
				'post_status' => array( 'any' ),
			);
		}

		return array(
			'post_status' => $view_key,
		);
	}


	/**
	 * Process visible columns.
	 *
	 * @since 2.0.0
	 * @param WP_Screen $screen Screen object.
	 * @param string    $post_type Post type slug.
	 * @return array
	 */
	private function process_columns( WP_Screen $screen, $post_type ) {
		$columns = get_column_headers( $screen );
		$columns = apply_filters( "manage_{$post_type}_posts_columns", $columns );

		$allowed_orderby = array(
			'ID',
			'author',
			'title',
			'name',
			'type',
			'date',
			'modified',
		);

		return $this->format_columns( $columns, $allowed_orderby );
	}


	/**
	 * Format columns for JSON response.
	 *
	 * @since 2.0.0
	 * @param array $columns Raw columns.
	 * @param array $allowed_orderby Allowed sortable keys.
	 * @return array
	 */
	private function format_columns( $columns, $allowed_orderby ) {
		$formatted_columns = array();

		foreach ( $columns as $key => $value ) {
			if ( 'cb' === $key ) {
				continue;
			}

			$formatted_columns[ $key ] = array(
				'sort_key' => in_array( $key, $allowed_orderby, true ) ? $key : false,
				'label'    => $value,
				'key'      => $key,
				'active'   => true,
			);

			if ( 'title' === $key ) {
				$formatted_columns['status'] = array(
					'label'    => __( 'Status', 'flexify-dashboard' ),
					'sort_key' => 'post_status',
					'key'      => 'status',
					'active'   => true,
				);
			}
		}

		return $this->add_special_columns( $formatted_columns );
	}


	/**
	 * Add special columns.
	 *
	 * @since 2.0.0
	 * @param array $columns Formatted columns.
	 * @return array
	 */
	private function add_special_columns( $columns ) {
		if ( isset( $columns['date'] ) ) {
			$columns['date']['label'] = __( 'Published', 'flexify-dashboard' );
		}

		if ( isset( $columns['comments'] ) ) {
			$columns['comments']['label'] = __( 'Comments', 'flexify-dashboard' );
		}

		$columns['post_actions'] = array(
			'label'    => '',
			'sort_key' => false,
			'key'      => 'post_actions',
			'active'   => true,
		);

		return $columns;
	}


	/**
	 * Process a single post row.
	 *
	 * @since 2.0.0
	 * @param WP_Post                $post Post object.
	 * @param array                  $columns Columns configuration.
	 * @param ColumnClassesListTable $wp_list_table List table instance.
	 * @param string                 $rest_base REST base.
	 * @param int                    $depth Current depth.
	 * @return array
	 */
	private function process_post_data( WP_Post $post, $columns, $wp_list_table, $rest_base, $depth ) {
		$post_data = $this->get_base_post_data( $post, $rest_base );
		$post_data['row_actions'] = $this->get_row_actions( $post );
		$post_data['children'] = array();
		$post_data['depth'] = $depth;
		$post_data['cell_classes'] = array();

		foreach ( $columns as $column_name => $column_info ) {
			unset( $column_info );

			if ( 'cb' === $column_name ) {
				continue;
			}

			$post_data = $this->process_column_data( $post_data, $column_name, $post, $wp_list_table );
		}

		if ( 'page' === $post->post_type ) {
			$post_data['children'] = $this->get_child_pages( $post, $columns, $wp_list_table, $rest_base, $depth );
		}

		return $post_data;
	}


	/**
	 * Get child pages recursively.
	 *
	 * @since 2.0.0
	 * @param WP_Post                $post Parent post.
	 * @param array                  $columns Columns configuration.
	 * @param ColumnClassesListTable $wp_list_table List table instance.
	 * @param string                 $rest_base REST base.
	 * @param int                    $depth Current depth.
	 * @return array
	 */
	private function get_child_pages( WP_Post $post, $columns, $wp_list_table, $rest_base, $depth ) {
		$query_args = $this->get_query_parameters();

		$args = array(
			'post_type'      => 'page',
			'post_parent'    => $post->ID,
			'posts_per_page' => -1,
			'order'          => $query_args['order'],
			'orderby'        => $query_args['orderby'],
			'post_status'    => 'any',
		);

		$children = array();
		$child_query = new WP_Query( $args );
		$child_depth = $depth + 1;

		if ( $child_query->have_posts() ) {
			foreach ( $child_query->posts as $child_post ) {
				$children[] = $this->process_post_data( $child_post, $columns, $wp_list_table, $rest_base, $child_depth );
			}
		}

		wp_reset_postdata();

		return $children;
	}


	/**
	 * Get base post data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @param string  $rest_base REST base slug.
	 * @return array
	 */
	private function get_base_post_data( WP_Post $post, $rest_base ) {
		return array(
			'id'            => $post->ID,
			'title'         => $post->post_title,
			'type'          => $post->post_type,
			'rest_base'     => $rest_base,
			'edit_url'      => html_entity_decode( (string) get_edit_post_link( $post->ID ) ),
			'view_url'      => html_entity_decode( (string) get_permalink( $post->ID ) ),
			'single_status' => $post->post_status,
			'row_actions'   => array(),
			'is_editable'   => current_user_can( 'edit_post', $post->ID ),
		);
	}


	/**
	 * Get row actions for a post.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function get_row_actions( WP_Post $post ) {
		$actions = array();

		$actions = apply_filters( 'post_row_actions', $actions, $post );
		$actions = apply_filters( "{$post->post_type}_row_actions", $actions, $post );

		return array_values(
			array_map(
				function( $link, $action ) {
					preg_match( '/href=["\'](.*?)["\']/', $link, $url_matches );
					preg_match( '/<a.*?>(.*?)<\/a>/', $link, $text_matches );

					return array(
						'key'  => $action,
						'url'  => isset( $url_matches[1] ) ? html_entity_decode( $url_matches[1] ) : '',
						'text' => isset( $text_matches[1] ) ? wp_strip_all_tags( $text_matches[1] ) : wp_strip_all_tags( $link ),
						'html' => $link,
					);
				},
				$actions,
				array_keys( $actions )
			)
		);
	}


	/**
	 * Process a column value.
	 *
	 * @since 2.0.0
	 * @param array                  $post_data Current post data.
	 * @param string                 $column_name Column name.
	 * @param WP_Post                $post Post object.
	 * @param ColumnClassesListTable $wp_list_table List table instance.
	 * @return array
	 */
	private function process_column_data( $post_data, $column_name, WP_Post $post, $wp_list_table ) {
		ob_start();

		if ( method_exists( $wp_list_table, 'column_' . $column_name ) ) {
			call_user_func( array( $wp_list_table, 'column_' . $column_name ), $post );
		} else {
			do_action( "manage_{$post->post_type}_posts_custom_column", $column_name, $post->ID );
			do_action( 'manage_posts_custom_column', $column_name, $post->ID );
		}

		$column_value = ob_get_clean();

		$post_data[ $column_name ] = $column_value;
		$post_data = $this->process_special_columns( $post_data, $column_name, $post );
		$post_data['cell_classes'][ $column_name ] = $wp_list_table->get_cell_classes( $column_name, $post );

		return $post_data;
	}


	/**
	 * Process special column formats.
	 *
	 * @since 2.0.0
	 * @param array   $post_data Current post data.
	 * @param string  $column_name Column name.
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function process_special_columns( $post_data, $column_name, WP_Post $post ) {
		if ( 0 === strpos( $column_name, 'taxonomy-' ) ) {
			$post_data[ $column_name ] = $this->process_taxonomy_column( $post, $column_name );
			return $post_data;
		}

		switch ( $column_name ) {
			case 'title':
				$post_data[ $column_name ] = $this->process_title_column( $post );
				break;

			case 'date':
				$post_data[ $column_name ] = $this->process_date_column( $post );
				break;

			case 'categories':
				$post_data[ $column_name ] = $this->process_categories_column( $post );
				break;

			case 'tags':
				$post_data[ $column_name ] = $this->process_tags_column( $post );
				break;

			case 'status':
				$post_data[ $column_name ] = $this->process_status_column( $post );
				break;

			case 'author':
				$post_data[ $column_name ] = $this->process_author_column( $post );
				break;

			case 'comments':
				$post_data[ $column_name ] = $this->process_comments_column( $post );
				break;
		}

		return $post_data;
	}


	/**
	 * Process taxonomy column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @param string  $column_name Column name.
	 * @return array
	 */
	private function process_taxonomy_column( WP_Post $post, $column_name ) {
		$taxonomy = str_replace( 'taxonomy-', '', $column_name );
		$terms = get_the_terms( $post->ID, $taxonomy );

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return array();
		}

		return array_map(
			function( $term ) {
				return array(
					'title' => $term->name,
					'url'   => get_edit_term_link( $term->term_id, $term->taxonomy ),
					'id'    => $term->term_id,
				);
			},
			$terms
		);
	}


	/**
	 * Process title column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function process_title_column( WP_Post $post ) {
		$thumbnail_id = get_post_thumbnail_id( $post->ID );
		$thumbnail_url = null;

		if ( $thumbnail_id ) {
			$thumbnail = wp_get_attachment_image_src( $thumbnail_id, 'thumbnail' );

			if ( ! empty( $thumbnail[0] ) ) {
				$thumbnail_url = $thumbnail[0];
			}
		}

		return array(
			'value'     => '' === $post->post_title ? __( '(No title)', 'flexify-dashboard' ) : $post->post_title,
			'image_url' => $thumbnail_url,
		);
	}


	/**
	 * Process date column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return string
	 */
	private function process_date_column( WP_Post $post ) {
		$timestamp = get_post_time( 'U', false, $post );
		$time_diff = human_time_diff( $timestamp, current_time( 'timestamp' ) );
		$exact_date = get_the_date( get_option( 'date_format' ), $post );

		if ( 'future' === get_post_status( $post ) ) {
			return sprintf(
				'<span title="%1$s">%2$s</span>',
				esc_attr( $exact_date ),
				sprintf( __( 'Scheduled for %s from now', 'flexify-dashboard' ), $time_diff )
			);
		}

		return sprintf(
			'<span title="%1$s">%2$s</span>',
			esc_attr( $exact_date ),
			sprintf( __( '%s ago', 'flexify-dashboard' ), $time_diff )
		);
	}


	/**
	 * Process categories column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function process_categories_column( WP_Post $post ) {
		$categories = get_the_category( $post->ID );

		if ( empty( $categories ) ) {
			return array();
		}

		return array_map(
			function( $category ) {
				return array(
					'title' => $category->name,
					'url'   => get_edit_term_link( $category->term_id, 'category' ),
					'id'    => $category->term_id,
				);
			},
			$categories
		);
	}


	/**
	 * Process tags column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function process_tags_column( WP_Post $post ) {
		$tags = get_the_tags( $post->ID );

		if ( empty( $tags ) ) {
			return array();
		}

		return array_map(
			function( $tag ) {
				return array(
					'title' => $tag->name,
					'url'   => get_edit_term_link( $tag->term_id, 'post_tag' ),
					'id'    => $tag->term_id,
				);
			},
			$tags
		);
	}


	/**
	 * Process status column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function process_status_column( WP_Post $post ) {
		$status_object = get_post_status_object( $post->post_status );
		$status_label = $status_object ? $status_object->label : $post->post_status;

		return array(
			'value' => $post->post_status,
			'label' => $status_label,
		);
	}


	/**
	 * Process author column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	private function process_author_column( WP_Post $post ) {
		$author_id = absint( $post->post_author );
		$author = get_userdata( $author_id );
		$display_name = '';

		if ( $author ) {
			$display_name = ! empty( $author->display_name ) ? $author->display_name : $author->user_login;
		}

		return array(
			'name'   => $display_name,
			'avatar' => get_avatar(
				$author_id,
				32,
				'',
				'',
				array(
					'class' => 'author-avatar',
				)
			),
			'url'    => get_author_posts_url( $author_id ),
			'id'     => $author_id,
		);
	}


	/**
	 * Process comments column data.
	 *
	 * @since 2.0.0
	 * @param WP_Post $post Post object.
	 * @return string
	 */
	private function process_comments_column( WP_Post $post ) {
		$comment_count = get_comments_number( $post->ID );

		if ( $comment_count <= 0 ) {
			return '';
		}

		return '<span class="fd-comment-count">' . absint( $comment_count ) . '</span>';
	}


	/**
	 * Check whether current page is the hidden posts data page.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private function is_posts_data_page() {
		$page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';

		return self::PAGE_SLUG === $page;
	}


	/**
	 * Modify page orderby for hierarchical sorting.
	 *
	 * @since 2.0.0
	 * @param string   $orderby Existing orderby clause.
	 * @param WP_Query $query Query object.
	 * @return string
	 */
	public function modify_pages_orderby( $orderby, $query ) {
		global $wpdb;

		if ( isset( $query->query['post_type'] ) && 'page' === $query->query['post_type'] ) {
			return "CONCAT(LPAD(COALESCE($wpdb->posts.post_parent, 0), 10, '0'), $wpdb->posts.post_title) ASC";
		}

		return $orderby;
	}


	/**
	 * Render the hidden page output as JSON.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_page() {
		if ( Settings::is_enabled( 'use_classic_post_tables' ) ) {
			return;
		}

		global $post;

		$params = $this->get_query_parameters();
		$args = $this->build_query_args( $params );

		$post_type_object = get_post_type_object( $params['post_type'] );

		if ( ! $post_type_object ) {
			wp_die( __( 'Invalid post type.', 'flexify-dashboard' ) );
		}

		$rest_base = false === $post_type_object->rest_base ? $post_type_object->name : $post_type_object->rest_base;

		$query = new WP_Query( $args );
		$wp_list_table = $this->setup_list_table( $params['post_type'] );

		$views = $wp_list_table->get_views();
		$processed_views = $this->process_views( $views );

		$wp_list_table->print_column_headers( false );
		$column_classes = $wp_list_table->captured_classes;
		$columns = $this->process_columns( get_current_screen(), $params['post_type'] );

		$posts = array();

		if ( $query->have_posts() ) {
			while ( $query->have_posts() ) {
				$query->the_post();

				if ( $post instanceof WP_Post ) {
					$posts[] = $this->process_post_data( $post, $columns, $wp_list_table, $rest_base, 0 );
				}
			}
		}

		wp_reset_postdata();

		$response = array(
			'items'          => $posts,
			'total'          => absint( $query->found_posts ),
			'pages'          => $params['per_page'] > 0 ? (int) ceil( $query->found_posts / $params['per_page'] ) : 0,
			'columns'        => $columns,
			'column_classes' => $column_classes,
			'custom_styles'  => array_values( $this->captured_styles ),
			'views'          => $processed_views,
		);
		?>
		<script type="application/json" id="flexify-dashboard-posts-data"><?php echo wp_json_encode( $response ); ?></script>
		<?php
		exit;
	}
}