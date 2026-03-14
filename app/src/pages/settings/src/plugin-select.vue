<script setup>
import { ref, onMounted } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import AppCheckBox from '@/components/utility/checkbox-basic/index.vue';

const model = defineModel({
  default: () => [],
});

const loading = ref(false);
const options = ref([]);
const isSelected = (pluginValue) => model.value.includes(pluginValue);

const toggleOption = (pluginValue) => {
    if (!Array.isArray(model.value)) {
        model.value = [];
    }

    if (isSelected(pluginValue)) {
        model.value = model.value.filter((value) => value !== pluginValue);

        return;
    }

    model.value = [...model.value, pluginValue];
};

const loadPlugins = async () => {
    loading.value = true;

    const response = await lmnFetch({
        endpoint: 'wp/v2/plugins',
        type: 'GET',
        params: {
            per_page: 100,
            status: 'active,inactive',
        },
    });

    loading.value = false;

    if (!response || !Array.isArray(response.data)) {
        return;
    }

    options.value = response.data.map((plugin) => ({
        value: plugin.plugin,
        label: `${plugin.name}`,
    }));
};

onMounted(() => {
  loadPlugins();
});
</script>

<template>
  <div class="flex flex-col gap-2 max-w-[560px]">
    <div class="max-h-[220px] overflow-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-1">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        @click="toggleOption(option.value)"
      >
        <AppCheckBox :checked="isSelected(option.value)" />
        <span class="text-sm">{{ option.label }}</span>
      </button>

      <span v-if="!loading && !options.length" class="block text-sm text-zinc-500 dark:text-zinc-400 p-2">
        {{ __('No plugins found.', 'flexify-dashboard') }}
      </span>
    </div>
    
    <span v-if="loading" class="text-sm text-zinc-500 dark:text-zinc-400">
      {{ __('Loading plugins…', 'flexify-dashboard') }}
    </span>
  </div>
</template>