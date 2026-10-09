<?php

namespace MeuMouse\Flexify_Dashboard\Security;

use MeuMouse\Flexify_Dashboard\Options\Settings;
use WP_Admin_Bar;

defined('ABSPATH') || exit;

/**
 * Class MaintenanceMode
 *
 * Closes the public site while it is being worked on, and leaves it open to the people working
 * on it.
 *
 * Visitors get a 503 with Retry-After, which tells search engines the site is coming back
 * rather than gone, and a page saying so. Anyone who can edit posts sees the site as usual,
 * with a reminder in the toolbar that nobody else does.
 *
 * @since 4.2.0
 * @package MeuMouse\Flexify_Dashboard\Security
 * @author MeuMouse.com
 */
class MaintenanceMode {

	/**
	 * Seconds a visitor is told to wait before trying again.
	 *
	 * @since 4.2.0
	 * @var int
	 */
	private const RETRY_AFTER = 3600;


	/**
	 * Hook into the request.
	 *
	 * `template_redirect` comes after the login page, which the plugin serves on `init` and
	 * WordPress on wp-login.php, so the way back in is never closed.
	 *
	 * @since 4.2.0
	 * @return void
	 */
	public function __construct() {
		add_action( 'template_redirect', array( $this, 'maybe_close_site' ), 0 );
		add_action( 'admin_bar_menu', array( $this, 'add_toolbar_reminder' ), 100 );
	}


	/**
	 * Whether the site is closed for this request.
	 *
	 * @since 4.2.0
	 * @return bool
	 */
	private function applies() {
		if ( ! Settings::is_enabled( 'maintenance_mode' ) ) {
			return false;
		}

		if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return false;
		}

		/**
		 * Who still sees the site while it is closed.
		 *
		 * @since 4.2.0
		 * @param string $capability Capability that lets a user through. Default edit_posts.
		 */
		$capability = apply_filters( 'flexify-dashboard/maintenance/bypass_capability', 'edit_posts' );

		return ! current_user_can( $capability );
	}


	/**
	 * Answer the visitor with the maintenance page and stop.
	 *
	 * @since 4.2.0
	 * @return void
	 */
	public function maybe_close_site() {
		if ( ! $this->applies() ) {
			return;
		}

		$title = Settings::get_setting( 'maintenance_title', '' );
		$message = Settings::get_setting( 'maintenance_message', '' );
		$logo = Settings::get_setting( 'logo', '' );

		$title = '' !== trim( (string) $title ) ? (string) $title : __( 'We will be back soon', 'flexify-dashboard' );
		$message = '' !== trim( (string) $message ) ? (string) $message : __( 'The site is being updated. Thank you for your patience.', 'flexify-dashboard' );

		status_header( 503 );
		nocache_headers();
		header( 'Retry-After: ' . self::RETRY_AFTER );
		header( 'Content-Type: text/html; charset=' . get_bloginfo( 'charset' ) );

		$this->render( $title, $message, $logo );

		exit;
	}


	/**
	 * The page itself: standalone, so a theme that is half-way through an update cannot break it.
	 *
	 * @since 4.2.0
	 * @param string $title Heading.
	 * @param string $message Text under it.
	 * @param string $logo Logo URL from the settings, or empty.
	 * @return void
	 */
	private function render( $title, $message, $logo ) {
		$site_name = get_bloginfo( 'name' );
		?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex">
	<title><?php echo esc_html( $title . ' · ' . $site_name ); ?></title>
	<style>
		:root { color-scheme: light dark; --accent: #008aff; }
		* { box-sizing: border-box; }
		body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f9fafb; color: #1d2939; font-family: Outfit, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
		main { width: 100%; max-width: 480px; text-align: center; }
		.logo { max-height: 48px; max-width: 200px; margin-bottom: 32px; }
		.icon { width: 72px; height: 72px; margin: 0 auto 24px; display: grid; place-items: center; border-radius: 9999px; background: rgb(0 138 255 / 0.1); color: var(--accent); }
		h1 { margin: 0 0 12px; font-size: 30px; line-height: 38px; font-weight: 600; }
		p { margin: 0; font-size: 16px; line-height: 24px; color: #667085; }
		footer { margin-top: 40px; font-size: 14px; color: #98a2b3; }
		@media (prefers-color-scheme: dark) {
			body { background: #101828; color: rgb(255 255 255 / 0.9); }
			p { color: #98a2b3; }
			footer { color: #667085; }
		}
	</style>
</head>
<body>
	<main>
		<?php if ( $logo ) : ?>
			<img class="logo" src="<?php echo esc_url( $logo ); ?>" alt="<?php echo esc_attr( $site_name ); ?>">
		<?php endif; ?>
		<div class="icon" aria-hidden="true">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
		</div>
		<h1><?php echo esc_html( $title ); ?></h1>
		<p><?php echo nl2br( esc_html( $message ) ); ?></p>
		<footer>&copy; <?php echo esc_html( gmdate( 'Y' ) . ' ' . $site_name ); ?></footer>
	</main>
</body>
</html>
		<?php
	}


	/**
	 * Remind whoever is let through that visitors see the maintenance page.
	 *
	 * @since 4.2.0
	 * @param WP_Admin_Bar $admin_bar Toolbar.
	 * @return void
	 */
	public function add_toolbar_reminder( $admin_bar ) {
		if ( ! Settings::is_enabled( 'maintenance_mode' ) || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$admin_bar->add_node( array(
			'id' => 'flexify-dashboard-maintenance',
			'title' => esc_html__( 'Maintenance mode is on', 'flexify-dashboard' ),
			'href' => esc_url( admin_url( 'admin.php?page=flexify-dashboard-settings#/?category=general' ) ),
			'meta' => array( 'class' => 'flexify-dashboard-maintenance-flag' ),
		) );
	}
}
