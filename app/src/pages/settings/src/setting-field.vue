<script setup>
import { computed } from 'vue';
import { getComponentForType } from './settings-components.js';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';

const props = defineProps({
  setting: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Object,
    required: true,
  },
  customHandlers: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

/**
 * Get the component for this setting type
 */
const componentDef = computed(() => {
  if (props.setting.type === 'custom') {
    return null;
  }
  return getComponentForType(props.setting.type);
});

/**
 * Get the value for this setting
 */
const settingValue = computed({
  get: () => props.modelValue[props.setting.id],
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      [props.setting.id]: value,
    });
  },
});

/**
 * Get merged component props
 */
const componentProps = computed(() => {
  const defaultProps = componentDef.value?.defaultProps || {};
  const settingProps = props.setting.componentProps || {};
  const merged = {
    ...defaultProps,
    ...settingProps,
  };
  
  // Handle dynamic options if getOptions function exists
  if (props.setting.getOptions && typeof props.setting.getOptions === 'function') {
    merged.options = props.setting.getOptions();
  }
  
  return merged;
});
</script>

<template>
  <!-- Label and Description -->
  <div class="flex flex-col pt-2 gap-2">
    <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
      setting.label
    }}</span>
    <span class="text-zinc-500 dark:text-zinc-400 leading-snug">{{
      setting.description
    }}</span>
  </div>

  <!-- Standard Component Rendering -->
  <div
    v-if="componentDef && !setting.customRender"
    class="col-span-2 flex flex-col"
    :class="setting.componentProps?.wrapperClass || ''"
  >
    <component
      :is="componentDef.component"
      v-model="settingValue"
      v-bind="componentProps"
    />
  </div>

  <!-- Custom Render Handlers -->
  <div
    v-else-if="setting.customRender && customHandlers[setting.customRender]"
    class="col-span-2"
  >
    <component
      :is="customHandlers[setting.customRender]"
      :setting="setting"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>

  <!-- Divider -->
  <div
    class="border-t border-zinc-200 dark:border-zinc-800 col-span-3"
  ></div>
</template>

