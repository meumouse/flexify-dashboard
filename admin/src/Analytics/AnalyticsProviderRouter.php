<?php

namespace MeuMouse\Flexify_Dashboard\Analytics;

use MeuMouse\Flexify_Dashboard\Analytics\Providers\AnalyticsProviderInterface;
use MeuMouse\Flexify_Dashboard\Analytics\Providers\flexifyDashboardAnalyticsProvider;
use MeuMouse\Flexify_Dashboard\Analytics\Providers\GoogleAnalyticsProvider;

// Prevent direct access to this file
defined("ABSPATH") || exit();

/**
 * Class AnalyticsProviderRouter
 * 
 * Routes analytics requests to the appropriate provider based on user settings.
 * 
 * @package UiXpress\Analytics
 * @since 1.0.0
 */
class AnalyticsProviderRouter
{
    /**
     * @var AnalyticsProviderInterface|null Cached provider instance
     */
    private static ?AnalyticsProviderInterface $provider = null;

    /**
     * @var array Available provider classes
     */
    private static array $providers = [
        'flexify-dashboard' => flexifyDashboardAnalyticsProvider::class,
        'google_analytics' => GoogleAnalyticsProvider::class,
    ];

    /**
     * Get the active analytics provider
     * 
     * @return AnalyticsProviderInterface The active provider instance
     */
    public static function getProvider(): AnalyticsProviderInterface
    {
        if (self::$provider !== null) {
            return self::$provider;
        }

        $provider_id = self::getActiveProviderId();
        self::$provider = self::createProvider($provider_id);

        return self::$provider;
    }

    /**
     * Get a specific provider by ID
     * 
     * @param string $provider_id Provider identifier
     * @return AnalyticsProviderInterface|null Provider instance or null if not found
     */
    public static function getProviderById(string $provider_id): ?AnalyticsProviderInterface
    {
        return self::createProvider($provider_id);
    }

    /**
     * Get all available providers
     * 
     * @return array Array of provider instances
     */
    public static function getAllProviders(): array
    {
        $providers = [];
        foreach (array_keys(self::$providers) as $provider_id) {
            $provider = self::createProvider($provider_id);
            if ($provider) {
                $providers[$provider_id] = $provider;
            }
        }
        return $providers;
    }

    /**
     * Get the active provider ID from settings
     * 
     * @return string Provider identifier
     */
    public static function getActiveProviderId(): string
    {
        $settings = get_option('flexify_dashboard_settings', []);
        $provider_id = $settings['analytics_provider'] ?? 'flexify-dashboard';

        // Validate provider exists
        if (!isset(self::$providers[$provider_id])) {
            return 'flexify-dashboard';
        }

        // If Google Analytics is selected but not configured, fall back to flexifyDashboard
        if ($provider_id === 'google_analytics') {
            $ga_provider = new GoogleAnalyticsProvider();
            $is_configured = $ga_provider->isConfigured();
            if (!$is_configured) {
                return 'flexify-dashboard';
            }
        }

        return $provider_id;
    }

    /**
     * Check if a provider is available and configured
     * 
     * @param string $provider_id Provider identifier
     * @return bool True if provider is available and configured
     */
    public static function isProviderAvailable(string $provider_id): bool
    {
        $provider = self::createProvider($provider_id);
        return $provider !== null && $provider->isConfigured();
    }

    /**
     * Register a new provider
     * 
     * @param string $provider_id Provider identifier
     * @param string $provider_class Provider class name
     */
    public static function registerProvider(string $provider_id, string $provider_class): void
    {
        if (is_subclass_of($provider_class, AnalyticsProviderInterface::class)) {
            self::$providers[$provider_id] = $provider_class;
            self::$provider = null; // Reset cached provider
        }
    }

    /**
     * Clear the cached provider instance
     * 
     * Call this when settings change to ensure the correct provider is used.
     */
    public static function clearCache(): void
    {
        self::$provider = null;
    }

    /**
     * Create a provider instance
     * 
     * @param string $provider_id Provider identifier
     * @return AnalyticsProviderInterface|null Provider instance or null if not found
     */
    private static function createProvider(string $provider_id): ?AnalyticsProviderInterface
    {
        if (!isset(self::$providers[$provider_id])) {
            // Fall back to flexifyDashboard provider
            return new flexifyDashboardAnalyticsProvider();
        }

        $class = self::$providers[$provider_id];
        
        if (!class_exists($class)) {
            return new flexifyDashboardAnalyticsProvider();
        }

        return new $class();
    }

    /**
     * Get provider status information
     * 
     * @return array Status information for all providers
     */
    public static function getProvidersStatus(): array
    {
        $status = [];
        
        foreach (self::$providers as $provider_id => $class) {
            $provider = self::createProvider($provider_id);
            if ($provider) {
                $status[$provider_id] = [
                    'id' => $provider_id,
                    'name' => $provider->getDisplayName(),
                    'configured' => $provider->isConfigured(),
                    'active' => $provider_id === self::getActiveProviderId(),
                ];
            }
        }

        return $status;
    }
}
