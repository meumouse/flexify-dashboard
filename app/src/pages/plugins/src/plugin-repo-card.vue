<script setup>
import { ref, defineProps, defineEmits, computed, defineModel, defineExpose } from "vue";

import AppButton from "@/components/utility/app-button/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import PluginActions from "./plugin-actions.vue";
import PluginCardBanner from "./plugin-card-banner.vue";
import AppCheckBox from "./checkbox.vue";

// Funcs
import { notify } from "@/assets/js/functions/notify.js";
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { ratingToStars } from "@/assets/js/functions/ratingToStars.js";
import { updatePlugin } from "./updatePlugin.js";
import { deactivatePlugin } from "./deactivatePlugin.js";
import { activatePlugin } from "./activatePlugin.js";
import { deletePlugin } from "./deletePlugin.js";
import { autoUpdate } from "./autoUpdate.js";

// Store
import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();

const props = defineProps({
  plugin: {
    type: Object,
    required: true,
  },
  isInstalled: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["update"]);
const pluginData = ref({});
const installing = ref(false);

/**
 * Gets the best available icon for a plugin
 */
const getPluginIcon = computed(() => {
  if (props.plugin?.icons) {
    const icons = props.plugin.icons;
    return icons["2x"] || icons["1x"] || icons.default;
  }
  return `https://www.google.com/s2/favicons?domain=${props.plugin.PluginURI || props.plugin.AuthorURI}&sz=400`;
});

/**
 * Gets the banner image for a plugin
 */
const getPluginBanner = computed(() => {
  if (props.plugin?.banners) {
    const banners = props.plugin.banners;
    return banners["low"] || banners["high"] || null;
  }
  return null;
});

const returnActivePlugins = computed(() => {
  let list = [];
  for (let slug in appStore.state.pluginsList) {
    const plugin = appStore.state.pluginsList[slug];

    // Only return active plugins
    if (!plugin.active || plugin.deleted) continue;

    // format plugin
    plugin.slug = slug;
    plugin.splitSlug = plugin.slug ? plugin.slug.split("/")[0] : slug;

    list.push(plugin);
  }

  return list;
});

const installPluginBySlug = async () => {
  installing.value = true;

  const args = { endpoint: `flexify-dashboard/v1/plugin/install-repo/${props.plugin.slug}`, params: {}, type: "POST" };
  const response = await lmnFetch(args);

  installing.value = false;

  if (!response) return false;

  notify({ title: __("Plugin installed", "flexify-dashboard"), message: props.plugin.name, type: "success" });

  response.data.plugin.icons = props.plugin.icons;
  response.data.plugin.banners = props.plugin.banners;

  appStore.state.pluginsList[response.data.plugin.slug] = response.data.plugin;
};
</script>

<template>
  <div class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden shadow relative group cursor-pointer">
    <div class="w-full aspect-[3.089] bg-zinc-100 border-b border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden relative">
      <!-- Show banner if available -->
      <img v-if="getPluginBanner" :src="getPluginBanner" class="w-full h-full object-cover object-center" />

      <PluginCardBanner v-else />

      <div class="absolute bottom-0 right-0 left-0 h-2/3 bg-gradient-to-t from-zinc-900/20 to-transparent"></div>
    </div>
    <div class="p-4 pt-0 -mt-3 flex flex-col gap-2 items-start grow z-[1]">
      <div class="rounded-lg bg-white dark:bg-zinc-900 p-1 -ml-1 -mt-1">
        <div class="rounded-md bg-indigo-600 aspect-square h-10 overflow-hidden">
          <img :src="getPluginIcon" class="w-full h-full object-cover" />
        </div>
      </div>
      <div class="text-zinc-900 dark:text-zinc-100 font-semibold" v-html="plugin.name"></div>
      <div class="text-zinc-500 dark:text-zinc-400 grow line-clamp-3" v-html="plugin.short_description"></div>
    </div>
    <div class="border-t border-zinc-200 dark:border-zinc-700 p-4 flex flex-row place-content-between items-center" @click.prevent.stop>
      <div>
        <AppButton v-if="!isInstalled" type="default" class="text-sm" :loading="installing" @click="installPluginBySlug">{{ __("Install", "flexify-dashboard") }}</AppButton>
        <div v-else class="px-3 py-2 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400 rounded-lg text-sm font-medium">
          {{ __("Installed", "flexify-dashboard") }}
        </div>
      </div>

      <div class="flex flex-col items-end">
        <div class="flex flex-row items-center text-orange-600 dark:text-orange-400 text-sm">
          <AppIcon v-for="icon in ratingToStars(plugin.rating)" :icon="icon" :class="icon == 'star_empty' ? 'opacity-50' : ''" />
        </div>

        <div class="text-zinc-500 text-xs">
          <strong>{{ Intl.NumberFormat().format(plugin.active_installs) }}</strong>
          {{ __("Active installs", "flexify-dashboard") }}
        </div>
      </div>
    </div>

    <div class="absolute top-0 left-0 right-0 bottom-0 bg-zinc-900/50 flex flex-col items-center place-content-center justify-center z-[100]" v-if="deleting || autoUpdating">
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  </div>
</template>
