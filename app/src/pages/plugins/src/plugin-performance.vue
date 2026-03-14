<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { useRoute, useRouter } from "vue-router";

// Store
import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();

import AppButton from "@/components/utility/app-button/index.vue";
import Accordion from "@/components/utility/accordion/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import AppToggle from "@/components/utility/toggle/index.vue";

const pluginStats = ref({});
const panel = ref(null);
const loading = ref(true);
const router = useRouter();
const route = useRoute();
const tab = ref("frontend");
const toggleOptions = {
  frontend: { label: __("Frontend performance", "flexify-dashboard"), value: "frontend" },
  backend: { label: __("Backend performance", "flexify-dashboard"), value: "backend" },
};
const frontEndDescription = __(
  "These metrics represent plugin performance during a home page load. While this provides valuable insight into plugin behavior, actual performance may vary across different pages and user interactions.",
  "flexify-dashboard"
);
const backEndDescription = __(
  "These metrics represent plugin performance during a admin dashboard page load. While this provides valuable insight into plugin behavior, actual performance may vary across different pages and user interactions.",
  "flexify-dashboard"
);

//route.params.slug

const maybeClose = (evt) => {
  if (!panel.value) return;
  if (panel.value.contains(evt.target)) return;
  router.push({ path: "/", query: {} });
};

const getPluginPerformance = async () => {
  loading.value = true;

  const urlBase = tab.value !== "backend" ? appStore.state.siteURL : appStore.state.adminUrl;
  const url = `${urlBase}?collect_plugin_metrics=1&plugin_slug=${route.params.slug}`;

  const response = await fetch(url);

  loading.value = false;

  // Generic error
  if (!response.ok) {
    try {
      const errorResponse = await response.json();
      return notify({ type: "error", title: "Unable to connect", message: errorResponse.message || errorResponse.error });
    } catch (err) {
      return notify({ type: "error", title: "Unable to connect", message: "Unable to connect to remote services at this time" });
    }
  }

  // Get HTML content
  const htmlContent = await response.text();

  // Create a DOM parser to handle the HTML content
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // Find the metrics script tag
  const metricsScript = doc.getElementById("plugin-metrics-data");

  if (!metricsScript) {
    notify({
      type: "error",
      title: "No metrics found",
      message: "Could not find metrics data in the response",
    });
    return;
  }

  // Parse the JSON content
  const metricsData = JSON.parse(metricsScript.textContent);

  pluginStats.value = metricsData;
};

// Utility function to format execution time
const formatExecutionTime = (seconds) => {
  if (seconds === 0) return 0;

  if (!seconds) return 0;
  // Convert all small times to milliseconds with 2 decimal places
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(2)}ms`;
  }
  // For times less than a minute, show seconds
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  // For longer times, show minutes and seconds
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
};

const formatMemoryUsage = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";

  // Define size thresholds
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;

  // Calculate the appropriate unit level
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Don't go beyond GB
  const unitIndex = Math.min(i, units.length - 1);

  // Convert to the appropriate unit
  const value = bytes / Math.pow(k, unitIndex);

  // Format with appropriate decimal places
  // Use more decimals for smaller units
  const decimals =
    unitIndex === 0
      ? 0 // Bytes: no decimals
      : unitIndex === 1
      ? 1 // KB: 1 decimal
      : 2; // MB/GB: 2 decimals

  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};

const returnActualPlugin = computed(() => {
  for (let key in appStore.state.pluginsList) {
    if (appStore.state.pluginsList[key].splitSlug == route.params.slug) return appStore.state.pluginsList[key];
  }
});

const returnPluginMetrics = computed(() => {
  for (let key in pluginStats.value) {
    if (pluginStats.value[key].splitSlug == route.params.slug) return pluginStats.value[key];
  }
});

const returnPluginAssetSize = computed(() => {
  const currentPluginMetrics = returnPluginMetrics.value;
  let size = 0;

  for (let asset of currentPluginMetrics.assets.scripts) {
    size += asset.size;
  }

  for (let asset of currentPluginMetrics.assets.styles) {
    size += asset.size;
  }

  return formatMemoryUsage(size);
});

const getPluginIcon = computed(() => {
  if (returnActualPlugin.value?.icons) {
    const icons = returnActualPlugin.value.icons;
    return icons["2x"] || icons["1x"] || icons.default;
  }
  return `https://www.google.com/s2/favicons?domain=${returnActualPlugin.value.PluginURI || returnActualPlugin.value.AuthorURI}&sz=400`;
});

const returnMemoryPercentage = computed(() => {
  const allocated = returnPluginMetrics.value.metrics.total_memory_allocated;
  const peak = returnPluginMetrics.value.metrics.global_peak_memory;
  const percentage = (allocated / peak) * 100;

  return `${percentage.toFixed(2)}%`;
});

onMounted(() => {
  getPluginPerformance();
});

watch(() => tab.value, getPluginPerformance);
</script>

<template>
  <div class="fixed top-0 left-0 right-0 bottom-0 bg-zinc-900/20 dark:bg-zinc-900/60 flex flex-row place-content-end z-[99999]" @click="maybeClose">
    <div
      ref="panel"
      class="h-screen max-h-screen overflow-auto bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 max-w-full relative shadow-lg rounded-tl-lg rounded-bl-lg relative max-w-full dark:shadow-zinc-950"
    >
      <div class="w-[600px] max-w-screen p-6">
        <div class="flex flex-col gap-6">
          <div class="flex flex-row items-center gap-3">
            <div class="rounded-md bg-indigo-600 aspect-square h-8 overflow-hidden">
              <img :src="getPluginIcon" class="w-full h-full object-cover" />
            </div>

            <div class="text-xl text-zinc-900 dark:text-zinc-100 grow" v-html="returnActualPlugin.Title"></div>

            <RouterLink to="/">
              <AppButton type="transparent"><AppIcon icon="close" class="text-lg" /></AppButton>
            </RouterLink>
          </div>

          <AppToggle :options="toggleOptions" v-model="tab" @click.stop />

          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ tab == "frontend" ? frontEndDescription : backEndDescription }}
          </div>

          <div class="grid grid-cols-3 gap-3 animate-pulse" v-if="loading">
            <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800 h-[66.5px]" v-for="index in 9"></div>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3 col-span-3"></div>

            <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800 h-[66.5px] col-span-3"></div>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3 col-span-3"></div>

            <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800 h-[66.5px] col-span-3"></div>
          </div>

          <template v-else-if="returnActualPlugin && returnPluginMetrics">
            <div class="grid grid-cols-3 gap-3">
              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Total Queries", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ returnPluginMetrics.metrics.query_count || 0 }}</div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Query time", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ formatExecutionTime(returnPluginMetrics.metrics.query_time) }}</div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Total hooks", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ returnPluginMetrics.metrics.hook_count || 0 }}</div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Execution time", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ formatExecutionTime(returnPluginMetrics.metrics.execution_time) }}</div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Memory usage", "flexify-dashboard") }}</div>
                <div class="">
                  <span class="font-semibold text-xl text-indigo-500 dark:text-indigo-400 mr-1">{{ formatMemoryUsage(returnPluginMetrics.metrics.total_memory_allocated) }}</span>
                  <span class="text-zinc-500">({{ returnMemoryPercentage }})</span>
                </div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Total scripts", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ returnPluginMetrics.assets.scripts.length }}</div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Total styles", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ returnPluginMetrics.assets.styles.length }}</div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("Total asset size", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ returnPluginAssetSize }}</div>
              </div>

              <div class="p-3 rounded-lg flex flex-col gap-1 grow transition-all bg-zinc-100 dark:bg-zinc-800">
                <div class="text-sm whitespace-nowrap">{{ __("HTTP requests", "flexify-dashboard") }}</div>
                <div class="font-semibold text-xl text-indigo-500 dark:text-indigo-400">{{ returnPluginMetrics.http_requests.length }}</div>
              </div>
            </div>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3"></div>

            <Accordion :title="`${__('Scripts', 'flexify-dashboard')} (${returnPluginMetrics.assets.scripts.length})`" v-if="returnPluginMetrics.assets.scripts.length">
              <div class="flex flex-col gap-2 pl-3">
                <div class="grid grid-cols-4 max-w-full gap-3 font-semibold mb-3">
                  <div class="text-sm text-zinc-500">{{ __("Handle", "flexify-dashboard") }}</div>
                  <div class="text-sm text-zinc-500">{{ __("Size", "flexify-dashboard") }}</div>
                  <div class="text-sm col-span-2 text-zinc-500">{{ __("File", "flexify-dashboard") }}</div>
                </div>
                <div v-for="script in returnPluginMetrics.assets.scripts" class="grid grid-cols-4 max-w-full gap-3">
                  <div class="truncate">{{ script.handle }}</div>
                  <div class="">{{ formatMemoryUsage(script.size) }}</div>
                  <div class="text-sm truncate col-span-2">{{ script.src }}</div>
                </div>
              </div>
            </Accordion>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3" v-if="returnPluginMetrics.assets.scripts.length"></div>

            <Accordion :title="`${__('Styles', 'flexify-dashboard')} (${returnPluginMetrics.assets.styles.length})`" v-if="returnPluginMetrics.assets.styles.length">
              <div class="flex flex-col gap-2 pl-3">
                <div class="grid grid-cols-4 max-w-full gap-3 font-semibold mb-3">
                  <div class="text-sm text-zinc-500">{{ __("Handle", "flexify-dashboard") }}</div>
                  <div class="text-sm text-zinc-500">{{ __("Size", "flexify-dashboard") }}</div>
                  <div class="text-sm col-span-2 text-zinc-500">{{ __("File", "flexify-dashboard") }}</div>
                </div>
                <div v-for="style in returnPluginMetrics.assets.styles" class="grid grid-cols-4 max-w-full gap-3">
                  <div class="truncate">{{ style.handle }}</div>
                  <div class="">{{ formatMemoryUsage(style.size) }}</div>
                  <div class="text-sm truncate col-span-2">{{ style.src }}</div>
                </div>
              </div>
            </Accordion>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3" v-if="returnPluginMetrics.assets.styles.length"></div>

            <Accordion :title="`${__('Queries', 'flexify-dashboard')} (${returnPluginMetrics.queries.length})`" v-if="returnPluginMetrics.queries.length">
              <div class="flex flex-col gap-2 pl-3">
                <div v-for="query in returnPluginMetrics.queries">
                  <pre class="rounded-lg bg-zinc-100 p-2 overflow-auto"><code>{{query.query}}</code></pre>
                  <div class="text-sm text-zinc-500 pl-2 mb-2">{{ formatExecutionTime(query.time) }}</div>
                </div>
              </div>
            </Accordion>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3" v-if="returnPluginMetrics.queries.length"></div>

            <Accordion :title="`${__('Hooks', 'flexify-dashboard')} (${returnPluginMetrics.hooks.length})`" v-if="returnPluginMetrics.hooks.length">
              <div class="flex flex-col gap-2 pl-3">
                <div class="grid grid-cols-8 max-w-full gap-3 font-semibold mb-3">
                  <div class="text-sm truncate col-span-2">{{ __("Hook", "flexify-dashboard") }}</div>
                  <div class="text-sm truncate col-span-2">{{ __("Callback", "flexify-dashboard") }}</div>
                  <div class="text-sm truncate col-span-3">{{ __("File", "flexify-dashboard") }}</div>
                  <div class="text-sm truncate text-right">{{ __("Priority", "flexify-dashboard") }}</div>
                </div>
                <div v-for="hook in returnPluginMetrics.hooks" class="grid grid-cols-8 max-w-full gap-3">
                  <div class="text-sm text-zinc-500 truncate col-span-2">{{ hook.name }}</div>
                  <div class="text-sm text-zinc-500 truncate col-span-2">{{ hook.callback }}</div>
                  <div class="text-sm text-zinc-500 truncate col-span-3">{{ hook.file }}</div>
                  <div class="text-sm text-zinc-500 truncate text-right">{{ hook.priority }}</div>
                </div>
              </div>
            </Accordion>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3" v-if="returnPluginMetrics.hooks.length"></div>

            <Accordion :title="`${__('HTTP requests', 'flexify-dashboard')} (${returnPluginMetrics.http_requests.length})`" v-if="returnPluginMetrics.http_requests.length">
              <div class="flex flex-col gap-2 pl-3">
                <div class="grid grid-cols-4 max-w-full gap-3 font-semibold mb-3">
                  <div class="text-sm text-zinc-500">{{ __("Hook", "flexify-dashboard") }}</div>
                  <div class="text-sm text-zinc-500">{{ __("Method", "flexify-dashboard") }}</div>
                  <div class="text-sm col-span-2 text-zinc-500">{{ __("URL", "flexify-dashboard") }}</div>
                </div>
                <div v-for="request in returnPluginMetrics.http_requests" class="grid grid-cols-4 max-w-full gap-3">
                  <div class="">{{ request.hook }}</div>
                  <div class="">{{ request.method }}</div>
                  <div class="text-sm truncate col-span-2">{{ request.url }}</div>
                </div>
              </div>
            </Accordion>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3" v-if="returnPluginMetrics.http_requests.length"></div>

            <Accordion :title="`${__('Depreciated functions', 'flexify-dashboard')} (${returnPluginMetrics.deprecated_calls.length})`" v-if="returnPluginMetrics.deprecated_calls.length">
              <div class="flex flex-col gap-2 pl-3">
                <div class="grid grid-cols-4 max-w-full gap-3 font-semibold mb-3">
                  <div class="text-sm text-zinc-500">{{ __("Function", "flexify-dashboard") }}</div>
                  <div class="text-sm text-zinc-500">{{ __("Line", "flexify-dashboard") }}</div>
                  <div class="text-sm col-span-2 text-zinc-500">{{ __("File", "flexify-dashboard") }}</div>
                </div>
                <div v-for="request in returnPluginMetrics.deprecated_calls" class="grid grid-cols-4 max-w-full gap-3">
                  <div class="">{{ request.function }}</div>
                  <div class="">{{ request.line }}</div>
                  <div class="text-sm truncate col-span-2">{{ request.file }}</div>
                </div>
              </div>
            </Accordion>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3" v-if="returnPluginMetrics.deprecated_calls.length"></div>

            <Accordion :title="`${__('Errors', 'flexify-dashboard')} (${returnPluginMetrics.errors.length})`" v-if="returnPluginMetrics.errors.length">
              <div class="flex flex-col gap-2 pl-3">
                <div class="grid grid-cols-4 max-w-full gap-3 font-semibold mb-3">
                  <div class="text-sm text-zinc-500">{{ __("Type", "flexify-dashboard") }}</div>
                  <div class="text-sm col-span-2 text-zinc-500">{{ __("Message", "flexify-dashboard") }}</div>
                  <div class="text-sm text-zinc-500 text-right">{{ __("File", "flexify-dashboard") }}</div>
                </div>
                <div v-for="error in returnPluginMetrics.errors" class="grid grid-cols-4 max-w-full gap-3">
                  <div class="">{{ error.type }}</div>
                  <div class="col-span-2">{{ error.message }}</div>
                  <div class="text-sm truncate text-right">{{ error.file }}</div>
                </div>
              </div>
            </Accordion>

            <div class="w-full border-t border-zinc-200 dark:border-zinc-700 my-3" v-if="returnPluginMetrics.errors.length"></div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
