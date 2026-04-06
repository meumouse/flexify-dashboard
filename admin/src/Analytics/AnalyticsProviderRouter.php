<?php

namespace MeuMouse\Flexify_Dashboard\Analytics;

use MeuMouse\Flexify_Dashboard\Analytics\Providers\AnalyticsProviderInterface;
use MeuMouse\Flexify_Dashboard\Analytics\Providers\flexifyDashboardAnalyticsProvider;
use MeuMouse\Flexify_Dashboard\Analytics\Providers\GoogleAnalyticsProvider;

defined('ABSPATH') || exit;

/**
 * Class AnalyticsProviderRouter
 *
 * Routes analytics requests to the appropriate provider based on plugin settings.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Analytics
 * @author MeuMouse.com
 */
class AnalyticsProviderRouter {

    /**
     * Default provider ID.
     *
     * @since 2.0.0
     * @var string
     */
    const DEFAULT_PROVIDER = 'flexify-dashboard';

    /**
     * Cached active provider instance.
     *
     * @since 2.0.0
     * @var AnalyticsProviderInterface|null
     */
    private static ?AnalyticsProviderInterface $provider = null;

    /**
     * Cached provider instances by ID.
     *
     * @since 2.0.0
     * @var array
     */
    private static array $provider_instances = array();

    /**
     * Available provider classes.
     *
     * @since 2.0.0
     * @var array
     */
    private static array $providers = array(
        'flexify-dashboard' => flexifyDashboardAnalyticsProvider::class,
        'google_analytics'  => GoogleAnalyticsProvider::class,
    );


    /**
     * Get the active analytics provider.
     *
     * @since 2.0.0
     * @return AnalyticsProviderInterface Active provider instance.
     */
    public static function get_provider(): AnalyticsProviderInterface {
        if ( self::$provider instanceof AnalyticsProviderInterface ) {
            return self::$provider;
        }

        $provider_id = self::get_active_provider_id();
        self::$provider = self::create_provider( $provider_id );

        return self::$provider;
    }


    /**
     * Get a provider instance by ID.
     *
     * @since 2.0.0
     * @param string $provider_id Provider identifier.
     * @return AnalyticsProviderInterface|null Provider instance on success. Null on failure.
     */
    public static function get_provider_by_id( string $provider_id ): ?AnalyticsProviderInterface {
        return self::create_provider( $provider_id );
    }


    /**
     * Get all available provider instances.
     *
     * @since 2.0.0
     * @return array Available providers indexed by provider ID.
     */
    public static function get_all_providers(): array {
        $providers = array();

        foreach ( array_keys( self::$providers ) as $provider_id ) {
            $provider = self::create_provider( $provider_id );

            if ( $provider instanceof AnalyticsProviderInterface ) {
                $providers[ $provider_id ] = $provider;
            }
        }

        return $providers;
    }


    /**
     * Get the active provider ID from plugin settings.
     *
     * Falls back to the default provider when the selected provider
     * does not exist or is not properly configured.
     *
     * @since 2.0.0
     * @return string Active provider identifier.
     */
    public static function get_active_provider_id(): string {
        $settings = get_option( 'flexify_dashboard_settings', array() );

        $provider_id = isset( $settings['analytics_provider'] )
            ? sanitize_text_field( $settings['analytics_provider'] )
            : self::DEFAULT_PROVIDER;

        if ( ! isset( self::$providers[ $provider_id ] ) ) {
            return self::DEFAULT_PROVIDER;
        }

        if ( 'google_analytics' === $provider_id ) {
            $ga_provider = self::create_provider( $provider_id );

            if ( ! $ga_provider instanceof AnalyticsProviderInterface || ! $ga_provider->isConfigured() ) {
                return self::DEFAULT_PROVIDER;
            }
        }

        return $provider_id;
    }


    /**
     * Check whether a provider is available and configured.
     *
     * @since 2.0.0
     * @param string $provider_id Provider identifier.
     * @return bool True if the provider exists and is configured. Otherwise false.
     */
    public static function is_provider_available( string $provider_id ): bool {
        $provider = self::create_provider( $provider_id );

        return $provider instanceof AnalyticsProviderInterface && $provider->isConfigured();
    }


    /**
     * Register a new analytics provider.
     *
     * @since 2.0.0
     * @param string $provider_id Provider identifier.
     * @param string $provider_class Provider class name.
     * @return void
     */
    public static function register_provider( string $provider_id, string $provider_class ): void {
        $provider_id = sanitize_key( $provider_id );

        if ( empty( $provider_id ) || empty( $provider_class ) ) {
            return;
        }

        if ( ! is_subclass_of( $provider_class, AnalyticsProviderInterface::class ) ) {
            return;
        }

        self::$providers[ $provider_id ] = $provider_class;
        self::clear_cache();
    }


    /**
     * Clear cached provider instances.
     *
     * Call this when settings are updated to ensure that
     * the latest provider configuration is loaded.
     *
     * @since 2.0.0
     * @return void
     */
    public static function clear_cache(): void {
        self::$provider = null;
        self::$provider_instances = array();
    }


    /**
     * Get the status information for all registered providers.
     *
     * @since 2.0.0
     * @return array Provider status data indexed by provider ID.
     */
    public static function get_providers_status(): array {
        $status = array();
        $active_provider_id = self::get_active_provider_id();

        foreach ( self::$providers as $provider_id => $provider_class ) {
            $provider = self::create_provider( $provider_id );

            if ( ! $provider instanceof AnalyticsProviderInterface ) {
                continue;
            }

            $status[ $provider_id ] = array(
                'id'         => $provider_id,
                'name'       => $provider->getDisplayName(),
                'configured' => $provider->isConfigured(),
                'active'     => $provider_id === $active_provider_id,
            );
        }

        return $status;
    }


    /**
     * Create a provider instance by ID.
     *
     * Falls back to the default provider when the requested provider
     * is not registered or its class is unavailable.
     *
     * @since 2.0.0
     * @param string $provider_id Provider identifier.
     * @return AnalyticsProviderInterface|null Provider instance on success. Null on failure.
     */
    private static function create_provider( string $provider_id ): ?AnalyticsProviderInterface {
        $provider_id = sanitize_key( $provider_id );

        if ( isset( self::$provider_instances[ $provider_id ] ) && self::$provider_instances[ $provider_id ] instanceof AnalyticsProviderInterface ) {
            return self::$provider_instances[ $provider_id ];
        }

        $provider_class = self::get_provider_class( $provider_id );

        if ( empty( $provider_class ) || ! class_exists( $provider_class ) ) {
            return null;
        }

        $provider = new $provider_class();

        if ( ! $provider instanceof AnalyticsProviderInterface ) {
            return null;
        }

        self::$provider_instances[ $provider_id ] = $provider;

        return $provider;
    }


    /**
     * Get the provider class for a given provider ID.
     *
     * Returns the default provider class when the requested provider
     * is not registered.
     *
     * @since 2.0.0
     * @param string $provider_id Provider identifier.
     * @return string Provider class name.
     */
    private static function get_provider_class( string $provider_id ): string {
        if ( isset( self::$providers[ $provider_id ] ) ) {
            return self::$providers[ $provider_id ];
        }

        return self::$providers[ self::DEFAULT_PROVIDER ] ?? '';
    }
}