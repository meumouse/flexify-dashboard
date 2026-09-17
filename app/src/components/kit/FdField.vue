<script setup>
import { computed } from 'vue';
import { hintClasses, labelClass } from './recipes.js';

const props = defineProps({
  label: { type: String, default: '' },
  /** id of the control the label points to */
  for: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: [String, Boolean], default: '' },
  success: { type: [String, Boolean], default: '' },
  required: { type: Boolean, default: false },
});

const state = computed(() => {
  if (props.error) return 'error';
  if (props.success) return 'success';
  return 'default';
});

const message = computed(() => {
  if (typeof props.error === 'string' && props.error) return props.error;
  if (typeof props.success === 'string' && props.success) return props.success;
  return props.hint;
});
</script>

<template>
  <div>
    <label v-if="label || $slots.label" :for="props.for || undefined" :class="labelClass">
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="text-error-500">*</span>
    </label>
    <slot :state="state" />
    <p v-if="message" :class="hintClasses[state]">{{ message }}</p>
  </div>
</template>
