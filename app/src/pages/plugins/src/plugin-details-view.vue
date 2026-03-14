<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Comps
import PluginCard from './plugin-card.vue';
import AppIcon from '@/components/utility/icons/index.vue';

const route = useRoute();
const router = useRouter();

// Refs
const pluginSlug = computed(() => route.params.slug);
const plugin = computed(() => {
  if (!pluginSlug.value || !appStore.state.pluginsList) {
    return null;
  }
  return appStore.state.pluginsList[pluginSlug.value];
});

/**
 * Update plugin data
 */
const updatePluginData = (data) => {
  if (plugin.value) {
    appStore.state.pluginsList[plugin.value.slug] = {
      ...appStore.state.pluginsList[plugin.value.slug],
      ...data,
    };
  }
};

// Watch for route changes and handle plugin deletion
watch(
  () => appStore.state.pluginsList?.[pluginSlug.value]?.deleted,
  (deleted) => {
    if (deleted && pluginSlug.value) {
      router.push('/');
    }
  }
);
</script>

<template>
  <div class="flex-1 flex flex-col h-full max-h-full overflow-hidden">
    <!-- Loading/Not Found State -->
    <div
      v-if="!plugin"
      class="flex-1 flex items-center justify-center"
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
          {{ __('Plugin not found', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          {{
            __(
              'The plugin you are looking for could not be found.',
              'flexify-dashboard'
            )
          }}
        </p>
      </div>
    </div>

    <!-- Plugin Details -->
    <PluginCard
      v-else
      v-model="appStore.state.pluginsList[pluginSlug]"
      @update="updatePluginData"
    />
  </div>
</template>

