<script setup>
import { ref, watch, computed, defineModel, watchEffect, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

// Dajjs
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

import AppButton from "@/components/utility/app-button/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";
import Accordion from "@/components/utility/accordion/index.vue";
import PluginCardBanner from "./plugin-card-banner.vue";

// Store
import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();

// Set CSS variable for plugin base URL and inject style for star mask
onMounted(() => {
  if (appStore.state.pluginBase) {
    const iconUrl = `${appStore.state.pluginBase}assets/icons/star_full.svg`;
    // Inject a style tag with the mask property to avoid CSS variable parsing issues
    const styleId = 'fd-plugin-star-mask-style';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      .wporg-ratings .star {
        mask: url("${iconUrl}") center center / contain no-repeat;
        -webkit-mask: url("${iconUrl}") center center / contain no-repeat;
      }
    `;
  }
});

// Funcs
import { ratingToStars } from "@/assets/js/functions/ratingToStars.js";
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { activating, activatePlugin } from "./activatePlugin.js";
import { updating, updatePlugin } from "./updatePlugin.js";
import { deactivating, deactivatePlugin } from "./deactivatePlugin.js";
import { deleting, deletePlugin } from "./deletePlugin.js";

const search = ref("");
const selected = ref([]);
const loading = ref(true);
const plugins = ref([]);
const currentPlugin = ref(null);
const installing = ref(false);
const panel = ref(null);
const router = useRouter();
const route = useRoute();
const error = ref(false);
const lightboxVisible = ref(false);
const lightboxIndex = ref(1);

const getPlugin = async () => {
  loading.value = true;
  error.value = false;
  const response = await fetch(
    `https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=${route.params.slug}&fields=icons,banners,short_description,last_updated,description,installation,faq,sections,screenshots,downloaded,reviews`
  );

  loading.value = false;

  if (!response.ok) {
    error.value = true;
    return;
  }

  const data = await response.json();

  if (data.error) {
    error.value = true;
    return;
  }

  error.value = false;
  currentPlugin.value = data;
};

/**
 * Gets the best available icon for a plugin
 */
const getPluginIcon = computed(() => {
  if (currentPlugin.value?.icons) {
    const icons = currentPlugin.value.icons;
    return icons["2x"] || icons["1x"] || icons.default;
  }
  return `https://www.google.com/s2/favicons?domain=${currentPlugin.value.homepage}&sz=400`;
});

/**
 * Gets the banner image for a plugin
 */
const getPluginBanner = computed(() => {
  if (currentPlugin.value?.banners) {
    const banners = currentPlugin.value.banners;
    return banners["low"] || banners["high"] || null;
  }
  return null;
});

const isPluginInstalled = computed(() => {
  for (let key in appStore.state.pluginsList) {
    const basePlugin = appStore.state.pluginsList[key];
    if ((currentPlugin.value.slug == basePlugin.splitSlug || currentPlugin.value.slug == basePlugin.slug) && !basePlugin.deleted) return basePlugin;
  }
  return false;
});

const isPluginActive = computed(() => {
  for (let key in appStore.state.pluginsList) {
    const basePlugin = appStore.state.pluginsList[key];
    if ((currentPlugin.value.slug == basePlugin.splitSlug || currentPlugin.value.slug == basePlugin.slug) && !basePlugin.deleted && basePlugin.active) return basePlugin;
  }
  return false;
});

const basePlugin = computed(() => {
  for (let key in appStore.state.pluginsList) {
    const basePlugin = appStore.state.pluginsList[key];
    if (currentPlugin.value.slug == basePlugin.splitSlug || currentPlugin.value.slug == basePlugin.slug) return basePlugin;
  }
  return currentPlugin.value;
});

const installPluginBySlug = async (plugin) => {
  installing.value = true;

  const args = { endpoint: `flexify-dashboard/v1/plugin/install-repo/${plugin.slug}`, params: {}, type: "POST" };
  const response = await lmnFetch(args);

  installing.value = false;

  if (!response) return false;

  notify({ title: __("Plugin installed", "flexify-dashboard"), message: plugin.name, type: "success" });

  response.data.plugin.icons = plugin.icons;
  response.data.plugin.banners = plugin.banners;

  // Update current plugin slug
  currentPlugin.value.splitSlug = currentPlugin.value.slug;
  currentPlugin.value.slug = response.data.plugin.slug;

  appStore.state.pluginsList[response.data.plugin.slug] = response.data.plugin;
};

const lightBoxBack = () => {
  const length = Object.keys(currentPlugin.value.screenshots).length;

  if (lightboxIndex.value === 1) {
    lightboxIndex.value = length;
  } else {
    lightboxIndex.value--;
  }
};

const lightBoxForward = () => {
  const length = Object.keys(currentPlugin.value.screenshots).length;

  if (lightboxIndex.value === length) {
    lightboxIndex.value = 1;
  } else {
    lightboxIndex.value++;
  }
};

const screenshotLength = computed(() => {
  return Object.keys(currentPlugin.value.screenshots).length;
});

watchEffect(() => {
  if (route.params.slug) {
    getPlugin();
  }
});
</script>

<template>
  <Transition>
    <!-- Loading indicator -->
    <div class="flex flex-col translate-x-0 h-screen min-h-screen max-h-screen overflow-hidden" v-if="loading">
      <div class="w-full aspect-[3.089] bg-zinc-100 border-b border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden relative shrink-0 animate-pulse"></div>

      <div class="p-8 py-0 -mt-8 flex flex-col gap-2 items-start z-[1] shrink-0 animate-pulse">
        <div class="rounded-lg bg-white dark:bg-zinc-900 p-1 -ml-1 -mt-1">
          <div class="rounded-md bg-brand-600 aspect-square h-16 overflow-hidden"></div>
        </div>
        <div class="rounded-lg h-10 bg-zinc-100 dark:bg-zinc-800 animate-pulse w-2/3"></div>
        <div class="rounded-lg h-16 bg-zinc-100 dark:bg-zinc-800 animate-pulse w-full"></div>
      </div>
    </div>
    <!-- End Loading indicator -->

    <div v-else-if="!loading && error" class="p-8">
      <div class="bg-rose-500/30 rounded-lg p-4">{{ __("There was an error fetching this plugins information", "flexify-dashboard") }}</div>
    </div>

    <div class="flex flex-col translate-x-0 h-screen min-h-screen max-h-screen overflow-hidden" v-else-if="currentPlugin && !loading">
      <div class="w-full aspect-[3.089] bg-zinc-100 border-b border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden relative shrink-0">
        <!-- Show banner if available -->
        <img v-if="getPluginBanner" :src="getPluginBanner" class="w-full h-full object-cover object-center" />

        <PluginCardBanner v-else />

        <!-- Closer -->

        <div class="absolute top-0 left-0 p-3 pl-8 z-[99]">
          <button
            class="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            @click.prevent.stop="currentPlugin = null"
          >
            <RouterLink to="/plugin-search" class="flex flex-row items-center gap-1">
              <AppIcon icon="chevron_left" class="text-xl" />
              <span>{{ __("Back to plugins", "flexify-dashboard") }}</span>
            </RouterLink>
          </button>
        </div>

        <div class="absolute bottom-0 right-0 left-0 h-2/3 bg-gradient-to-t from-zinc-900/20 to-transparent"></div>
      </div>
      <div class="p-8 py-0 -mt-8 flex flex-col gap-2 items-start z-[1] shrink-0">
        <div class="rounded-lg bg-white dark:bg-zinc-900 p-1 -ml-1 -mt-1">
          <div class="rounded-md bg-brand-600 aspect-square h-16 overflow-hidden">
            <img :src="getPluginIcon" class="w-full h-full object-cover" />
          </div>
        </div>
        <div class="text-zinc-900 dark:text-zinc-100 font-semibold text-xl" v-html="currentPlugin.name"></div>
        <div class="text-zinc-500 dark:text-zinc-400 grow line-clamp-3" v-html="currentPlugin.short_description"></div>
      </div>

      <div class="p-8 py-6 grid grid-cols-5 gap-2 shrink-0">
        <div class="flex flex-col items-center h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
          <div class="flex flex-row items-center text-orange-600 dark:text-orange-400 text-sm grow">
            <AppIcon v-for="icon in ratingToStars(currentPlugin.rating)" :icon="icon" :class="icon == 'star_empty' ? 'opacity-50' : ''" />
          </div>
          <span class="text-xs text-zinc-500">{{ __("Rating", "flexify-dashboard") }}</span>
        </div>

        <div class="flex flex-col items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
          <span>{{ Intl.NumberFormat().format(currentPlugin.active_installs) }}</span>
          <span class="text-xs text-zinc-500">{{ __("Installs", "flexify-dashboard") }}</span>
        </div>

        <div class="flex flex-col items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
          <span>{{ Intl.NumberFormat().format(currentPlugin.downloaded) }}</span>
          <span class="text-xs text-zinc-500">{{ __("Downloads", "flexify-dashboard") }}</span>
        </div>

        <div class="flex flex-col items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
          <span>{{ currentPlugin.version }}</span>
          <span class="text-xs text-zinc-500">{{ __("Version", "flexify-dashboard") }}</span>
        </div>

        <div class="flex flex-col items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
          <span>{{ dayjs(currentPlugin.last_updated).fromNow() }}</span>
          <span class="text-xs text-zinc-500">{{ __("Last updated", "flexify-dashboard") }}</span>
        </div>
      </div>

      <div class="px-8 flex flex-col gap-6 grow overflow-auto">
        <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3"></div>
        <Accordion :title="__('Description', 'flexify-dashboard')">
          <div class="max-w-full fd-plugin-description" v-html="currentPlugin.description"></div>
        </Accordion>

        <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3"></div>

        <Accordion :title="__('Screenshots', 'flexify-dashboard')">
          <div class="grid grid-cols-2 gap-6">
            <template v-for="(image, index) in currentPlugin.screenshots">
              <img
                :src="image.src"
                class="rounded-xl w-full cursor-pointer"
                @click="
                  () => {
                    lightboxIndex = Number(index);
                    lightboxVisible = true;
                  }
                "
              />
            </template>
          </div>
        </Accordion>

        <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3"></div>

        <Accordion :title="__('Installation', 'flexify-dashboard')">
          <div class="max-w-full fd-plugin-description" v-html="currentPlugin.sections.installation"></div>
        </Accordion>

        <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3"></div>

        <Accordion :title="__('FAQ', 'flexify-dashboard')">
          <div class="max-w-full fd-plugin-description" v-html="currentPlugin.sections.faq"></div>
        </Accordion>

        <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3"></div>

        <Accordion :title="__('Reviews', 'flexify-dashboard')">
          <div class="max-w-full fd-plugin-description flex flex-col gap-3" v-html="currentPlugin.sections.reviews"></div>
        </Accordion>

        <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3"></div>

        <Accordion :title="__('Changelog', 'flexify-dashboard')">
          <div class="max-w-full fd-plugin-description" v-html="currentPlugin.sections.changelog"></div>
        </Accordion>
      </div>

      <div class="sticky bottom-0 left-0 right-0 p-8 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 flex flex-row place-content-end gap-2">
        <AppButton v-if="!isPluginInstalled" type="primary" @click.stop.prevent="installPluginBySlug(currentPlugin)" :loading="installing">{{ __("Install plugin", "flexify-dashboard") }}</AppButton>
        <AppButton v-if="isPluginInstalled && !isPluginActive" type="danger" @click.stop.prevent="deletePlugin(basePlugin)" :loading="deleting">{{ __("Delete", "flexify-dashboard") }}</AppButton>
        <AppButton v-if="isPluginInstalled && isPluginActive" type="primary" @click.stop.prevent="deactivatePlugin(basePlugin)" :loading="deactivating">{{ __("Deactivate", "flexify-dashboard") }}</AppButton>
        <AppButton v-if="isPluginInstalled && !isPluginActive" type="primary" @click.stop.prevent="activatePlugin(basePlugin)" :loading="activating">{{ __("Activate", "flexify-dashboard") }}</AppButton>
      </div>
    </div>
  </Transition>

  <!-- Lightbox -->
  <div v-if="currentPlugin && !loading && lightboxVisible" class="fixed top-0 left-0 right-0 h-screen bg-zinc-900/30 z-99 flex flex-col place-items-center justify-center items-center p-24">
    <Transition name="slide-fade">
      <img :src="currentPlugin.screenshots[lightboxIndex].src" class="rounded-xl object-contain max-w-full max-h-full" />
    </Transition>

    <div class="absolute top-0 right-0 p-6">
      <button class="rounded-full p-2 text-zinc-200 hover:text-white transition-colors bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer" @click.stop.prevent="lightboxVisible = false">
        <AppIcon icon="close" class="text-2xl" />
      </button>
    </div>

    <div class="absolute top-1/2 -translate-y-1/2 left-0 p-6" v-if="screenshotLength">
      <button class="rounded-full p-2 text-zinc-200 hover:text-white transition-colors bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer" @click="lightBoxBack">
        <AppIcon icon="chevron_left" class="text-2xl" />
      </button>
    </div>

    <div class="absolute top-1/2 -translate-y-1/2 right-0 p-6" v-if="screenshotLength">
      <button class="rounded-full p-2 text-zinc-200 hover:text-white transition-colors bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer" @click="lightBoxForward">
        <AppIcon icon="chevron_right" class="text-2xl" />
      </button>
    </div>
  </div>
</template>

<style>
@reference "@/assets/css/tailwind.css";

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
.review {
  @apply p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900;
}

.reviewer-info {
  @apply space-y-3;
}

.review-title-section {
  @apply flex justify-between items-center;
}

.review h4.review-title {
  @apply text-lg font-medium m-0;
}

.star-rating {
  @apply flex gap-1;
}

.reviewer-info > p.reviewer {
  @apply text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2 m-0;
  margin: 0 !important;
}

.reviewer img {
  @apply rounded-full;
}

.reviewer-name {
  @apply hover:text-brand-600 dark:hover:text-brand-400;
}

.review-date {
  @apply text-zinc-500;
}

.review-body {
  @apply mt-3 text-zinc-500 dark:text-zinc-400;
}
.review-body p:last-of-type {
  @apply mb-0;
}

.wporg-ratings {
  @apply flex flex-row;
}
.wporg-ratings .star {
  display: block;
  height: 1em;
  width: 1em;
  min-height: 1em;
  min-width: 1em;
  /* Mask will be set dynamically via injected style tag to avoid CSS variable parsing issues */
}

.wporg-ratings .star.dashicons-star-filled {
  @apply ![background-color:theme(colors.orange.600)] dark:![background-color:theme(colors.orange.400)];
}

.wporg-ratings .star.dashicons-star-empty {
  @apply ![background-color:theme(colors.zinc.300)] dark:![background-color:theme(colors.zinc.600)];
}
</style>
