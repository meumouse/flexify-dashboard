<script setup>
import { computed, ref, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { useChartTheme } from '@/composables/useChartTheme.js';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Array, required: true } });
const translate = window.wp?.i18n?.__ ?? ((value) => value);

const data = ref(null);
const loading = ref(false);
const error = ref(null);

const loadData = async () => {
    loading.value = true;
    error.value = null;

    try {
        data.value = await getWooDashboardData(props.dateRange);
    } catch (err) {
        error.value = err?.message || 'Failed to load WooCommerce revenue';
    } finally {
        loading.value = false;
    }
};

const currency = computed(() => data.value?.currency || 'USD');
const chartData = computed(() => data.value?.revenue?.chart_data || null);
const chartInterval = computed(() => chartData.value?.interval || 'month');

const chartSeries = computed(() => {
    if (!chartData.value?.datasets?.length) {
        return [];
    }

    return chartData.value.datasets.map((dataset) => ({
        name: dataset.label,
        data: dataset.data || [],
    }));
});

const formattedSelectedRange = computed(() => {
    const [start, end] = props.dateRange || [];

    if (!start || !end) {
        return translate('Selected period', 'flexify-dashboard');
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    return `${formatter.format(start)} - ${formatter.format(end)}`;
});

const dateRangeLabel = computed(() => {
    if (chartInterval.value === 'day') {
        return formattedSelectedRange.value;
    }

    if (chartInterval.value === 'week') {
        return `${translate('Weekly period', 'flexify-dashboard')} • ${formattedSelectedRange.value}`;
    }

    return `${translate('Monthly period', 'flexify-dashboard')} • ${formattedSelectedRange.value}`;
});

const { chartOptions: themedChartOptions } = useChartTheme();

const chartOptions = computed(() =>
    themedChartOptions({
        chart: { type: 'area' },
        stroke: { width: 2 },
        fill: {
            type: 'gradient',
            gradient: { opacityFrom: 0.45, opacityTo: 0 },
        },
        legend: {
            show: true,
            position: 'bottom',
            horizontalAlign: 'center',
            fontSize: '12px',
            markers: { size: 5, shape: 'circle' },
        },
        xaxis: {
            categories: chartData.value?.labels || [],
            tooltip: { enabled: false },
        },
        yaxis: {
            min: 0,
            tickAmount: 6,
            labels: {
                formatter: (value) => formatCurrency(value, currency.value),
            },
        },
        tooltip: {
            y: {
                formatter: (value) => formatCurrency(value, currency.value),
            },
        },
    })
);

watch(() => props.dateRange, loadData, { deep: true, immediate: true });
</script>

<template>
    <div class="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl py-6 px-8 h-full flex flex-col">
        <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="text-center">
                <div class="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ __('Loading revenue...', 'flexify-dashboard') }}
                </p>
            </div>
        </div>

        <div v-else-if="error" class="flex-1 flex items-center justify-center">
            <div class="text-center">
                <p class="text-sm text-error-600 dark:text-error-400 mb-2">
                    {{ __('Failed to load revenue', 'flexify-dashboard') }}
                </p>
                <button
                    @click="loadData"
                    class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                    {{ __('Try again', 'flexify-dashboard') }}
                </button>
            </div>
        </div>

        <div v-else class="h-full flex flex-col gap-5">
            <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ __('Revenue', 'flexify-dashboard') }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ dateRangeLabel }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div class="rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 px-4 py-3">
                    <div class="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                        {{ __('Gross', 'flexify-dashboard') }}
                    </div>
                    <div class="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {{ formatCurrency(data?.revenue?.gross, currency) }}
                    </div>
                </div>

                <div class="rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 px-4 py-3">
                    <div class="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                        {{ __('Net', 'flexify-dashboard') }}
                    </div>
                    <div class="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {{ formatCurrency(data?.revenue?.net, currency) }}
                    </div>
                </div>
            </div>

            <div
                v-if="chartSeries.length"
                class="bg-white dark:bg-white/[0.03] -mx-2 flex-1"
            >
                <div class="h-[360px] max-md:h-72">
                    <VueApexCharts
                        height="100%"
                        type="area"
                        :options="chartOptions"
                        :series="chartSeries"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
