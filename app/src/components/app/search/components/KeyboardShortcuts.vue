<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
</script>

<template>
  <div class="flex flex-row gap-6 items-center text-zinc-500">
    <!-- Arrow Navigation -->
    <div class="flex flex-row gap-2 items-center">
      <span class="p-1 border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <AppIcon icon="arrow_up" />
      </span>
      <span class="p-1 border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <AppIcon icon="arrow_down" />
      </span>
      <span class="text-sm">{{ __('to navigate', 'flexify-dashboard') }}</span>
    </div>

    <!-- Enter to Select -->
    <div class="flex flex-row gap-2 items-center">
      <span class="p-1 border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <AppIcon icon="return" />
      </span>
      <span class="text-sm">{{ __('to select', 'flexify-dashboard') }}</span>
    </div>

    <!-- Escape to Close -->
    <div class="flex flex-row gap-2 items-center">
      <span
        class="p-1 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
        >Esc</span
      >
      <span class="text-sm">{{ __('to close', 'flexify-dashboard') }}</span>
    </div>
  </div>
</template>
