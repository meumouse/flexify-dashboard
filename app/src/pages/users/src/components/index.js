import { addFilter } from '@/assets/js/functions/HooksSystem.js';

// Components
import userDetailsForm from './user-details-form/index.js';
import userActivity from './user-activity/index.js';
import woocommerceCustomer from './woocommerce-customer/index.js';

/**
 * Register default categories for user details view
 */
addFilter('flexify-dashboard/user-details/categories/register', (categories) => {
  return [
    ...categories,
    { value: 'details', label: __('Details', 'flexify-dashboard') },
    { value: 'activity', label: __('Activity', 'flexify-dashboard') },
    { value: 'commerce', label: __('Commerce', 'flexify-dashboard') },
  ];
});

/**
 * Register default components for user details view
 * Components can be registered here or by plugins using the filter
 */
addFilter('flexify-dashboard/user-details/components/register', (components) => {
  return [...components, userDetailsForm, userActivity, woocommerceCustomer];
});

