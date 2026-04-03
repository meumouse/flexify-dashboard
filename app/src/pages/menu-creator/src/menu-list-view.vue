<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ShadowRoot } from 'vue-shadow-dom';

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
import MenuList from './menu-list.vue';

const router = useRouter();
const route = useRoute();

// Refs
const adoptedStyleSheets = ref(new CSSStyleSheet());
const loading = ref(false);
const menus = ref([]);
const filteredMenus = ref([]);
const searchQuery = ref('');
const statusFilter = ref('any'); // 'any', 'publish', 'draft'
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const drawerOpen = ref(false);
const creating = ref(false);
const pagination = ref({
  page: 1,
  per_page: 30,
  total: 0,
  totalPages: 0,
  search: '',
  order: 'desc',
  orderby: 'date',
  status: 'any',
  context: 'edit',
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
  await getMenus();
};

const goNextPage = async () => {
  if (!canGoNext.value) return;
  pagination.value.page += 1;
  await getMenus();
};

/**
 * Fetches menus data from WordPress REST API
 */
const getMenus = async () => {
  loading.value = true;
  appStore.updateState('loading', true);

  const args = {
    endpoint: 'wp/v2/flexify-dashboard-menus',
    params: {
      page: pagination.value.page,
      per_page: pagination.value.per_page,
      search: pagination.value.search,
      order: pagination.value.order,
      orderby: pagination.value.orderby,
      status: pagination.value.status,
      context: pagination.value.context,
    },
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data) return;

  menus.value = data.data.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    modified: item.modified,
    date: item.date,
  }));

  pagination.value.total = data.totalItems;
  pagination.value.totalPages = data.totalPages;

  applyFilters();
};

/**
 * Handle menu item selection - navigate to editor
 */
const selectMenuItem = (item) => {
  router.push({ name: 'menu-editor', params: { menuid: item.id } });
};

/**
 * Handle menu deletion
 */
const handleDelete = async (menuIds) => {
  loading.value = true;

  try {
    const deletePromises = menuIds.map((id) =>
      lmnFetch({
        endpoint: `wp/v2/flexify-dashboard-menus/${id}`,
        type: 'DELETE',
        params: {
          force: true,
        },
      })
    );

    await Promise.all(deletePromises);

    notify({
      title: __('Menu deleted successfully!', 'flexify-dashboard'),
      type: 'success',
    });

    // Refresh menus data from API
    await getMenus();
  } catch (error) {
    notify({
      title: __('Delete failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Create new menu
 */
const newMenu = async () => {
  appStore.updateState('loading', true);
  creating.value = true;

  const title =
    __('Draft menu', 'flexify-dashboard') + ` (${pagination.value.total + 1})`;
  const args = {
    endpoint: 'wp/v2/flexify-dashboard-menus',
    params: {},
    data: { title, meta: { menu_items: [], menu_settings: {} } },
    type: 'POST',
  };
  const data = await lmnFetch(args);

  appStore.updateState('loading', false);
  creating.value = false;

  if (!data) return;

  getMenus();

  notify({ type: 'success', title: __('Menu created', 'flexify-dashboard') });
  router.push({ name: 'menu-editor', params: { menuid: data.data.id } });
};

/**
 * Gets the menu cache key combining user ID and cache key
 *
 * @returns {string} The cache key for localStorage
 */
const getMenuCacheKey = () => {
  const userID = appStore.state.userID || '';
  const cacheKey = appStore.state.menuCacheKey || '';
  return `flexify_dashboard_menu_${userID}_${cacheKey}`;
};

/**
 * Rotates the menu cache key on the server, invalidating all client caches
 *
 * @since 1.0.9
 * @async
 * @function
 * @returns {Promise<void>}
 */
const rotateMenuCacheKey = async () => {
  const args = {
    endpoint: 'flexify-dashboard/v1/menu-cache/rotate',
    type: 'POST',
  };
  const response = await lmnFetch(args);

  if (response && response.data?.cache_key) {
    // Update the cache key in the store
    appStore.updateState('menuCacheKey', response.data.cache_key);
  }
};

/**
 * Manually clears the menu cache by rotating the cache key
 *
 * @since 1.0.9
 * @async
 * @function
 * @returns {Promise<void>}
 */
const clearMenuCache = async () => {
  await rotateMenuCacheKey();
  notify({
    type: 'success',
    title: __('Menu cache cleared', 'flexify-dashboard'),
    message: __(
      'The menu cache has been cleared successfully. All users will see fresh menu data.',
      'flexify-dashboard'
    ),
  });
};

/**
 * Apply filters and sorting to menus
 */
const applyFilters = () => {
  let filtered = [...menus.value];

  // Filter by status
  if (statusFilter.value !== 'any') {
    filtered = filtered.filter((item) => item.status === statusFilter.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((item) => {
      const title = item.title?.rendered || item.title?.raw || '';
      return title.toLowerCase().includes(query);
    });
  }

  filteredMenus.value = filtered;
};

/**
 * Injects styles into shadow root
 */
const setStyles = () => {
  let appStyleNode = document.querySelector('#flexify-dashboard-menu-creator-css');
  if (!appStyleNode) {
    appStyleNode = manuallyAddStyleSheet();
    appStyleNode.onload = () => {
      const appStyles = appStyleNode.sheet;
      for (const rule of [...appStyles.cssRules].reverse()) {
        adoptedStyleSheets.value.insertRule(rule.cssText);
      }
    };
  } else {
    const appStyles = appStyleNode.sheet;
    for (const rule of [...appStyles.cssRules].reverse()) {
      adoptedStyleSheets.value.insertRule(rule.cssText);
    }
  }
};

const manuallyAddStyleSheet = () => {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${appStore.state.pluginBase}app/dist/assets/styles/menu-creator.css`;
  document.head.appendChild(link);
  return link;
};

// Watch for search query changes
watch(searchQuery, () => {
  pagination.value.search = searchQuery.value;
  pagination.value.page = 1;
  getMenus();
});

// Watch for status filter changes
watch(statusFilter, () => {
  pagination.value.status = statusFilter.value;
  pagination.value.page = 1;
  getMenus();
});

/**
 * Handle window resize
 */
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  getMenus();
  setStyles();

  // Initialize window width
  windowWidth.value = window.innerWidth;

  // Add resize listener
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // Remove resize listener
  window.removeEventListener('resize', handleResize);
});

watch(
  () => route.params.menuid,
  (newVal) => {
    if (newVal) {
      drawerOpen.value = true;
    } else {
      drawerOpen.value = false;
    }
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div
    class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize"
    :class="isDark ? 'dark' : ''"
  >
    <!-- Menu List Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {{ __('Menu Creator', 'flexify-dashboard') }}
          </h1>
          <div class="flex items-center gap-2">
            <AppButton
              type="default"
              @click="clearMenuCache"
              class="text-sm"
              icon="refresh"
              >{{ __('Clear Cache', 'flexify-dashboard') }}</AppButton
            >
            <AppButton
              type="primary"
              @click="newMenu"
              :disabled="creating"
              :loading="creating"
              class="text-sm"
            >
              <AppIcon icon="add" class="text-base" />
            </AppButton>
          </div>
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
            :placeholder="__('Search menus...', 'flexify-dashboard')"
            class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>
      </div>

      <!-- Status Filter -->
      <div class="px-6 py-3">
        <div class="flex items-center gap-1.5">
          <button
            @click="statusFilter = 'any'"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
              statusFilter === 'any'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            ]"
          >
            {{ __('All', 'flexify-dashboard') }}
          </button>
          <button
            @click="statusFilter = 'publish'"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
              statusFilter === 'publish'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            ]"
          >
            {{ __('Published', 'flexify-dashboard') }}
          </button>
          <button
            @click="statusFilter = 'draft'"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
              statusFilter === 'draft'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            ]"
          >
            {{ __('Draft', 'flexify-dashboard') }}
          </button>
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
              ? __('menu', 'flexify-dashboard')
              : __('menus', 'flexify-dashboard')
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

      <!-- Menu List -->
      <div class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar">
        <div v-if="loading && !menus.length" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="menu" class="text-zinc-400 text-xl animate-pulse" />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Loading menus...', 'flexify-dashboard') }}
          </p>
        </div>

        <div
          v-else-if="filteredMenus.length === 0"
          class="p-8 text-center flex flex-col items-center justify-center"
        >
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="menu" class="text-zinc-400 text-xl" />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {{
              searchQuery || statusFilter !== 'any'
                ? __('No menus found', 'flexify-dashboard')
                : __('No menus yet', 'flexify-dashboard')
            }}
          </p>
          <AppButton
            v-if="!searchQuery && statusFilter === 'any'"
            type="primary"
            class="mt-4"
            @click="newMenu"
            :loading="creating"
          >
            {{ __('New menu', 'flexify-dashboard') }}
          </AppButton>
        </div>

        <MenuList
          v-else
          :menus="filteredMenus"
          @select-menu="selectMenuItem"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <RouterView key="menu-editor-content" v-slot="{ Component }">
        <div class="flex-1 flex items-center justify-center" v-if="!Component">
          <div class="text-center">
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon icon="menu" class="text-2xl text-zinc-400" />
            </div>
            <h3
              class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
            >
              {{ __('Menu Editor', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {{
                __(
                  'Select a menu from the list to edit its structure and settings.',
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

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>

<style>
#wpbody,
#wpcontent {
  padding: 0 !important;
}

html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}
</style>
