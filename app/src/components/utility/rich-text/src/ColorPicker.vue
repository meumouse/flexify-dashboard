<template>
  <div class="flex items-center gap-2">
    <input
      type="color"
      class="h-8 w-10 cursor-pointer rounded border border-gray-200 dark:border-gray-700 bg-transparent"
      :value="modelValue || defaultColor"
      @input="handleInput"
    />

    <input
      type="text"
      class="h-8 w-28 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs text-gray-900 dark:text-gray-100"
      :value="modelValue || ''"
      placeholder="#000000"
      @input="handleText"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  defaultColor: {
    type: String,
    default: '#000000',
  },
});

const emit = defineEmits([ 'update:modelValue', 'change' ]);

function normalizeHex(value) {
  if (!value) {
    return '';
  }

  const val = String(value).trim();

  if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
    return val;
  }

  // Allow plain hex without '#'
  if (!val.startsWith('#') && (val.length === 3 || val.length === 6)) {
    return `#${val}`;
  }

  return val;
}

function handleInput(event) {
  const value = normalizeHex(event.target.value);
  emit('update:modelValue', value);
  emit('change', value);
}

function handleText(event) {
  const value = normalizeHex(event.target.value);
  emit('update:modelValue', value);
  emit('change', value);
}
</script>
