<script setup>
import { ref } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { __ } from './i18n.js';

/**
 * Drop area for files. Emits `files` with a FileList-like array, or `click`
 * when the consumer prefers opening the WordPress media library.
 */
const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  accept: { type: String, default: '' },
  multiple: { type: Boolean, default: false },
  /** When true the area only emits `click` (no native file picker) */
  pickerOnly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['files', 'click']);
const dragging = ref(false);
const input = ref(null);

const open = () => {
  if (props.disabled) return;
  if (props.pickerOnly) return emit('click');
  input.value?.click();
};

const onDrop = (event) => {
  dragging.value = false;
  if (props.disabled || props.pickerOnly) return;
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length) emit('files', props.multiple ? files : files.slice(0, 1));
};

const onChange = (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length) emit('files', files);
  event.target.value = '';
};
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-disabled="disabled || undefined"
    :class="
      cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus:outline-hidden focus-visible:shadow-focus-ring',
        dragging ? 'border-brand-500 bg-brand-25 dark:bg-brand-500/[0.06]' : 'border-gray-300 bg-gray-50 hover:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500',
        disabled && 'cursor-not-allowed opacity-60'
      )
    "
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
      <AppIcon icon="upload" class="text-2xl" />
    </div>
    <p class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ title || __('Drag & drop files here', 'flexify-dashboard') }}</p>
    <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{{ description || __('or click to browse', 'flexify-dashboard') }}</p>
    <slot />
    <input v-if="!pickerOnly" ref="input" type="file" class="hidden" :accept="accept" :multiple="multiple" @change="onChange" />
  </div>
</template>
