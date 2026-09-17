<script setup>
import { defineProps } from "vue";
import { returnOriginalLinkAttribute } from "../utils/returnOriginalLinkAttribute.js";
import AppIcon from "@/components/utility/icons/index.vue";

const props = defineProps(["link"]);
</script>

<template>
  <div
    v-if="!link.settings?.icon"
    class="icon h-6 w-6 bg-contain bg-center bg-no-repeat text-gray-500 transition-colors duration-150 group-hover:text-gray-700 group-[.active]:text-brand-500 dark:text-gray-400 dark:group-hover:text-gray-300 dark:group-[.active]:text-brand-400"
    :class="returnOriginalLinkAttribute(link, 'imageClasses', link.imageClasses)"
    :style="returnOriginalLinkAttribute(link, 'iconStyles', link.iconStyles)"
  ></div>

  <AppIcon v-else :icon="link.settings.icon" class="text-2xl text-gray-500 transition-colors group-hover:text-gray-700 group-[.active]:text-brand-500 dark:text-gray-400 dark:group-hover:text-gray-300 dark:group-[.active]:text-brand-400" />
</template>
