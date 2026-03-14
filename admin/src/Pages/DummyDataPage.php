<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsDatabase;
use MeuMouse\Flexify_Dashboard\Analytics\DummyDataGenerator;

defined("ABSPATH") || exit();

/**
 * Class DummyDataPage
 *
 * Admin page for generating dummy analytics data
 * 
 * @since 1.0.0
 */
class DummyDataPage
{
    /**
     * DummyDataPage constructor.
     */
    public function __construct()
    {


        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_generate_dummy_data', [$this, 'handle_generate_dummy_data']);
    }

    /**
     * Add admin menu page
     * 
     * @return void
     * @since 1.0.0
     */
    public function add_admin_menu()
    {
        

   

        add_options_page('fd-dummy-data','fd-dummy-data', "manage_options", "fd-dummy-data", [$this, "render_page"]);
    }

    /**
     * Render the dummy data page
     * 
     * @return void
     * @since 1.0.0
     */
    public function render_page()
    {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Generate Dummy Analytics Data', 'flexify-dashboard'); ?></h1>
            
            <div class="notice notice-warning">
                <p>
                    <strong><?php echo esc_html__('Warning:', 'flexify-dashboard'); ?></strong>
                    <?php echo esc_html__('This will delete all existing analytics data and replace it with dummy data for testing purposes.', 'flexify-dashboard'); ?>
                </p>
            </div>

            <div class="card">
                <h2><?php echo esc_html__('Generate Test Data', 'flexify-dashboard'); ?></h2>
                <p><?php echo esc_html__('This tool will generate realistic dummy analytics data for the last 2 months to help you test the analytics features.', 'flexify-dashboard'); ?></p>
                
                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                    <?php wp_nonce_field('generate_dummy_data', 'dummy_data_nonce'); ?>
                    <input type="hidden" name="action" value="generate_dummy_data">
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="months"><?php echo esc_html__('Number of Months', 'flexify-dashboard'); ?></label>
                            </th>
                            <td>
                                <select name="months" id="months">
                                    <option value="1">1 Month</option>
                                    <option value="2" selected>2 Months</option>
                                    <option value="3">3 Months</option>
                                    <option value="6">6 Months</option>
                                </select>
                                <p class="description"><?php echo esc_html__('Select how many months of dummy data to generate.', 'flexify-dashboard'); ?></p>
                            </td>
                        </tr>
                    </table>

                    <p class="submit">
                        <input type="submit" name="generate_data" class="button button-primary" value="<?php echo esc_attr__('Generate Dummy Data', 'flexify-dashboard'); ?>" 
                               onclick="return confirm('<?php echo esc_js(__('Are you sure? This will delete all existing analytics data.', 'flexify-dashboard')); ?>')">
                    </p>
                </form>
            </div>

            <div class="card">
                <h2><?php echo esc_html__('What This Generates', 'flexify-dashboard'); ?></h2>
                <ul>
                    <li><?php echo esc_html__('Page views from various devices (desktop, mobile, tablet)', 'flexify-dashboard'); ?></li>
                    <li><?php echo esc_html__('Realistic browser and operating system data', 'flexify-dashboard'); ?></li>
                    <li><?php echo esc_html__('Geographic data from different countries and cities', 'flexify-dashboard'); ?></li>
                    <li><?php echo esc_html__('Referrer data from search engines and social media', 'flexify-dashboard'); ?></li>
                    <li><?php echo esc_html__('Session tracking and unique visitor data', 'flexify-dashboard'); ?></li>
                    <li><?php echo esc_html__('Aggregated daily statistics', 'flexify-dashboard'); ?></li>
                </ul>
            </div>

            <div class="card">
                <h2><?php echo esc_html__('Current Analytics Status', 'flexify-dashboard'); ?></h2>
                <p>
                    <strong><?php echo esc_html__('Analytics Enabled:', 'flexify-dashboard'); ?></strong>
                    <?php echo AnalyticsDatabase::is_analytics_enabled() ? '<span style="color: green;">✓ Yes</span>' : '<span style="color: red;">✗ No</span>'; ?>
                </p>
                
                <?php if (AnalyticsDatabase::is_analytics_enabled()): ?>
                    <p>
                        <strong><?php echo esc_html__('Tables Created:', 'flexify-dashboard'); ?></strong>
                        <span style="color: green;">✓ Yes</span>
                    </p>
                <?php else: ?>
                    <p class="notice notice-error">
                        <?php echo esc_html__('Analytics must be enabled in the UiXpress settings before generating dummy data.', 'flexify-dashboard'); ?>
                    </p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    /**
     * Handle dummy data generation
     * 
     * @return void
     * @since 1.0.0
     */
    public function handle_generate_dummy_data()
    {
        // Verify nonce
        if (!wp_verify_nonce($_POST['dummy_data_nonce'], 'generate_dummy_data')) {
            wp_die(__('Security check failed.', 'flexify-dashboard'));
        }

        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'flexify-dashboard'));
        }

        // Check if analytics is enabled
        if (!AnalyticsDatabase::is_analytics_enabled()) {
            wp_die(__('Analytics is not enabled. Please enable analytics in settings first.', 'flexify-dashboard'));
        }

        $months = intval($_POST['months'] ?? 2);
        
        if ($months < 1 || $months > 12) {
            wp_die(__('Invalid number of months. Please select between 1 and 12 months.', 'flexify-dashboard'));
        }

        try {
            $generator = new DummyDataGenerator();
            $generator->generate_dummy_data($months);
            
            wp_redirect(add_query_arg([
                'page' => 'flexify-dashboard-dummy-data',
                'message' => 'success',
                'months' => $months
            ], admin_url('admin.php')));
            exit;
            
        } catch (Exception $e) {
            wp_die(__('Error generating dummy data: ', 'flexify-dashboard') . $e->getMessage());
        }
    }
}
