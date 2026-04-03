<script setup>
import { defineProps } from "vue";
import { returnOriginalLinkAttribute } from "../utils/returnOriginalLinkAttribute.js";
import AppIcon from "@/components/utility/icons/index.vue";

const props = defineProps(["link"]);
</script>

<template>
  <div
    v-if="!link.settings?.icon"
    class="icon text-[rgba(255,255,255,0.75)] group-hover:text-white group-[.active]:text-white w-[1.5rem] h-[1.5rem] bg-contain bg-center bg-no-repeat contrast-75 group-[.active]:contrast-[1] transition-colors duration-150"
    :class="returnOriginalLinkAttribute(link, 'imageClasses', link.imageClasses)"
    :style="returnOriginalLinkAttribute(link, 'iconStyles', link.iconStyles)"
  ></div>

  <AppIcon v-else :icon="link.settings.icon" class="text-xl text-[rgba(255,255,255,0.75)] group-hover:text-white group-[.active]:text-white transition-colors" />
</template>
