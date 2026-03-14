<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
import { MAX_DISPLAY_ITEMS } from '../state/constants.js';

const props = defineProps({
  history: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['select', 'clear']);

const handleSelect = (query) => {
  emit('select', query);
};

const handleClear = () => {
  emit('clear');
};
</script>

<template>
  <div v-if="history.length > 0" class="flex flex-col gap-2">
    <div class="flex items-center justify-between mb-2">
      <div class="capitalize text-zinc-400 dark:text-zinc-200">
        {{ __('Recent Searches', 'flexify-dashboard') }}
      </div>
      <button
        @click.stop.prevent="handleClear"
        class="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {{ __('Clear', 'flexify-dashboard') }}
      </button>
    </div>
    <ul class="flex flex-col gap-1">
      <li
        v-for="(historyItem, index) in history.slice(0, MAX_DISPLAY_ITEMS.HISTORY)"
        :key="index"
        class="p-2 rounded-lg transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400"
        @click.stop.prevent="handleSelect(historyItem.query)"
      >
        <div class="flex items-center gap-2">
          <AppIcon icon="history" class="text-zinc-400 text-sm" />
          <span>{{ historyItem.query }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>
