<script setup>
import { ref, computed, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { useChartTheme } from '@/composables/useChartTheme.js';

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

const { chartOptions: themedChartOptions } = useChartTheme();

const chartOptions = computed(() =>
  themedChartOptions({
    chart: { type: 'area' },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.45, opacityTo: 0 },
    },
    xaxis: {
      categories: chartData.value?.labels || [],
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (value) => (Number.isInteger(value) ? value : ''),
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${value} new users`,
      },
    },
  })
);

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
    class="bg-white dark:bg-white/[0.03] rounded-2xl p-6 h-full flex flex-col border border-gray-200 dark:border-gray-800 pb-2"
  >
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ __('Loading user analytics...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="error" class="text-4xl text-error-500 mx-auto mb-3" />
        <p class="text-sm text-error-600 dark:text-error-400 mb-2">
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
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ __('User Analytics', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ __('User registration trends', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 py-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {{ totalUsers.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ __('Total Users', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {{ usersInRange.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ __('In Range', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {{ recentUsers.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ __('Recent (7d)', 'flexify-dashboard') }}
          </div>
        </div>
      </div>

      <div
        v-if="chartData"
        class="bg-white dark:bg-white/[0.03] rounded-xl p-4 -mx-3 -mb-3 border border-gray-200 dark:border-gray-800"
      >
        <div class="h-48">
          <VueApexCharts
            height="100%"
            type="area"
            :options="chartOptions"
            :series="chartSeries"
          />
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="people" class="text-4xl text-gray-400 mx-auto mb-3" />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ __('No user data available', 'flexify-dashboard') }}
        </p>
      </div>
    </div>
  </div>
</template>
