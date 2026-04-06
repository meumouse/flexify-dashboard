<?php

namespace MeuMouse\Flexify_Dashboard\Activity;

defined('ABSPATH') || exit;

/**
 * Class ActivityHooks
 *
 * Hook into WordPress actions to log activities.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Activity
 * @author MeuMouse.com
 */
class ActivityHooks {
	/**
	 * Options that should be ignored to avoid log spam.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $skip_options = array(
		'cron',
		'transient',
		'_transient',
		'_site_transient',
		'rewrite_rules',
		'active_plugins',
	);


	/**
	 * Class constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		if ( ! ActivityDatabase::is_activity_logger_enabled() ) {
			return;
		}

		$this->register_hooks();
	}


	/**
	 * Register WordPress hooks for activity logging.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function register_hooks() {
		add_action( 'wp_insert_post', array( $this, 'log_post_created' ), 10, 3 );
		add_action( 'post_updated', array( $this, 'log_post_updated' ), 10, 3 );
		add_action( 'before_delete_post', array( $this, 'log_post_deleted' ), 10, 1 );
		add_action( 'trashed_post', array( $this, 'log_post_trashed' ), 10, 1 );
		add_action( 'untrashed_post', array( $this, 'log_post_restored' ), 10, 1 );

		add_action( 'user_register', array( $this, 'log_user_created' ), 10, 1 );
		add_action( 'profile_update', array( $this, 'log_user_updated' ), 10, 2 );
		add_action( 'delete_user', array( $this, 'log_user_deleted' ), 10, 1 );
		add_action( 'set_user_role', array( $this, 'log_user_role_changed' ), 10, 3 );

		add_action( 'wp_insert_comment', array( $this, 'log_comment_created' ), 10, 2 );
		add_action( 'edit_comment', array( $this, 'log_comment_updated' ), 10, 2 );
		add_action( 'delete_comment', array( $this, 'log_comment_deleted' ), 10, 2 );
		add_action( 'wp_set_comment_status', array( $this, 'log_comment_status_changed' ), 10, 2 );

		add_action( 'activated_plugin', array( $this, 'log_plugin_activated' ), 10, 2 );
		add_action( 'deactivated_plugin', array( $this, 'log_plugin_deactivated' ), 10, 2 );
		add_action( 'upgrader_process_complete', array( $this, 'log_plugin_installed' ), 10, 2 );
		add_action( 'delete_plugin', array( $this, 'log_plugin_deleted' ), 10, 1 );

		add_action( 'updated_option', array( $this, 'log_option_updated' ), 10, 3 );

		add_action( 'add_attachment', array( $this, 'log_media_uploaded' ), 10, 1 );
		add_action( 'delete_attachment', array( $this, 'log_media_deleted' ), 10, 1 );

		add_action( 'wp_login', array( $this, 'log_user_login' ), 10, 2 );
		add_action( 'wp_logout', array( $this, 'log_user_logout' ) );
	}


	/**
	 * Log post creation.
	 *
	 * @since 2.0.0
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post Post object.
	 * @param bool     $update Whether this is an update.
	 * @return void
	 */
	public function log_post_created( $post_id, $post, $update ) {
		if ( $update || ! $post instanceof \WP_Post ) {
			return;
		}

		if ( 'auto-draft' === $post->post_status || 'revision' === $post->post_type ) {
			return;
		}

		ActivityLogger::log(
			'created',
			$post->post_type,
			$post_id,
			null,
			array(
				'title' => $post->post_title,
				'status' => $post->post_status,
			),
			array(
				'post_type' => $post->post_type,
			)
		);
	}


	/**
	 * Log post update.
	 *
	 * @since 2.0.0
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post_after Post object after update.
	 * @param \WP_Post $post_before Post object before update.
	 * @return void
	 */
	public function log_post_updated( $post_id, $post_after, $post_before ) {
		if ( ! $post_after instanceof \WP_Post || ! $post_before instanceof \WP_Post ) {
			return;
		}

		if ( 'auto-draft' === $post_after->post_status || 'revision' === $post_after->post_type ) {
			return;
		}

		$old_value = array();
		$new_value = array();

		if ( $post_before->post_title !== $post_after->post_title ) {
			$old_value['title'] = $post_before->post_title;
			$new_value['title'] = $post_after->post_title;
		}

		if ( $post_before->post_status !== $post_after->post_status ) {
			$old_value['status'] = $post_before->post_status;
			$new_value['status'] = $post_after->post_status;
		}

		if ( $post_before->post_content !== $post_after->post_content ) {
			$old_value['content'] = $this->truncate_text( $post_before->post_content );
			$new_value['content'] = $this->truncate_text( $post_after->post_content );
		}

		if ( empty( $old_value ) && empty( $new_value ) ) {
			return;
		}

		ActivityLogger::log(
			'updated',
			$post_after->post_type,
			$post_id,
			$old_value,
			$new_value,
			array(
				'post_type' => $post_after->post_type,
			)
		);
	}


	/**
	 * Log post deletion.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public function log_post_deleted( $post_id ) {
		$post = get_post( $post_id );

		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		ActivityLogger::log(
			'deleted',
			$post->post_type,
			$post_id,
			array(
				'title' => $post->post_title,
				'status' => $post->post_status,
			),
			null,
			array(
				'post_type' => $post->post_type,
			)
		);
	}


	/**
	 * Log post moved to trash.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public function log_post_trashed( $post_id ) {
		$post = get_post( $post_id );

		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		ActivityLogger::log(
			'trashed',
			$post->post_type,
			$post_id,
			array(
				'status' => $post->post_status,
			),
			array(
				'status' => 'trash',
			),
			array(
				'post_type' => $post->post_type,
			)
		);
	}


	/**
	 * Log post restored from trash.
	 *
	 * @since 2.0.0
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public function log_post_restored( $post_id ) {
		$post = get_post( $post_id );

		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		ActivityLogger::log(
			'restored',
			$post->post_type,
			$post_id,
			array(
				'status' => 'trash',
			),
			array(
				'status' => $post->post_status,
			),
			array(
				'post_type' => $post->post_type,
			)
		);
	}


	/**
	 * Log user creation.
	 *
	 * @since 2.0.0
	 * @param int $user_id User ID.
	 * @return void
	 */
	public function log_user_created( $user_id ) {
		$user = get_userdata( $user_id );

		if ( ! $user instanceof \WP_User ) {
			return;
		}

		ActivityLogger::log(
			'created',
			'user',
			$user_id,
			null,
			array(
				'username' => $user->user_login,
				'email' => $user->user_email,
				'display_name' => $user->display_name,
			)
		);
	}


	/**
	 * Log user update.
	 *
	 * @since 2.0.0
	 * @param int      $user_id User ID.
	 * @param \WP_User $old_user_data User object before update.
	 * @return void
	 */
	public function log_user_updated( $user_id, $old_user_data ) {
		$user = get_userdata( $user_id );

		if ( ! $user instanceof \WP_User || ! $old_user_data instanceof \WP_User ) {
			return;
		}

		$old_value = array();
		$new_value = array();

		if ( $old_user_data->user_email !== $user->user_email ) {
			$old_value['email'] = $old_user_data->user_email;
			$new_value['email'] = $user->user_email;
		}

		if ( $old_user_data->display_name !== $user->display_name ) {
			$old_value['display_name'] = $old_user_data->display_name;
			$new_value['display_name'] = $user->display_name;
		}

		if ( empty( $old_value ) && empty( $new_value ) ) {
			return;
		}

		ActivityLogger::log(
			'updated',
			'user',
			$user_id,
			$old_value,
			$new_value
		);
	}


	/**
	 * Log user deletion.
	 *
	 * @since 2.0.0
	 * @param int $user_id User ID.
	 * @return void
	 */
	public function log_user_deleted( $user_id ) {
		ActivityLogger::log(
			'deleted',
			'user',
			$user_id,
			null,
			null
		);
	}


	/**
	 * Log user role change.
	 *
	 * @since 2.0.0
	 * @param int    $user_id User ID.
	 * @param string $role New role.
	 * @param array  $old_roles Old roles.
	 * @return void
	 */
	public function log_user_role_changed( $user_id, $role, $old_roles ) {
		ActivityLogger::log(
			'role_changed',
			'user',
			$user_id,
			array(
				'roles' => is_array( $old_roles ) ? $old_roles : array(),
			),
			array(
				'role' => $role,
			),
			array(
				'action_type' => 'role_change',
			)
		);
	}


	/**
	 * Log comment creation.
	 *
	 * @since 2.0.0
	 * @param int         $comment_id Comment ID.
	 * @param \WP_Comment $comment Comment object.
	 * @return void
	 */
	public function log_comment_created( $comment_id, $comment ) {
		if ( ! $comment instanceof \WP_Comment ) {
			return;
		}

		ActivityLogger::log(
			'created',
			'comment',
			$comment_id,
			null,
			array(
				'author' => $comment->comment_author,
				'status' => $comment->comment_approved,
				'post_id' => $comment->comment_post_ID,
			),
			array(
				'post_id' => $comment->comment_post_ID,
			)
		);
	}


	/**
	 * Log comment update.
	 *
	 * @since 2.0.0
	 * @param int   $comment_id Comment ID.
	 * @param array $data Comment data.
	 * @return void
	 */
	public function log_comment_updated( $comment_id, $data ) {
		$comment = get_comment( $comment_id );

		if ( ! $comment instanceof \WP_Comment || ! is_array( $data ) ) {
			return;
		}

		$old_value = array();
		$new_value = array();

		if ( isset( $data['comment_content'] ) && $data['comment_content'] !== $comment->comment_content ) {
			$old_value['content'] = $this->truncate_text( $comment->comment_content );
			$new_value['content'] = $this->truncate_text( $data['comment_content'] );
		}

		if ( empty( $old_value ) && empty( $new_value ) ) {
			return;
		}

		ActivityLogger::log(
			'updated',
			'comment',
			$comment_id,
			$old_value,
			$new_value,
			array(
				'post_id' => $comment->comment_post_ID,
			)
		);
	}


	/**
	 * Log comment deletion.
	 *
	 * @since 2.0.0
	 * @param int         $comment_id Comment ID.
	 * @param \WP_Comment $comment Comment object.
	 * @return void
	 */
	public function log_comment_deleted( $comment_id, $comment ) {
		if ( ! $comment instanceof \WP_Comment ) {
			return;
		}

		ActivityLogger::log(
			'deleted',
			'comment',
			$comment_id,
			array(
				'author' => $comment->comment_author,
				'post_id' => $comment->comment_post_ID,
			),
			null,
			array(
				'post_id' => $comment->comment_post_ID,
			)
		);
	}


	/**
	 * Log comment status change.
	 *
	 * @since 2.0.0
	 * @param int        $comment_id Comment ID.
	 * @param string|int $status New status.
	 * @return void
	 */
	public function log_comment_status_changed( $comment_id, $status ) {
		$comment = get_comment( $comment_id );

		if ( ! $comment instanceof \WP_Comment ) {
			return;
		}

		ActivityLogger::log(
			'status_changed',
			'comment',
			$comment_id,
			array(
				'status' => $comment->comment_approved,
			),
			array(
				'status' => $status,
			),
			array(
				'post_id' => $comment->comment_post_ID,
			)
		);
	}


	/**
	 * Log plugin activation.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file.
	 * @param bool   $network_wide Whether activation is network wide.
	 * @return void
	 */
	public function log_plugin_activated( $plugin, $network_wide ) {
		ActivityLogger::log(
			'activated',
			'plugin',
			null,
			null,
			array(
				'plugin' => $plugin,
			),
			array(
				'network_wide' => (bool) $network_wide,
			)
		);
	}


	/**
	 * Log plugin deactivation.
	 *
	 * @since 2.0.0
	 * @param string $plugin Plugin file.
	 * @param bool   $network_wide Whether deactivation is network wide.
	 * @return void
	 */
	public function log_plugin_deactivated( $plugin, $network_wide ) {
		ActivityLogger::log(
			'deactivated',
			'plugin',
			null,
			null,
			array(
				'plugin' => $plugin,
			),
			array(
				'network_wide' => (bool) $network_wide,
			)
		);
	}


	/**
	 * Log plugin installation.
	 *
	 * @since 2.0.0
	 * @param \WP_Upgrader $upgrader Upgrader instance.
	 * @param array        $hook_extra Extra hook arguments.
	 * @return void
	 */
	public function log_plugin_installed( $upgrader, $hook_extra ) {
		if ( ! is_array( $hook_extra ) ) {
			return;
		}

		if ( ! isset( $hook_extra['type'] ) || 'plugin' !== $hook_extra['type'] ) {
			return;
		}

		if ( ! isset( $hook_extra['action'] ) || 'install' !== $hook_extra['action'] ) {
			return;
		}

		$plugin = isset( $hook_extra['plugin'] ) ? $hook_extra['plugin'] : 'unknown';

		ActivityLogger::log(
			'installed',
			'plugin',
			null,
			null,
			array(
				'plugin' => $plugin,
			)
		);
	}


	/**
	 * Log plugin deletion.
	 *
	 * @since 2.0.0
	 * @param string $plugin_file Plugin file path.
	 * @param bool   $deleted Whether deletion was successful.
	 * @return void
	 */
	public function log_plugin_deleted( $plugin_file, $deleted = true ) {
		if ( ! $deleted ) {
			return;
		}

		ActivityLogger::log(
			'deleted',
			'plugin',
			null,
			null,
			array(
				'plugin' => $plugin_file,
			)
		);
	}


	/**
	 * Log option update.
	 *
	 * @since 2.0.0
	 * @param string $option_name Option name.
	 * @param mixed  $old_value Old value.
	 * @param mixed  $value New value.
	 * @return void
	 */
	public function log_option_updated( $option_name, $old_value, $value ) {
		if ( $this->should_skip_option( $option_name ) ) {
			return;
		}

		if ( false === strpos( $option_name, 'flexify-dashboard' ) && false === strpos( $option_name, 'theme_mods' ) ) {
			return;
		}

		ActivityLogger::log(
			'updated',
			'option',
			null,
			$this->normalize_logged_value( $old_value ),
			$this->normalize_logged_value( $value ),
			array(
				'option_name' => $option_name,
			)
		);
	}


	/**
	 * Log media upload.
	 *
	 * @since 2.0.0
	 * @param int $attachment_id Attachment ID.
	 * @return void
	 */
	public function log_media_uploaded( $attachment_id ) {
		$attachment = get_post( $attachment_id );

		if ( ! $attachment instanceof \WP_Post ) {
			return;
		}

		$attached_file = get_attached_file( $attachment_id );

		ActivityLogger::log(
			'uploaded',
			'media',
			$attachment_id,
			null,
			array(
				'title' => $attachment->post_title,
				'filename' => $attached_file ? basename( $attached_file ) : '',
				'mime_type' => get_post_mime_type( $attachment_id ),
			)
		);
	}


	/**
	 * Log media deletion.
	 *
	 * @since 2.0.0
	 * @param int $attachment_id Attachment ID.
	 * @return void
	 */
	public function log_media_deleted( $attachment_id ) {
		$attachment = get_post( $attachment_id );

		if ( ! $attachment instanceof \WP_Post ) {
			return;
		}

		$attached_file = get_attached_file( $attachment_id );

		ActivityLogger::log(
			'deleted',
			'media',
			$attachment_id,
			array(
				'title' => $attachment->post_title,
				'filename' => $attached_file ? basename( $attached_file ) : '',
			),
			null
		);
	}


	/**
	 * Log user login.
	 *
	 * @since 2.0.0
	 * @param string   $user_login User login.
	 * @param \WP_User $user User object.
	 * @return void
	 */
	public function log_user_login( $user_login, $user ) {
		if ( ! $user instanceof \WP_User ) {
			return;
		}

		ActivityLogger::log(
			'login',
			'user',
			$user->ID,
			null,
			null,
			array(
				'username' => $user_login,
			)
		);
	}


	/**
	 * Log user logout.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function log_user_logout() {
		$user_id = get_current_user_id();

		if ( empty( $user_id ) ) {
			return;
		}

		ActivityLogger::log(
			'logout',
			'user',
			$user_id,
			null,
			null
		);
	}


	/**
	 * Check if the option should be skipped.
	 *
	 * @since 2.0.0
	 * @param string $option_name Option name.
	 * @return bool
	 */
	private function should_skip_option( $option_name ) {
		foreach ( $this->skip_options as $skip_option ) {
			if ( false !== strpos( $option_name, $skip_option ) ) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Normalize a value before logging.
	 *
	 * @since 2.0.0
	 * @param mixed $value Value to normalize.
	 * @return array
	 */
	private function normalize_logged_value( $value ) {
		if ( is_array( $value ) ) {
			return $value;
		}

		return array(
			'value' => $value,
		);
	}


	/**
	 * Truncate text for log storage.
	 *
	 * @since 2.0.0
	 * @param string $text Text to truncate.
	 * @param int    $length Maximum text length.
	 * @return string
	 */
	private function truncate_text( $text, $length = 100 ) {
		$text = is_string( $text ) ? $text : '';

		if ( strlen( $text ) <= $length ) {
			return $text;
		}

		return substr( $text, 0, $length ) . '...';
	}
}