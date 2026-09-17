<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
import { MAX_DISPLAY_ITEMS } from '../state/constants.js';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  activeIndex: {
    type: Number,
    default: -1,
  },
  getItemIndex: {
    type: Function,
    default: () => -1,
  },
});

const emit = defineEmits(['item-click']);

const handleItemClick = (item) => {
  emit('item-click', item);
};
</script>

<template>
  <div v-if="items.length > 0" class="flex flex-col gap-2">
    <div class="mb-2 capitalize text-gray-400 dark:text-gray-200">
      {{ __('Recently Accessed', 'flexify-dashboard') }}
    </div>
    <ul class="flex flex-col">
      <li
        v-for="(item, index) in items.slice(0, MAX_DISPLAY_ITEMS.RECENTLY_ACCESSED)"
        :key="`recent-${item.id}`"
        :class="[
          'p-2 rounded-lg transition-all cursor-pointer pl-3',
          getItemIndex(item) === activeIndex
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-gray-100'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-100',
        ]"
      >
        <a
          :href="item.url"
          class="flex flex-row items-center gap-3"
          @click="handleItemClick(item)"
        >
          <AppIcon icon="history" class="text-gray-400 text-sm" />
          <span
            class="grow truncate"
            v-html="item.name || item.title?.rendered || item.email"
          ></span>
          <AppIcon icon="chevron_right" class="text-gray-400" />
        </a>
      </li>
    </ul>
  </div>
</template>
