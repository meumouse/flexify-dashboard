<script setup>
import { computed, ref, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Array, required: true } });

const value = ref(0);
const currency = ref('USD');
const loading = ref(false);

const loadData = async () => {
    loading.value = true;

    try {
        const data = await getWooDashboardData(props.dateRange);
        value.value = data?.average_ticket || 0;
        currency.value = data?.currency || 'USD';
    } finally {
        loading.value = false;
    }
};

const formattedValue = computed(() => formatCurrency(value.value, currency.value));

watch(() => props.dateRange, loadData, { deep: true, immediate: true });
</script>

<template>
    <div class="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl py-6 px-8 h-full flex flex-col justify-between">
        <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ __('Average Order Value', 'flexify-dashboard') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ __('Average value per order in the selected period', 'flexify-dashboard') }}</p>
        </div>

        <div class="space-y-4">
            <div v-if="loading" class="h-10 w-36 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div v-else class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                {{ formattedValue }}
            </div>
        </div>
    </div>
</template>
