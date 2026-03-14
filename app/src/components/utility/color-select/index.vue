<script setup>
import { defineModel, useAttrs, defineProps, computed } from "vue";
import { notify } from "@/assets/js/functions/notify.js";
import AppIcon from "@/components/utility/icons/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";

const attrs = useAttrs();
const props = defineProps(["icon", "copy", "value"]);
const model = defineModel();

if (props.value) model.value = props.value;
</script>

<template>
  <label class="relative flex group">
    <input
      v-model="model"
      class="px-2 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-indigo-300 dark:focus:outline-indigo-700 focus:shadow-xs text-sm pl-10 bg-transparent"
      placeholder="#ffffff"
      v-bind="attrs"
      type="text"
    />

    <div class="absolute top-0 left-0 h-full flex flex-col place-content-center px-2 py-1">
      <label class="relative">
        <div class="rounded-full w-6 h-6 border border-zinc-200 dark:border-zinc-700 cursor-pointer" :style="`background-color:${model || 'transparent'}`" :class="!model ? 'checkered' : ''"></div>
        <input v-model="model" class="absolute opacity-0 appearance-none" type="color" />
      </label>
    </div>

    <div class="absolute top-0 right-0 h-full flex flex-col place-content-center px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
      <AppButton type="transparent" @click.stop.prevent="model = ''" v-if="model">
        <AppIcon icon="close" />
      </AppButton>
    </div>
  </label>
</template>

<style scoped>
.checkered {
  background: repeating-conic-gradient(rgb(var(--fd-base-200)) 0 25%, transparent 0 50%) 50%/7px 7px;
}
.dark .checkered {
  background: repeating-conic-gradient(rgb(var(--fd-base-700)) 0 25%, transparent 0 50%) 50%/7px 7px;
}
</style>
