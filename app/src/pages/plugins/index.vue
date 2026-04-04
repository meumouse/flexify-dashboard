<script setup>
import {
  ref,
  watch,
  nextTick,
  computed,
  watchEffect,
  defineAsyncComponent,
  onMounted,
  defineEmits,
  onUnmounted,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { inSearch } from '@/assets/js/functions/inSearch.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { useDarkMode } from './src/useDarkMode.js';
const { isDark } = useDarkMode();

// Comps
import LoadingIndicator from '@/components/utility/loading-indicator/index.ts';
import Notifications from '@/components/utility/notifications/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import Drawer from '@/components/utility/drawer/index.vue';

// Functions
import { notify } from '@/assets/js/functions/notify.js';

const router = useRouter();
const route = useRoute();

// Refs
const emit = defineEmits(['update']);
const search = ref('');
const pluginupload = ref(null);
const confirm = ref(null);
const uploading = ref(false);
const uploadingFileName = ref('');
const drawerOpen = ref(false);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const loadingPlugins = ref(false);

const filteredPlugins = computed(() => {
  let list = [];
  for (let slug in appStore.state.pluginsList) {
    const plugin = appStore.state.pluginsList[slug];

    if (plugin.deleted) continue;
    if (!inSearch(search.value, plugin.Name, plugin.Author, plugin.Version))
      continue;

    plugin.slug = slug;
    list.push(plugin);
  }

  // Sort: Active plugins first, then alphabetically within each group
  return list.sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    return a.Name.localeCompare(b.Name);
  });
});

// Computed property for window width
const windowWidthComputed = computed(() => windowWidth.value);

// Current selected plugin from route
const selectedPluginSlug = computed(() => route.params.slug);

// Handle plugin selection
const selectPlugin = (pluginSlug) => {
  // Encode the slug properly for URL
  const encodedSlug = encodeURIComponent(pluginSlug);
  router.push(`/${encodedSlug}`);

  // Open drawer on mobile
  if (windowWidth.value <= 1024) {
    drawerOpen.value = true;
  }
};

// Update window width on resize
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

// Watch route changes to close drawer on mobile when navigating away
watch(
  () => route.params.slug,
  (newSlug) => {
    if (!newSlug && drawerOpen.value) {
      drawerOpen.value = false;
    }
  }
);

const handlePluginUpload = async (evt) => {
  const files = evt.target.files;
  if (!files || !files[0]) {
    return;
  }

  const file = files[0];
  if (!file.name.endsWith('.zip')) {
    notify({
      title: __('Invalid File', 'flexify-dashboard'),
      message: __('Please select a valid ZIP file', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    notify({
      title: __('File Too Large', 'flexify-dashboard'),
      message: __('File size must be less than 50MB', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  uploading.value = true;
  uploadingFileName.value = file.name;

  try {
    const formData = new FormData();
    formData.append('plugin_zip', file);

    const args = {
      endpoint: 'flexify-dashboard/v1/plugin/install',
      params: {},
      type: 'POST',
      data: formData,
      isFormData: true,
    };

    const response = await lmnFetch(args);

    if (!response || !response.data || !response.data.plugin) {
      throw new Error(
        __('Upload failed. Please try again.', 'flexify-dashboard')
      );
    }

    const plugin = response.data.plugin;

    notify({
      title: __('Success', 'flexify-dashboard'),
      message: __('Plugin uploaded successfully', 'flexify-dashboard'),
      type: 'success',
    });

    appStore.state.pluginsList[plugin.slug] = {
      ...plugin,
      active: false,
      has_update: false,
      deleted: false,
      auto_update_enabled: false,
      splitSlug: plugin.slug.split('/')[0],
    };

    setTimeout(() => {
      uploading.value = false;
      uploadingFileName.value = '';
      if (pluginupload.value) {
        pluginupload.value.value = '';
      }
    }, 500);
  } catch (error) {
    console.error('Plugin upload error:', error);
    notify({
      title: __('Upload Failed', 'flexify-dashboard'),
      message:
        error.message ||
        __('An unexpected error occurred during upload', 'flexify-dashboard'),
      type: 'error',
    });
    setTimeout(() => {
      uploading.value = false;
      uploadingFileName.value = '';
      if (pluginupload.value) {
        pluginupload.value.value = '';
      }
    }, 500);
  }
};

/**
 * Fetches plugins list from REST API
 *
 * @returns {Promise<void>}
 */
const fetchPlugins = async () => {
  loadingPlugins.value = true;
  appStore.updateState('loading', true);

  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/plugins',
      type: 'GET',
      params: {},
    };

    const response = await lmnFetch(args);

    if (
      response &&
      response.data &&
      response.data.success &&
      response.data.plugins
    ) {
      // Update plugins list in store
      appStore.updateState('pluginsList', response.data.plugins);
    } else {
      notify({
        title: __('Error', 'flexify-dashboard'),
        message: __('Failed to load plugins', 'flexify-dashboard'),
        type: 'error',
      });
    }
  } catch (error) {
    console.error('Error fetching plugins:', error);
    notify({
      title: __('Error', 'flexify-dashboard'),
      message: __('Failed to load plugins', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loadingPlugins.value = false;
    appStore.updateState('loading', false);
  }
};

onMounted(async () => {
  if (!appStore.state.pluginsList) {
    appStore.state.pluginsList = {};
  }

  // Fetch plugins from REST API
  await fetchPlugins();

  // Set initial window width
  updateWindowWidth();

  // Listen for window resize
  window.addEventListener('resize', updateWindowWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth);
});

// Watch for plugin deletion and navigate away
watchEffect(() => {
  return;
  if (
    !selectedPluginSlug.value ||
    !appStore.state.pluginsList[selectedPluginSlug.value]
  )
    return;

  if (appStore.state.pluginsList[selectedPluginSlug.value].deleted) {
    router.push('/');
  }
});
</script>

<template>
  <div class="flexify-dashboard-isolation">
    <Notifications />
    <LoadingIndicator :height="3" />

    <!-- Upload Progress Panel -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="uploading"
        class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-6"
      >
        <div
          class="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4 shadow-xl"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="flex-shrink-0">
              <div
                class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center"
              >
                <AppIcon
                  icon="upload"
                  class="text-zinc-400 text-sm animate-pulse"
                />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white mb-0.5">
                {{ __('Uploading Plugin', 'flexify-dashboard') }}
              </p>
              <p
                class="text-xs text-zinc-400 truncate"
                :title="uploadingFileName"
              >
                {{ uploadingFileName }}
              </p>
            </div>
          </div>
          <div class="relative h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              class="absolute inset-0 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded-full"
              style="
                background-size: 200% 100%;
                animation: progress-shimmer 1.5s ease-in-out infinite;
              "
            />
          </div>
        </div>
      </div>
    </Transition>

    <div
      class="flex text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize h-[var(--fd-body-height)] max-h-[var(--fd-body-height)]"
      :class="isDark ? 'dark' : ''"
    >
      <!-- Left Sidebar -->
      <div
        class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
      >
        <!-- Header -->
        <div class="p-6">
          <div class="flex items-center gap-4 mb-6">
            <h1 class="text-xl font-medium grow">
              {{ __('Installed Plugins', 'flexify-dashboard') }}
            </h1>
            <div class="flex items-center gap-">
              <AppButton
                type="transparent"
                @click="pluginupload.click($event)"
                :disabled="uploading"
                :loading="uploading"
              >
                <AppIcon
                  icon="upload"
                  class="text-xl text-zinc-600 dark:text-zinc-400"
                />
                <input
                  type="file"
                  ref="pluginupload"
                  accept=".zip"
                  @change="handlePluginUpload($event)"
                  class="hidden"
                />
              </AppButton>
              <RouterLink
                to="/plugin-search"
                class="ml-auto p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <AppIcon
                  icon="category_search"
                  class="text-xl text-zinc-600 dark:text-zinc-400"
                />
              </RouterLink>
            </div>
          </div>

          <!-- Search -->
          <div class="relative flex items-center">
            <AppIcon
              icon="search"
              class="absolute left-3 text-zinc-400 text-lg"
            />
            <input
              v-model="search"
              type="text"
              :placeholder="__('Search plugins...', 'flexify-dashboard')"
              class="w-full bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        <!-- Plugin List -->
        <div class="flex-1 overflow-auto">
          <div v-if="loadingPlugins" class="p-8 text-center">
            <div
              class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
            >
              <AppIcon
                icon="extension"
                class="text-zinc-400 text-xl animate-pulse"
              />
            </div>
            <p class="text-sm text-zinc-500">
              {{ __('Loading plugins...', 'flexify-dashboard') }}
            </p>
          </div>

          <div v-else-if="!filteredPlugins.length" class="p-8 text-center">
            <div
              class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
            >
              <AppIcon icon="folder_open" class="text-zinc-400 text-xl" />
            </div>
            <p class="text-sm text-zinc-500">
              {{ __('No plugins found', 'flexify-dashboard') }}
            </p>
          </div>

          <div v-else class="py-2 px-6 flex flex-col gap-1">
            <div
              v-for="plugin in filteredPlugins"
              :key="plugin.slug"
              @click="selectPlugin(plugin.slug)"
              class="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              :class="
                selectedPluginSlug === plugin.slug
                  ? 'bg-zinc-100 dark:bg-zinc-800'
                  : ''
              "
            >
              <!-- Status Dot -->
              <div class="flex-shrink-0">
                <div
                  class="w-2 h-2 rounded-full"
                  :class="
                    plugin.active
                      ? 'bg-green-500'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  "
                />
              </div>

              <!-- Plugin Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span
                    class="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate"
                  >
                    {{ plugin.Name }}
                  </span>
                  <span
                    v-if="plugin.has_update"
                    class="w-1 h-1 bg-orange-500 rounded-full flex-shrink-0"
                  ></span>
                </div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate plugin-author-line">
                  <span v-if="plugin.Author" v-html="plugin.Author"></span>
                  <span v-if="plugin.Author"> • </span>
                  <span>v{{ plugin.Version }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Content Area -->
      <div
        class="flex-1 flex flex-col rounded-l-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
      >
        <RouterView key="plugin-details-content" v-slot="{ Component }">
          <div
            class="flex-1 flex items-center justify-center"
            v-if="!Component"
          >
            <div class="text-center">
              <div
                class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <AppIcon icon="extension" class="text-2xl text-zinc-400" />
              </div>
              <h3
                class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
              >
                {{ __('Plugin Details', 'flexify-dashboard') }}
              </h3>
              <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                {{
                  __(
                    'Select a plugin from the list to view its details and manage settings.',
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

    <Confirm ref="confirm" />
  </div>
</template>

<style>
html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}

.plugin-author-line :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.plugin-author-line :deep(a:hover) {
  opacity: 0.8;
}

#wpbody,
#wpcontent {
  padding: 0 !important;
}

@keyframes progress-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
