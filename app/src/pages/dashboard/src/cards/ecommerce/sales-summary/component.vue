<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Array, required: true } });
const orders = ref([]);
const currency = ref('USD');
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        orders.value = data?.recent_orders || [];
        currency.value = data?.currency || 'USD';
    } finally {
        loading.value = false;
    }
};

const ordersPageUrl = computed(() => {
    const firstOrder = orders.value?.[0];

    if (firstOrder?.edit_url) {
        return firstOrder.edit_url.replace(/([?&])action=edit&?/u, '$1').replace(/([?&])id=\d+/u, '').replace(/[?&]$/u, '');
    }

    return 'admin.php?page=wc-orders';
});

const getStatusClasses = (status) => {
    const map = {
        completed: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-300',
        processing: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-300',
        pending: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-300',
        'on-hold': 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
        cancelled: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-300',
        refunded: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
        failed: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-300',
    };

    return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300';
};

watch(() => props.dateRange, loadData, { deep: true });
onMounted(loadData);
</script>

<template>
  <div class="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl h-full flex flex-col">
    <div class="flex flex-col gap-3 border-b border-gray-200 px-8 py-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ __('Sales Summary', 'flexify-dashboard') }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ __('Latest 5 orders', 'flexify-dashboard') }}</p>
      </div>

      <div class="flex items-center gap-3 pr-6">
        <a
          :href="ordersPageUrl"
          class="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:text-white"
        >
          {{ __('View all', 'flexify-dashboard') }}
        </a>
      </div>
    </div>

    <div v-if="loading" class="space-y-3 px-4 py-4 sm:px-6">
      <div
        v-for="index in 5"
        :key="`sales-summary-placeholder-${index}`"
        class="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 p-4 md:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr] xl:grid-cols-[minmax(250px,1.5fr)_minmax(120px,0.8fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(160px,1fr)] dark:border-gray-800"
      >
        <div class="flex items-center gap-3">
          <div class="h-14 w-14 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
            <div class="h-3 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </div>
        <div class="h-4 w-20 animate-pulse self-center rounded bg-gray-200 dark:bg-gray-800"></div>
        <div class="h-4 w-24 animate-pulse self-center rounded bg-gray-200 dark:bg-gray-800"></div>
        <div class="h-7 w-24 animate-pulse self-center rounded-full bg-gray-200 dark:bg-gray-800"></div>
        <div class="h-4 w-24 animate-pulse self-center rounded bg-gray-200 dark:bg-gray-800"></div>
        <div class="h-4 w-28 animate-pulse self-center rounded bg-gray-200 dark:bg-gray-800"></div>
        <div class="h-4 w-32 animate-pulse self-center rounded bg-gray-200 dark:bg-gray-800"></div>
      </div>
    </div>

    <div v-else-if="orders.length" class="max-w-full overflow-x-auto">
      <table class="min-w-[1100px] w-full">
        <thead class="border-b border-gray-200 dark:border-gray-800">
          <tr>
            <th class="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 sm:px-6">{{ __('Product', 'flexify-dashboard') }}</th>
            <th class="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{{ __('Category', 'flexify-dashboard') }}</th>
            <th class="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{{ __('Total', 'flexify-dashboard') }}</th>
            <th class="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{{ __('Status', 'flexify-dashboard') }}</th>
            <th class="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{{ __('Order', 'flexify-dashboard') }}</th>
            <th class="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{{ __('Customer', 'flexify-dashboard') }}</th>
            <th class="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 pr-6">{{ __('Source', 'flexify-dashboard') }}</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-for="order in orders" :key="order.id" class="align-middle">
            <td class="px-4 py-4 sm:px-6">
              <div class="flex items-center gap-3">
                <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-inset ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
                  <img
                    v-if="order.product?.image"
                    :src="order.product.image"
                    :alt="order.product?.name || __('Product', 'flexify-dashboard')"
                    class="h-full w-full object-cover"
                  >
                  <i v-else class="bx bx-package text-2xl text-gray-400 dark:text-gray-500"></i>
                </div>

                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ order.product?.name || __('Unnamed product', 'flexify-dashboard') }}
                  </p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {{ __('Order', 'flexify-dashboard') }} #{{ order.id }}
                  </p>
                </div>
              </div>
            </td>

            <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{{ order.category || __('Uncategorized', 'flexify-dashboard') }}</td>

            <td class="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ formatCurrency(order.total, currency) }}
            </td>

            <td class="px-4 py-4">
              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="getStatusClasses(order.status?.slug)"
              >
                {{ order.status?.label || __('No status', 'flexify-dashboard') }}
              </span>
            </td>

            <td class="px-4 py-4 text-sm">
              <a
                :href="order.edit_url"
                class="font-semibold text-blue-light-700 transition hover:text-blue-light-800 dark:text-blue-light-300 dark:hover:text-blue-light-200"
              >
                #{{ order.id }}
              </a>
            </td>

            <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{{ order.customer_name }}</td>

            <td class="px-4 py-4 pr-6">
              <div class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <i :class="order.source?.icon || 'bx bx-shopping-bag'" class="text-base"></i>
                <span>{{ order.source?.label || __('Unknown source', 'flexify-dashboard') }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="px-4 py-5 text-sm text-gray-500 sm:px-6 dark:text-gray-400">{{ __('No orders in the selected period.', 'flexify-dashboard') }}</p>
  </div>
</template>
