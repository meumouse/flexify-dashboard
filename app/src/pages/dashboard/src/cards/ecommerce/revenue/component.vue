<script setup>
import { computed, ref, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getWooDashboardData, formatCurrency } from '../useWooCommerceDashboard.js';

const props = defineProps({ dateRange: { type: Object, required: true } });

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

const chartSeries = computed(() => {
    if (!chartData.value?.datasets?.length) {
        return [];
    }

    return chartData.value.datasets.map((dataset) => ({
        name: dataset.label,
        data: dataset.data || [],
    }));
});

const dateRangeLabel = computed(() => {
    const totalLabels = chartData.value?.labels?.length || 0;

    if (totalLabels >= 12) {
        return __('Últimos 12 meses', 'flexify-dashboard');
    }

    if (totalLabels > 1) {
        return __('Últimos meses', 'flexify-dashboard');
    }

    return __('Período filtrado por data', 'flexify-dashboard');
});

const chartOptions = computed(() => ({
    chart: {
        type: 'line',
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { speed: 300 },
    },
    dataLabels: { enabled: false },
    stroke: {
        curve: 'smooth',
        width: 4,
    },
    markers: {
        size: 0,
        hover: {
            size: 5,
        },
    },
    legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '12px',
        labels: {
            colors: 'rgb(113, 113, 122)',
        },
        markers: {
            width: 10,
            height: 10,
            radius: 999,
        },
    },
    colors: chartData.value?.datasets?.map((dataset) => dataset.borderColor) || ['#339AF0', '#20C997'],
    grid: {
        borderColor: 'rgba(113, 113, 122, 0.14)',
        xaxis: {
            lines: { show: false },
        },
    },
    xaxis: {
        categories: chartData.value?.labels || [],
        labels: {
            style: {
                colors: 'rgb(113, 113, 122)',
                fontSize: '12px',
            },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
    },
    yaxis: {
        min: 0,
        tickAmount: 6,
        labels: {
            formatter: (value) => formatCurrency(value, currency.value),
            style: {
                colors: 'rgb(113, 113, 122)',
                fontSize: '12px',
            },
        },
    },
    tooltip: {
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        y: {
            formatter: (value) => formatCurrency(value, currency.value),
        },
    },
}));

watch(() => props.dateRange, loadData, { deep: true, immediate: true });
</script>

<template>
    <div class="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 h-full flex flex-col">
        <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="text-center">
                <div class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                    {{ __('Carregando faturamento...', 'flexify-dashboard') }}
                </p>
            </div>
        </div>

        <div v-else-if="error" class="flex-1 flex items-center justify-center">
            <div class="text-center">
                <p class="text-sm text-red-600 dark:text-red-400 mb-2">
                    {{ __('Falha ao carregar faturamento', 'flexify-dashboard') }}
                </p>
                <button
                    @click="loadData"
                    class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                    {{ __('Tentar novamente', 'flexify-dashboard') }}
                </button>
            </div>
        </div>

        <div v-else class="h-full flex flex-col gap-5">
            <div>
                <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{{ __('Faturamento', 'flexify-dashboard') }}</h3>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ dateRangeLabel }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div class="rounded-2xl bg-white/70 dark:bg-zinc-950/30 border border-zinc-200/60 dark:border-zinc-700/30 px-4 py-3">
                    <div class="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        {{ __('Bruto', 'flexify-dashboard') }}
                    </div>
                    <div class="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {{ formatCurrency(data?.revenue?.gross, currency) }}
                    </div>
                </div>

                <div class="rounded-2xl bg-white/70 dark:bg-zinc-950/30 border border-zinc-200/60 dark:border-zinc-700/30 px-4 py-3">
                    <div class="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        {{ __('Líquido', 'flexify-dashboard') }}
                    </div>
                    <div class="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {{ formatCurrency(data?.revenue?.net, currency) }}
                    </div>
                </div>
            </div>

            <div
                v-if="chartSeries.length"
                class="bg-white dark:bg-zinc-950/40 rounded-3xl border border-zinc-200/40 dark:border-zinc-700/20 p-4 -mx-2 flex-1"
            >
                <div class="h-[360px] max-md:h-72">
                    <VueApexCharts
                        height="100%"
                        type="line"
                        :options="chartOptions"
                        :series="chartSeries"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
