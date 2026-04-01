<script setup>
import { computed, ref, watch } from 'vue';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Object, required: true } });

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
    <div class="bg-white border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 h-full flex flex-col justify-between">
        <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{{ __('Average Order Value', 'flexify-dashboard') }}</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{{ __('Average value per order in the selected period', 'flexify-dashboard') }}</p>
        </div>

        <div class="space-y-4">
            <div v-if="loading" class="h-10 w-36 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
            <div v-else class="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {{ formattedValue }}
            </div>

            <div class="rounded-2xl bg-white/70 dark:bg-zinc-950/30 border border-zinc-200/60 dark:border-zinc-700/30 px-4 py-3">
                <div class="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    {{ __('Indicator', 'flexify-dashboard') }}
                </div>
                <p class="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {{ __('Shows how much revenue each order generates on average during the selected period.', 'flexify-dashboard') }}
                </p>
            </div>
        </div>
    </div>
</template>
