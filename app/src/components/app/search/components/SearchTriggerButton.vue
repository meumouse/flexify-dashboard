<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';

const emit = defineEmits(['click']);

const isMac = computed(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));

const handleClick = (evt) => {
  emit('click', evt);
};
</script>

<template>
  <button
    id="fd-search-button"
    type="button"
    :aria-label="__('Open search', 'flexify-dashboard')"
    class="group flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 lg:h-11 lg:w-[360px] lg:justify-start lg:gap-3 lg:bg-transparent lg:px-4 lg:hover:bg-gray-50 xl:w-[430px] dark:lg:bg-white/[0.03]"
    @click.prevent="handleClick"
  >
    <AppIcon icon="search" class="text-xl lg:text-lg" />
    <span class="hidden text-sm text-gray-400 lg:block dark:text-white/30">{{ __('Search or type command...', 'flexify-dashboard') }}</span>
    <span
      class="ms-auto hidden items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 lg:inline-flex dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
    >
      <span>{{ isMac ? '⌘' : 'Ctrl' }}</span>
      <span>K</span>
    </span>
  </button>
</template>
