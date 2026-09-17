<script setup>
import { computed, ref, useAttrs, useId } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import FdField from './FdField.vue';
import { cn } from '@/lib/utils.js';
import { fieldBase, fieldSizes, fieldStates } from './recipes.js';

defineOptions({ inheritAttrs: false });

const model = defineModel({ type: [String, Number, null], default: '' });

const props = defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: [String, Boolean], default: '' },
  success: { type: [String, Boolean], default: '' },
  required: { type: Boolean, default: false },
  /** Leading icon */
  icon: { type: String, default: '' },
  /** Text or node placed before the value (e.g. currency) */
  prefix: { type: String, default: '' },
  /** Text placed after the value (e.g. unit) */
  suffix: { type: String, default: '' },
  /** sm | md | lg */
  size: { type: String, default: 'md' },
  clearable: { type: Boolean, default: false },
  inputClass: { type: [String, Array, Object], default: '' },
});

const emit = defineEmits(['clear']);
const attrs = useAttrs();
const generatedId = useId();
const inputRef = ref(null);

const id = computed(() => attrs.id || generatedId);
const state = computed(() => (props.error ? 'error' : props.success ? 'success' : 'default'));

const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const classes = computed(() =>
  cn(
    fieldBase,
    fieldStates[state.value],
    fieldSizes[props.size] || fieldSizes.md,
    (props.icon || props.prefix) && 'ps-10',
    (props.suffix || props.clearable) && 'pe-10',
    props.inputClass
  )
);

const clear = () => {
  model.value = '';
  emit('clear');
  inputRef.value?.focus();
};

defineExpose({ focus: () => inputRef.value?.focus(), input: inputRef });
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
    <div class="relative">
      <span
        v-if="icon || prefix"
        class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-500 dark:text-gray-400"
      >
        <AppIcon v-if="icon" :icon="icon" class="text-lg" />
        <span v-else class="text-sm">{{ prefix }}</span>
      </span>

      <input
        :id="id"
        ref="inputRef"
        v-model="model"
        :class="classes"
        :aria-invalid="state === 'error' || undefined"
        v-bind="controlAttrs"
      />

      <button
        v-if="clearable && model"
        type="button"
        class="absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        :aria-label="__('Clear', 'flexify-dashboard')"
        @click="clear"
      >
        <AppIcon icon="close" class="text-base" />
      </button>
      <span
        v-else-if="suffix"
        class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3.5 text-sm text-gray-500 dark:text-gray-400"
      >
        {{ suffix }}
      </span>
    </div>
  </FdField>
</template>
