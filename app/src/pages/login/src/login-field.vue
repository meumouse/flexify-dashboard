<script setup>
const model = defineModel({
  type: String,
  default: '',
});

defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  requiredLabel: {
    type: String,
    default: '',
  },
  inputName: {
    type: String,
    required: true,
  },
  inputType: {
    type: String,
    default: 'text',
  },
  placeholder: {
    type: String,
    default: '',
  },
  autocomplete: {
    type: String,
    default: '',
  },
  inputmode: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <div>
    <label
      :for="id"
      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
    >
      {{ label }}<span v-if="requiredLabel" class="text-red-500">{{ requiredLabel }}</span>
    </label>

    <input
      :id="id"
      v-model="model"
      :name="inputName"
      :type="inputType"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      class="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-4 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
    />
  </div>
</template>
