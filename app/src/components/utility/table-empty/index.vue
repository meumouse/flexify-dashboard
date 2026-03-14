<template>
  <div class="flex flex-col gap-6 items-center p-16 mx-auto w-[460px]">
    <AppIcon icon="folder-open" class="w-24" />
    <span class="text-zinc-900 text-3xl text-center font-semibold">{{ title }} :(</span>
    <span class="text-zinc-500 text-lg text-center">{{ description }}</span>
    <div class="place-content-between flex gap-6 flex-row">
      <slot name="links"></slot>
    </div>
  </div>
</template>

<script setup>
import AppIcon from "@/components/utility/icons/index.vue";
const props = defineProps(["title", "description"]);
</script>
