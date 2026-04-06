<?php

namespace MeuMouse\Flexify_Dashboard\Analytics\Providers;

defined('ABSPATH') || exit;

/**
 * Interface AnalyticsProviderInterface
 *
 * Define the contract for analytics data providers.
 * All analytics providers must implement this interface.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Analytics\Providers
 * @author MeuMouse.com
 */
interface AnalyticsProviderInterface {
    
	/**
	 * Get overview statistics for the specified date range.
	 *
	 * @since 2.0.0
	 * @param string      $start_date Start date in ISO 8601 format.
	 * @param string      $end_date End date in ISO 8601 format.
	 * @param string|null $page_url Optional page URL filter.
	 * @return array Overview statistics.
	 */
	public function getOverview( string $start_date, string $end_date, ?string $page_url = null ): array;


	/**
	 * Get page-level statistics.
	 *
	 * @since 2.0.0
	 * @param string      $start_date Start date in ISO 8601 format.
	 * @param string      $end_date End date in ISO 8601 format.
	 * @param string|null $page_url Optional page URL filter.
	 * @return array Page statistics data.
	 */
	public function getPages( string $start_date, string $end_date, ?string $page_url = null ): array;


	/**
	 * Get referrer statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array Referrer statistics data.
	 */
	public function getReferrers( string $start_date, string $end_date ): array;


	/**
	 * Get device statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array Device statistics data.
	 */
	public function getDevices( string $start_date, string $end_date ): array;


	/**
	 * Get geographic statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array Geographic statistics data.
	 */
	public function getGeo( string $start_date, string $end_date ): array;


	/**
	 * Get events statistics.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @return array Event statistics data.
	 */
	public function getEvents( string $start_date, string $end_date ): array;


	/**
	 * Get chart data for visualization.
	 *
	 * @since 2.0.0
	 * @param string $start_date Start date in ISO 8601 format.
	 * @param string $end_date End date in ISO 8601 format.
	 * @param string $chart_type Type of chart data.
	 * @return array Chart data for visualization.
	 */
	public function getChart( string $start_date, string $end_date, string $chart_type = 'pageviews' ): array;


	/**
	 * Get count of currently active users.
	 *
	 * @since 2.0.0
	 * @param string|null $timezone Browser timezone.
	 * @param string|null $browser_time Browser time in ISO format.
	 * @return array Active users data.
	 */
	public function getActiveUsers( ?string $timezone = null, ?string $browser_time = null ): array;


	/**
	 * Check if the provider is properly configured and ready to use.
	 *
	 * @since 2.0.0
	 * @return bool True if provider is configured, false otherwise.
	 */
	public function isConfigured(): bool;


	/**
	 * Get the provider identifier.
	 *
	 * @since 2.0.0
	 * @return string Provider identifier.
	 */
	public function getIdentifier(): string;


	/**
	 * Get the provider display name.
	 *
	 * @since 2.0.0
	 * @return string Human-readable provider name.
	 */
	public function getDisplayName(): string;
}