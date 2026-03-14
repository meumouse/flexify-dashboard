<script setup>
import { ref, onMounted, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Object, required: true } });
const items = ref([]);
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        items.value = data?.top_products || [];
    } finally {
        loading.value = false;
    }
};

watch(() => props.dateRange, loadData, { deep: true });
onMounted(loadData);
</script>

<template>
  <div class="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 h-full">
    <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">{{ __('Produtos mais vendidos', 'flexify-dashboard') }}</h3>
    
	<div v-if="loading" class="space-y-3">
      <div
        v-for="index in 4"
        :key="`placeholder-${index}`"
        class="flex items-center justify-between gap-4"
      >
        <div class="h-4 w-2/3 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
        <div class="h-4 w-1/4 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
      </div>
    </div>

    <div class="space-y-2" v-else-if="items.length">
      <div v-for="item in items" :key="item.product_id" class="flex justify-between text-sm">
        <span class="text-zinc-700 dark:text-zinc-300 truncate pr-4">{{ item.name }}</span>
        <span class="text-zinc-900 dark:text-zinc-100 font-medium">{{ item.quantity }} • {{ formatCurrency(item.revenue) }}</span>
      </div>
    </div>
	
    <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">{{ __('Sem dados no período selecionado.', 'flexify-dashboard') }}</p>
  </div>
</template>