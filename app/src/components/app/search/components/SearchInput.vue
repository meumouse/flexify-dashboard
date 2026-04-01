<script setup>
import AppIcon from '@/components/utility/icons/index.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:modelValue',
  'keyup-down',
  'keyup-up',
  'keyup-enter',
  'focus',
  'blur',
]);

const searchInput = defineModel('searchInputRef');

const handleInput = (event) => {
  emit('update:modelValue', event.target.value);
};
</script>

<template>
  <div class="relative flex">
    <input
      class="px-2 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-transparent rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 dark:focus:outline-brand-700 focus:shadow-xs text-sm pl-8 dark:text-zinc-300"
      :value="modelValue"
      @input="handleInput"
      :placeholder="placeholder || __('Search posts, pages, categories, users...', 'flexify-dashboard')"
      autofocus
      name="search"
      icon="search"
      @keyup.down="emit('keyup-down', $event)"
      @keyup.up="emit('keyup-up', $event)"
      @keyup.enter="emit('keyup-enter', $event)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      autocomplete="off"
      ref="searchInput"
    />

    <div
      class="absolute top-0 left-0 h-full flex flex-col place-content-center px-2 py-1"
    >
      <AppIcon icon="search" class="text-lg text-zinc-400" />
    </div>

    <Transition>
      <div
        class="absolute top-0 right-0 h-full flex flex-col place-content-center px-2 py-1"
        v-if="isLoading"
      >
        <svg
          class="animate-spin text-brand-500 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    </Transition>
  </div>
</template>
