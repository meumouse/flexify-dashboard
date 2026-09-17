<script setup>
import { ref, onMounted, watch } from 'vue';
import { getWooDashboardData } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Array, required: true } });
const value = ref(0);
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        value.value = data?.orders_received || 0;
    } finally {
        loading.value = false;
    }
};

watch(() => props.dateRange, loadData, { deep: true });
onMounted(loadData);
</script>

<template>
  <div class="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl py-6 px-8 h-full">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ __('Orders received', 'flexify-dashboard') }}</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ __('Quantity of orders from period', 'flexify-dashboard') }}</p>
    
    <div
      v-if="loading"
      class="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"
    ></div>

    <div v-else class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ value }}</div>
  </div>
</template>
