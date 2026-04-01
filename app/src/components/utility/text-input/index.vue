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
  if (props.icon) classes += 'pl-8';
  if (props.copy) classes += ' pr-8';
  return classes;
});

/**
 * Copies text from model to the clipboard using async/await.
 */
const copyInput = async () => {
  try {
    // Copy the text inside the text field using async/await
    await navigator.clipboard.writeText(model.value);
    notify({ title: 'Texto copiado para a área de transferência', type: 'success' });
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};
</script>

<template>
  <div class="relative flex">
    <input
      v-model="model"
      class="px-2 py-2 border border-zinc-200 dark:border-zinc-700/40 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 dark:focus:outline-brand-700 focus:shadow-xs text-sm bg-transparent"
      :class="returnInputClass"
      v-bind="attrs"
    />

    <!-- Icon-->
    <div
      v-if="icon"
      class="absolute top-0 left-0 h-full flex flex-col place-content-center px-2 py-1"
    >
      <AppIcon :icon="icon" class="text-lg text-zinc-400" />
    </div>

    <!-- Copy-->
    <div
      v-if="copy"
      class="absolute top-0 right-0 h-full flex flex-col place-content-center p-1"
    >
      <div
        class="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 cursor-pointer dark:hover:text-white"
        @click="copyInput"
      >
        <AppIcon icon="duplicate" class="text-base" />
      </div>
    </div>
  </div>
</template>
