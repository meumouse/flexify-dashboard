<script setup>
import { defineModel, useAttrs, defineProps, computed } from 'vue';
import { notify } from '@/assets/js/functions/notify.js';
import AppIcon from '@/components/utility/icons/index.vue';

const attrs = useAttrs();
const props = defineProps(['icon', 'copy', 'value']);
const model = defineModel();

if (props.value) model.value = props.value;

/**
 * Returns input classes depending on icons and copy
 */
const returnInputClass = computed(() => {
  let classes = '';
  if (props.icon) classes += 'ps-9';
  if (props.copy) classes += ' pe-9';
  return classes;
});

/**
 * Copies text from model to the clipboard using async/await.
 */
const copyInput = async () => {
  try {
    // Copy the text inside the text field using async/await
    await navigator.clipboard.writeText(model.value);
    notify({
      title: __('Text copied to clipboard', 'flexify-dashboard'),
      type: 'success',
    });
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};
</script>

<template>
  <div class="relative flex">
    <textarea
      v-model="model"
      class="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs transition-colors placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 dark:disabled:bg-white/[0.03]"
      rows="3"
      :class="returnInputClass"
      v-bind="attrs"
    ></textarea>

    <!-- Icon-->
    <div
      v-if="icon"
      class="pointer-events-none absolute top-0 start-0 h-full flex flex-col place-content-center ps-3 py-1"
    >
      <AppIcon :icon="icon" class="text-lg text-gray-500 dark:text-gray-400" />
    </div>

    <!-- Copy-->
    <div
      v-if="copy"
      class="absolute top-0 right-0 h-full flex flex-col place-content-center p-1"
    >
      <div
        class="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer dark:hover:bg-white/5 dark:hover:text-white"
        @click="copyInput"
      >
        <AppIcon icon="duplicate" class="text-base" />
      </div>
    </div>
  </div>
</template>
