<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { ShadowRoot } from 'vue-shadow-dom';
import { useDarkMode } from './src/useDarkMode.js';
const { isDark } = useDarkMode();

// Configure veaury for React 19 support
import { setVeauryOptions } from 'veaury';
import { createRoot } from 'react-dom/client';
setVeauryOptions({
  react: {
    createRoot,
  },
});

// Import the hooks system
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';

// Cards
import './src/cards/index.js';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Comps
import Notifications from '@/components/utility/notifications/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import CardRender from './src/card-render.vue';

// Dashboard components
import DateRangePicker from './src/date-range-picker.vue';

// Refs
const confirm = ref(null);

// Helper function to parse date from query param
const parseDateFromQuery = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Helper function to format date for query param (YYYY-MM-DD)
const formatDateForQuery = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initialize date range from query params or use default
const initializeDateRange = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dateFrom = urlParams.get('date_from');
  const dateTo = urlParams.get('date_to');

  if (dateFrom && dateTo) {
    const fromDate = parseDateFromQuery(dateFrom);
    const toDate = parseDateFromQuery(dateTo);
    if (fromDate && toDate) {
      return [fromDate, toDate];
    }
  }

  // Default: last 7 days
  return [new Date(new Date().setDate(new Date().getDate() - 7)), new Date()];
};

// Dashboard state
const dateRange = ref(initializeDateRange());

const registeredCards = ref([]);
const registeredCategories = ref([]);
const activeCategory = ref(null);
const loading = ref(false);

const isWooCommerceActive = computed(() => {
    const plugins = appStore.state?.activePlugins || [];

    return plugins.some((plugin) =>
      	plugin?.path === 'woocommerce/woocommerce.php' || plugin?.slug === 'woocommerce'
    );
});

const activeCategoryID = computed(() => {
	const urlParams = new URLSearchParams(window.location.search);
	const dashboardCategory = urlParams.get('dashboard_category');

	if (dashboardCategory) {
		const siteCategory = registeredCategories.value.find(
			(category) => category.value === dashboardCategory
		)?.value;

		if (siteCategory) {
			return siteCategory;
		}
	}

	if (registeredCategories.value[0]) {
		return registeredCategories.value[0].value;
	}

	return null;
});

const formattedCategories = computed(() => {
	const formattedCategories = {};

	registeredCategories.value.forEach((category) => {
		formattedCategories[category.value] = category;
	});

	return formattedCategories;
});

/**
 * Handle date range changes
 */
const handleDateRangeChange = (newDateRange) => {
	dateRange.value = newDateRange;
	updateDateRangeQueryParams(newDateRange);
};

/**
 * Update query parameters with date range
 */
const updateDateRangeQueryParams = (range) => {
	if (!range || !Array.isArray(range) || range.length !== 2) {
		return;
	}

	const urlParams = new URLSearchParams(window.location.search);

	if (range[0]) {
		urlParams.set('date_from', formatDateForQuery(range[0]));
	} else {
		urlParams.delete('date_from');
	}

	if (range[1]) {
		urlParams.set('date_to', formatDateForQuery(range[1]));
	} else {
		urlParams.delete('date_to');
	}

	window.history.replaceState(
		{},
		'',
		`${window.location.pathname}?${urlParams.toString()}`
	);
};

watch(
	registeredCategories,
	(newVal, oldVal) => {
		activeCategory.value = activeCategoryID.value;
	},
	{ deep: true }
);

onMounted(async () => {
  // Dispatch event for plugins to register cards
  const event = new CustomEvent('flexify-dashboard/dashboard/ready');
  document.dispatchEvent(event);

  await nextTick();

  // Add categories
  registeredCategories.value = await applyFilters(
    'flexify-dashboard/dashboard/categories/register',
    registeredCategories.value
  );

  if (
    isWooCommerceActive.value &&
    !registeredCategories.value.some((category) => category.value === 'e-commerce')
  ) {
    registeredCategories.value.push({
      value: 'e-commerce',
      label: __('e-Commerce', 'flexify-dashboard'),
    });
  }

  // Let other apps modify/add to the widgets array
  registeredCards.value = await applyFilters(
    'flexify-dashboard/dashboard/cards/register',
    registeredCards.value
  );

  // Initialize date range query params if not present
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('date_from') || !urlParams.has('date_to')) {
    updateDateRangeQueryParams(dateRange.value);
  }
});

watch(activeCategory, (newVal, oldVal) => {
  if (newVal === oldVal) return;

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('dashboard_category', newVal);
  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}?${urlParams.toString()}`
  );
});
</script>

<template>
  <div tag="div" class="flexify-dashboard-isolation">
    <component is="style"> #wpcontent{padding:0}</component>
    <Notifications />
    <div
      :class="isDark ? 'dark' : ''"
      class="border border-solid border-zinc-200/50 dark:border-zinc-700/30 rounded-l-3xl max-h-[var(--fd-body-height)] overflow-auto bg-white dark:bg-zinc-800/20"
    >
      <div
        class="@container flexify-dashboard-normalize font-sans p-8 flex flex-col gap-6 text-zinc-500 dark:text-zinc-400"
        style="min-height: calc(100dvh - var(--wp-admin--admin-bar--height))"
      >
        <!-- Dashboard Header -->
        <div class="flex flex-row justify-between items-center mb-3">
          <div>
            <h1 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Dashboard', 'flexify-dashboard') }}
            </h1>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {{ __('Overview of your site activity', 'flexify-dashboard') }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Date Range Picker -->
            <DateRangePicker
              :value="dateRange"
              @updated="handleDateRangeChange"
            />
          </div>
        </div>

        <div
          v-if="registeredCategories.length > 0"
          class="flex items-center mb-3"
        >
          <AppToggle
            :options="formattedCategories"
            v-model="activeCategory"
            class="w-auto mr-auto"
            style="width: auto"
          />
        </div>

        <!-- Dashboard Cards Grid -->
        <div v-if="registeredCards.length > 1" class="grid grid-cols-12 gap-10">
          <template v-for="card in registeredCards">
            <CardRender
              v-if="card.metadata.category === activeCategory"
              :key="card.metadata.id"
              :card="card"
              :date-range="dateRange"
            />
          </template>
        </div>

        <!-- Default content if no cards -->
        <div
          v-else
          class="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-8 text-center"
        >
          <AppIcon
            icon="dashboard"
            class="text-4xl text-zinc-400 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {{ __('No Dashboard Cards', 'flexify-dashboard') }}
          </h3>
          <p class="text-zinc-500 dark:text-zinc-400">
            {{
              __(
                'Install plugins or extensions to add dashboard cards here.',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>

        <Confirm ref="confirm" />
      </div>
    </div>
  </div>
</template>
