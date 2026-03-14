<script setup>
import { ref, onMounted, watch, computed } from 'vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true,
  },
  userEmail: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['woocommerce-status']);

// Refs
const wooCommerceCustomer = ref(null);
const orders = ref([]);
const loadingWooCommerce = ref(false);
const wooCommerceActive = ref(false);
const customerSchema = ref(null);
const loadingSchema = ref(false);

/**
 * Format date
 */
const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format currency amount
 *
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency code (default: USD)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD') => {
  if (
    amount === null ||
    amount === undefined ||
    amount === '' ||
    isNaN(amount)
  ) {
    return '—';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '—';
  }

  // Use currency from orders if available, otherwise default to USD
  const currencyCode = currency || 'USD';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(numAmount);
};

/**
 * Get order status label
 *
 * @param {string} status - The order status
 * @returns {string} Formatted status label
 */
const getStatusLabel = (status) => {
  const statusMap = {
    pending: __('Pending', 'flexify-dashboard'),
    processing: __('Processing', 'flexify-dashboard'),
    'on-hold': __('On Hold', 'flexify-dashboard'),
    completed: __('Completed', 'flexify-dashboard'),
    cancelled: __('Cancelled', 'flexify-dashboard'),
    refunded: __('Refunded', 'flexify-dashboard'),
    failed: __('Failed', 'flexify-dashboard'),
  };
  return statusMap[status] || status;
};

/**
 * Get status badge color class
 *
 * @param {string} status - The order status
 * @returns {string} Tailwind CSS classes for status badge
 */
const getStatusBadgeClass = (status) => {
  const statusClasses = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'on-hold': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    refunded: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    statusClasses[status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  );
};

/**
 * Get WooCommerce order edit URL
 *
 * @param {number|string} orderId - The order ID
 * @returns {string} The order edit URL
 */
const getOrderEditUrl = (orderId) => {
  const adminUrl = appStore.state.adminUrl || '';
  return `${adminUrl}post.php?post=${orderId}&action=edit`;
};

/**
 * Fetch WooCommerce customer schema from OPTIONS endpoint
 *
 * @returns {Promise<void>}
 */
const fetchCustomerSchema = async () => {
  if (!wooCommerceActive.value) return;

  loadingSchema.value = true;

  try {
    // Use native fetch for OPTIONS request since lmnFetch may not handle it properly
    const restBase = appStore.state.restBase;
    const restNonce = appStore.state.restNonce;

    const response = await fetch(`${restBase}wc/v3/customers`, {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json',
        ...(restNonce ? { 'X-WP-Nonce': restNonce } : {}),
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.schema) {
        customerSchema.value = data.schema;
      }
    }
  } catch (error) {
    console.error('Failed to fetch customer schema:', error);
  } finally {
    loadingSchema.value = false;
  }
};

/**
 * Get field type from schema
 *
 * @param {string} fieldPath - The field path (e.g., 'billing.first_name')
 * @returns {string|null} Field type or null
 */
const getFieldType = (fieldPath) => {
  if (!customerSchema.value) return null;

  const parts = fieldPath.split('.');
  let schema = customerSchema.value;

  for (const part of parts) {
    if (schema?.properties?.[part]) {
      schema = schema.properties[part];
    } else {
      return null;
    }
  }

  return schema?.type || null;
};

/**
 * Format field value based on its type
 *
 * @param {*} value - The field value
 * @param {string} fieldPath - The field path
 * @returns {string} Formatted value
 */
const formatFieldValue = (value, fieldPath) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const fieldType = getFieldType(fieldPath);

  if (fieldType === 'date-time' || fieldType === 'date') {
    return formatDate(value);
  }

  if (fieldType === 'number' || fieldType === 'integer') {
    return typeof value === 'number' ? value.toLocaleString() : value;
  }

  if (fieldType === 'boolean') {
    return value ? __('Yes', 'flexify-dashboard') : __('No', 'flexify-dashboard');
  }

  return value;
};

/**
 * Check if WooCommerce is active
 */
const checkWooCommerceActive = async () => {
  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/woocommerce-active',
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      wooCommerceActive.value = data.data.woocommerce_active || false;
      emit('woocommerce-status', wooCommerceActive.value);

      // If WooCommerce is active, fetch customer data and schema
      if (wooCommerceActive.value && props.userId) {
        await Promise.all([fetchCustomerSchema(), fetchWooCommerceCustomer()]);
      }
    }
  } catch (error) {
    console.error('Failed to check WooCommerce status:', error);
    wooCommerceActive.value = false;
    emit('woocommerce-status', false);
  }
};

/**
 * Fetch WooCommerce customer data for the user from WooCommerce REST API
 */
const fetchWooCommerceCustomer = async () => {
  if (!props.userId) return;

  loadingWooCommerce.value = true;

  try {
    // First try to get customer by user ID (customer ID is usually the same as user ID)
    let customerData = null;

    try {
      const args = {
        endpoint: `wc/v3/customers/${props.userId}`,
      };

      const data = await lmnFetch(args);
      if (data?.data) {
        customerData = data.data;
      }
    } catch (error) {
      // If not found by ID, try to find by email
      if (props.userEmail) {
        try {
          const args = {
            endpoint: 'wc/v3/customers',
            params: {
              email: props.userEmail,
            },
          };

          const data = await lmnFetch(args);
          if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
            // Get the customer ID from the search result
            const customerId = data.data[0].id;

            // Fetch full customer data
            const fullDataArgs = {
              endpoint: `wc/v3/customers/${customerId}`,
            };

            const fullData = await lmnFetch(fullDataArgs);
            if (fullData?.data) {
              customerData = fullData.data;
            }
          }
        } catch (emailError) {
          console.error('Failed to fetch customer by email:', emailError);
        }
      }
    }

    if (customerData) {
      // Fetch orders count and total spent
      await enrichCustomerData(customerData);
      wooCommerceCustomer.value = customerData;
    } else {
      wooCommerceCustomer.value = null;
    }
  } catch (error) {
    console.error('Failed to fetch WooCommerce customer data:', error);
    wooCommerceCustomer.value = null;
  } finally {
    loadingWooCommerce.value = false;
  }
};

/**
 * Enrich customer data with orders and analytics
 *
 * @param {Object} customerData - The customer data object
 */
const enrichCustomerData = async (customerData) => {
  if (!customerData.id) return;

  try {
    // Fetch orders for this customer using WooCommerce API
    const args = {
      endpoint: 'wc/v3/orders',
      params: {
        customer: customerData.id,
        per_page: 100, // Get up to 100 orders
        orderby: 'date',
        order: 'desc',
      },
    };

    const ordersData = await lmnFetch(args);

    if (ordersData?.data && Array.isArray(ordersData.data)) {
      orders.value = ordersData.data;

      // Calculate orders count
      customerData.orders_count = orders.value.length;

      // Calculate total spent (from completed and processing orders)
      customerData.total_spent = orders.value
        .filter((order) => ['completed', 'processing'].includes(order.status))
        .reduce((total, order) => {
          return total + parseFloat(order.total || 0);
        }, 0);

      // Store currency from first order (if available)
      if (orders.value.length > 0 && orders.value[0].currency) {
        customerData.currency = orders.value[0].currency;
      }
    } else {
      orders.value = [];
      customerData.orders_count = 0;
      customerData.total_spent = 0;
    }
  } catch (error) {
    console.error('Failed to fetch customer orders:', error);
    orders.value = [];
    customerData.orders_count = 0;
    customerData.total_spent = 0;
  }
};

/**
 * Calculate analytics from orders
 */
const orderAnalytics = computed(() => {
  if (!orders.value || orders.value.length === 0) {
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      totalItems: 0,
      statusBreakdown: {},
      recentOrders: [],
      currency: 'USD',
    };
  }

  const completedOrders = orders.value.filter((order) =>
    ['completed', 'processing'].includes(order.status)
  );

  // Calculate total items purchased
  const totalItems = orders.value.reduce((total, order) => {
    if (order.line_items && Array.isArray(order.line_items)) {
      return (
        total +
        order.line_items.reduce((sum, item) => {
          return sum + parseInt(item.quantity || 0);
        }, 0)
      );
    }
    return total;
  }, 0);

  // Calculate status breakdown
  const statusBreakdown = {};
  orders.value.forEach((order) => {
    const status = order.status || 'unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });

  // Calculate average order value
  const totalSpent = completedOrders.reduce((total, order) => {
    return total + parseFloat(order.total || 0);
  }, 0);
  const averageOrderValue =
    completedOrders.length > 0 ? totalSpent / completedOrders.length : 0;

  // Get recent orders (last 5)
  const recentOrders = orders.value.slice(0, 5);

  // Get currency from first order
  const currency = orders.value[0]?.currency || 'USD';

  return {
    totalOrders: orders.value.length,
    totalSpent,
    averageOrderValue,
    totalItems,
    statusBreakdown,
    recentOrders,
    currency,
  };
});

// Lifecycle
onMounted(async () => {
  // Check WooCommerce status immediately on mount and emit to parent
  // This allows the parent to update tab visibility reactively
  await checkWooCommerceActive();
});

// Watch for userId changes
watch(
  () => props.userId,
  async (newUserId) => {
    if (newUserId) {
      // Re-check WooCommerce status when userId changes
      await checkWooCommerceActive();
    }
  }
);
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div
      v-if="loadingWooCommerce"
      class="flex items-center justify-center py-12"
    >
      <AppIcon
        icon="refresh"
        class="text-xl text-zinc-400 dark:text-zinc-500 animate-spin"
      />
    </div>

    <!-- Customer Data -->
    <div v-else-if="wooCommerceCustomer" class="space-y-6">
      <!-- Customer Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          class="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200"
        >
          <div class="text-xs text-zinc-400 mb-1.5">
            {{ __('Orders', 'flexify-dashboard') }}
          </div>
          <div class="text-2xl font-bold text-white">
            {{ orderAnalytics.totalOrders }}
          </div>
        </div>
        <div
          class="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200"
        >
          <div class="text-xs text-zinc-400 mb-1.5">
            {{ __('Total Spent', 'flexify-dashboard') }}
          </div>
          <div class="text-2xl font-bold text-white">
            {{
              formatCurrency(orderAnalytics.totalSpent, orderAnalytics.currency)
            }}
          </div>
        </div>
        <div
          class="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200"
        >
          <div class="text-xs text-zinc-400 mb-1.5">
            {{ __('Average Order', 'flexify-dashboard') }}
          </div>
          <div class="text-2xl font-bold text-white">
            {{
              formatCurrency(
                orderAnalytics.averageOrderValue,
                orderAnalytics.currency
              )
            }}
          </div>
        </div>
        <div
          class="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200"
        >
          <div class="text-xs text-zinc-400 mb-1.5">
            {{ __('Total Items', 'flexify-dashboard') }}
          </div>
          <div class="text-2xl font-bold text-white">
            {{ orderAnalytics.totalItems }}
          </div>
        </div>
      </div>

      <!-- Order Status Breakdown -->
      <div
        v-if="Object.keys(orderAnalytics.statusBreakdown).length > 0"
        class="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50"
      >
        <div
          class="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider"
        >
          {{ __('Order Status Breakdown', 'flexify-dashboard') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(count, status) in orderAnalytics.statusBreakdown"
            :key="status"
            :class="[
              'px-3 py-1.5 text-[10px] font-semibold rounded-lg uppercase border transition-all duration-200',
              getStatusBadgeClass(status),
            ]"
          >
            {{ getStatusLabel(status) }}: {{ count }}
          </span>
        </div>
      </div>

      <!-- Recent Orders -->
      <div
        v-if="orderAnalytics.recentOrders.length > 0"
        class="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50"
      >
        <div
          class="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider"
        >
          {{ __('Recent Orders', 'flexify-dashboard') }}
        </div>
        <div class="space-y-3">
          <a
            v-for="order in orderAnalytics.recentOrders"
            :key="order.id"
            :href="getOrderEditUrl(order.id)"
            target="_blank"
            class="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/30 hover:border-zinc-700/50 transition-all duration-200 group cursor-pointer"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1.5">
                <span
                  class="text-sm font-semibold text-white group-hover:text-zinc-100 transition-colors"
                >
                  #{{ order.number || order.id }}
                </span>
                <span
                  :class="[
                    'px-2 py-0.5 text-[10px] font-semibold rounded-lg uppercase border',
                    getStatusBadgeClass(order.status),
                  ]"
                >
                  {{ getStatusLabel(order.status) }}
                </span>
              </div>
              <div class="text-xs text-zinc-400">
                {{ formatDate(order.date_created) }}
              </div>
            </div>
            <div class="text-base font-bold text-white">
              {{ formatCurrency(order.total, order.currency) }}
            </div>
          </a>
        </div>
      </div>

      <!-- Billing Address -->
      <div
        v-if="
          wooCommerceCustomer.billing &&
          (wooCommerceCustomer.billing.address_1 ||
            wooCommerceCustomer.billing.city)
        "
        class="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50"
      >
        <div
          class="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider"
        >
          {{ __('Billing Address', 'flexify-dashboard') }}
        </div>
        <div class="text-sm text-zinc-400 space-y-2 leading-relaxed">
          <div
            v-if="
              wooCommerceCustomer.billing.first_name ||
              wooCommerceCustomer.billing.last_name
            "
            class="font-medium text-white"
          >
            {{ wooCommerceCustomer.billing.first_name }}
            {{ wooCommerceCustomer.billing.last_name }}
          </div>
          <div v-if="wooCommerceCustomer.billing.company">
            {{ wooCommerceCustomer.billing.company }}
          </div>
          <div v-if="wooCommerceCustomer.billing.address_1">
            {{ wooCommerceCustomer.billing.address_1 }}
          </div>
          <div v-if="wooCommerceCustomer.billing.address_2">
            {{ wooCommerceCustomer.billing.address_2 }}
          </div>
          <div
            v-if="
              wooCommerceCustomer.billing.city ||
              wooCommerceCustomer.billing.state ||
              wooCommerceCustomer.billing.postcode
            "
          >
            {{
              [
                wooCommerceCustomer.billing.city,
                wooCommerceCustomer.billing.state,
                wooCommerceCustomer.billing.postcode,
              ]
                .filter(Boolean)
                .join(', ')
            }}
          </div>
          <div v-if="wooCommerceCustomer.billing.country">
            {{ wooCommerceCustomer.billing.country }}
          </div>
          <div
            v-if="wooCommerceCustomer.billing.email"
            class="pt-2 mt-2 border-t border-zinc-800/50"
          >
            <span class="text-zinc-500 text-xs uppercase tracking-wider"
              >{{ __('Email', 'flexify-dashboard') }}:</span
            >
            <div class="text-white mt-1">
              {{ wooCommerceCustomer.billing.email }}
            </div>
          </div>
          <div
            v-if="wooCommerceCustomer.billing.phone"
            class="pt-2 mt-2 border-t border-zinc-800/50"
          >
            <span class="text-zinc-500 text-xs uppercase tracking-wider"
              >{{ __('Phone', 'flexify-dashboard') }}:</span
            >
            <div class="text-white mt-1">
              {{ wooCommerceCustomer.billing.phone }}
            </div>
          </div>
        </div>
      </div>

      <!-- Shipping Address -->
      <div
        v-if="
          wooCommerceCustomer.shipping &&
          (wooCommerceCustomer.shipping.address_1 ||
            wooCommerceCustomer.shipping.city)
        "
        class="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50"
      >
        <div
          class="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider"
        >
          {{ __('Shipping Address', 'flexify-dashboard') }}
        </div>
        <div class="text-sm text-zinc-400 space-y-2 leading-relaxed">
          <div
            v-if="
              wooCommerceCustomer.shipping.first_name ||
              wooCommerceCustomer.shipping.last_name
            "
            class="font-medium text-white"
          >
            {{ wooCommerceCustomer.shipping.first_name }}
            {{ wooCommerceCustomer.shipping.last_name }}
          </div>
          <div v-if="wooCommerceCustomer.shipping.company">
            {{ wooCommerceCustomer.shipping.company }}
          </div>
          <div v-if="wooCommerceCustomer.shipping.address_1">
            {{ wooCommerceCustomer.shipping.address_1 }}
          </div>
          <div v-if="wooCommerceCustomer.shipping.address_2">
            {{ wooCommerceCustomer.shipping.address_2 }}
          </div>
          <div
            v-if="
              wooCommerceCustomer.shipping.city ||
              wooCommerceCustomer.shipping.state ||
              wooCommerceCustomer.shipping.postcode
            "
          >
            {{
              [
                wooCommerceCustomer.shipping.city,
                wooCommerceCustomer.shipping.state,
                wooCommerceCustomer.shipping.postcode,
              ]
                .filter(Boolean)
                .join(', ')
            }}
          </div>
          <div v-if="wooCommerceCustomer.shipping.country">
            {{ wooCommerceCustomer.shipping.country }}
          </div>
        </div>
      </div>

      <!-- Customer Dates -->
      <div
        v-if="wooCommerceCustomer.date_created"
        class="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50"
      >
        <div
          class="text-xs font-semibold text-zinc-300 mb-3 uppercase tracking-wider"
        >
          {{ __('Customer Information', 'flexify-dashboard') }}
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-zinc-400">{{
              __('Customer Since', 'flexify-dashboard')
            }}</span>
            <span class="text-white font-medium">{{
              formatDate(wooCommerceCustomer.date_created)
            }}</span>
          </div>
          <div
            v-if="wooCommerceCustomer.date_modified"
            class="flex items-center justify-between pt-2 border-t border-zinc-800/50"
          >
            <span class="text-zinc-400">{{
              __('Last Updated', 'flexify-dashboard')
            }}</span>
            <span class="text-white font-medium">{{
              formatDate(wooCommerceCustomer.date_modified)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No Customer Found -->
    <div v-else class="py-12 text-center">
      <div class="text-sm text-zinc-400">
        {{ __('No WooCommerce customer data found for this user', 'flexify-dashboard') }}
      </div>
    </div>
  </div>
</template>
