<?php

namespace MeuMouse\Flexify_Dashboard\Rest\CustomFields;

defined('ABSPATH') || exit;

/**
 * Class LocationRuleEvaluator
 *
 * Evaluates location rules to determine if field groups should be displayed.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest\CustomFields
 * @author MeuMouse.com
 */
class LocationRuleEvaluator {

	/**
	 * Get taxonomies from location rules.
	 *
	 * This extracts all taxonomies that could potentially match the location rules.
	 *
	 * @since 2.0.0
	 * @param array $location Location rules.
	 * @return array
	 */
	public static function get_location_taxonomies( $location ) {
		$taxonomies     = array();
		$all_taxonomies = get_taxonomies( array( 'public' => true ), 'names' );

		if ( ! is_array( $location ) || empty( $location ) ) {
			return $taxonomies;
		}

		foreach ( $location as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			foreach ( $group as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}

				$param    = isset( $rule['param'] ) ? $rule['param'] : '';
				$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
				$value    = isset( $rule['value'] ) ? $rule['value'] : '';

				if ( 'taxonomy' === $param ) {
					if ( '==' === $operator && 'all' === $value ) {
						$taxonomies = array_merge( $taxonomies, $all_taxonomies );
					} elseif ( '==' === $operator ) {
						$taxonomies[] = $value;
					} elseif ( '!=' === $operator && 'all' !== $value ) {
						$taxonomies = array_merge( $taxonomies, array_diff( $all_taxonomies, array( $value ) ) );
					}
				} elseif ( 'taxonomy_term' === $param && false !== strpos( $value, ':' ) ) {
					list( $taxonomy_name ) = explode( ':', $value, 2 );
					$taxonomies[] = $taxonomy_name;
				}
			}
		}

		return array_values( array_unique( array_filter( $taxonomies ) ) );
	}


	/**
	 * Check if a field group should be displayed for a taxonomy term.
	 *
	 * Uses OR logic between groups and AND logic within groups.
	 *
	 * @since 2.0.0
	 * @param array         $location Location rules.
	 * @param string        $taxonomy Taxonomy name.
	 * @param \WP_Term|null $term Term object.
	 * @return bool
	 */
	public static function should_show_for_taxonomy( $location, $taxonomy, $term = null ) {
		if ( empty( $location ) || ! is_array( $location ) ) {
			return false;
		}

		foreach ( $location as $group ) {
			if ( self::evaluate_taxonomy_location_group( $group, $taxonomy, $term ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Check if location rules contain rules for a specific context.
	 *
	 * @since 2.0.0
	 * @param array  $location Location rules.
	 * @param string $context Context type.
	 * @return bool
	 */
	public static function has_context_rules( $location, $context ) {
		if ( empty( $location ) || ! is_array( $location ) ) {
			return false;
		}

		$context_params = array(
			'post'       => array( 'post_type', 'post_template', 'post_status', 'post_format', 'post_category', 'post_taxonomy', 'post', 'page_template', 'page_type', 'page_parent', 'page', 'block' ),
			'taxonomy'   => array( 'taxonomy', 'taxonomy_term' ),
			'user'       => array( 'user', 'user_form', 'user_role' ),
			'comment'    => array( 'comment' ),
			'attachment' => array( 'attachment' ),
		);

		$target_params = isset( $context_params[ $context ] ) ? $context_params[ $context ] : array();

		foreach ( $location as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			foreach ( $group as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}

				$param = isset( $rule['param'] ) ? $rule['param'] : '';

				if ( in_array( $param, $target_params, true ) ) {
					return true;
				}
			}
		}

		return false;
	}


	/**
	 * Check if a field group should be displayed for a user.
	 *
	 * @since 2.0.0
	 * @param array         $location Location rules.
	 * @param \WP_User|null $user User object.
	 * @param string        $context Context type.
	 * @return bool
	 */
	public static function should_show_for_user( $location, $user = null, $context = 'edit' ) {
		if ( empty( $location ) || ! is_array( $location ) ) {
			return false;
		}

		foreach ( $location as $group ) {
			if ( self::evaluate_user_location_group( $group, $user, $context ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Check if a field group should be displayed for a comment.
	 *
	 * @since 2.0.0
	 * @param array       $location Location rules.
	 * @param \WP_Comment $comment Comment object.
	 * @return bool
	 */
	public static function should_show_for_comment( $location, $comment ) {
		if ( empty( $location ) || ! is_array( $location ) ) {
			return false;
		}

		foreach ( $location as $group ) {
			if ( self::evaluate_comment_location_group( $group, $comment ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Check if a field group should be displayed for an attachment.
	 *
	 * @since 2.0.0
	 * @param array    $location Location rules.
	 * @param \WP_Post $post Attachment post object.
	 * @return bool
	 */
	public static function should_show_for_attachment( $location, $post ) {
		if ( empty( $location ) || ! is_array( $location ) ) {
			return false;
		}

		foreach ( $location as $group ) {
			if ( self::evaluate_attachment_location_group( $group, $post ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get post types from location rules.
	 *
	 * For complex rules, this returns all potential post types and filters later at render time.
	 *
	 * @since 2.0.0
	 * @param array $location Location rules.
	 * @return array
	 */
	public static function get_location_post_types( $location ) {
		$post_types     = array();
		$all_post_types = get_post_types( array( 'public' => true ), 'names' );

		if ( ! is_array( $location ) || empty( $location ) ) {
			return $post_types;
		}

		foreach ( $location as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			$group_post_types   = array();
			$has_post_type_rule = false;
			$has_page_rule      = false;
			$needs_all_types    = false;

			foreach ( $group as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}

				$param    = isset( $rule['param'] ) ? $rule['param'] : '';
				$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
				$value    = isset( $rule['value'] ) ? $rule['value'] : '';

				switch ( $param ) {
					case 'post_type':
						$has_post_type_rule = true;

						if ( '==' === $operator && 'all' === $value ) {
							$group_post_types = array_merge( $group_post_types, $all_post_types );
						} elseif ( '==' === $operator ) {
							$group_post_types[] = $value;
						} elseif ( '!=' === $operator && 'all' !== $value ) {
							$group_post_types = array_merge( $group_post_types, array_diff( $all_post_types, array( $value ) ) );
						}
						break;

					case 'post_template':
					case 'post_status':
					case 'post_format':
					case 'post_category':
					case 'post_taxonomy':
					case 'post':
						if ( ! $has_post_type_rule ) {
							$group_post_types[] = 'post';
						}
						break;

					case 'page_template':
					case 'page_type':
					case 'page_parent':
					case 'page':
						$has_page_rule      = true;
						$group_post_types[] = 'page';
						break;

					case 'attachment':
						$group_post_types[] = 'attachment';
						break;

					case 'block':
						$needs_all_types = true;
						break;

					case 'current_user':
					case 'current_user_role':
						if ( ! $has_post_type_rule && ! $has_page_rule ) {
							$needs_all_types = true;
						}
						break;
				}
			}

			if ( $needs_all_types ) {
				$group_post_types = array_merge( $group_post_types, $all_post_types );
			}

			$post_types = array_merge( $post_types, $group_post_types );
		}

		return array_values( array_unique( array_filter( $post_types ) ) );
	}


	/**
	 * Check if a field group should be displayed for a specific post.
	 *
	 * Uses OR logic between groups and AND logic within groups.
	 *
	 * @since 2.0.0
	 * @param array    $location Location rules.
	 * @param \WP_Post $post Post object.
	 * @return bool
	 */
	public static function should_show_for_post( $location, $post ) {
		if ( empty( $location ) || ! is_array( $location ) || ! $post instanceof \WP_Post ) {
			return false;
		}

		foreach ( $location as $group ) {
			if ( self::evaluate_location_group( $group, $post ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Check if a field group should be displayed for an option page.
	 *
	 * @since 2.0.0
	 * @param array  $location Location rules.
	 * @param string $page_slug Option page slug.
	 * @return bool
	 */
	public static function should_show_for_option_page( $location, $page_slug ) {
		if ( empty( $location ) || ! is_array( $location ) ) {
			return false;
		}

		foreach ( $location as $group ) {
			if ( self::evaluate_option_page_location_group( $group, $page_slug ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Get option page slugs from location rules.
	 *
	 * @since 2.0.0
	 * @param array $location Location rules.
	 * @return array
	 */
	public static function get_location_option_pages( $location ) {
		$option_pages = array();

		if ( ! is_array( $location ) || empty( $location ) ) {
			return $option_pages;
		}

		foreach ( $location as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			foreach ( $group as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}

				$param    = isset( $rule['param'] ) ? $rule['param'] : '';
				$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
				$value    = isset( $rule['value'] ) ? $rule['value'] : '';

				if ( 'options_page' === $param && '==' === $operator && '' !== $value ) {
					$option_pages[] = $value;
				}
			}
		}

		return array_values( array_unique( $option_pages ) );
	}


	/**
	 * Evaluate a single taxonomy location group.
	 *
	 * Uses AND logic within the group.
	 *
	 * @since 2.0.0
	 * @param array         $group Array of rules.
	 * @param string        $taxonomy Taxonomy name.
	 * @param \WP_Term|null $term Term object.
	 * @return bool
	 */
	private static function evaluate_taxonomy_location_group( $group, $taxonomy, $term ) {
		if ( empty( $group ) || ! is_array( $group ) ) {
			return false;
		}

		$has_taxonomy_rule = false;

		foreach ( $group as $rule ) {
			$param = isset( $rule['param'] ) ? $rule['param'] : '';

			if ( in_array( $param, array( 'taxonomy', 'taxonomy_term' ), true ) ) {
				$has_taxonomy_rule = true;
				break;
			}
		}

		if ( ! $has_taxonomy_rule ) {
			return false;
		}

		foreach ( $group as $rule ) {
			if ( ! self::evaluate_taxonomy_location_rule( $rule, $taxonomy, $term ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Evaluate a single taxonomy location rule.
	 *
	 * @since 2.0.0
	 * @param array         $rule Rule data.
	 * @param string        $taxonomy Taxonomy name.
	 * @param \WP_Term|null $term Term object.
	 * @return bool
	 */
	private static function evaluate_taxonomy_location_rule( $rule, $taxonomy, $term ) {
		$param    = isset( $rule['param'] ) ? $rule['param'] : '';
		$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
		$value    = isset( $rule['value'] ) ? $rule['value'] : '';
		$match    = false;

		switch ( $param ) {
			case 'taxonomy':
				$match = ( 'all' === $value ) ? true : ( $taxonomy === $value );
				break;

			case 'taxonomy_term':
				if ( ! $term ) {
					if ( false !== strpos( $value, ':' ) ) {
						list( $tax_name ) = explode( ':', $value, 2 );
						$match = ( $taxonomy === $tax_name );
					}
				} else {
					if ( false !== strpos( $value, ':' ) ) {
						list( $tax_name, $term_id ) = explode( ':', $value, 2 );
						$match = ( $taxonomy === $tax_name && absint( $term->term_id ) === absint( $term_id ) );
					} else {
						$match = ( absint( $term->term_id ) === absint( $value ) );
					}
				}
				break;

			case 'current_user':
				$match = self::match_current_user( $value );
				break;

			case 'current_user_role':
				$match = self::match_current_user_role( $value );
				break;

			case 'post_type':
			case 'post_template':
			case 'post_status':
			case 'post_format':
			case 'post_category':
			case 'post_taxonomy':
			case 'post':
			case 'page_template':
			case 'page_type':
			case 'page_parent':
			case 'page':
			case 'attachment':
			case 'user':
			case 'user_form':
			case 'user_role':
			case 'comment':
			case 'nav_menu':
			case 'nav_menu_item':
			case 'widget':
			case 'options_page':
			case 'block':
				$match = true;
				break;

			default:
				$match = true;
				break;
		}

		return self::apply_operator( $match, $operator );
	}


	/**
	 * Evaluate a single user location group.
	 *
	 * @since 2.0.0
	 * @param array         $group Array of rules.
	 * @param \WP_User|null $user User object.
	 * @param string        $context Context type.
	 * @return bool
	 */
	private static function evaluate_user_location_group( $group, $user, $context ) {
		if ( empty( $group ) || ! is_array( $group ) ) {
			return false;
		}

		$has_user_rule = false;

		foreach ( $group as $rule ) {
			$param = isset( $rule['param'] ) ? $rule['param'] : '';

			if ( in_array( $param, array( 'user', 'user_form', 'user_role' ), true ) ) {
				$has_user_rule = true;
				break;
			}
		}

		if ( ! $has_user_rule ) {
			return false;
		}

		foreach ( $group as $rule ) {
			if ( ! self::evaluate_user_location_rule( $rule, $user, $context ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Evaluate a single user location rule.
	 *
	 * @since 2.0.0
	 * @param array         $rule Rule data.
	 * @param \WP_User|null $user User object.
	 * @param string        $context Context type.
	 * @return bool
	 */
	private static function evaluate_user_location_rule( $rule, $user, $context ) {
		$param    = isset( $rule['param'] ) ? $rule['param'] : '';
		$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
		$value    = isset( $rule['value'] ) ? $rule['value'] : '';
		$match    = false;

		switch ( $param ) {
			case 'user_form':
				if ( 'all' === $value ) {
					$match = true;
				} elseif ( 'add' === $value ) {
					$match = ( 'add' === $context );
				} elseif ( 'edit' === $value ) {
					$match = ( 'edit' === $context );
				}
				break;

			case 'user_role':
				if ( 'all' === $value ) {
					$match = true;
				} elseif ( $user instanceof \WP_User ) {
					$match = in_array( $value, (array) $user->roles, true );
				} else {
					$match = true;
				}
				break;

			case 'user':
				if ( $user instanceof \WP_User ) {
					$match = ( absint( $user->ID ) === absint( $value ) );
				}
				break;

			case 'current_user':
				$match = self::match_current_user( $value );
				break;

			case 'current_user_role':
				$match = self::match_current_user_role( $value );
				break;

			default:
				$match = true;
				break;
		}

		return self::apply_operator( $match, $operator );
	}


	/**
	 * Evaluate a single comment location group.
	 *
	 * @since 2.0.0
	 * @param array       $group Array of rules.
	 * @param \WP_Comment $comment Comment object.
	 * @return bool
	 */
	private static function evaluate_comment_location_group( $group, $comment ) {
		if ( empty( $group ) || ! is_array( $group ) ) {
			return false;
		}

		$has_comment_rule = false;

		foreach ( $group as $rule ) {
			if ( 'comment' === ( isset( $rule['param'] ) ? $rule['param'] : '' ) ) {
				$has_comment_rule = true;
				break;
			}
		}

		if ( ! $has_comment_rule ) {
			return false;
		}

		foreach ( $group as $rule ) {
			if ( ! self::evaluate_comment_location_rule( $rule, $comment ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Evaluate a single comment location rule.
	 *
	 * @since 2.0.0
	 * @param array       $rule Rule data.
	 * @param \WP_Comment $comment Comment object.
	 * @return bool
	 */
	private static function evaluate_comment_location_rule( $rule, $comment ) {
		$param    = isset( $rule['param'] ) ? $rule['param'] : '';
		$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
		$value    = isset( $rule['value'] ) ? $rule['value'] : '';
		$match    = false;

		switch ( $param ) {
			case 'comment':
				if ( 'all' === $value ) {
					$match = true;
				} else {
					$post  = get_post( $comment->comment_post_ID );
					$match = ( $post instanceof \WP_Post && $post->post_type === $value );
				}
				break;

			case 'current_user':
				$match = self::match_current_user( $value );
				break;

			case 'current_user_role':
				$match = self::match_current_user_role( $value );
				break;

			default:
				$match = true;
				break;
		}

		return self::apply_operator( $match, $operator );
	}


	/**
	 * Evaluate a single attachment location group.
	 *
	 * @since 2.0.0
	 * @param array    $group Array of rules.
	 * @param \WP_Post $post Attachment post object.
	 * @return bool
	 */
	private static function evaluate_attachment_location_group( $group, $post ) {
		if ( empty( $group ) || ! is_array( $group ) ) {
			return false;
		}

		$has_attachment_rule = false;

		foreach ( $group as $rule ) {
			if ( 'attachment' === ( isset( $rule['param'] ) ? $rule['param'] : '' ) ) {
				$has_attachment_rule = true;
				break;
			}
		}

		if ( ! $has_attachment_rule ) {
			return false;
		}

		foreach ( $group as $rule ) {
			if ( ! self::evaluate_attachment_location_rule( $rule, $post ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Evaluate a single attachment location rule.
	 *
	 * @since 2.0.0
	 * @param array    $rule Rule data.
	 * @param \WP_Post $post Attachment post object.
	 * @return bool
	 */
	private static function evaluate_attachment_location_rule( $rule, $post ) {
		$param    = isset( $rule['param'] ) ? $rule['param'] : '';
		$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
		$value    = isset( $rule['value'] ) ? $rule['value'] : '';
		$match    = false;

		switch ( $param ) {
			case 'attachment':
				if ( 'all' === $value ) {
					$match = true;
				} else {
					$mime_type = get_post_mime_type( $post );
					$type_parts = is_string( $mime_type ) ? explode( '/', $mime_type ) : array();
					$main_type = isset( $type_parts[0] ) ? $type_parts[0] : '';
					$match = ( $main_type === $value );
				}
				break;

			case 'current_user':
				$match = self::match_current_user( $value );
				break;

			case 'current_user_role':
				$match = self::match_current_user_role( $value );
				break;

			default:
				$match = true;
				break;
		}

		return self::apply_operator( $match, $operator );
	}


	/**
	 * Evaluate a single location group for posts.
	 *
	 * Uses AND logic within the group.
	 *
	 * @since 2.0.0
	 * @param array    $group Array of rules.
	 * @param \WP_Post $post Post object.
	 * @return bool
	 */
	private static function evaluate_location_group( $group, $post ) {
		if ( empty( $group ) || ! is_array( $group ) ) {
			return false;
		}

		foreach ( $group as $rule ) {
			if ( ! self::evaluate_location_rule( $rule, $post ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Evaluate a single location rule for posts.
	 *
	 * @since 2.0.0
	 * @param array    $rule Rule data.
	 * @param \WP_Post $post Post object.
	 * @return bool
	 */
	private static function evaluate_location_rule( $rule, $post ) {
		$param    = isset( $rule['param'] ) ? $rule['param'] : '';
		$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
		$value    = isset( $rule['value'] ) ? $rule['value'] : '';
		$match    = false;

		switch ( $param ) {
			case 'post_type':
				$match = self::match_post_type( $post, $value );
				break;

			case 'post_template':
				$match = self::match_post_template( $post, $value );
				break;

			case 'post_status':
				$match = self::match_post_status( $post, $value );
				break;

			case 'post_format':
				$match = self::match_post_format( $post, $value );
				break;

			case 'post_category':
				$match = self::match_post_category( $post, $value );
				break;

			case 'post_taxonomy':
				$match = self::match_post_taxonomy( $post, $value );
				break;

			case 'post':
				$match = self::match_specific_post( $post, $value );
				break;

			case 'page_template':
				$match = self::match_page_template( $post, $value );
				break;

			case 'page_type':
				$match = self::match_page_type( $post, $value );
				break;

			case 'page_parent':
				$match = self::match_page_parent( $post, $value );
				break;

			case 'page':
				$match = self::match_specific_page( $post, $value );
				break;

			case 'attachment':
				$match = self::match_attachment( $post, $value );
				break;

			case 'taxonomy':
				$match = self::match_taxonomy( $post, $value );
				break;

			case 'taxonomy_term':
				$match = self::match_taxonomy_term( $post, $value );
				break;

			case 'current_user':
				$match = self::match_current_user( $value );
				break;

			case 'current_user_role':
				$match = self::match_current_user_role( $value );
				break;

			case 'user':
			case 'user_form':
			case 'user_role':
			case 'comment':
			case 'nav_menu':
			case 'nav_menu_item':
			case 'widget':
			case 'options_page':
			case 'block':
				$match = true;
				break;

			default:
				$match = true;
				break;
		}

		return self::apply_operator( $match, $operator );
	}


	/**
	 * Evaluate a single option page location group.
	 *
	 * @since 2.0.0
	 * @param array  $group Array of rules.
	 * @param string $page_slug Option page slug.
	 * @return bool
	 */
	private static function evaluate_option_page_location_group( $group, $page_slug ) {
		if ( empty( $group ) || ! is_array( $group ) ) {
			return false;
		}

		$has_option_page_rule = false;

		foreach ( $group as $rule ) {
			if ( 'options_page' === ( isset( $rule['param'] ) ? $rule['param'] : '' ) ) {
				$has_option_page_rule = true;
				break;
			}
		}

		if ( ! $has_option_page_rule ) {
			return false;
		}

		foreach ( $group as $rule ) {
			if ( ! self::evaluate_option_page_location_rule( $rule, $page_slug ) ) {
				return false;
			}
		}

		return true;
	}


	/**
	 * Evaluate a single option page location rule.
	 *
	 * @since 2.0.0
	 * @param array  $rule Rule data.
	 * @param string $page_slug Option page slug.
	 * @return bool
	 */
	private static function evaluate_option_page_location_rule( $rule, $page_slug ) {
		$param    = isset( $rule['param'] ) ? $rule['param'] : '';
		$operator = isset( $rule['operator'] ) ? $rule['operator'] : '==';
		$value    = isset( $rule['value'] ) ? $rule['value'] : '';
		$match    = false;

		switch ( $param ) {
			case 'options_page':
				$match = ( $page_slug === $value );
				break;

			case 'current_user':
				$match = self::match_current_user( $value );
				break;

			case 'current_user_role':
				$match = self::match_current_user_role( $value );
				break;

			default:
				$match = true;
				break;
		}

		return self::apply_operator( $match, $operator );
	}


	/**
	 * Apply a rule operator to the match result.
	 *
	 * @since 2.0.0
	 * @param bool   $match Raw match result.
	 * @param string $operator Rule operator.
	 * @return bool
	 */
	private static function apply_operator( $match, $operator ) {
		if ( '!=' === $operator ) {
			return ! $match;
		}

		return (bool) $match;
	}


	/**
	 * Match post type.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_post_type( $post, $value ) {
		if ( 'all' === $value ) {
			return true;
		}

		return $post->post_type === $value;
	}


	/**
	 * Match post template.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_post_template( $post, $value ) {
		$template = get_page_template_slug( $post );

		if ( 'default' === $value || empty( $value ) ) {
			return empty( $template );
		}

		return $template === $value;
	}


	/**
	 * Match post status.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_post_status( $post, $value ) {
		if ( 'all' === $value ) {
			return true;
		}

		return $post->post_status === $value;
	}


	/**
	 * Match post format.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_post_format( $post, $value ) {
		$format = get_post_format( $post );

		if ( 'standard' === $value || empty( $value ) ) {
			return false === $format || 'standard' === $format;
		}

		return $format === $value;
	}


	/**
	 * Match post category.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param mixed    $value Rule value.
	 * @return bool
	 */
	private static function match_post_category( $post, $value ) {
		if ( 'all' === $value ) {
			return has_category( '', $post );
		}

		if ( is_numeric( $value ) ) {
			return has_category( absint( $value ), $post );
		}

		return has_category( $value, $post );
	}


	/**
	 * Match post taxonomy.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_post_taxonomy( $post, $value ) {
		if ( 'all' === $value ) {
			return true;
		}

		$terms = get_the_terms( $post->ID, $value );

		return ! empty( $terms ) && ! is_wp_error( $terms );
	}


	/**
	 * Match a specific post.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param mixed    $value Rule value.
	 * @return bool
	 */
	private static function match_specific_post( $post, $value ) {
		return absint( $post->ID ) === absint( $value );
	}


	/**
	 * Match page template.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_page_template( $post, $value ) {
		if ( 'page' !== $post->post_type ) {
			return false;
		}

		$template = get_page_template_slug( $post );

		if ( 'default' === $value || empty( $value ) ) {
			return empty( $template );
		}

		return $template === $value;
	}


	/**
	 * Match page type.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_page_type( $post, $value ) {
		if ( 'page' !== $post->post_type ) {
			return false;
		}

		switch ( $value ) {
			case 'front_page':
				return absint( get_option( 'page_on_front' ) ) === absint( $post->ID );

			case 'posts_page':
				return absint( get_option( 'page_for_posts' ) ) === absint( $post->ID );

			case 'top_level':
				return 0 === absint( $post->post_parent );

			case 'parent':
				$children = get_pages( array(
					'parent' => $post->ID,
					'number' => 1,
				) );

				return ! empty( $children );

			case 'child':
				return absint( $post->post_parent ) > 0;
		}

		return false;
	}


	/**
	 * Match page parent.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param mixed    $value Rule value.
	 * @return bool
	 */
	private static function match_page_parent( $post, $value ) {
		if ( 'page' !== $post->post_type ) {
			return false;
		}

		return absint( $post->post_parent ) === absint( $value );
	}


	/**
	 * Match a specific page.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param mixed    $value Rule value.
	 * @return bool
	 */
	private static function match_specific_page( $post, $value ) {
		if ( 'page' !== $post->post_type ) {
			return false;
		}

		return absint( $post->ID ) === absint( $value );
	}


	/**
	 * Match attachment type.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_attachment( $post, $value ) {
		if ( 'attachment' !== $post->post_type ) {
			return false;
		}

		if ( 'all' === $value ) {
			return true;
		}

		$mime_type  = get_post_mime_type( $post );
		$type_parts = is_string( $mime_type ) ? explode( '/', $mime_type ) : array();
		$main_type  = isset( $type_parts[0] ) ? $type_parts[0] : '';

		return $main_type === $value;
	}


	/**
	 * Match current user state.
	 *
	 * @since 2.0.0
	 * @param string $value Rule value.
	 * @return bool
	 */
	private static function match_current_user( $value ) {
		switch ( $value ) {
			case 'logged_in':
				return is_user_logged_in();

			case 'logged_out':
				return ! is_user_logged_in();

			case 'viewing_front':
				return ! is_admin();

			case 'viewing_back':
				return is_admin();
		}

		return false;
	}


	/**
	 * Match current user role.
	 *
	 * @since 2.0.0
	 * @param string $value Rule value.
	 * @return bool
	 */
	private static function match_current_user_role( $value ) {
		if ( ! is_user_logged_in() ) {
			return false;
		}

		$user = wp_get_current_user();

		if ( 'all' === $value ) {
			return true;
		}

		return in_array( $value, (array) $user->roles, true );
	}


	/**
	 * Match taxonomy.
	 *
	 * Checks if the post has any terms in the given taxonomy.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_taxonomy( $post, $value ) {
		if ( 'all' === $value ) {
			$taxonomies = get_post_taxonomies( $post );

			foreach ( $taxonomies as $taxonomy ) {
				$terms = get_the_terms( $post->ID, $taxonomy );

				if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {
					return true;
				}
			}

			return false;
		}

		$terms = get_the_terms( $post->ID, $value );

		return ! empty( $terms ) && ! is_wp_error( $terms );
	}


	/**
	 * Match taxonomy term.
	 *
	 * Value format: "taxonomy_name:term_id" or just "term_id" for category.
	 *
	 * @since 2.0.0
	 * @param \WP_Post $post Post object.
	 * @param string   $value Rule value.
	 * @return bool
	 */
	private static function match_taxonomy_term( $post, $value ) {
		if ( false !== strpos( $value, ':' ) ) {
			list( $taxonomy, $term_id ) = explode( ':', $value, 2 );
			return has_term( absint( $term_id ), $taxonomy, $post );
		}

		return has_term( absint( $value ), 'category', $post );
	}
}