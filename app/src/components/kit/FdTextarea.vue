<script setup>
import { computed, useAttrs, useId } from 'vue';
import FdField from './FdField.vue';
import { cn } from '@/lib/utils.js';
import { fieldBase, fieldStates } from './recipes.js';

defineOptions({ inheritAttrs: false });

const model = defineModel({ type: [String, null], default: '' });

const props = defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: [String, Boolean], default: '' },
  success: { type: [String, Boolean], default: '' },
  required: { type: Boolean, default: false },
  rows: { type: [Number, String], default: 4 },
});

const attrs = useAttrs();
const generatedId = useId();
const id = computed(() => attrs.id || generatedId);
const state = computed(() => (props.error ? 'error' : props.success ? 'success' : 'default'));

const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <FdField
    :label="label"
    :for="id"
    :hint="hint"
    :error="error"
    :success="success"
    :required="required"
    :class="attrs.class"
    :style="attrs.style"
  >
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :class="cn(fieldBase, fieldStates[state], 'px-4 py-2.5')"
      :aria-invalid="state === 'error' || undefined"
      v-bind="controlAttrs"
    ></textarea>
  </FdField>
</template>
