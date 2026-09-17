<script setup>
import { computed, useAttrs, useId } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import FdField from './FdField.vue';
import { cn } from '@/lib/utils.js';
import { fieldBase, fieldSizes, fieldStates } from './recipes.js';

/**
 * Native select styled with the design system.
 *
 * Options: [{ value, label, disabled? }] or grouped [{ label, options: [...] }].
 */
defineOptions({ inheritAttrs: false });

const model = defineModel({ type: [String, Number, Boolean, null], default: '' });

const props = defineProps({
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: [String, Boolean], default: '' },
  required: { type: Boolean, default: false },
  /** sm | md | lg */
  size: { type: String, default: 'md' },
  selectClass: { type: [String, Array, Object], default: '' },
});

const attrs = useAttrs();
const generatedId = useId();
const id = computed(() => attrs.id || generatedId);
const state = computed(() => (props.error ? 'error' : 'default'));

const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const hasValue = computed(() => model.value !== '' && model.value !== null && model.value !== undefined);
</script>

<template>
  <FdField :label="label" :for="id" :hint="hint" :error="error" :required="required" :class="attrs.class" :style="attrs.style">
    <div class="relative">
      <select
        :id="id"
        v-model="model"
        :class="
          cn(
            fieldBase,
            fieldStates[state],
            fieldSizes[size] || fieldSizes.md,
            'appearance-none bg-none pe-11',
            !hasValue && placeholder && 'text-gray-400 dark:text-gray-400',
            selectClass
          )
        "
        v-bind="controlAttrs"
      >
        <option v-if="placeholder" value="" class="text-gray-700 dark:bg-gray-900 dark:text-gray-400">{{ placeholder }}</option>
        <template v-for="option in options" :key="option.options ? `group-${option.label}` : option.value">
          <optgroup v-if="option.options" :label="option.label">
            <option
              v-for="child in option.options"
              :key="child.value"
              :value="child.value"
              :disabled="child.disabled"
              class="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              {{ child.label }}
            </option>
          </optgroup>
          <option v-else :value="option.value" :disabled="option.disabled" class="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
            {{ option.label }}
          </option>
        </template>
      </select>
      <span class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-500 dark:text-gray-400">
        <AppIcon icon="expand_more" class="text-lg" />
      </span>
    </div>
  </FdField>
</template>
