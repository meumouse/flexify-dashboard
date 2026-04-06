<?php

namespace MeuMouse\Flexify_Dashboard\Rest;

use WP_Error;
use WP_Post;
use WP_REST_Request;
use WP_REST_Response;

defined('ABSPATH') || exit;

/**
 * Class MediaReplace
 *
 * Handles media file replacement while keeping the same attachment ID
 * and regenerating metadata when necessary.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Rest
 * @author MeuMouse.com
 */
class MediaReplace {
	/**
	 * Allowed file extensions for replacement.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $allowed_types = array(
		'jpg',
		'jpeg',
		'png',
		'gif',
		'webp',
		'svg',
		'mp4',
		'mov',
		'avi',
		'mp3',
		'wav',
		'pdf',
		'woff2',
		'woff',
		'ttf',
		'otf',
		'eot',
	);

	/**
	 * MIME to extension fallback map.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private static $mime_to_ext = array(
		'image/jpeg'                    => 'jpg',
		'image/jpg'                     => 'jpg',
		'image/png'                     => 'png',
		'image/gif'                     => 'gif',
		'image/webp'                    => 'webp',
		'image/svg+xml'                 => 'svg',
		'video/mp4'                     => 'mp4',
		'video/quicktime'               => 'mov',
		'video/x-msvideo'               => 'avi',
		'audio/mpeg'                    => 'mp3',
		'audio/wav'                     => 'wav',
		'application/pdf'               => 'pdf',
		'font/woff2'                    => 'woff2',
		'font/woff'                     => 'woff',
		'font/ttf'                      => 'ttf',
		'font/otf'                      => 'otf',
		'application/font-woff2'        => 'woff2',
		'application/font-woff'         => 'woff',
		'application/x-font-ttf'        => 'ttf',
		'application/x-font-otf'        => 'otf',
		'application/vnd.ms-fontobject' => 'eot',
	);

	/**
	 * Constructor.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_custom_endpoints' ) );
	}


	/**
	 * Register custom REST API endpoints.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_custom_endpoints() {
		register_rest_route( 'flexify-dashboard/v1', '/media/replace', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'replace_media_file' ),
			'permission_callback' => array( $this, 'check_permissions' ),
			'accept_file_uploads' => true,
		) );
	}


	/**
	 * Check if the user has permission to replace media files.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request|null $request REST request object.
	 * @return bool|WP_Error
	 */
	public function check_permissions( $request = null ) {
		if ( ! $request instanceof WP_REST_Request ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'Invalid request.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		return RestPermissionChecker::check_permissions( $request, 'upload_files' );
	}


	/**
	 * Replace media file while keeping the same attachment ID.
	 *
	 * @since 2.0.0
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function replace_media_file( WP_REST_Request $request ) {
		$this->include_media_dependencies();

		$media_id = absint( $request->get_param( 'media_id' ) );

		if ( empty( $media_id ) ) {
			return new WP_Error(
				'missing_media_id',
				__( 'Media ID is required.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$existing_media = get_post( $media_id );

		if ( ! $existing_media instanceof WP_Post || 'attachment' !== $existing_media->post_type ) {
			return new WP_Error(
				'media_not_found',
				__( 'Media item not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		if ( ! current_user_can( 'edit_post', $media_id ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to edit this media item.', 'flexify-dashboard' ),
				array( 'status' => 403 )
			);
		}

		$files = $request->get_file_params();

		if ( empty( $files['file'] ) || ! is_array( $files['file'] ) ) {
			return new WP_Error(
				'no_file_uploaded',
				__( 'No file was uploaded.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$uploaded_file = $files['file'];
		$validation    = $this->validate_uploaded_file( $uploaded_file );

		if ( is_wp_error( $validation ) ) {
			return $validation;
		}

		$file_extension     = $validation['extension'];
		$sanitized_filename = $validation['filename'];
		$existing_file_path = get_attached_file( $media_id );

		if ( empty( $existing_file_path ) || ! file_exists( $existing_file_path ) ) {
			return new WP_Error(
				'existing_file_not_found',
				__( 'Original file not found.', 'flexify-dashboard' ),
				array( 'status' => 404 )
			);
		}

		$new_file_path = $this->generate_new_file_path( $existing_file_path, $sanitized_filename, $file_extension );

		if ( is_wp_error( $new_file_path ) ) {
			return $new_file_path;
		}

		$old_metadata = wp_get_attachment_metadata( $media_id );

		if ( ! move_uploaded_file( $uploaded_file['tmp_name'], $new_file_path ) ) {
			return new WP_Error(
				'file_move_failed',
				__( 'Failed to move uploaded file.', 'flexify-dashboard' ),
				array( 'status' => 500 )
			);
		}

		$updated_post = wp_update_post( array(
			'ID'             => $media_id,
			'post_mime_type' => sanitize_mime_type( $uploaded_file['type'] ),
		), true );

		if ( is_wp_error( $updated_post ) ) {
			$this->delete_file_if_exists( $new_file_path );
			return $updated_post;
		}

		update_attached_file( $media_id, $new_file_path );

		$attachment_metadata = wp_generate_attachment_metadata( $media_id, $new_file_path );
		wp_update_attachment_metadata( $media_id, $attachment_metadata );

		$this->delete_old_thumbnails( $existing_file_path, $old_metadata );

		if ( realpath( $existing_file_path ) !== realpath( $new_file_path ) ) {
			$this->delete_file_if_exists( $existing_file_path );
		}

		if ( 0 === strpos( sanitize_mime_type( $uploaded_file['type'] ), 'image/' ) ) {
			$regenerated_metadata = wp_generate_attachment_metadata( $media_id, $new_file_path );
			wp_update_attachment_metadata( $media_id, $regenerated_metadata );
		}

		return new WP_REST_Response( array(
			'success' => true,
			'data'    => $this->get_updated_media_data( $media_id ),
			'message' => __( 'File replaced successfully.', 'flexify-dashboard' ),
		), 200 );
	}


	/**
	 * Include required WordPress media files.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function include_media_dependencies() {
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
	}


	/**
	 * Validate uploaded file before replacement.
	 *
	 * @since 2.0.0
	 * @param array $uploaded_file Uploaded file data.
	 * @return array|WP_Error
	 */
	private function validate_uploaded_file( array $uploaded_file ) {
		if ( ! isset( $uploaded_file['error'] ) || UPLOAD_ERR_OK !== (int) $uploaded_file['error'] ) {
			error_log( 'Media replace upload error: ' . ( isset( $uploaded_file['error'] ) ? (int) $uploaded_file['error'] : -1 ) );

			return new WP_Error(
				'upload_error',
				__( 'File upload failed. Please try again.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$uploaded_name = isset( $uploaded_file['name'] ) ? sanitize_file_name( $uploaded_file['name'] ) : '';
		$uploaded_type = isset( $uploaded_file['type'] ) ? sanitize_mime_type( $uploaded_file['type'] ) : '';
		$tmp_name      = isset( $uploaded_file['tmp_name'] ) ? $uploaded_file['tmp_name'] : '';

		if ( empty( $uploaded_name ) || empty( $tmp_name ) ) {
			return new WP_Error(
				'invalid_file_upload',
				__( 'Invalid uploaded file.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$file_type      = wp_check_filetype( $uploaded_name );
		$file_extension = ! empty( $file_type['ext'] ) ? $file_type['ext'] : $this->get_extension_from_mime( $uploaded_type );

		if ( empty( $file_extension ) || ! in_array( $file_extension, self::$allowed_types, true ) ) {
			return new WP_Error(
				'invalid_file_type',
				__( 'File type not allowed.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		if ( ! $this->validate_real_file_type( $tmp_name, $file_extension ) ) {
			return new WP_Error(
				'invalid_file_content',
				__( 'File content does not match file type.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$file_info     = pathinfo( $uploaded_name );
		$base_filename = isset( $file_info['filename'] ) ? (string) $file_info['filename'] : '';

		if ( $this->has_dangerous_double_extension( $base_filename ) ) {
			return new WP_Error(
				'invalid_file_name',
				__( 'File name contains invalid characters.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$base_filename = ! empty( $base_filename ) ? sanitize_file_name( $base_filename ) : 'file';

		return array(
			'extension' => $file_extension,
			'filename'  => $base_filename,
		);
	}


	/**
	 * Get file extension from MIME type fallback map.
	 *
	 * @since 2.0.0
	 * @param string $mime_type File MIME type.
	 * @return string
	 */
	private function get_extension_from_mime( string $mime_type ): string {
		return isset( self::$mime_to_ext[ $mime_type ] ) ? self::$mime_to_ext[ $mime_type ] : '';
	}


	/**
	 * Validate real file MIME type against the expected extension.
	 *
	 * @since 2.0.0
	 * @param string $tmp_name       Temporary file path.
	 * @param string $file_extension File extension.
	 * @return bool
	 */
	private function validate_real_file_type( string $tmp_name, string $file_extension ): bool {
		if ( ! file_exists( $tmp_name ) || ! function_exists( 'mime_content_type' ) ) {
			return true;
		}

		$real_mime     = mime_content_type( $tmp_name );
		$allowed_mimes = wp_get_mime_types();
		$expected      = array();

		foreach ( $allowed_mimes as $extensions => $mime ) {
			$extension_group = explode( '|', $extensions );

			if ( in_array( $file_extension, $extension_group, true ) ) {
				$expected[] = $mime;
			}
		}

		if ( empty( $expected ) ) {
			return true;
		}

		return in_array( $real_mime, $expected, true );
	}


	/**
	 * Check for dangerous double extensions.
	 *
	 * @since 2.0.0
	 * @param string $base_filename Base file name.
	 * @return bool
	 */
	private function has_dangerous_double_extension( string $base_filename ): bool {
		return (bool) preg_match( '/\.(php|phtml|php3|php4|php5|phps|phar|pl|py|rb|sh|bash|exe|dll|bat|cmd|com|scr|vbs|js|jar|war|jsp|asp|aspx)$/i', $base_filename );
	}


	/**
	 * Generate a safe file path for the new uploaded file.
	 *
	 * @since 2.0.0
	 * @param string $existing_file_path Existing attachment file path.
	 * @param string $base_filename      Sanitized base filename.
	 * @param string $file_extension     Target file extension.
	 * @return string|WP_Error
	 */
	private function generate_new_file_path( string $existing_file_path, string $base_filename, string $file_extension ) {
		$upload_dir         = wp_upload_dir();
		$existing_file_dir  = dirname( $existing_file_path );
		$new_filename       = sanitize_file_name( $base_filename . '.' . $file_extension );
		$new_file_path      = trailingslashit( $existing_file_dir ) . $new_filename;
		$real_target_dir    = realpath( dirname( $new_file_path ) );
		$real_uploads_based = realpath( $upload_dir['basedir'] );

		if ( false === $real_target_dir || false === $real_uploads_based || 0 !== strpos( $real_target_dir, $real_uploads_based ) ) {
			return new WP_Error(
				'invalid_path',
				__( 'Invalid file path.', 'flexify-dashboard' ),
				array( 'status' => 400 )
			);
		}

		$counter = 1;

		while ( file_exists( $new_file_path ) ) {
			$new_filename  = sanitize_file_name( $base_filename . '-' . $counter . '.' . $file_extension );
			$new_file_path = trailingslashit( $existing_file_dir ) . $new_filename;
			$counter++;
		}

		return $new_file_path;
	}


	/**
	 * Delete old generated thumbnails from previous metadata.
	 *
	 * @since 2.0.0
	 * @param string     $existing_file_path Existing attachment file path.
	 * @param array|bool $old_metadata       Old attachment metadata.
	 * @return void
	 */
	private function delete_old_thumbnails( string $existing_file_path, $old_metadata ) {
		if ( empty( $old_metadata ) || ! is_array( $old_metadata ) || empty( $old_metadata['sizes'] ) || ! is_array( $old_metadata['sizes'] ) ) {
			return;
		}

		$old_file_dir = dirname( $existing_file_path );

		foreach ( $old_metadata['sizes'] as $size_data ) {
			if ( empty( $size_data['file'] ) ) {
				continue;
			}

			$old_thumbnail_path = trailingslashit( $old_file_dir ) . $size_data['file'];
			$this->delete_file_if_exists( $old_thumbnail_path );
		}
	}


	/**
	 * Delete a file if it exists.
	 *
	 * @since 2.0.0
	 * @param string $file_path File path.
	 * @return void
	 */
	private function delete_file_if_exists( string $file_path ) {
		if ( file_exists( $file_path ) ) {
			wp_delete_file( $file_path );
		}
	}


	/**
	 * Get updated media response data.
	 *
	 * @since 2.0.0
	 * @param int $media_id Attachment ID.
	 * @return array
	 */
	private function get_updated_media_data( int $media_id ): array {
		$updated_media = get_post( $media_id );

		if ( ! $updated_media instanceof WP_Post ) {
			return array();
		}

		return array(
			'id'            => $updated_media->ID,
			'title'         => $updated_media->post_title,
			'source_url'    => wp_get_attachment_url( $media_id ),
			'mime_type'     => $updated_media->post_mime_type,
			'media_details' => wp_get_attachment_metadata( $media_id ),
		);
	}
}