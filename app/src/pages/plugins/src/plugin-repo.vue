<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Dajjs
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import PluginCard from './plugin-repo-card.vue';
import AppSelect from '@/components/utility/select/index.vue';
import Drawer from '@/components/utility/drawer/index.vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

const search = ref('');
const drawer = ref(null);
const selected = ref([]);
const loading = ref(true);
const pagination = ref({ page: 1, per_page: 20, pages: 0 });
const plugins = ref([]);
const panel = ref(null);
const router = useRouter();
const route = useRoute();
const activeSort = ref('popularity');

const orderByOptions = {
  name: { label: __('Name', 'flexify-dashboard'), value: 'name' },
  slug: { label: __('Slug', 'flexify-dashboard'), value: 'Slug' },
  rating: { label: __('Rating', 'flexify-dashboard'), value: 'rating' },
  popularity: { label: __('Popularity', 'flexify-dashboard'), value: 'popularity' },
  downloaded: { label: __('Downloaded', 'flexify-dashboard'), value: 'downloaded' },
  active_installs: {
    label: __('Active installs', 'flexify-dashboard'),
    value: 'active_installs',
  },
  last_updated: {
    label: __('Last updated', 'flexify-dashboard'),
    value: 'last_updated',
  },
};

const getPlugins = async () => {
  loading.value = true;

  const response = await fetch(
    `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&page=${pagination.value.page}&per_page=${pagination.value.per_page}&search=${search.value}&orderby=${activeSort.value}&fields=icons,banners,short_description,last_updated,description,installation,faq,sections,screenshots`
  );
  const data = await response.json();

  loading.value = false;

  plugins.value = data.plugins;

  const { pages } = data.info;
  pagination.value.pages = pages;
};

const isPluginInstalled = (plugin) => {
  if (!plugin?.slug) return false;
  const searchSlug = plugin.slug.split('/')[0];

  for (let key in appStore.state.pluginsList) {
    const basePlugin = appStore.state.pluginsList[key];
    if (!basePlugin || basePlugin.deleted) continue;

    // Compute splitSlug if it doesn't exist
    const baseSplitSlug =
      basePlugin.splitSlug ||
      (basePlugin.slug ? basePlugin.slug.split('/')[0] : key.split('/')[0]);

    // Match by splitSlug or by full slug
    if (
      (plugin.slug == baseSplitSlug ||
        searchSlug == baseSplitSlug ||
        plugin.slug == basePlugin.slug) &&
      !basePlugin.deleted
    ) {
      return basePlugin;
    }
  }
  return false;
};

const updatePluginData = (plugin, data) => {
  if (!plugin?.slug) return;
  appStore.state.pluginsList[plugin.slug] = {
    ...appStore.state.pluginsList[plugin.slug],
    ...data,
  };
};

const inspectPlugin = (plugin) => {
  if (!plugin?.slug) return;
  router.push({ path: `/plugin-search/${plugin.slug}`, query: {} });
};

const maybeClose = (evt) => {
  if (!panel.value) return;
  if (panel.value.contains(evt.target)) return;
  router.push({ path: '/', query: {} });
};

const isPluginInspect = computed(() => {
  return route.matched.some(({ name }) => name == 'plugin-inspect');
});

watch(() => pagination.value.page, getPlugins);

watch(
  () => search.value,
  (newVal, oldVal) => {
    if (!newVal && oldVal != '') getPlugins();
  }
);

watch(() => activeSort.value, getPlugins);

onMounted(() => {
  drawer.value = true;
});

getPlugins();
</script>

<template>
  <Drawer
    v-model="drawer"
    :showHeader="false"
    size="large"
    @close="router.push({ path: '/', query: { ...route.query } })"
  >
    <div
      class="w-full max-w-screen flex flex-col gap-6 p-6 h-full max-h-full overflow-hidden"
      :class="isPluginInspect ? '' : 'p-6'"
    >
      <template v-if="!isPluginInspect">
        <div class="text-xl flex-shrink-0">
          {{ __('Add plugin', 'flexify-dashboard') }}
        </div>

        <div class="flex flex-row gap-2 flex-shrink-0">
          <!-- Search box -->
          <div class="relative flex grow">
            <input
              v-model="search"
              class="px-2 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 dark:focus:outline-brand-700 focus:shadow-xs text-sm bg-transparent px-8"
              :placeholder="__('Search plugins', 'flexify-dashboard')"
              @keyup.enter="
                () => {
                  pagination.page = 1;
                  getPlugins();
                }
              "
            />

            <!-- Icon-->
            <div
              class="absolute top-0 left-0 h-full flex flex-col place-content-center px-2 py-1"
            >
              <AppIcon icon="search" class="text-lg text-zinc-400" />
            </div>

            <!-- Copy-->
            <div
              class="absolute top-0 right-0 h-full flex flex-col place-content-center p-1"
              v-if="search"
            >
              <div
                class="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <AppIcon icon="return" class="text-base" />
              </div>
            </div>
          </div>

          <!-- Browse options don't work with search -->
          <AppSelect
            v-if="1 == 2"
            v-model="activeSort"
            :options="orderByOptions"
          />

          <AppButton
            type="default"
            :disabled="pagination.page <= 1"
            @click="pagination.page--"
          >
            <AppIcon icon="chevron_left" />
          </AppButton>
          <AppButton
            type="default"
            :disabled="pagination.page >= pagination.pages"
            @click="pagination.page++"
          >
            <AppIcon icon="chevron_right" />
          </AppButton>
        </div>

        <div
          class="grid md:grid-cols-2 gap-6 grid-cols-1 overflow-y-auto flex-1 min-h-0"
          style="grid-auto-rows: max-content"
        >
          <!-- Loading -->
          <div
            class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden shadow relative group cursor-pointer gap-3 p-4 animate-pulse"
            v-if="loading"
            v-for="index in 20"
          >
            <div
              class="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800"
            ></div>

            <div class="w-2/3 h-3 rounded bg-zinc-100 dark:bg-zinc-800"></div>
            <div class="w-3/4 h-3 rounded bg-zinc-100 dark:bg-zinc-800"></div>

            <div class="w-1/3 h-6 rounded bg-zinc-100 dark:bg-zinc-800"></div>
          </div>

          <template v-else v-for="plugin in plugins" :key="plugin.slug">
            <PluginCard
              :plugin="plugin"
              :is-installed="!!isPluginInstalled(plugin)"
              @click.stop.prevent="inspectPlugin(plugin)"
            />
          </template>
        </div>
      </template>

      <RouterView id="plugin-inspect" v-else />
    </div>
  </Drawer>
</template>

<style>
@reference "@/assets/css/tailwind.css";

.fd-plugin-description {
  @apply text-zinc-700 dark:text-zinc-300 leading-relaxed;

  h1,
  h2,
  h3,
  h4 {
    @apply font-bold mb-4 mt-6;
  }

  h1 {
    @apply text-2xl;
  }

  h2 {
    @apply text-xl;
  }

  h3 {
    @apply text-lg;
  }

  h4 {
    @apply text-base;
  }

  p {
    @apply mb-4;
  }

  code {
    @apply bg-zinc-100 px-1.5 py-0.5 rounded text-sm;
    font-family: var(--font-mono);
  }

  pre {
    @apply bg-zinc-100 p-4 rounded-lg mb-4 overflow-x-auto;
  }

  ul,
  ol {
    @apply mb-4 ml-6;
  }

  ul {
    @apply list-disc;
  }

  ol {
    @apply list-decimal;
  }

  a {
    @apply text-brand-600 hover:text-brand-800 underline;
  }

  iframe {
    @apply max-w-full;
  }

  dt {
    @apply text-lg font-semibold mb-2 mt-6;
  }

  dd {
    @apply mb-6 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700;
  }

  dt p {
    @apply text-base font-normal mt-2;
  }
}
</style>
