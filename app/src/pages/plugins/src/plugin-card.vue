<script setup>
import { ref, watch, defineEmits, computed, defineModel, defineExpose } from "vue";

import AppButton from "@/components/utility/app-button/index.vue";
import Confirm from "@/components/utility/confirm/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import PluginActions from "./plugin-actions.vue";
import PluginCardBanner from "./plugin-card-banner.vue";

// Funcs
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { updatePlugin } from "./updatePlugin.js";
import { deactivatePlugin } from "./deactivatePlugin.js";
import { activatePlugin } from "./activatePlugin.js";
import { deletePlugin } from "./deletePlugin.js";
import { autoUpdate } from "./autoUpdate.js";

// Store
import { useAppStore } from "@/store/app/app.js";

const appStore = useAppStore();
const plugin = defineModel();
const emit = defineEmits(["update"]);
const updating = ref(false);
const deactivating = ref(false);
const activating = ref(false);
const deleting = ref(false);
const confirm = ref(null);
const autoUpdating = ref(false);

/**
 * Gets the best available icon for a plugin
 */
const getPluginIcon = computed(() => {
  const authorText = plugin.value?.Author ? plugin.value.Author.replace(/<[^>]*>/g, "").trim().toLowerCase() : "";

  if (authorText === "meumouse" || authorText === "meumouse.com") {
    return `${appStore.state.pluginBase}assets/icons/logo-meumouse.svg`;
  }

  if (plugin.value?.icons) {
    const icons = plugin.value.icons;
    
    return icons["2x"] || icons["1x"] || icons.default;
  }

  return `https://www.google.com/s2/favicons?domain=${plugin.value.PluginURI || plugin.value.AuthorURI}&sz=400`;
});

/**
 * Gets the banner image for a plugin
 */
const getPluginBanner = computed(() => {
  if (plugin.value?.banners) {
    const banners = plugin.value.banners;
    return banners["low"] || banners["high"] || null;
  }
  return null;
});

const returnActivePlugins = computed(() => {
  let list = [];
  for (let slug in appStore.state.pluginsList) {
    const plugin = appStore.state.pluginsList[slug];

    if (!plugin.active || plugin.deleted) continue;
    plugin.slug = slug;
    list.push(plugin);
  }

  return list;
});

const hasRequiredPlugins = computed(() => {
  if (!plugin.value?.RequiresPlugins) return true;
  const requiredPlugins = plugin.value.RequiresPlugins.split(",");

  if (!requiredPlugins.length) return true;

  for (let slug of requiredPlugins) {
    slug = slug.trim();
    if (!slug) continue;
    const activePlugin = returnActivePlugins.value.find((item) => item.splitSlug == slug);
    if (!activePlugin) {
      return false;
    }
  }
  return true;
});


/**
 * Fetches extended plugin data from WordPress.org with caching
 */
const fetchPluginData = async () => {
  // Bail if slug is not available
  if (!plugin.value?.slug) {
    return;
  }

  const splitSlug = plugin.value.slug.split("/");
  const slug = splitSlug[0];

  // Check cache first
  const cached = localStorage.getItem(`plugin_data_${slug}`);

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      const now = new Date().getTime();
      const age = now - timestamp;
      const cachedHasIcons = Boolean(data?.icons && Object.keys(data.icons).length);
      const cachedHasBanners = Boolean(data?.banners && Object.keys(data.banners).length);

      // If cache is less than 24 hours old (24 * 60 * 60 * 1000 = 86400000 ms)
      if (age < 86400000 && cachedHasIcons && cachedHasBanners) {
        emit("update", {
          banners: data.banners,
          icons: data.icons,
          tags: data.tags,
          notInRepository: data.notInRepository,
        });
      } else {
        localStorage.removeItem(`plugin_data_${slug}`);
      }
    } catch (error) {
      // Invalid cache data, remove it
      localStorage.removeItem(`plugin_data_${slug}`);
      console.error("Error parsing cached plugin data:", error);
    }
  }

  const updatePluginVisualData = (data) => {
    emit("update", {
      banners: data?.banners,
      icons: data?.icons,
      tags: data?.tags,
      notInRepository: data?.notInRepository,
    });
  };

  const fetchFromWordPressOrg = async () => {
    const response = await fetch(`https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=${slug}&fields=icons,banners`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  };

  const fetchFromPluginApiFallback = async () => {
    const response = await lmnFetch({
      endpoint: `flexify-dashboard/v1/plugin/repository-assets/${slug}`,
      type: "GET",
    });

    if (!response?.success && !response?.data) {
      return null;
    }

    return response.data || response;
  };

  try {
    let data = await fetchFromWordPressOrg();

    if (!data) {
      data = await fetchFromPluginApiFallback();
    }

    if (!data) {
      updatePluginVisualData({ notInRepository: true });
      cachePluginInfo({ notInRepository: true }, slug);
      return;
    }

    cachePluginInfo(data, slug);
    updatePluginVisualData(data);
  } catch (error) {
    try {
      const fallbackData = await fetchFromPluginApiFallback();

      if (fallbackData) {
        cachePluginInfo(fallbackData, slug);
        updatePluginVisualData(fallbackData);
        return;
      }
    } catch (fallbackError) {
      console.error(`Error fetching fallback plugin data for ${slug}:`, fallbackError);
    }

    updatePluginVisualData({ notInRepository: true });
    cachePluginInfo({ notInRepository: true }, slug);
    console.error(`Error fetching plugin data for ${slug}:`, error);
    return null;
  }
};

const cachePluginInfo = (data, slug) => {
  // Cache the fresh data
  localStorage.setItem(
    `plugin_data_${slug}`,
    JSON.stringify({
      data: {
        banners: data.banners,
        icons: data.icons,
        tags: data.tags,
        notInRepository: data.notInRepository,
      },
      timestamp: new Date().getTime(),
    })
  );
};

const updatePluginBySlug = async () => {
  updating.value = true;
  await updatePlugin(plugin.value, emit);
  updating.value = false;
};

const deactivatePluginBySlug = async () => {
  deactivating.value = true;
  await deactivatePlugin(plugin.value, emit);
  deactivating.value = false;
};

const activatePluginBySlug = async () => {
  activating.value = true;
  await activatePlugin(plugin.value, emit);
  activating.value = false;
};

const toggleAutoUpdate = async () => {
  autoUpdating.value = true;
  await autoUpdate(plugin.value, emit);
  autoUpdating.value = false;
};

const deletePluginBySlug = async () => {
  const userResponse = await confirm.value.show({
    title: __("Are you sure?", "flexify-dashboard"),
    message: __("Are you sure you want to delete this plugin? This action cannot be undone.", "flexify-dashboard"),
    okButton: __("Yes, delete it", "flexify-dashboard"),
  });

  if (!userResponse) return;

  deleting.value = true;
  await deletePlugin(plugin.value, emit);
  deleting.value = false;
};

watch(
  () => plugin.value?.slug,
  () => {
    fetchPluginData();
  },
  { immediate: true }
);

defineExpose({ updatePluginBySlug, activatePluginBySlug, deactivatePluginBySlug, deletePluginBySlug, toggleAutoUpdate });
</script>

<template>
  <div class="flex-1 flex flex-col" v-if="plugin">
    <!-- Banner Header -->
    <div class="p-8">
      <div class="relative h-48 bg-zinc-100 dark:bg-zinc-800 overflow-hidden rounded-xl pb-0 border border-zinc-200 dark:border-zinc-700">
        <img v-if="getPluginBanner" :src="getPluginBanner" class="w-full h-full object-cover filter-sharp" />
        <PluginCardBanner v-else />

        <!-- Gradient Overlay -->
        <div class="absolute inset-0"></div>

        <!-- Plugin Icon -->
        <div class="absolute bottom-6 left-6">
          <div class="w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border-2 border-white dark:border-zinc-600 shadow-lg">
            <img :src="getPluginIcon" class="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>

    <!-- Plugin Header -->
    <div class="p-8 pt-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-3">
            <h2 class="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
              {{ plugin.Name }}
            </h2>
            <div class="flex items-center gap-2 grow">
              <div class="px-2 py-1 rounded text-xs font-medium" :class="plugin.active
                ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'">
                {{ plugin.active ? __("Active", "flexify-dashboard") : __("Inactive", "flexify-dashboard") }}
              </div>
              <div v-if="plugin.has_update" class="px-2 py-1 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 rounded text-xs font-medium">
                {{ __("Update Available", "flexify-dashboard") }}
              </div>
            </div>


            <!-- Actions -->
            <div class="flex items-center gap-2 ml-6">
              <button v-if="!plugin.active" @click="activatePluginBySlug" :disabled="activating || !hasRequiredPlugins" class="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50">
                <span v-if="activating" class="inline-flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ __("Activating...", "flexify-dashboard") }}
                </span>
                <span v-else>{{ __("Activate", "flexify-dashboard") }}</span>
              </button>

              <button v-if="plugin.active" @click="deactivatePluginBySlug" :disabled="deactivating" class="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50">
                <span v-if="deactivating" class="inline-flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ __("Deactivating...", "flexify-dashboard") }}
                </span>
                <span v-else>{{ __("Deactivate", "flexify-dashboard") }}</span>
              </button>

              <button v-if="plugin.has_update" @click="updatePluginBySlug" :disabled="updating" class="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50">
                <span v-if="updating" class="inline-flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ __("Updating...", "flexify-dashboard") }}
                </span>
                <span v-else>{{ __("Update", "flexify-dashboard") }}</span>
              </button>

              <button @click="deletePluginBySlug" :disabled="deleting" class="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors disabled:opacity-50">
                <AppIcon icon="delete" class="text-base" />
              </button>
            </div>
          </div>

          <div class="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            <span>{{ __("Version", "flexify-dashboard") }} {{ plugin.Version }}</span>
            <span v-if="plugin.Author" v-html="plugin.Author"></span>
          </div>

          <p v-if="plugin.Description" class="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6" v-html="plugin.Description"></p>

          <!-- Requirements Warning -->
          <div v-if="!hasRequiredPlugins" class="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div class="flex items-start gap-3">
              <AppIcon icon="warning" class="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div class="font-medium text-red-700 dark:text-red-400 mb-2">{{ __("Missing Required Plugins", "flexify-dashboard") }}</div>
                <div class="text-sm text-red-600 dark:text-red-400 mb-2">{{ __("This plugin requires the following plugins to be installed and active:", "flexify-dashboard") }}</div>
                <ul class="list-disc pl-4 text-sm text-red-600 dark:text-red-400">
                  <li v-for="sub in (plugin.RequiresPlugins || '').split(',')" :key="sub">{{ sub.trim() }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Links Section -->
          <div class="flex flex-wrap gap-3">
            <!-- Plugin Action Links (Settings, etc) -->
            <template v-if="plugin.action_links && plugin.action_links.length">
              <a v-for="link in plugin.action_links" :key="link.url" :href="link.url" class="inline-flex items-center gap-2 px-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-sm font-medium">
                <AppIcon icon="link" class="text-sm" />
                <span v-html="link.text"></span>
              </a>
            </template>

            <!-- Repository Links -->
            <RouterLink v-if="!plugin.notInRepository && plugin.slug" :to="`/plugin-search/${plugin.slug.split('/')[0]}`" class="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm">
              <AppIcon icon="info" class="text-sm" />
              {{ __("Plugin Info", "flexify-dashboard") }}
            </RouterLink>

            <RouterLink v-if="plugin.active && plugin.slug" :to="`/plugin-performance/${plugin.slug.split('/')[0]}`" class="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm">
              <AppIcon icon="speed" class="text-sm" />
              {{ __("Performance", "flexify-dashboard") }}
            </RouterLink>

            <!-- External Links -->
            <a v-if="plugin.PluginURI" :href="plugin.PluginURI" target="_blank" class="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm">
              <AppIcon icon="link" class="text-sm" />
              {{ __("Plugin Page", "flexify-dashboard") }}
              <AppIcon icon="open_new" class="text-xs opacity-60" />
            </a>

            <a v-if="plugin.AuthorURI" :href="plugin.AuthorURI" target="_blank" class="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm">
              <AppIcon icon="person" class="text-sm" />
              {{ __("Author", "flexify-dashboard") }}
              <AppIcon icon="open_new" class="text-xs opacity-60" />
            </a>
          </div>
        </div>


      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 p-8 overflow-auto">
      <div class="space-y-8">
        <!-- Plugin Information -->
        <div v-if="plugin.RequiresWP || plugin.TestedUpTo || plugin.Network">
          <h3 class="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            {{ __("Plugin Information", "flexify-dashboard") }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div v-if="plugin.RequiresWP">
              <div class="text-zinc-500 dark:text-zinc-500 text-xs uppercase tracking-wide font-medium mb-1">
                {{ __("Requires WordPress", "flexify-dashboard") }}
              </div>
              <div class="text-zinc-900 dark:text-zinc-100">{{ plugin.RequiresWP }}+</div>
            </div>
            <div v-if="plugin.RequiresPHP">
              <div class="text-zinc-500 dark:text-zinc-500 text-xs uppercase tracking-wide font-medium mb-1">
                {{ __("Requires PHP", "flexify-dashboard") }}
              </div>
              <div class="text-zinc-900 dark:text-zinc-100">{{ plugin.RequiresPHP }}+</div>
            </div>
            <div v-if="plugin.TestedUpTo">
              <div class="text-zinc-500 dark:text-zinc-500 text-xs uppercase tracking-wide font-medium mb-1">
                {{ __("Tested up to", "flexify-dashboard") }}
              </div>
              <div class="text-zinc-900 dark:text-zinc-100">{{ plugin.TestedUpTo }}</div>
            </div>
            <div>
              <div class="text-zinc-500 dark:text-zinc-500 text-xs uppercase tracking-wide font-medium mb-1">
                {{ __("Network", "flexify-dashboard") }}
              </div>
              <div class="text-zinc-900 dark:text-zinc-100">{{ plugin.Network ? __("Yes", "flexify-dashboard") : __("No", "flexify-dashboard") }}</div>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div>
          <h3 class="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            {{ __("Settings", "flexify-dashboard") }}
          </h3>
          <div class="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  {{ __("Automatic Updates", "flexify-dashboard") }}
                </div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {{ __("Allow WordPress to update this plugin automatically", "flexify-dashboard") }}
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" :checked="plugin.auto_update_enabled" @change="toggleAutoUpdate" :disabled="autoUpdating" class="sr-only peer">
                <div class="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-600 peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Confirm ref="confirm" />
  </div>
</template>
