<?php

namespace MeuMouse\Flexify_Dashboard\Utility;

defined('ABSPATH') || exit;

/**
 * Class Encryption
 *
 * Provide encryption and decryption helpers using OpenSSL.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Utility
 * @author MeuMouse.com
 */
class Encryption {

	/**
	 * Cipher method used for encryption.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const METHOD = 'aes-256-ctr';

	/**
	 * Decrypt an encrypted value.
	 *
	 * @since 2.0.0
	 * @param string $raw_value Encrypted value.
	 * @return string|false
	 */
	public static function decrypt( $raw_value ) {
		if ( ! self::is_openssl_available() ) {
			return $raw_value;
		}

		if ( empty( $raw_value ) || ! is_string( $raw_value ) ) {
			return false;
		}

		$decoded_value = base64_decode( $raw_value, true );

		if ( false === $decoded_value ) {
			return false;
		}

		$iv_length = openssl_cipher_iv_length( self::METHOD );

		if ( empty( $iv_length ) || strlen( $decoded_value ) <= $iv_length ) {
			return false;
		}

		$iv              = substr( $decoded_value, 0, $iv_length );
		$encrypted_value = substr( $decoded_value, $iv_length );

		$value = openssl_decrypt( $encrypted_value, self::METHOD, LOGGED_IN_KEY, 0, $iv );

		if ( false === $value ) {
			return false;
		}

		$salt_length = strlen( LOGGED_IN_SALT );

		if ( substr( $value, -$salt_length ) !== LOGGED_IN_SALT ) {
			return false;
		}

		return substr( $value, 0, -$salt_length );
	}


	/**
	 * Encrypt a value.
	 *
	 * @since 2.0.0
	 * @param string $value Plain value.
	 * @return string|false
	 */
	public static function encrypt( $value ) {
		if ( ! self::is_openssl_available() ) {
			return $value;
		}

		if ( ! is_string( $value ) || '' === $value ) {
			return false;
		}

		if ( self::is_encrypted( $value ) ) {
			return $value;
		}

		$iv_length = openssl_cipher_iv_length( self::METHOD );

		if ( empty( $iv_length ) ) {
			return false;
		}

		try {
			$iv = random_bytes( $iv_length );
		} catch ( \Exception $e ) {
			error_log( 'Encryption IV generation failed: ' . $e->getMessage() );

			return false;
		}

		$encrypted_value = openssl_encrypt( $value . LOGGED_IN_SALT, self::METHOD, LOGGED_IN_KEY, 0, $iv );

		if ( false === $encrypted_value ) {
			return false;
		}

		return base64_encode( $iv . $encrypted_value );
	}


	/**
	 * Check if a value appears to be encrypted by this helper.
	 *
	 * @since 2.0.0
	 * @param string $value Value to inspect.
	 * @return bool
	 */
	public static function is_encrypted( $value ) {
		if ( ! self::is_openssl_available() ) {
			return false;
		}

		if ( empty( $value ) || ! is_string( $value ) ) {
			return false;
		}

		$decoded_value = base64_decode( $value, true );

		if ( false === $decoded_value ) {
			return false;
		}

		$iv_length = openssl_cipher_iv_length( self::METHOD );

		if ( empty( $iv_length ) || strlen( $decoded_value ) <= $iv_length ) {
			return false;
		}

		return false !== self::decrypt( $value );
	}


	/**
	 * Backward-compatible alias for encrypted value checks.
	 *
	 * @since 2.0.0
	 * @param string $value Value to inspect.
	 * @return bool
	 */
	public static function isEncrypted( $value ) {
		return self::is_encrypted( $value );
	}


	/**
	 * Check if the OpenSSL extension is available.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	private static function is_openssl_available() {
		return extension_loaded( 'openssl' );
	}
}