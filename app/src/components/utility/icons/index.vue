<script setup>
import { computed } from "vue";

import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();
const pluginBase = appStore.state.pluginBase;

// Define props
const props = defineProps({
  icon: String,
});

/**
 * Returns icon style
 */
const returnIconStyle = computed(() => {
  if (!props.icon) return;

  let icon = `${pluginBase}assets/icons/${props.icon}.svg`;

  if (props.icon.includes("data:image")) {
    icon = props.icon;
  }

  return `display:block;
			height:1em;
			width:1em;
			min-height:1em;
			min-width:1em;
			background-color:currentColor;
			-webkit-mask: url(${icon}) no-repeat center;
			-webkit-mask-size: contain;
			mask: url(${icon}) no-repeat center;
			mask-size: contain;`;
});
</script>

<template>
  <span :style="returnIconStyle"></span>
</template>
