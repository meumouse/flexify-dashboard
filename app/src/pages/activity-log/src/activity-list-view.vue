<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { useDarkMode } from './useDarkMode.js';
import Drawer from '@/components/utility/drawer/index.vue';
const { isDark } = useDarkMode();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import ActivityList from './activity-list.vue';
import ActivityDetailsView from './activity-details-view.vue';

const router = useRouter();
const route = useRoute();

// Refs
const loading = ref(false);
const activities = ref([]);
const filteredActivities = ref([]);
const searchQuery = ref('');
const actionFilter = ref('all');
const objectTypeFilter = ref('all');
const userFilter = ref(null);
const dateFromFilter = ref(null);
const dateToFilter = ref(null);
const sortBy = ref('date');
const sortOrder = ref('desc');
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const drawerOpen = ref(false);
const selectedActivities = ref([]);
const lastSelectedIndex = ref(null);
const pagination = ref({
  page: 1,
  per_page: 30,
  total: 0,
  totalPages: 0,
  search: '',
  order: 'desc',
  orderby: 'created_at',
});

// Computed property for window width
const windowWidthComputed = computed(() => windowWidth.value);

// Pagination helpers
const canGoPrev = computed(() => pagination.value.page > 1);
const canGoNext = computed(
  () =>
    pagination.value.totalPages > 0 &&
    pagination.value.page < pagination.value.totalPages
);

const goPrevPage = async () => {
  if (!canGoPrev.value) return;
  pagination.value.page -= 1;
  await getActivitiesData();
};

const goNextPage = async () => {
  if (!canGoNext.value) return;
  pagination.value.page += 1;
  await getActivitiesData();
};

/**
 * Fetches activity logs from WordPress REST API
 */
const getActivitiesData = async () => {
  loading.value = true;
  appStore.updateState('loading', true);

  const params = {
    page: pagination.value.page,
    per_page: pagination.value.per_page,
    search: pagination.value.search || searchQuery.value || undefined,
    order: pagination.value.order,
    orderby: pagination.value.orderby,
  };

  // Add filters if not 'all'
  if (actionFilter.value !== 'all') {
    params.action = actionFilter.value;
  }

  if (objectTypeFilter.value !== 'all') {
    params.object_type = objectTypeFilter.value;
  }

  if (userFilter.value) {
    params.user_id = userFilter.value;
  }

  if (dateFromFilter.value) {
    params.date_from = dateFromFilter.value;
  }

  if (dateToFilter.value) {
    params.date_to = dateToFilter.value;
  }

  const args = {
    endpoint: 'flexify-dashboard/v1/activity-log',
    params,
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data) return;

  activities.value = data.data || [];
  pagination.value.total = parseInt(data.totalItems || 0);
  pagination.value.totalPages = parseInt(data.totalPages || 0);
};

/**
 * Handle activity item selection - navigate to details
 */
const selectActivityItem = (item) => {
  router.push({ name: 'activity-log-details', params: { logId: item.id } });
};

/**
 * Handle activity checkbox selection
 */
const toggleActivitySelection = (item, event) => {
  const currentIndex = filteredActivities.value.findIndex(
    (activity) => activity.id === item.id
  );

  // Handle shift+click for range selection
  if (event?.shiftKey && lastSelectedIndex.value !== null) {
    const start = Math.min(lastSelectedIndex.value, currentIndex);
    const end = Math.max(lastSelectedIndex.value, currentIndex);

    const rangeItems = filteredActivities.value.slice(start, end + 1);
    const rangeIds = rangeItems.map((activity) => activity.id);

    rangeIds.forEach((id) => {
      if (!selectedActivities.value.includes(id)) {
        selectedActivities.value.push(id);
      }
    });

    lastSelectedIndex.value = currentIndex;
  } else {
    const index = selectedActivities.value.findIndex((id) => id === item.id);
    if (index > -1) {
      selectedActivities.value.splice(index, 1);
    } else {
      selectedActivities.value.push(item.id);
    }

    lastSelectedIndex.value = currentIndex;
  }
};

/**
 * Check if activity item is selected
 */
const isActivitySelected = (item) => {
  return selectedActivities.value.includes(item.id);
};

/**
 * Computed property to check if there are selected items
 */
const hasSelection = computed(() => {
  return selectedActivities.value.length > 0;
});

/**
 * Clear selection
 */
const clearSelection = () => {
  selectedActivities.value = [];
  lastSelectedIndex.value = null;
};

/**
 * Handle search
 */
const handleSearch = async () => {
  pagination.value.page = 1;
  pagination.value.search = searchQuery.value;
  await getActivitiesData();
};

/**
 * Handle filter changes
 */
const handleFilterChange = async () => {
  pagination.value.page = 1;
  await getActivitiesData();
};

// Watch for route changes to update drawer
watch(
  () => route.params.logId,
  (newLogId) => {
    if (windowWidth.value < 1024) {
      drawerOpen.value = !!newLogId;
    }
  },
  { immediate: true }
);

// Watch for window resize
const handleResize = () => {
  windowWidth.value = window.innerWidth;
  if (windowWidth.value >= 1024) {
    drawerOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  handleResize();
  getActivitiesData();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Get available action types for filter
const actionTypes = computed(() => {
  const actions = new Set();
  activities.value.forEach((activity) => {
    if (activity.action) {
      actions.add(activity.action);
    }
  });
  return Array.from(actions).sort();
});

// Get available object types for filter
const objectTypes = computed(() => {
  const types = new Set();
  activities.value.forEach((activity) => {
    if (activity.object_type) {
      types.add(activity.object_type);
    }
  });
  return Array.from(types).sort();
});

// Filter activities based on current filters (client-side filtering for display)
watch([activities, searchQuery], () => {
  filteredActivities.value = activities.value;
});
</script>

<template>
  <div
    class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize"
    :class="isDark ? 'dark' : ''"
  >
    <!-- Activity List Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {{ __('Activity Log', 'flexify-dashboard') }}
          </h1>
        </div>

        <!-- Search Bar -->
        <div class="relative mb-4">
          <AppIcon
            icon="search"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-base pointer-events-none"
          />
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            :placeholder="__('Search activities...', 'flexify-dashboard')"
            class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>

        <!-- Filters -->
        <div class="space-y-3">
          <!-- Action Filter -->
          <div>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
            >
              {{ __('Action', 'flexify-dashboard') }}
            </label>
            <select
              v-model="actionFilter"
              @change="handleFilterChange"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="all">{{ __('All Actions', 'flexify-dashboard') }}</option>
              <option
                v-for="action in actionTypes"
                :key="action"
                :value="action"
              >
                {{ action }}
              </option>
            </select>
          </div>

          <!-- Object Type Filter -->
          <div>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
            >
              {{ __('Object Type', 'flexify-dashboard') }}
            </label>
            <select
              v-model="objectTypeFilter"
              @change="handleFilterChange"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="all">{{ __('All Types', 'flexify-dashboard') }}</option>
              <option v-for="type in objectTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Results Count -->
      <div class="flex flex-row place-content-between items-center px-6 pr-4">
        <div
          class="py-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500"
        >
          {{ pagination.total }}
          {{
            pagination.total === 1
              ? __('item', 'flexify-dashboard')
              : __('items', 'flexify-dashboard')
          }}
        </div>

        <div class="flex flex-row items-center">
          <div class="text-xs text-zinc-500 dark:text-zinc-500 mr-2">
            {{ __('Page', 'flexify-dashboard') }} {{ pagination.page }}
            <span v-if="pagination.totalPages > 0">
              / {{ pagination.totalPages }}
            </span>
          </div>
          <AppButton
            type="transparent"
            :disabled="!canGoPrev"
            @click="goPrevPage"
            :aria-disabled="!canGoPrev"
            :title="__('Previous', 'flexify-dashboard')"
          >
            <AppIcon icon="chevron_left" />
          </AppButton>
          <AppButton
            type="transparent"
            :disabled="!canGoNext"
            @click="goNextPage"
            :aria-disabled="!canGoNext"
            :title="__('Next', 'flexify-dashboard')"
          >
            <AppIcon icon="chevron_right" />
          </AppButton>
        </div>
      </div>

      <!-- Activity List -->
      <div class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar">
        <ActivityList
          :activities="filteredActivities"
          :selected-activities="selectedActivities"
          @select-activity="selectActivityItem"
          @toggle-selection="toggleActivitySelection"
        />
      </div>
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-l-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <RouterView key="activity-log-details-content" v-slot="{ Component }">
        <div class="flex-1 flex items-center justify-center" v-if="!Component">
          <div class="text-center">
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon icon="history" class="text-2xl text-zinc-400" />
            </div>
            <h3
              class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
            >
              {{ __('Activity Details', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {{
                __(
                  'Select an activity from the list to view detailed information.',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>
        </div>

        <component
          :is="Component"
          v-else-if="Component && windowWidthComputed > 1024"
        />

        <Drawer
          v-else-if="Component && windowWidthComputed <= 1024"
          v-model="drawerOpen"
          size="full"
          :show-header="false"
          :show-close-button="false"
          :close-on-overlay-click="true"
          :close-on-escape="true"
          @close="router.push('/')"
        >
          <component :is="Component" />
        </Drawer>
      </RouterView>
    </div>
  </div>
</template>

<style scoped></style>

<style>
#wpbody,
#wpcontent {
  padding: 0 !important;
}

html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}
</style>
