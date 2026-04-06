<?php

/**
 * Flexify Dashboard Custom Fields Helper Functions
 *
 * Global helper functions for retrieving and formatting custom field values.
 * These functions provide a developer-friendly API similar to ACF for accessing
 * custom field data across posts, terms, users, comments, and option pages.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */

defined('ABSPATH') || exit;

if ( ! defined( 'FLEXIFY_DASHBOARD_FIELD_CACHE_KEY' ) ) {
	define( 'FLEXIFY_DASHBOARD_FIELD_CACHE_KEY', 'flexify_dashboard_field_definitions' );
}

if ( ! defined( 'FLEXIFY_DASHBOARD_FIELD_CACHE_EXPIRY' ) ) {
	define( 'FLEXIFY_DASHBOARD_FIELD_CACHE_EXPIRY', HOUR_IN_SECONDS );
}

/**
 * Get a custom field value with automatic context detection.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return mixed
 */
function flexify_dashboard_get_field( $field_name, $object_id = null, $options = array() ) {
	if ( empty( $field_name ) || ! is_string( $field_name ) ) {
		return null;
	}

	$options = wp_parse_args(
		$options,
		array(
			'format'  => 'escaped',
			'default' => null,
			'context' => null,
			'size'    => 'full',
		)
	);

	$context = ! empty( $options['context'] ) ? $options['context'] : _flexify_dashboard_detect_context( $object_id );

	if ( null === $object_id ) {
		$object_id = _flexify_dashboard_get_current_object_id( $context );
	}

	if ( empty( $object_id ) ) {
		return $options['default'];
	}

	$value = _flexify_dashboard_get_meta_value( $field_name, $object_id, $context );

	if ( '' === $value || null === $value || false === $value ) {
		return $options['default'];
	}

	$field_def  = _flexify_dashboard_get_field_definition( $field_name );
	$field_type = isset( $field_def['type'] ) ? $field_def['type'] : 'text';

	return _flexify_dashboard_format_value( $value, $field_type, $options );
}

/**
 * Echo a custom field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return void
 */
function flexify_dashboard_the_field( $field_name, $object_id = null, $options = array() ) {
	$options['format'] = isset( $options['format'] ) ? $options['format'] : 'escaped';

	$value = flexify_dashboard_get_field( $field_name, $object_id, $options );

	if ( is_array( $value ) || is_object( $value ) ) {
		$field_def  = _flexify_dashboard_get_field_definition( $field_name );
		$field_type = isset( $field_def['type'] ) ? $field_def['type'] : 'text';

		if ( 'html' === $options['format'] ) {
			echo _flexify_dashboard_render_html( $value, $field_type, $options ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		echo esc_html( print_r( $value, true ) );
		return;
	}

	echo $value; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * Get the full field object including configuration and value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @return array|null
 */
function flexify_dashboard_get_field_object( $field_name, $object_id = null ) {
	$field_def = _flexify_dashboard_get_field_definition( $field_name );

	if ( empty( $field_def ) ) {
		return null;
	}

	$context = _flexify_dashboard_detect_context( $object_id );

	if ( null === $object_id ) {
		$object_id = _flexify_dashboard_get_current_object_id( $context );
	}

	$value = null;

	if ( ! empty( $object_id ) ) {
		$value = _flexify_dashboard_get_meta_value( $field_name, $object_id, $context );
	}

	return array(
		'name'          => isset( $field_def['name'] ) ? $field_def['name'] : $field_name,
		'label'         => isset( $field_def['label'] ) ? $field_def['label'] : $field_name,
		'type'          => isset( $field_def['type'] ) ? $field_def['type'] : 'text',
		'value'         => $value,
		'instructions'  => isset( $field_def['instructions'] ) ? $field_def['instructions'] : '',
		'required'      => isset( $field_def['required'] ) ? (bool) $field_def['required'] : false,
		'default_value' => isset( $field_def['default_value'] ) ? $field_def['default_value'] : null,
		'placeholder'   => isset( $field_def['placeholder'] ) ? $field_def['placeholder'] : '',
		'options'       => isset( $field_def['options'] ) ? $field_def['options'] : array(),
	);
}

/**
 * Get a post custom field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $post_id The post ID.
 * @param array    $options Field options.
 * @return mixed
 */
function flexify_dashboard_get_post_field( $field_name, $post_id = null, $options = array() ) {
	$options['context'] = 'post';

	return flexify_dashboard_get_field( $field_name, $post_id, $options );
}

/**
 * Get a term custom field value.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param int    $term_id The term ID.
 * @param array  $options Field options.
 * @return mixed
 */
function flexify_dashboard_get_term_field( $field_name, $term_id, $options = array() ) {
	if ( empty( $term_id ) ) {
		return isset( $options['default'] ) ? $options['default'] : null;
	}

	$options['context'] = 'term';

	return flexify_dashboard_get_field( $field_name, $term_id, $options );
}

/**
 * Get a user custom field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $user_id The user ID.
 * @param array    $options Field options.
 * @return mixed
 */
function flexify_dashboard_get_user_field( $field_name, $user_id = null, $options = array() ) {
	if ( null === $user_id ) {
		$user_id = get_current_user_id();
	}

	$options['context'] = 'user';

	return flexify_dashboard_get_field( $field_name, $user_id, $options );
}

/**
 * Get a comment custom field value.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param int    $comment_id The comment ID.
 * @param array  $options Field options.
 * @return mixed
 */
function flexify_dashboard_get_comment_field( $field_name, $comment_id, $options = array() ) {
	if ( empty( $comment_id ) ) {
		return isset( $options['default'] ) ? $options['default'] : null;
	}

	$options['context'] = 'comment';

	return flexify_dashboard_get_field( $field_name, $comment_id, $options );
}

/**
 * Get an image field value with enhanced data.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return array|null
 */
function flexify_dashboard_get_image_field( $field_name, $object_id = null, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'size'    => 'full',
			'context' => null,
			'default' => null,
			'single'  => null,
		)
	);

	$value = flexify_dashboard_get_field(
		$field_name,
		$object_id,
		array(
			'format'  => 'raw',
			'context' => $options['context'],
		)
	);

	if ( empty( $value ) ) {
		return $options['default'];
	}

	$is_multi      = _flexify_dashboard_is_multi_image_value( $value );
	$return_single = $options['single'];

	if ( null === $return_single ) {
		$return_single = ! $is_multi;
	}

	if ( $is_multi && ! $return_single ) {
		return _flexify_dashboard_format_multi_image_value( $value, $options['size'] );
	}

	return _flexify_dashboard_format_image_value( $value, $options['size'] );
}

/**
 * Get a file field value with enhanced data.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return array|null
 */
function flexify_dashboard_get_file_field( $field_name, $object_id = null, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'context' => null,
			'default' => null,
		)
	);

	$value = flexify_dashboard_get_field(
		$field_name,
		$object_id,
		array(
			'format'  => 'raw',
			'context' => $options['context'],
		)
	);

	if ( empty( $value ) ) {
		return $options['default'];
	}

	return _flexify_dashboard_format_file_value( $value );
}

/**
 * Get a link field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return array|string|null
 */
function flexify_dashboard_get_link_field( $field_name, $object_id = null, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'format'  => 'array',
			'class'   => '',
			'context' => null,
			'default' => null,
		)
	);

	$value = flexify_dashboard_get_field(
		$field_name,
		$object_id,
		array(
			'format'  => 'raw',
			'context' => $options['context'],
		)
	);

	if ( empty( $value ) ) {
		return $options['default'];
	}

	$link = _flexify_dashboard_normalize_link_value( $value );

	if ( 'html' === $options['format'] ) {
		return _flexify_dashboard_render_link_html( $link, $options['class'] );
	}

	return $link;
}

/**
 * Get a repeater field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return array
 */
function flexify_dashboard_get_repeater_field( $field_name, $object_id = null, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'context' => null,
		)
	);

	$value = flexify_dashboard_get_field(
		$field_name,
		$object_id,
		array(
			'format'  => 'raw',
			'context' => $options['context'],
		)
	);

	if ( empty( $value ) || ! is_array( $value ) ) {
		return array();
	}

	return $value;
}

/**
 * Get a relationship field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return array
 */
function flexify_dashboard_get_relationship_field( $field_name, $object_id = null, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'return'  => 'objects',
			'context' => null,
		)
	);

	$value = flexify_dashboard_get_field(
		$field_name,
		$object_id,
		array(
			'format'  => 'raw',
			'context' => $options['context'],
		)
	);

	if ( empty( $value ) ) {
		return array();
	}

	if ( is_array( $value ) ) {
		$ids = array();

		if ( isset( $value[0] ) && is_array( $value[0] ) && isset( $value[0]['id'] ) ) {
			$ids = array_map(
				function( $item ) {
					return absint( $item['id'] );
				},
				$value
			);
		} elseif ( isset( $value['id'] ) ) {
			$ids = array( absint( $value['id'] ) );
		} else {
			$ids = array_map( 'absint', array_filter( $value ) );
		}

		if ( 'ids' === $options['return'] ) {
			return $ids;
		}

		$posts = array();

		foreach ( $ids as $id ) {
			$post = get_post( $id );

			if ( $post ) {
				$posts[] = $post;
			}
		}

		return $posts;
	}

	$id = absint( $value );

	if ( 'ids' === $options['return'] ) {
		return array( $id );
	}

	$post = get_post( $id );

	return $post ? array( $post ) : array();
}

/**
 * Get a Google Map field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return array|null
 */
function flexify_dashboard_get_google_map_field( $field_name, $object_id = null, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'context' => null,
			'default' => null,
		)
	);

	$value = flexify_dashboard_get_field(
		$field_name,
		$object_id,
		array(
			'format'  => 'raw',
			'context' => $options['context'],
		)
	);

	if ( empty( $value ) ) {
		return $options['default'];
	}

	if ( is_string( $value ) ) {
		$decoded = json_decode( $value, true );

		if ( JSON_ERROR_NONE === json_last_error() && is_array( $decoded ) ) {
			$value = $decoded;
		} else {
			return $options['default'];
		}
	}

	if ( ! is_array( $value ) ) {
		return $options['default'];
	}

	if ( ! isset( $value['lat'] ) && ! isset( $value['lng'] ) ) {
		return $options['default'];
	}

	return array(
		'lat'     => isset( $value['lat'] ) ? floatval( $value['lat'] ) : null,
		'lng'     => isset( $value['lng'] ) ? floatval( $value['lng'] ) : null,
		'address' => isset( $value['address'] ) ? sanitize_text_field( $value['address'] ) : '',
		'zoom'    => isset( $value['zoom'] ) ? absint( $value['zoom'] ) : 13,
	);
}

/**
 * Get a date picker field value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return string|null
 */
function flexify_dashboard_get_date_field( $field_name, $object_id = null, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'format'  => 'Y-m-d',
			'context' => null,
			'default' => null,
		)
	);

	$value = flexify_dashboard_get_field(
		$field_name,
		$object_id,
		array(
			'format'  => 'raw',
			'context' => $options['context'],
		)
	);

	if ( empty( $value ) ) {
		return $options['default'];
	}

	$timestamp = strtotime( $value );

	if ( false === $timestamp ) {
		return $options['default'];
	}

	return gmdate( $options['format'], $timestamp + ( get_option( 'gmt_offset' ) * HOUR_IN_SECONDS ) );
}

/**
 * Check if a field has a value.
 *
 * @since 2.0.0
 * @param string   $field_name The field name.
 * @param int|null $object_id The object ID.
 * @param array    $options Field options.
 * @return bool
 */
function flexify_dashboard_have_field( $field_name, $object_id = null, $options = array() ) {
	$value = flexify_dashboard_get_field( $field_name, $object_id, array_merge( $options, array( 'format' => 'raw' ) ) );

	if ( null === $value || '' === $value || false === $value ) {
		return false;
	}

	if ( is_array( $value ) && empty( $value ) ) {
		return false;
	}

	return true;
}

/**
 * Get a custom field value from an option page.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param string $page_slug The option page slug.
 * @param array  $options Field options.
 * @return mixed
 */
function flexify_dashboard_get_option_field( $field_name, $page_slug, $options = array() ) {
	if ( empty( $field_name ) || ! is_string( $field_name ) ) {
		return null;
	}

	if ( empty( $page_slug ) || ! is_string( $page_slug ) ) {
		return null;
	}

	$options = wp_parse_args(
		$options,
		array(
			'format'  => 'escaped',
			'default' => null,
			'size'    => 'full',
		)
	);

	$option_key   = 'flexify_dashboard_options_' . sanitize_key( $page_slug );
	$page_options = get_option( $option_key, array() );

	if ( ! is_array( $page_options ) || ! isset( $page_options[ $field_name ] ) ) {
		return $options['default'];
	}

	$value = $page_options[ $field_name ];

	if ( '' === $value || null === $value || false === $value ) {
		return $options['default'];
	}

	$field_def  = _flexify_dashboard_get_field_definition( $field_name );
	$field_type = isset( $field_def['type'] ) ? $field_def['type'] : 'text';

	return _flexify_dashboard_format_value( $value, $field_type, $options );
}

/**
 * Echo an option page field value.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param string $page_slug The option page slug.
 * @param array  $options Field options.
 * @return void
 */
function flexify_dashboard_the_option_field( $field_name, $page_slug, $options = array() ) {
	$options['format'] = isset( $options['format'] ) ? $options['format'] : 'escaped';

	$value = flexify_dashboard_get_option_field( $field_name, $page_slug, $options );

	if ( is_array( $value ) || is_object( $value ) ) {
		$field_def  = _flexify_dashboard_get_field_definition( $field_name );
		$field_type = isset( $field_def['type'] ) ? $field_def['type'] : 'text';

		if ( 'html' === $options['format'] ) {
			echo _flexify_dashboard_render_html( $value, $field_type, $options ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		echo esc_html( print_r( $value, true ) );
		return;
	}

	echo $value; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * Get all option page values.
 *
 * @since 2.0.0
 * @param string $page_slug The option page slug.
 * @param array  $options Field options.
 * @return array
 */
function flexify_dashboard_get_option_page_values( $page_slug, $options = array() ) {
	if ( empty( $page_slug ) || ! is_string( $page_slug ) ) {
		return array();
	}

	$options = wp_parse_args(
		$options,
		array(
			'format' => 'escaped',
		)
	);

	$option_key   = 'flexify_dashboard_options_' . sanitize_key( $page_slug );
	$page_options = get_option( $option_key, array() );

	if ( ! is_array( $page_options ) ) {
		return array();
	}

	if ( 'raw' === $options['format'] ) {
		return $page_options;
	}

	$formatted = array();

	foreach ( $page_options as $field_name => $value ) {
		$field_def               = _flexify_dashboard_get_field_definition( $field_name );
		$field_type              = isset( $field_def['type'] ) ? $field_def['type'] : 'text';
		$formatted[ $field_name ] = _flexify_dashboard_format_value( $value, $field_type, $options );
	}

	return $formatted;
}

/**
 * Check if an option page field has a value.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param string $page_slug The option page slug.
 * @return bool
 */
function flexify_dashboard_have_option_field( $field_name, $page_slug ) {
	$value = flexify_dashboard_get_option_field( $field_name, $page_slug, array( 'format' => 'raw' ) );

	if ( null === $value || '' === $value || false === $value ) {
		return false;
	}

	if ( is_array( $value ) && empty( $value ) ) {
		return false;
	}

	return true;
}

/**
 * Get an image field value from an option page.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param string $page_slug The option page slug.
 * @param array  $options Field options.
 * @return array|null
 */
function flexify_dashboard_get_option_image_field( $field_name, $page_slug, $options = array() ) {
	$options = wp_parse_args(
		$options,
		array(
			'size'    => 'full',
			'default' => null,
		)
	);

	$value = flexify_dashboard_get_option_field( $field_name, $page_slug, array( 'format' => 'raw' ) );

	if ( empty( $value ) ) {
		return $options['default'];
	}

	return _flexify_dashboard_format_image_value( $value, $options['size'] );
}

/**
 * Get a repeater field value from an option page.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param string $page_slug The option page slug.
 * @return array
 */
function flexify_dashboard_get_option_repeater_field( $field_name, $page_slug ) {
	$value = flexify_dashboard_get_option_field( $field_name, $page_slug, array( 'format' => 'raw' ) );

	if ( empty( $value ) || ! is_array( $value ) ) {
		return array();
	}

	return $value;
}

/**
 * Detect the current context.
 *
 * @since 2.0.0
 * @param int|null $object_id Optional object ID.
 * @return string
 */
function _flexify_dashboard_detect_context( $object_id = null ) {
	if ( is_tax() || is_category() || is_tag() ) {
		return 'term';
	}

	if ( is_author() ) {
		return 'user';
	}

	if ( is_singular() || in_the_loop() ) {
		return 'post';
	}

	if ( is_admin() ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( $screen ) {
			if ( in_array( $screen->base, array( 'edit-tags', 'term' ), true ) ) {
				return 'term';
			}

			if ( in_array( $screen->base, array( 'user-edit', 'profile', 'user-new' ), true ) ) {
				return 'user';
			}

			if ( 'comment' === $screen->base ) {
				return 'comment';
			}
		}
	}

	return 'post';
}

/**
 * Get current object ID by context.
 *
 * @since 2.0.0
 * @param string $context Context type.
 * @return int|null
 */
function _flexify_dashboard_get_current_object_id( $context ) {
	switch ( $context ) {
		case 'post':
			return get_the_ID() ? absint( get_the_ID() ) : null;

		case 'term':
			$queried = get_queried_object();
			return ( $queried instanceof WP_Term ) ? absint( $queried->term_id ) : null;

		case 'user':
			if ( is_author() ) {
				$queried = get_queried_object();
				return ( $queried instanceof WP_User ) ? absint( $queried->ID ) : null;
			}

			return get_current_user_id() ? absint( get_current_user_id() ) : null;

		case 'comment':
			return null;

		default:
			return null;
	}
}

/**
 * Get meta value by context.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @param int    $object_id The object ID.
 * @param string $context The context.
 * @return mixed
 */
function _flexify_dashboard_get_meta_value( $field_name, $object_id, $context ) {
	switch ( $context ) {
		case 'post':
			return get_post_meta( $object_id, $field_name, true );

		case 'term':
			return get_term_meta( $object_id, $field_name, true );

		case 'user':
			return get_user_meta( $object_id, $field_name, true );

		case 'comment':
			return get_comment_meta( $object_id, $field_name, true );

		default:
			return null;
	}
}

/**
 * Get field definition by field name.
 *
 * @since 2.0.0
 * @param string $field_name The field name.
 * @return array|null
 */
function _flexify_dashboard_get_field_definition( $field_name ) {
	$definitions = _flexify_dashboard_get_all_field_definitions();

	return isset( $definitions[ $field_name ] ) ? $definitions[ $field_name ] : null;
}

/**
 * Get all field definitions.
 *
 * @since 2.0.0
 * @return array
 */
function _flexify_dashboard_get_all_field_definitions() {
	$cached = get_transient( FLEXIFY_DASHBOARD_FIELD_CACHE_KEY );

	if ( false !== $cached ) {
		return $cached;
	}

	$json_path = WP_CONTENT_DIR . '/flexify-dashboard-custom-fields.json';

	if ( ! file_exists( $json_path ) || ! is_readable( $json_path ) ) {
		return array();
	}

	$json_content = file_get_contents( $json_path );

	if ( false === $json_content || '' === $json_content ) {
		return array();
	}

	$field_groups = json_decode( $json_content, true );

	if ( ! is_array( $field_groups ) ) {
		return array();
	}

	$definitions = array();

	foreach ( $field_groups as $group ) {
		if ( empty( $group['fields'] ) || ! is_array( $group['fields'] ) ) {
			continue;
		}

		_flexify_dashboard_collect_field_definitions( $group['fields'], $definitions );
	}

	set_transient( FLEXIFY_DASHBOARD_FIELD_CACHE_KEY, $definitions, FLEXIFY_DASHBOARD_FIELD_CACHE_EXPIRY );

	return $definitions;
}

/**
 * Collect field definitions recursively.
 *
 * @since 2.0.0
 * @param array $fields Fields array.
 * @param array $definitions Definitions array.
 * @return void
 */
function _flexify_dashboard_collect_field_definitions( $fields, &$definitions ) {
	foreach ( $fields as $field ) {
		if ( ! is_array( $field ) ) {
			continue;
		}

		$name = isset( $field['name'] ) ? $field['name'] : '';

		if ( ! empty( $name ) ) {
			$definitions[ $name ] = $field;
		}

		if ( ! empty( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
			_flexify_dashboard_collect_field_definitions( $field['sub_fields'], $definitions );
		}
	}
}

/**
 * Clear the field definitions cache.
 *
 * @since 2.0.0
 * @return bool
 */
function flexify_dashboard_clear_field_cache() {
	return delete_transient( FLEXIFY_DASHBOARD_FIELD_CACHE_KEY );
}

/**
 * Format a value based on field type and format option.
 *
 * @since 2.0.0
 * @param mixed  $value Raw value.
 * @param string $field_type Field type.
 * @param array  $options Field options.
 * @return mixed
 */
function _flexify_dashboard_format_value( $value, $field_type, $options ) {
	$format = isset( $options['format'] ) ? $options['format'] : 'escaped';

	if ( 'raw' === $format ) {
		return $value;
	}

	switch ( $field_type ) {
		case 'text':
		case 'password':
			return ( 'escaped' === $format ) ? esc_html( $value ) : $value;

		case 'email':
			return ( 'escaped' === $format ) ? sanitize_email( $value ) : $value;

		case 'url':
			return ( 'escaped' === $format ) ? esc_url( $value ) : $value;

		case 'textarea':
			if ( 'html' === $format ) {
				return nl2br( esc_html( $value ) );
			}

			return ( 'escaped' === $format ) ? esc_html( $value ) : $value;

		case 'wysiwyg':
			if ( 'html' === $format || 'escaped' === $format ) {
				return wp_kses_post( $value );
			}

			return $value;

		case 'number':
		case 'range':
			return is_numeric( $value ) ? floatval( $value ) : 0;

		case 'true_false':
			return (bool) $value;

		case 'color_picker':
			if ( is_string( $value ) && preg_match( '/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $value ) ) {
				return $value;
			}

			return ( 'escaped' === $format ) ? esc_attr( $value ) : $value;

		case 'date_picker':
		case 'time_picker':
		case 'date_time_picker':
			return ( 'escaped' === $format ) ? esc_html( $value ) : $value;

		case 'select':
		case 'radio':
		case 'button_group':
			if ( is_array( $value ) ) {
				return ( 'escaped' === $format ) ? array_map( 'esc_html', $value ) : $value;
			}

			return ( 'escaped' === $format ) ? esc_html( $value ) : $value;

		case 'checkbox':
			if ( is_array( $value ) ) {
				return ( 'escaped' === $format ) ? array_map( 'esc_html', $value ) : $value;
			}

			return (bool) $value;

		case 'image':
		case 'file':
		case 'gallery':
		case 'relationship':
		case 'post_object':
		case 'page_link':
		case 'taxonomy':
		case 'user':
		case 'google_map':
		case 'repeater':
		case 'group':
			return $value;

		case 'link':
			return _flexify_dashboard_normalize_link_value( $value );

		case 'oembed':
			if ( 'html' === $format && is_string( $value ) ) {
				$embed = wp_oembed_get( $value );
				return $embed ? $embed : esc_url( $value );
			}

			return ( 'escaped' === $format ) ? esc_url( $value ) : $value;

		default:
			if ( is_string( $value ) ) {
				return ( 'escaped' === $format ) ? esc_html( $value ) : $value;
			}

			return $value;
	}
}

/**
 * Format an image field value with additional data.
 *
 * @since 2.0.0
 * @param mixed  $value Raw image value.
 * @param string $size Image size.
 * @return array|null
 */
function _flexify_dashboard_format_image_value( $value, $size = 'full' ) {
	$attachment_id = null;
	$stored_data   = array();

	if ( is_array( $value ) ) {
		if ( isset( $value['id'] ) ) {
			$attachment_id = absint( $value['id'] );
			$stored_data   = $value;
		} elseif ( isset( $value[0] ) && is_array( $value[0] ) && isset( $value[0]['id'] ) ) {
			$attachment_id = absint( $value[0]['id'] );
			$stored_data   = $value[0];
		}
	} elseif ( is_numeric( $value ) ) {
		$attachment_id = absint( $value );
	}

	if ( empty( $attachment_id ) ) {
		return null;
	}

	$image_src = wp_get_attachment_image_src( $attachment_id, $size );

	if ( ! $image_src ) {
		return null;
	}

	$alt = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );

	if ( empty( $alt ) && isset( $stored_data['alt_text'] ) ) {
		$alt = $stored_data['alt_text'];
	}

	$attachment = get_post( $attachment_id );
	$title      = $attachment ? $attachment->post_title : '';

	if ( empty( $title ) && isset( $stored_data['title'] ) ) {
		$title = $stored_data['title'];
	}

	$sizes            = array();
	$registered_sizes = get_intermediate_image_sizes();
	$registered_sizes[] = 'full';

	foreach ( $registered_sizes as $size_name ) {
		$src = wp_get_attachment_image_src( $attachment_id, $size_name );

		if ( $src ) {
			$sizes[ $size_name ] = array(
				'url'    => $src[0],
				'width'  => $src[1],
				'height' => $src[2],
			);
		}
	}

	return array(
		'id'          => $attachment_id,
		'url'         => $image_src[0],
		'width'       => $image_src[1],
		'height'      => $image_src[2],
		'alt'         => esc_attr( $alt ),
		'title'       => esc_attr( $title ),
		'caption'     => $attachment ? esc_html( $attachment->post_excerpt ) : '',
		'description' => $attachment ? esc_html( $attachment->post_content ) : '',
		'mime_type'   => isset( $stored_data['mime_type'] ) ? $stored_data['mime_type'] : ( $attachment ? $attachment->post_mime_type : '' ),
		'sizes'       => $sizes,
	);
}

/**
 * Check if a value represents multiple images.
 *
 * @since 2.0.0
 * @param mixed $value Raw image value.
 * @return bool
 */
function _flexify_dashboard_is_multi_image_value( $value ) {
	if ( ! is_array( $value ) ) {
		return false;
	}

	if ( isset( $value['id'] ) ) {
		return false;
	}

	if ( isset( $value[0] ) ) {
		if ( is_array( $value[0] ) && isset( $value[0]['id'] ) ) {
			return true;
		}

		if ( is_numeric( $value[0] ) ) {
			return count( $value ) > 1 || ! isset( $value['id'] );
		}
	}

	return false;
}

/**
 * Format multiple images with enhanced data.
 *
 * @since 2.0.0
 * @param array  $value Raw multi-image value.
 * @param string $size Image size.
 * @return array
 */
function _flexify_dashboard_format_multi_image_value( $value, $size = 'full' ) {
	$images = array();

	if ( ! is_array( $value ) ) {
		return $images;
	}

	foreach ( $value as $item ) {
		$formatted = _flexify_dashboard_format_single_image( $item, $size );

		if ( $formatted ) {
			$images[] = $formatted;
		}
	}

	return $images;
}

/**
 * Format a single image item.
 *
 * @since 2.0.0
 * @param mixed  $item Image item.
 * @param string $size Image size.
 * @return array|null
 */
function _flexify_dashboard_format_single_image( $item, $size = 'full' ) {
	$attachment_id = null;
	$stored_data   = array();

	if ( is_array( $item ) && isset( $item['id'] ) ) {
		$attachment_id = absint( $item['id'] );
		$stored_data   = $item;
	} elseif ( is_numeric( $item ) ) {
		$attachment_id = absint( $item );
	}

	if ( empty( $attachment_id ) ) {
		return null;
	}

	$image_src = wp_get_attachment_image_src( $attachment_id, $size );

	if ( ! $image_src ) {
		return null;
	}

	$alt = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );

	if ( empty( $alt ) && isset( $stored_data['alt_text'] ) ) {
		$alt = $stored_data['alt_text'];
	}

	$attachment = get_post( $attachment_id );
	$title      = $attachment ? $attachment->post_title : '';

	if ( empty( $title ) && isset( $stored_data['title'] ) ) {
		$title = $stored_data['title'];
	}

	$sizes              = array();
	$intermediate_sizes = get_intermediate_image_sizes();
	$intermediate_sizes[] = 'full';

	foreach ( $intermediate_sizes as $size_name ) {
		$src = wp_get_attachment_image_src( $attachment_id, $size_name );

		if ( $src ) {
			$sizes[ $size_name ] = array(
				'url'    => $src[0],
				'width'  => $src[1],
				'height' => $src[2],
			);
		}
	}

	return array(
		'id'          => $attachment_id,
		'url'         => $image_src[0],
		'width'       => $image_src[1],
		'height'      => $image_src[2],
		'alt'         => esc_attr( $alt ),
		'title'       => esc_attr( $title ),
		'caption'     => $attachment ? esc_html( $attachment->post_excerpt ) : '',
		'description' => $attachment ? esc_html( $attachment->post_content ) : '',
		'mime_type'   => isset( $stored_data['mime_type'] ) ? $stored_data['mime_type'] : ( $attachment ? $attachment->post_mime_type : '' ),
		'sizes'       => $sizes,
	);
}

/**
 * Format a file field value with additional data.
 *
 * @since 2.0.0
 * @param mixed $value Raw file value.
 * @return array|null
 */
function _flexify_dashboard_format_file_value( $value ) {
	$attachment_id = null;
	$stored_data   = array();

	if ( is_array( $value ) ) {
		if ( isset( $value['id'] ) ) {
			$attachment_id = absint( $value['id'] );
			$stored_data   = $value;
		} elseif ( isset( $value[0] ) && is_array( $value[0] ) && isset( $value[0]['id'] ) ) {
			$attachment_id = absint( $value[0]['id'] );
			$stored_data   = $value[0];
		}
	} elseif ( is_numeric( $value ) ) {
		$attachment_id = absint( $value );
	}

	if ( empty( $attachment_id ) ) {
		return null;
	}

	$url = wp_get_attachment_url( $attachment_id );

	if ( ! $url ) {
		return null;
	}

	$attachment = get_post( $attachment_id );
	$file_path  = get_attached_file( $attachment_id );
	$file_size  = ( $file_path && file_exists( $file_path ) ) ? filesize( $file_path ) : 0;

	return array(
		'id'                 => $attachment_id,
		'url'                => esc_url( $url ),
		'title'              => $attachment ? esc_attr( $attachment->post_title ) : '',
		'filename'           => $file_path ? basename( $file_path ) : '',
		'filesize'           => $file_size,
		'filesize_formatted' => $file_size ? size_format( $file_size ) : '',
		'mime_type'          => isset( $stored_data['mime_type'] ) ? $stored_data['mime_type'] : ( $attachment ? $attachment->post_mime_type : '' ),
		'icon'               => wp_mime_type_icon( $attachment_id ),
	);
}

/**
 * Normalize a link field value.
 *
 * @since 2.0.0
 * @param mixed $value Raw link value.
 * @return array|null
 */
function _flexify_dashboard_normalize_link_value( $value ) {
	if ( empty( $value ) ) {
		return null;
	}

	if ( is_string( $value ) ) {
		return array(
			'url'    => esc_url( $value ),
			'title'  => '',
			'target' => '_self',
		);
	}

	if ( is_array( $value ) ) {
		return array(
			'url'    => isset( $value['url'] ) ? esc_url( $value['url'] ) : '',
			'title'  => isset( $value['title'] ) ? esc_attr( $value['title'] ) : '',
			'target' => isset( $value['target'] ) ? esc_attr( $value['target'] ) : '_self',
		);
	}

	return null;
}

/**
 * Render a link as HTML.
 *
 * @since 2.0.0
 * @param array  $link Link array.
 * @param string $class CSS class.
 * @return string
 */
function _flexify_dashboard_render_link_html( $link, $class = '' ) {
	if ( empty( $link ) || empty( $link['url'] ) ) {
		return '';
	}

	$attrs = array(
		'href' => esc_url( $link['url'] ),
	);

	if ( ! empty( $link['target'] ) && '_self' !== $link['target'] ) {
		$attrs['target'] = esc_attr( $link['target'] );

		if ( '_blank' === $link['target'] ) {
			$attrs['rel'] = 'noopener noreferrer';
		}
	}

	if ( ! empty( $class ) ) {
		$attrs['class'] = esc_attr( $class );
	}

	$attr_string = '';

	foreach ( $attrs as $name => $value ) {
		$attr_string .= sprintf( ' %s="%s"', $name, $value );
	}

	$title = ! empty( $link['title'] ) ? esc_html( $link['title'] ) : esc_url( $link['url'] );

	return sprintf( '<a%s>%s</a>', $attr_string, $title );
}

/**
 * Render a value as HTML based on field type.
 *
 * @since 2.0.0
 * @param mixed  $value Value.
 * @param string $field_type Field type.
 * @param array  $options Render options.
 * @return string
 */
function _flexify_dashboard_render_html( $value, $field_type, $options = array() ) {
	switch ( $field_type ) {
		case 'link':
			return _flexify_dashboard_render_link_html(
				$value,
				isset( $options['class'] ) ? $options['class'] : ''
			);

		case 'image':
			if ( is_array( $value ) && isset( $value['url'] ) ) {
				return sprintf(
					'<img src="%s" alt="%s" width="%s" height="%s">',
					esc_url( $value['url'] ),
					esc_attr( isset( $value['alt'] ) ? $value['alt'] : '' ),
					esc_attr( isset( $value['width'] ) ? $value['width'] : '' ),
					esc_attr( isset( $value['height'] ) ? $value['height'] : '' )
				);
			}

			return '';

		case 'oembed':
			if ( is_string( $value ) ) {
				$embed = wp_oembed_get( $value );
				return $embed ? $embed : '';
			}

			return '';

		case 'google_map':
			if ( is_array( $value ) && isset( $value['lat'] ) && isset( $value['lng'] ) ) {
				return sprintf(
					'<div class="flexify-dashboard-map" data-lat="%s" data-lng="%s" data-zoom="%s" data-address="%s"></div>',
					esc_attr( $value['lat'] ),
					esc_attr( $value['lng'] ),
					esc_attr( isset( $value['zoom'] ) ? $value['zoom'] : 13 ),
					esc_attr( isset( $value['address'] ) ? $value['address'] : '' )
				);
			}

			return '';

		default:
			if ( is_string( $value ) ) {
				return esc_html( $value );
			}

			return '';
	}
}

add_action( 'flexify_dashboard_field_groups_saved', 'flexify_dashboard_clear_field_cache' );