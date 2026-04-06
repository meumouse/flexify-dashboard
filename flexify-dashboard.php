<?php

/*
 * Plugin Name:         Flexify Dashboard
 * Plugin URI:          https://meumouse.com/plugins/flexify-dashboard/?utm_source=wordpress&utm_medium=flexify_dashboard&utm_campaign=plugins_list
 * Description:         Aprimore sua experiência administrativa no WordPress com uma interface elegante e de alto desempenho. O Flexify Dashboard oferece um tema administrativo moderno e intuitivo que combina beleza e funcionalidade.
 * Version:             2.0.0
 * Author:              MeuMouse.com
 * Author URI:          https://meumouse.com/?utm_source=wordpress&utm_medium=flexify_dashboard&utm_campaign=plugins_list
 * Text Domain:         flexify-dashboard
 * Domain Path:         /languages/
 * Requires PHP:        7.4
 * Requires at least:   6.0
 * License:             GPLv2 or later for PHP code, proprietary license for other assets
 * License URI:         license.md
 */

// Exit if accessed directly.
defined('ABSPATH') || exit;

define( 'FLEXIFY_DASHBOARD_VERSION', '2.0.0' );
define( 'FLEXIFY_DASHBOARD_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );

require FLEXIFY_DASHBOARD_PLUGIN_PATH . 'admin/vendor/autoload.php';

// Load custom field helper functions (global functions for theme developers)
require FLEXIFY_DASHBOARD_PLUGIN_PATH . 'admin/src/Rest/CustomFields/FieldHelpers.php';

// Initialize the plugin
new MeuMouse\Flexify_Dashboard\App\Plugin();