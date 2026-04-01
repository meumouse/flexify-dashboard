<script setup>
import { ref, computed, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

const props = defineProps({
	dateRange: {
		type: Object,
		required: true,
	},
	appData: {
		type: Object,
		required: true,
	},
});

const analytics = ref(null);
const loading = ref(false);
const error = ref(null);

const loadAnalytics = async () => {
	loading.value = true;
	error.value = null;

	try {
		const response = await lmnFetch({
			endpoint: 'flexify-dashboard/v1/user-analytics',
			type: 'GET',
			params: {
				start_date: props.dateRange[0].toISOString(),
				end_date: props.dateRange[1].toISOString(),
			},
		});

		analytics.value = response.data;
	} catch (err) {
		error.value = err.message || 'Failed to load user analytics';
		console.error('User analytics error:', err);
	} finally {
		loading.value = false;
	}
};

const totalUsers = computed(() => analytics.value?.total_users || 0);
const usersInRange = computed(() => analytics.value?.users_in_range || 0);
const recentUsers = computed(() => analytics.value?.recent_users || 0);
const chartData = computed(() => analytics.value?.chart_data || null);

const chartSeries = computed(() => {
  if (!chartData.value?.datasets?.length) return [];

  return [
    {
      name: chartData.value.datasets[0].label || 'New users',
      data: chartData.value.datasets[0].data || [],
    },
  ];
});

const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  markers: {
    size: 4,
    hover: { size: 6 },
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
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    labels: {
      formatter: (value) => (Number.isInteger(value) ? value : ''),
      style: {
        colors: 'rgb(113, 113, 122)',
        fontSize: '12px',
      },
    },
  },
  grid: {
    borderColor: 'rgba(113, 113, 122, 0.1)',
    xaxis: { lines: { show: false } },
  },
  tooltip: {
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    y: {
      formatter: (value) => `${value} new users`,
    },
  },
  legend: { show: false },
  colors: [chartData.value?.datasets?.[0]?.borderColor || 'rgb(99, 102, 241)'],
}));

watch(
  () => props.dateRange,
  () => {
    if (!props.dateRange) return;
    loadAnalytics();
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div
    class="bg-white rounded-3xl p-6 h-full flex flex-col border border-zinc-200/40 dark:border-zinc-800/60 pb-2"
  >
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading user analytics...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="error" class="text-4xl text-red-500 mx-auto mb-3" />
        <p class="text-sm text-red-600 dark:text-red-400 mb-2">
          {{ __('Failed to load user analytics', 'flexify-dashboard') }}
        </p>
        <button
          @click="loadAnalytics"
          class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
        >
          {{ __('Try again', 'flexify-dashboard') }}
        </button>
      </div>
    </div>

    <div v-else-if="analytics" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('User Analytics', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ __('User registration trends', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 py-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {{ totalUsers.toLocaleString() }}
          </div>
          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Total Users', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {{ usersInRange.toLocaleString() }}
          </div>
          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('In Range', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {{ recentUsers.toLocaleString() }}
          </div>
          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Recent (7d)', 'flexify-dashboard') }}
          </div>
        </div>
      </div>

      <div
        v-if="chartData"
        class="bg-white dark:bg-zinc-950/40 rounded-xl p-4 -mx-3 -mb-3 border border-zinc-200/40 dark:border-zinc-700/20"
      >
        <div class="h-48">
          <VueApexCharts
            height="100%"
            type="line"
            :options="chartOptions"
            :series="chartSeries"
          />
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="people" class="text-4xl text-zinc-400 mx-auto mb-3" />
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('No user data available', 'flexify-dashboard') }}
        </p>
      </div>
    </div>
  </div>
</template>
