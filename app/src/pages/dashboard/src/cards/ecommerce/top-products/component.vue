<script setup>
import { ref, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Array, required: true } });
const items = ref([]);
const currency = ref('USD');
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        items.value = data?.top_products || [];
        currency.value = data?.currency || 'USD';
    } finally {
        loading.value = false;
    }
};

watch(() => props.dateRange, loadData, { deep: true, immediate: true });
</script>

<template>
  <div class="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl py-6 px-8 h-full flex flex-col">
    <div class="mb-5 flex items-center gap-4">
      <div>
        <h3 class="text-lg leading-none font-semibold text-gray-900 dark:text-gray-100">{{ __('Top Selling Products', 'flexify-dashboard') }}</h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ __('The 5 best-selling products in your store', 'flexify-dashboard') }}</p>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <div
        v-for="index in 5"
        :key="`placeholder-${index}`"
        class="grid grid-cols-[3rem_minmax(0,1.8fr)_0.7fr_1fr] items-center gap-4"
      >
        <div class="h-4 w-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        <div class="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        <div class="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        <div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse justify-self-end"></div>
      </div>
    </div>

    <div v-else-if="items.length" class="overflow-x-auto">
      <table class="w-full min-w-[700px] border-collapse">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700/70">
            <th class="px-3 pb-4 text-left text-sm font-semibold text-gray-950 dark:text-gray-100">{{ __('Position', 'flexify-dashboard') }}</th>
            <th class="px-3 pb-4 text-left text-sm font-semibold text-gray-950 dark:text-gray-100">{{ __('Product', 'flexify-dashboard') }}</th>
            <th class="px-3 pb-4 text-left text-sm font-semibold text-gray-950 dark:text-gray-100">{{ __('Orders', 'flexify-dashboard') }}</th>
            <th class="px-3 pb-4 text-left text-sm font-semibold text-gray-950 dark:text-gray-100">{{ __('Revenue', 'flexify-dashboard') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="item.product_id"
            class="border-b border-gray-200 last:border-b-0 dark:border-gray-700/60"
          >
            <td class="px-3 py-4 text-sm text-gray-900 dark:text-gray-100">{{ index + 1 }}</td>
            <td class="px-3 py-4 text-sm">
              <div class="flex min-w-0 items-center gap-3">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                  >
                  <div v-else class="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                    <i class="bx bx-package text-lg"></i>
                  </div>
                </div>
                <a
                  :href="item.edit_url"
                  class="line-clamp-2 text-blue-light-700 underline decoration-blue-light-700/30 underline-offset-2 transition hover:text-blue-light-800 dark:text-blue-light-300 dark:hover:text-blue-light-200"
                >
                  {{ item.name }}
                </a>
              </div>
            </td>
            <td class="px-3 py-4 text-sm text-gray-900 dark:text-gray-100">{{ item.quantity }}</td>
            <td class="px-3 py-4 text-sm text-gray-900 dark:text-gray-100">{{ formatCurrency(item.revenue, currency) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="text-sm text-gray-500 dark:text-gray-400">{{ __('No data available for the selected period.', 'flexify-dashboard') }}</p>
  </div>
</template>
