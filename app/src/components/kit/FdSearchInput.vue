<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import FdInput from './FdInput.vue';
import { __ } from './i18n.js';

/**
 * Search field that emits the debounced value through v-model.
 */
const model = defineModel({ type: String, default: '' });

const props = defineProps({
  placeholder: { type: String, default: '' },
  debounce: { type: Number, default: 350 },
  size: { type: String, default: 'md' },
});

const local = ref(model.value);
let timer = null;

watch(
  () => model.value,
  (value) => {
    if (value !== local.value) local.value = value;
  }
);

watch(local, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    model.value = value;
  }, props.debounce);
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <FdInput
    v-model="local"
    type="search"
    icon="search"
    clearable
    :size="size"
    :placeholder="placeholder || __('Search...', 'flexify-dashboard')"
    :aria-label="placeholder || __('Search', 'flexify-dashboard')"
    autocomplete="off"
    @keydown.enter.prevent="model = local"
  />
</template>
