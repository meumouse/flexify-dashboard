<script setup>
import { ref, onMounted, watch } from 'vue';
import { getWooDashboardData } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Object, required: true } });
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
  <div class="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 h-full">
    <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{{ __('Orders received', 'flexify-dashboard') }}</h3>
    <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{{ __('Quantity of orders from period', 'flexify-dashboard') }}</p>
    <div
      v-if="loading"
      class="h-9 w-20 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"
    ></div>
    <div v-else class="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{{ value }}</div>
  </div>
</template>