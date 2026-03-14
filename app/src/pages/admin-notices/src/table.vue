<script setup>
import { ref, watch, watchEffect, computed, nextTick, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { formatDateString } from '@/assets/js/functions/formatDateString.js';
import { returnStatusType } from '@/assets/js/functions/returnStatusType.js';
import { notify } from '@/assets/js/functions/notify.js';
import { inSearch } from '@/assets/js/functions/inSearch.js';

// Comps
import LoadingIndicator from '@/components/utility/loading-indicator/index.ts';
import Notifications from '@/components/utility/notifications/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import BatchOptions from '@/components/app/batch-options/index.vue';
import Drawer from '@/components/utility/drawer/index.vue';

// Refs
const router = useRouter();
const route = useRoute();
const search = ref('');
const isOpen = ref(false);
const selected = ref([]);
const loading = ref(false);
const creating = ref(false);
const notices = ref([]);
const pagination = ref({
  search: '',
  per_page: 15,
  page: 1,
  pages: 0,
  total: 0,
  status: 'any',
  order: 'desc',
  orderby: 'date',
  context: 'edit',
});

const filteredNotices = computed(() => {
  return notices.value.filter((notice) => {
    if (!search.value) return true;
    return inSearch(
      search.value,
      notice.title.rendered,
      notice.status,
      notice.id.toString()
    );
  });
});

/**
 * Fetches notices
 */
const getNotices = async (suppressLoading) => {
  appStore.updateState('loading', true);
  if (!suppressLoading) loading.value = true;

  const args = { endpoint: 'wp/v2/flexify-dashboard-notices', params: pagination.value };
  const data = await lmnFetch(args);

  appStore.updateState('loading', false);
  loading.value = false;

  if (!data) return;

  notices.value = data.data;
  pagination.value.pages = data.totalPages;
  pagination.value.total = data.totalItems;
};

/**
 * Creates new notice
 */
const newNotice = async () => {
  appStore.updateState('loading', true);
  creating.value = true;

  const title =
    __('Draft notice', 'flexify-dashboard') + ` (${pagination.value.total + 1})`;
  const args = {
    endpoint: 'wp/v2/flexify-dashboard-notices',
    params: {},
    data: {
      title,
      meta: {
        notice_items: [],
        notice_settings: {},
      },
    },
    type: 'POST',
  };
  const data = await lmnFetch(args);

  appStore.updateState('loading', false);
  creating.value = false;

  if (!data) return;

  getNotices(true);

  notify({ type: 'success', title: __('Notice created', 'flexify-dashboard') });

  // Select the new notice and navigate to editor
  router.push({ name: 'notice-editor', params: { noticeid: data.data.id } });
};

const openNotice = (notice) => {
  if (!notice) return;

  router.push({ name: 'notice-editor', params: { noticeid: notice.id } });
};

const returnStatusFormatted = (status) => {
  if (status == 'publish') return __('Published', 'flexify-dashboard');
  if (status == 'draft') return __('Draft', 'flexify-dashboard');
  return status;
};

// Watch for search changes
watch(
  () => search.value,
  () => {
    pagination.value.search = search.value;
    pagination.value.page = 1; // Reset to first page when searching
    getNotices();
  },
  { debounce: 300 }
);

watchEffect(() => {
  if (route.query.refresh) {
    getNotices(true);
    route.query.refresh = 0;

    const updatedQuery = { ...route.query };
    delete updatedQuery.refresh;

    router.push({ query: updatedQuery });
  }
});

watch(
  () => route.params.noticeid,
  (newValue) => {
    if (newValue) {
      isOpen.value = true;
    } else {
      isOpen.value = false;
    }
  },
  { immediate: true }
);

getNotices();
</script>

<template>
  <div
    class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0"
  >
    <!-- Left Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <!-- Header -->
      <div class="p-6">
        <div class="flex items-center gap-4 mb-6">
          <h1 class="text-xl font-medium grow">
            {{ __('Admin Notices', 'flexify-dashboard') }}
          </h1>
          <div class="flex items-center gap-2">
            <BatchOptions
              v-if="selected.length"
              v-model="selected"
              @updated="getNotices(true)"
              route="wp/v2/flexify-dashboard-notices"
            />
            <AppButton
              type="transparent"
              @click="newNotice"
              :loading="creating"
              class="text-sm"
            >
              <AppIcon icon="add" class="text-xl" />
            </AppButton>
          </div>
        </div>

        <!-- Search -->
        <div class="relative">
          <AppIcon
            icon="search"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 text-sm"
          />
          <input
            v-model="search"
            type="text"
            :placeholder="__('Search notices...', 'flexify-dashboard')"
            class="w-full bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      <!-- Notices List -->
      <div class="flex-1 overflow-auto">
        <div v-if="loading && !notices.length" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon
              icon="notifications"
              class="text-zinc-400 text-xl animate-pulse"
            />
          </div>
          <p class="text-sm text-zinc-500">
            {{ __('Loading notices...', 'flexify-dashboard') }}
          </p>
        </div>

        <div
          v-else-if="!filteredNotices.length"
          class="p-8 text-center flex flex-col items-center justify-center"
        >
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="folder_open" class="text-zinc-400 text-xl" />
          </div>
          <p class="text-sm text-zinc-500">
            {{ __('No notices found', 'flexify-dashboard') }}
          </p>
          <AppButton
            type="primary"
            class="mt-4"
            @click="newNotice"
            :loading="creating"
          >
            {{ __('Create Your First Notice', 'flexify-dashboard') }}
          </AppButton>
        </div>

        <div v-else class="py-2 px-6 flex flex-col gap-1">
          <div
            v-for="notice in filteredNotices"
            :key="notice.id"
            @click="openNotice(notice)"
            class="flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer group"
            :class="
              route.params.noticeid == notice.id
                ? 'bg-zinc-100 dark:bg-zinc-800'
                : ''
            "
          >
            <!-- Status Dot -->
            <div class="flex-shrink-0">
              <div
                class="w-2 h-2 rounded-full"
                :class="
                  notice.status === 'publish' ? 'bg-green-500' : 'bg-orange-400'
                "
              />
            </div>

            <!-- Notice Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span
                  class="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate"
                  v-html="notice.title.rendered"
                />
              </div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {{ returnStatusFormatted(notice.status) }} •
                {{ formatDateString(notice.modified) }} •
                {{ __('Seen by', 'flexify-dashboard') }}:
                {{ notice.meta.seen_by?.length || 0 }}
              </div>
            </div>

            <!-- Arrow indicator -->
            <div
              class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <AppIcon icon="chevron_right" class="text-zinc-400 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.pages > 1"
        class="p-6 border-t border-zinc-200 dark:border-zinc-700"
      >
        <div class="flex items-center justify-between text-sm">
          <span class="text-zinc-500">
            {{ __('Page', 'flexify-dashboard') }} {{ pagination.page }}
            {{ __('of', 'flexify-dashboard') }} {{ pagination.pages }}
          </span>
          <div class="flex items-center gap-1">
            <button
              @click="
                pagination.page = 1;
                getNotices(true);
              "
              :disabled="pagination.page === 1"
              class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AppIcon icon="first_page" class="text-sm" />
            </button>
            <button
              @click="
                pagination.page--;
                getNotices(true);
              "
              :disabled="pagination.page === 1"
              class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AppIcon icon="chevron_left" class="text-sm" />
            </button>
            <button
              @click="
                pagination.page++;
                getNotices(true);
              "
              :disabled="pagination.page === pagination.pages"
              class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AppIcon icon="chevron_right" class="text-sm" />
            </button>
            <button
              @click="
                pagination.page = pagination.pages;
                getNotices(true);
              "
              :disabled="pagination.page === pagination.pages"
              class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AppIcon icon="last_page" class="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <!-- Empty State -->
      <div
        v-if="!route.params.noticeid"
        class="flex-1 flex items-center justify-center"
      >
        <div class="text-center flex flex-col items-center justify-center">
          <div
            class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <AppIcon icon="notifications" class="text-2xl text-zinc-400" />
          </div>
          <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {{ __('Notice Editor', 'flexify-dashboard') }}
          </h3>
          <p class="text-sm text-zinc-500 mb-4">
            {{
              __(
                'Select a notice from the list to edit it, or create a new one to get started.',
                'flexify-dashboard'
              )
            }}
          </p>
          <AppButton
            type="primary"
            @click="newNotice"
            :loading="creating"
            class="text-sm"
          >
            <AppIcon icon="add" class="text-sm mr-1" />
            {{ __('Create New Notice', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>

      <!-- Router View for Notice Editor -->
      <div v-else class="flex-1 flex flex-col">
        <RouterView class="hidden md:flex" />

        <div class="md:hidden">
          <Drawer
            v-model="isOpen"
            title="Notice Editor"
            :show-close-button="false"
            :show-header="false"
            @close="router.push('/')"
          >
            <RouterView />
          </Drawer>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
#wpfooter {
  display: none !important;
}
</style>
