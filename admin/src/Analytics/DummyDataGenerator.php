<?php

namespace MeuMouse\Flexify_Dashboard\Analytics;

defined('ABSPATH') || exit;

/**
 * Class DummyDataGenerator
 *
 * Generates dummy analytics data for testing purposes.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Analytics
 * @author MeuMouse.com
 */
class DummyDataGenerator {

    /**
     * Pageviews table name.
     *
     * @since 2.0.0
     * @var string
     */
    private $pageviews_table;

    /**
     * Daily table name.
     *
     * @since 2.0.0
     * @var string
     */
    private $daily_table;

    /**
     * Referrers table name.
     *
     * @since 2.0.0
     * @var string
     */
    private $referrers_table;

    /**
     * Devices table name.
     *
     * @since 2.0.0
     * @var string
     */
    private $devices_table;

    /**
     * Geo table name.
     *
     * @since 2.0.0
     * @var string
     */
    private $geo_table;


    /**
     * Class constructor.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        global $wpdb;

        $this->pageviews_table = $wpdb->prefix . 'flexify_dashboard_analytics_pageviews';
        $this->daily_table = $wpdb->prefix . 'flexify_dashboard_analytics_daily';
        $this->referrers_table = $wpdb->prefix . 'flexify_dashboard_analytics_referrers';
        $this->devices_table = $wpdb->prefix . 'flexify_dashboard_analytics_devices';
        $this->geo_table = $wpdb->prefix . 'flexify_dashboard_analytics_geo';
    }


    /**
     * Generate dummy data for the specified number of months.
     *
     * @since 2.0.0
     * @param int $months Number of months to generate data for.
     * @return void
     */
    public function generate_dummy_data( $months = 2 ) {
        $months = absint( $months );

        if ( $months < 1 ) {
            $months = 2;
        }

        if ( ! AnalyticsDatabase::is_analytics_enabled() ) {
            wp_die( esc_html__( 'Analytics is not enabled. Please enable the feature in the settings first.', 'flexify-dashboard' ) );
        }

        $this->clear_existing_data();

        $start_date = gmdate( 'Y-m-d', strtotime( '-' . $months . ' months' ) );
        $end_date = gmdate( 'Y-m-d' );
        $current_date = $start_date;

        while ( $current_date <= $end_date ) {
            $this->generate_daily_data( $current_date );
            $current_date = gmdate( 'Y-m-d', strtotime( $current_date . ' +1 day' ) );
        }

        $this->aggregate_dummy_data();

        echo esc_html(
            sprintf(
                /* translators: %d: number of months. */
                __( 'Fictitious analytics data successfully generated for %d months.', 'flexify-dashboard' ),
                $months
            )
        );
    }


    /**
     * Clear all existing analytics data.
     *
     * @since 2.0.0
     * @return void
     */
    private function clear_existing_data() {
        global $wpdb;

        $wpdb->query( "DELETE FROM {$this->pageviews_table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "DELETE FROM {$this->daily_table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "DELETE FROM {$this->referrers_table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "DELETE FROM {$this->devices_table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "DELETE FROM {$this->geo_table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    }


    /**
     * Generate dummy data for a specific date.
     *
     * @since 2.0.0
     * @param string $date Date in Y-m-d format.
     * @return void
     */
    private function generate_daily_data( $date ) {
        global $wpdb;

        $pages = array(
            '/',
            '/about',
            '/contact',
            '/products',
            '/blog',
            '/services',
            '/pricing',
            '/faq',
            '/support',
            '/news',
            '/gallery',
            '/testimonials',
        );

        $device_types = array(
            'desktop',
            'mobile',
            'tablet',
        );

        $browsers = array(
            'Chrome',
            'Safari',
            'Firefox',
            'Edge',
        );

        $operating_systems = array(
            'Windows',
            'macOS',
            'iOS',
            'Android',
            'Linux',
        );

        $countries = array(
            'US',
            'CA',
            'GB',
            'AU',
            'DE',
            'FR',
            'IT',
            'ES',
            'NL',
            'SE',
        );

        $cities = array(
            'New York',
            'London',
            'Toronto',
            'Sydney',
            'Berlin',
            'Paris',
            'Rome',
            'Madrid',
            'Amsterdam',
            'Stockholm',
        );

        $referrers = array(
            'google.com',
            'bing.com',
            'yahoo.com',
            'facebook.com',
            'twitter.com',
            'linkedin.com',
            'reddit.com',
            'youtube.com',
            'instagram.com',
            'tiktok.com',
            'direct',
            null,
        );

        $daily_pageviews = wp_rand( 10, 100 );

        for ( $i = 0; $i < $daily_pageviews; $i++ ) {
            $page = $pages[ array_rand( $pages ) ];
            $device_type = $device_types[ array_rand( $device_types ) ];
            $browser = $browsers[ array_rand( $browsers ) ];
            $os = $operating_systems[ array_rand( $operating_systems ) ];
            $country = $countries[ array_rand( $countries ) ];
            $city = $cities[ array_rand( $cities ) ];
            $referrer_domain = $referrers[ array_rand( $referrers ) ];

            $session_id = 'session_' . $date . '_' . wp_rand( 1, 20 );

            $hour = wp_rand( 0, 23 );
            $minute = wp_rand( 0, 59 );
            $second = wp_rand( 0, 59 );

            $created_at = $date . ' ' . sprintf( '%02d:%02d:%02d', $hour, $minute, $second );
            $page_title = $this->generate_page_title( $page );
            $user_agent = $this->generate_user_agent( $browser, $os, $device_type );
            $ip_hash = hash( 'sha256', $session_id . wp_rand( 1, 1000 ) );
            $is_unique_visitor = wp_rand( 1, 100 ) <= 30 ? 1 : 0;

            $wpdb->insert(
                $this->pageviews_table,
                array(
                    'page_url'          => home_url( $page ),
                    'page_title'        => $page_title,
                    'referrer'          => $referrer_domain ? 'https://' . $referrer_domain . '/search' : null,
                    'referrer_domain'   => $referrer_domain,
                    'user_agent'        => $user_agent,
                    'device_type'       => $device_type,
                    'browser'           => $browser,
                    'browser_version'   => $this->generate_browser_version( $browser ),
                    'os'                => $os,
                    'country_code'      => $country,
                    'city'              => $city,
                    'ip_hash'           => $ip_hash,
                    'session_id'        => $session_id,
                    'is_unique_visitor' => $is_unique_visitor,
                    'created_at'        => $created_at,
                ),
                array(
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%d',
                    '%s',
                )
            );
        }
    }


    /**
     * Generate a page title based on the page URL.
     *
     * @since 2.0.0
     * @param string $page Page URL.
     * @return string Generated page title.
     */
    private function generate_page_title( $page ) {
        $titles = array(
            '/'             => 'Home - Welcome to Our Website',
            '/about'        => 'About Us - Learn More About Our Company',
            '/contact'      => 'Contact Us - Get in Touch',
            '/products'     => 'Products - Our Amazing Products',
            '/blog'         => 'Blog - Latest News and Updates',
            '/services'     => 'Services - What We Offer',
            '/pricing'      => 'Pricing - Choose Your Plan',
            '/faq'          => 'FAQ - Frequently Asked Questions',
            '/support'      => 'Support - We\'re Here to Help',
            '/news'         => 'News - Latest Updates',
            '/gallery'      => 'Gallery - Photo Collection',
            '/testimonials' => 'Testimonials - What Our Customers Say',
        );

        if ( isset( $titles[ $page ] ) ) {
            return $titles[ $page ];
        }

        return 'Page - ' . ucfirst( trim( $page, '/' ) );
    }


    /**
     * Generate a user agent string.
     *
     * @since 2.0.0
     * @param string $browser Browser name.
     * @param string $os Operating system name.
     * @param string $device_type Device type.
     * @return string User agent string.
     */
    private function generate_user_agent( $browser, $os, $device_type ) {
        $user_agents = array(
            'Chrome' => array(
                'Windows' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'macOS'   => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Linux'   => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ),
            'Safari' => array(
                'macOS' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                'iOS'   => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            ),
            'Firefox' => array(
                'Windows' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
                'macOS'   => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
                'Linux'   => 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
            ),
            'Edge' => array(
                'Windows' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            ),
        );

        if ( 'mobile' === $device_type ) {
            return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
        }

        if ( 'tablet' === $device_type ) {
            return 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
        }

        if ( isset( $user_agents[ $browser ][ $os ] ) ) {
            return $user_agents[ $browser ][ $os ];
        }

        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }


    /**
     * Generate a browser version string.
     *
     * @since 2.0.0
     * @param string $browser Browser name.
     * @return string Browser version.
     */
    private function generate_browser_version( $browser ) {
        $versions = array(
            'Chrome'  => '120.0.6099.109',
            'Safari'  => '17.1',
            'Firefox' => '121.0',
            'Edge'    => '120.0.2210.91',
        );

        return $versions[ $browser ] ?? '120.0.0.0';
    }


    /**
     * Aggregate pageviews data into summary tables.
     *
     * @since 2.0.0
     * @return void
     */
    private function aggregate_dummy_data() {
        global $wpdb;

        $dates = $wpdb->get_col( "SELECT DISTINCT DATE(created_at) AS date FROM {$this->pageviews_table} ORDER BY date" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        if ( empty( $dates ) ) {
            return;
        }

        foreach ( $dates as $date ) {
            $this->aggregate_daily_stats( $date );
            $this->aggregate_referrers_stats( $date );
            $this->aggregate_devices_stats( $date );
            $this->aggregate_geo_stats( $date );
        }
    }


    /**
     * Aggregate daily statistics.
     *
     * @since 2.0.0
     * @param string $date Date in Y-m-d format.
     * @return void
     */
    private function aggregate_daily_stats( $date ) {
        global $wpdb;

        $stats = $wpdb->get_results(
            $wpdb->prepare(
                "
                SELECT
                    page_url,
                    page_title,
                    COUNT(*) AS views,
                    COUNT(DISTINCT session_id) AS unique_visitors,
                    AVG(CASE WHEN is_unique_visitor = 1 THEN 1 ELSE 0 END) * 100 AS bounce_rate
                FROM {$this->pageviews_table}
                WHERE DATE(created_at) = %s
                GROUP BY page_url, page_title
                ",
                $date
            ),
            ARRAY_A
        );

        if ( empty( $stats ) ) {
            return;
        }

        foreach ( $stats as $stat ) {
            $wpdb->replace(
                $this->daily_table,
                array(
                    'date'            => $date,
                    'page_url'        => $stat['page_url'],
                    'page_title'      => $stat['page_title'],
                    'views'           => (int) $stat['views'],
                    'unique_visitors' => (int) $stat['unique_visitors'],
                    'avg_time_on_page'=> wp_rand( 30, 300 ),
                    'bounce_rate'     => (float) $stat['bounce_rate'],
                    'created_at'      => current_time( 'mysql' ),
                    'updated_at'      => current_time( 'mysql' ),
                ),
                array(
                    '%s',
                    '%s',
                    '%s',
                    '%d',
                    '%d',
                    '%d',
                    '%f',
                    '%s',
                    '%s',
                )
            );
        }
    }


    /**
     * Aggregate referrers statistics.
     *
     * @since 2.0.0
     * @param string $date Date in Y-m-d format.
     * @return void
     */
    private function aggregate_referrers_stats( $date ) {
        global $wpdb;

        $stats = $wpdb->get_results(
            $wpdb->prepare(
                "
                SELECT
                    referrer_domain,
                    referrer,
                    page_url,
                    COUNT(*) AS visits,
                    COUNT(DISTINCT session_id) AS unique_visitors
                FROM {$this->pageviews_table}
                WHERE DATE(created_at) = %s
                    AND referrer_domain IS NOT NULL
                    AND referrer_domain != ''
                GROUP BY referrer_domain, referrer, page_url
                ",
                $date
            ),
            ARRAY_A
        );

        if ( empty( $stats ) ) {
            return;
        }

        foreach ( $stats as $stat ) {
            $wpdb->replace(
                $this->referrers_table,
                array(
                    'date'            => $date,
                    'referrer_domain' => $stat['referrer_domain'],
                    'referrer_url'    => $stat['referrer'],
                    'page_url'        => $stat['page_url'],
                    'visits'          => (int) $stat['visits'],
                    'unique_visitors' => (int) $stat['unique_visitors'],
                    'created_at'      => current_time( 'mysql' ),
                    'updated_at'      => current_time( 'mysql' ),
                ),
                array(
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%d',
                    '%d',
                    '%s',
                    '%s',
                )
            );
        }
    }


    /**
     * Aggregate devices statistics.
     *
     * @since 2.0.0
     * @param string $date Date in Y-m-d format.
     * @return void
     */
    private function aggregate_devices_stats( $date ) {
        global $wpdb;

        $stats = $wpdb->get_results(
            $wpdb->prepare(
                "
                SELECT
                    device_type,
                    browser,
                    os,
                    COUNT(*) AS views,
                    COUNT(DISTINCT session_id) AS unique_visitors
                FROM {$this->pageviews_table}
                WHERE DATE(created_at) = %s
                GROUP BY device_type, browser, os
                ",
                $date
            ),
            ARRAY_A
        );

        if ( empty( $stats ) ) {
            return;
        }

        foreach ( $stats as $stat ) {
            $wpdb->replace(
                $this->devices_table,
                array(
                    'date'            => $date,
                    'device_type'     => $stat['device_type'],
                    'browser'         => $stat['browser'],
                    'os'              => $stat['os'],
                    'views'           => (int) $stat['views'],
                    'unique_visitors' => (int) $stat['unique_visitors'],
                    'created_at'      => current_time( 'mysql' ),
                    'updated_at'      => current_time( 'mysql' ),
                ),
                array(
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%d',
                    '%d',
                    '%s',
                    '%s',
                )
            );
        }
    }


    /**
     * Aggregate geographic statistics.
     *
     * @since 2.0.0
     * @param string $date Date in Y-m-d format.
     * @return void
     */
    private function aggregate_geo_stats( $date ) {
        global $wpdb;

        $stats = $wpdb->get_results(
            $wpdb->prepare(
                "
                SELECT
                    country_code,
                    city,
                    COUNT(*) AS views,
                    COUNT(DISTINCT session_id) AS unique_visitors
                FROM {$this->pageviews_table}
                WHERE DATE(created_at) = %s
                    AND country_code IS NOT NULL
                GROUP BY country_code, city
                ",
                $date
            ),
            ARRAY_A
        );

        if ( empty( $stats ) ) {
            return;
        }

        foreach ( $stats as $stat ) {
            $wpdb->replace(
                $this->geo_table,
                array(
                    'date'            => $date,
                    'country_code'    => $stat['country_code'],
                    'city'            => $stat['city'],
                    'views'           => (int) $stat['views'],
                    'unique_visitors' => (int) $stat['unique_visitors'],
                    'created_at'      => current_time( 'mysql' ),
                    'updated_at'      => current_time( 'mysql' ),
                ),
                array(
                    '%s',
                    '%s',
                    '%s',
                    '%d',
                    '%d',
                    '%s',
                    '%s',
                )
            );
        }
    }
}