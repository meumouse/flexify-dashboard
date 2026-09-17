<template>
  <div class="mx-auto flex w-[460px] max-w-full flex-col items-center gap-3 p-12">
    <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"><AppIcon icon="folder-open" class="text-2xl" /></div>
    <span class="text-center text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</span>
    <span class="text-center text-sm text-gray-500 dark:text-gray-400">{{ description }}</span>
    <div class="place-content-between flex gap-6 flex-row">
      <slot name="links"></slot>
    </div>
  </div>
</template>

<script setup>
import AppIcon from "@/components/utility/icons/index.vue";
const props = defineProps(["title", "description"]);
</script>
