<template>
  <label class="inline-flex items-center gap-2 select-none cursor-pointer">
    <input
      type="checkbox"
      class="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
      :checked="isChecked"
      :disabled="disabled"
      @change="onChange"
    />
    <span v-if="label" class="text-xs text-zinc-700 dark:text-zinc-300">
      {{ label }}
    </span>
  </label>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [Boolean, Array],
    default: false,
  },
  value: {
    type: [String, Number, Boolean, Object],
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([ 'update:modelValue', 'change' ]);

const isChecked = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.includes(props.value);
  }

  return !!props.modelValue;
});

function onChange(event) {
  const checked = !!event.target.checked;

  if (Array.isArray(props.modelValue)) {
    const next = props.modelValue.slice(0);

    const index = next.indexOf(props.value);

    if (checked && index === -1) {
      next.push(props.value);
    }

    if (!checked && index !== -1) {
      next.splice(index, 1);
    }

    emit('update:modelValue', next);
    emit('change', next);
    return;
  }

  emit('update:modelValue', checked);
  emit('change', checked);
}
</script>
