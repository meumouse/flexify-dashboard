<?php

namespace MeuMouse\Flexify_Dashboard\Pages;

use Exception;
use MeuMouse\Flexify_Dashboard\Analytics\AnalyticsDatabase;
use MeuMouse\Flexify_Dashboard\Analytics\DummyDataGenerator;

defined('ABSPATH') || exit;

/**
 * Class DummyDataPage
 *
 * Admin page for generating dummy analytics data.
 *
 * @since 2.0.0
 * @package MeuMouse\Flexify_Dashboard\Pages
 * @author MeuMouse.com
 */
class DummyDataPage {

    /**
     * Menu slug.
     *
     * @since 2.0.0
     * @var string
     */
    const MENU_SLUG = 'fd-dummy-data';


    /**
     * Class constructor.
     *
     * @since 2.0.0
     * @return void
     */
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
        add_action( 'admin_post_generate_dummy_data', array( $this, 'handle_generate_dummy_data' ) );
    }


    /**
     * Adds the admin menu page.
     *
     * @since 2.0.0
     * @return void
     */
    public function add_admin_menu() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        add_options_page(
            'fd-dummy-data',
            'fd-dummy-data',
            'manage_options',
            self::MENU_SLUG,
            array( $this, 'render_page' )
        );
    }


    /**
     * Renders the dummy data page.
     *
     * @since 2.0.0
     * @return void
     */
    public function render_page() {
        $success_message = $this->get_success_message();
        $is_analytics_enabled = AnalyticsDatabase::is_analytics_enabled();
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__( 'Generate Dummy Analytics Data', 'flexify-dashboard' ); ?></h1>

            <?php if ( ! empty( $success_message ) ) : ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php echo esc_html( $success_message ); ?></p>
                </div>
            <?php endif; ?>

            <div class="notice notice-warning">
                <p>
                    <strong><?php echo esc_html__( 'Warning:', 'flexify-dashboard' ); ?></strong>
                    <?php echo esc_html__( 'This will delete all existing analytics data and replace it with dummy data for testing purposes.', 'flexify-dashboard' ); ?>
                </p>
            </div>

            <div class="card">
                <h2><?php echo esc_html__( 'Generate Test Data', 'flexify-dashboard' ); ?></h2>
                <p><?php echo esc_html__( 'This tool will generate realistic dummy analytics data for the last 2 months to help you test the analytics features.', 'flexify-dashboard' ); ?></p>

                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                    <?php wp_nonce_field( 'generate_dummy_data', 'dummy_data_nonce' ); ?>
                    <input type="hidden" name="action" value="generate_dummy_data">

                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="months"><?php echo esc_html__( 'Number of Months', 'flexify-dashboard' ); ?></label>
                            </th>
                            <td>
                                <select name="months" id="months">
                                    <option value="1">1 Month</option>
                                    <option value="2" selected>2 Months</option>
                                    <option value="3">3 Months</option>
                                    <option value="6">6 Months</option>
                                </select>
                                <p class="description"><?php echo esc_html__( 'Select how many months of dummy data to generate.', 'flexify-dashboard' ); ?></p>
                            </td>
                        </tr>
                    </table>

                    <p class="submit">
                        <input type="submit" name="generate_data" class="button button-primary" value="<?php echo esc_attr__( 'Generate Dummy Data', 'flexify-dashboard' ); ?>" onclick="return confirm('<?php echo esc_js( __( 'Are you sure? This will delete all existing analytics data.', 'flexify-dashboard' ) ); ?>')">
                    </p>
                </form>
            </div>

            <div class="card">
                <h2><?php echo esc_html__( 'What This Generates', 'flexify-dashboard' ); ?></h2>
                <ul>
                    <li><?php echo esc_html__( 'Page views from various devices (desktop, mobile, tablet)', 'flexify-dashboard' ); ?></li>
                    <li><?php echo esc_html__( 'Realistic browser and operating system data', 'flexify-dashboard' ); ?></li>
                    <li><?php echo esc_html__( 'Geographic data from different countries and cities', 'flexify-dashboard' ); ?></li>
                    <li><?php echo esc_html__( 'Referrer data from search engines and social media', 'flexify-dashboard' ); ?></li>
                    <li><?php echo esc_html__( 'Session tracking and unique visitor data', 'flexify-dashboard' ); ?></li>
                    <li><?php echo esc_html__( 'Aggregated daily statistics', 'flexify-dashboard' ); ?></li>
                </ul>
            </div>

            <div class="card">
                <h2><?php echo esc_html__( 'Current Analytics Status', 'flexify-dashboard' ); ?></h2>
                <p>
                    <strong><?php echo esc_html__( 'Analytics Enabled:', 'flexify-dashboard' ); ?></strong>
                    <?php echo $is_analytics_enabled ? '<span style="color: green;">✓ Yes</span>' : '<span style="color: red;">✗ No</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                </p>

                <?php if ( $is_analytics_enabled ) : ?>
                    <p>
                        <strong><?php echo esc_html__( 'Tables Created:', 'flexify-dashboard' ); ?></strong>
                        <span style="color: green;">✓ Yes</span>
                    </p>
                <?php else : ?>
                    <p class="notice notice-error">
                        <?php echo esc_html__( 'Analytics must be enabled in the UiXpress settings before generating dummy data.', 'flexify-dashboard' ); ?>
                    </p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }


    /**
     * Handles dummy data generation.
     *
     * @since 2.0.0
     * @return void
     */
    public function handle_generate_dummy_data() {
        $nonce = isset( $_POST['dummy_data_nonce'] )
            ? sanitize_text_field( wp_unslash( $_POST['dummy_data_nonce'] ) )
            : '';

        if ( ! wp_verify_nonce( $nonce, 'generate_dummy_data' ) ) {
            wp_die( esc_html__( 'Security check failed.', 'flexify-dashboard' ) );
        }

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'flexify-dashboard' ) );
        }

        if ( ! AnalyticsDatabase::is_analytics_enabled() ) {
            wp_die( esc_html__( 'Analytics is not enabled. Please enable analytics in settings first.', 'flexify-dashboard' ) );
        }

        $months = isset( $_POST['months'] )
            ? absint( wp_unslash( $_POST['months'] ) )
            : 2;

        if ( $months < 1 || $months > 12 ) {
            wp_die( esc_html__( 'Invalid number of months. Please select between 1 and 12 months.', 'flexify-dashboard' ) );
        }

        try {
            $generator = new DummyDataGenerator();
            $generator->generate_dummy_data( $months );

            wp_safe_redirect( add_query_arg( array(
                'page'    => self::MENU_SLUG,
                'message' => 'success',
                'months'  => $months,
            ), admin_url( 'options-general.php' ) ) );
            exit;
        } catch ( Exception $e ) {
            error_log( 'Dummy data generation error: ' . $e->getMessage() );

            wp_die( esc_html__( 'Error generating dummy data: ', 'flexify-dashboard' ) . esc_html( $e->getMessage() ) );
        }
    }


    /**
     * Retrieves the success message.
     *
     * @since 2.0.0
     * @return string
     */
    private function get_success_message() {
        $message = isset( $_GET['message'] )
            ? sanitize_text_field( wp_unslash( $_GET['message'] ) )
            : '';

        $months = isset( $_GET['months'] )
            ? absint( wp_unslash( $_GET['months'] ) )
            : 0;

        if ( 'success' !== $message || $months < 1 ) {
            return '';
        }

        /* translators: %d: number of months */
        return sprintf( __( 'Dummy analytics data generated successfully for %d month(s).', 'flexify-dashboard' ), $months );
    }
}