<script setup>
import { ref, onMounted, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Object, required: true } });
const data = ref(null);
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        data.value = await getWooDashboardData(props.dateRange);
    } finally {
        loading.value = false;
    }
};

watch(() => props.dateRange, loadData, { deep: true });
onMounted(loadData);
</script>

<template>
	<div class="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 h-full">
		<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{{ __('Faturamento', 'flexify-dashboard') }}</h3>
		<p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{{ __('Período filtrado por data', 'flexify-dashboard') }}</p>
		
		<div class="space-y-2">
			<div class="text-sm text-zinc-500 dark:text-zinc-400">{{ __('Bruto', 'flexify-dashboard') }}</div>
			
			<div
				v-if="loading"
				class="h-8 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"
			></div>
			
			<div v-else class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{{ formatCurrency(data?.revenue?.gross) }}</div>
			
			<div class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{{ __('Líquido', 'flexify-dashboard') }}</div>
			
			<div
				v-if="loading"
				class="h-7 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"
			></div>
			<div v-else class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{{ formatCurrency(data?.revenue?.net) }}</div>
		</div>
	</div>
</template>