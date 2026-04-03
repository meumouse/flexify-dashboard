<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import Drawer from '@/components/utility/drawer/index.vue';

const router = useRouter();
const route = useRoute();

// Refs
const loading = ref(false);
const tables = ref([]);
const searchQuery = ref('');
const selectedTable = ref(null);
const drawerOpen = ref(false);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const sortBy = ref('name'); // 'name', 'rows', 'size', 'type'
const sortOrder = ref('asc'); // 'asc' or 'desc'
const filtersExpanded = ref(false);
const showNonWpOnly = ref(false); // Filter to show only non-WordPress tables

/**
 * Fetches list of all database tables
 */
const fetchTables = async () => {
  loading.value = true;
  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/database/tables',
    };
    const data = await lmnFetch(args);
    if (data && data.data) {
      tables.value = data.data;
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
  } finally {
    loading.value = false;
  }
};

/**
 * Filters and sorts tables based on search query and sort options
 */
const filteredTables = computed(() => {
  let filtered = [...tables.value];

  // Filter by non-WordPress tables only
  if (showNonWpOnly.value) {
    filtered = filtered.filter((table) => !table.is_wp_table);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((table) =>
      table.name.toLowerCase().includes(query)
    );
  }

  // Sort tables
  filtered.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy.value) {
      case 'rows':
        aValue = a.row_count || 0;
        bValue = b.row_count || 0;
        break;
      case 'size':
        aValue = a.size_mb || 0;
        bValue = b.size_mb || 0;
        break;
      case 'type':
        // Sort by WordPress tables first, then custom tables
        aValue = a.is_wp_table ? 0 : 1;
        bValue = b.is_wp_table ? 0 : 1;
        break;
      case 'name':
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
    }

    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return filtered;
});

/**
 * Handles table selection
 * @param {Object} table - The selected table object
 */
const selectTable = (table) => {
  selectedTable.value = table;
  router.push(`/table/${table.name}`);

  // Open drawer on mobile
  if (windowWidth.value <= 1024) {
    drawerOpen.value = true;
  }
};

/**
 * Navigates to query editor
 */
const openQueryEditor = () => {
  router.push('/query');
};

/**
 * Updates window width on resize
 */
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  fetchTables();
  windowWidth.value = window.innerWidth;
  window.addEventListener('resize', updateWindowWidth);
});

// Watch route changes to close drawer on mobile when navigating away
watch(
  () => route.path,
  () => {
    if (windowWidth.value <= 1024 && route.path === '/') {
      drawerOpen.value = false;
    }
    // Refresh table list when returning to main view (e.g., after deletion)
    if (route.path === '/') {
      fetchTables();
    }
  }
);
</script>

<template>
  <div
    class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize"
  >
    <!-- Database Tables Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {{ __('Database Explorer', 'flexify-dashboard') }}
          </h1>
          <AppButton type="primary" @click="openQueryEditor" class="text-sm">
            <AppIcon icon="code" class="text-base" />
          </AppButton>
        </div>

        <!-- Search Bar -->
        <div class="relative flex items-center">
          <AppIcon
            icon="search"
            class="absolute left-3 text-lg text-zinc-400 dark:text-zinc-500 pointer-events-none"
          />
          
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search tables...', 'flexify-dashboard')"
            class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>
      </div>

      <!-- Compact Filter Bar -->
      <div class="px-6 py-3">
        <div class="flex items-center gap-2">
          <!-- Sort Order Toggle -->
          <button
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
            class="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            :title="
              sortOrder === 'asc'
                ? __('Ascending', 'flexify-dashboard')
                : __('Descending', 'flexify-dashboard')
            "
          >
            <AppIcon
              :icon="sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'"
              class="text-sm text-zinc-600 dark:text-zinc-400"
            />
          </button>

          <!-- Sort & Filter Button -->
          <button
            @click="filtersExpanded = !filtersExpanded"
            :class="[
              'relative p-2 rounded-md transition-colors',
              filtersExpanded
                ? 'bg-zinc-900 dark:bg-zinc-100'
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            ]"
          >
            <AppIcon
              icon="tune"
              :class="[
                'text-sm',
                filtersExpanded
                  ? 'text-white dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400',
              ]"
            />
          </button>
        </div>

        <!-- Expanded Filters Panel -->
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-96"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-96"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="filtersExpanded" class="mt-3 pt-3 space-y-3">
            <!-- Filter: Non-WP Tables Only -->
            <div>
              <label
                class="flex items-center gap-2 cursor-pointer group"
                @click="showNonWpOnly = !showNonWpOnly"
              >
                <input
                  type="checkbox"
                  v-model="showNonWpOnly"
                  class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
                <span
                  class="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors"
                >
                  {{ __('Show non-WordPress tables only', 'flexify-dashboard') }}
                </span>
              </label>
            </div>

            <!-- Sort By -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
              >
                {{ __('Sort By', 'flexify-dashboard') }}
              </label>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="option in [
                    { value: 'name', label: 'Name', icon: 'sort_by_alpha' },
                    { value: 'rows', label: 'Rows', icon: 'table' },
                    { value: 'size', label: 'Size', icon: 'data_usage' },
                    { value: 'type', label: 'Type', icon: 'category' },
                  ]"
                  :key="option.value"
                  @click="sortBy = option.value"
                  :class="[
                    'flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                    sortBy === option.value
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  ]"
                >
                  <AppIcon :icon="option.icon" class="text-sm" />
                  {{ __(option.label, 'flexify-dashboard') }}
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Results Count -->
      <div class="flex flex-row place-content-between items-center px-6 pr-4">
        <div
          class="py-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500"
        >
          {{ filteredTables.length }}
          {{
            filteredTables.length === 1
              ? __('table', 'flexify-dashboard')
              : __('tables', 'flexify-dashboard')
          }}
        </div>
      </div>

      <!-- Tables List -->
      <div class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar">
        <div v-if="loading && !tables.length" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon
              icon="database"
              class="text-zinc-400 text-xl animate-pulse"
            />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Loading tables...', 'flexify-dashboard') }}
          </p>
        </div>

        <div v-else-if="filteredTables.length === 0" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="database" class="text-zinc-400 text-xl" />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {{
              searchQuery
                ? __('No tables found', 'flexify-dashboard')
                : __('No tables available', 'flexify-dashboard')
            }}
          </p>
        </div>

        <div v-else class="space-y-1.5">
          <div
            v-for="table in filteredTables"
            :key="table.name"
            @click="selectTable(table)"
            class="p-3 rounded-xl cursor-pointer transition-all group -mx-3"
            :class="
              selectedTable?.name === table.name
                ? 'bg-zinc-200 dark:bg-zinc-800'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
            "
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5">
                  <span
                    :class="[
                      'text-sm font-medium truncate',
                      selectedTable?.name === table.name
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-zinc-500 dark:text-zinc-400',
                    ]"
                  >
                    {{ table.name }}
                  </span>
                </div>
                <div
                  :class="[
                    'flex items-center gap-3 text-xs',
                    selectedTable?.name === table.name
                      ? 'text-zinc-500 dark:text-zinc-400'
                      : 'text-zinc-500 dark:text-zinc-400',
                  ]"
                >
                  <span
                    >{{ table.row_count.toLocaleString() }}
                    {{ __('rows', 'flexify-dashboard') }}</span
                  >
                  <span v-if="table.size_mb > 0">
                    {{ table.size_mb.toFixed(2) }} MB
                  </span>
                </div>
              </div>
              <AppIcon
                icon="chevron_right"
                :class="[
                  'text-base flex-shrink-0 transition-opacity',
                  selectedTable?.name === table.name
                    ? 'text-zinc-900 dark:text-white opacity-100'
                    : 'text-zinc-400 opacity-0 group-hover:opacity-100',
                ]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-l-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <RouterView key="database-content" v-slot="{ Component }">
        <div class="flex-1 flex items-center justify-center" v-if="!Component">
          <div class="text-center">
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon icon="database" class="text-2xl text-zinc-400" />
            </div>
            <h3
              class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
            >
              {{ __('Table Details', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {{
                __(
                  'Select a table from the list to view its structure and data.',
                  'flexify-dashboard'
                )
              }}
            </p>
            <AppButton @click="openQueryEditor" type="primary" class="text-sm">
              <AppIcon icon="code" class="text-base mr-2" />
              {{ __('Open SQL Editor', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>

        <component
          :is="Component"
          v-else-if="Component && windowWidth > 1024"
        />

        <Drawer
          v-else-if="Component && windowWidth <= 1024"
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

<style scoped>
@reference "@/assets/css/tailwind.css";
</style>
