<script setup>
import { defineAsyncComponent, computed, nextTick, Suspense } from 'vue';
import AppButton from '@/components/utility/app-button/index.vue';

const CodeEditor = defineAsyncComponent(() =>
  import('@/components/utility/code-editor/index.vue')
);

const props = defineProps({
  setting: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Object,
    required: true,
  },
  onSave: {
    type: Function,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

/**
 * Computed property for the code value with proper reactivity
 * Ensures changes are properly tracked and emitted
 */
const codeValue = computed({
  get: () => {
    const value = props.modelValue?.[props.setting.id];
    return value !== undefined && value !== null ? value : '';
  },
  set: (value) => {
    // Create a new object to ensure reactivity
    const newValue = {
      ...props.modelValue,
      [props.setting.id]: value !== undefined && value !== null ? value : '',
    };
    emit('update:modelValue', newValue);
  },
});

/**
 * Handle save with proper timing
 * Ensures Vue has processed all updates before saving
 */
const handleSave = async () => {
  // Wait for Vue to process any pending updates
  await nextTick();

  // Call the save handler
  props.onSave();
};
</script>

<template>
  <div class="col-span-2 flex flex-col place-content-start gap-3">
    <Suspense>
      <template #default>
        <CodeEditor v-model="codeValue">
          <AppButton
            type="primary"
            @click="handleSave"
            class="text-sm"
            :loading="saving"
          >
            {{ __('Update settings', 'flexify-dashboard') }}
          </AppButton>
        </CodeEditor>
      </template>
      <template #fallback>
        <div class="flex items-center gap-2">
          <div
            class="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-400"
          ></div>
          <span class="text-sm text-zinc-500 dark:text-zinc-400">{{
            __('Loading editor...', 'flexify-dashboard')
          }}</span>
        </div>
      </template>
    </Suspense>
  </div>
</template>
