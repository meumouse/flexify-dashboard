<script setup>
import AppIcon from '@/components/utility/icons/index.vue';

defineProps({
  icon: { type: String, default: 'inventory' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  compact: { type: Boolean, default: false },
});
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center text-center" :class="compact ? 'px-4 py-8' : 'px-6 py-16'">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      <AppIcon :icon="icon" class="text-2xl" />
    </div>
    <h3 class="text-base font-semibold text-gray-800 dark:text-white/90">{{ title }}</h3>
    <p v-if="description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap items-center justify-center gap-3">
      <slot />
    </div>
  </div>
</template>
