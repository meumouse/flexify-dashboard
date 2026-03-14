<script setup>
import { ref, computed, defineProps, useAttrs } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';

const props = defineProps({
  type: String,
  loading: [Boolean, Function],
  buttontype: String,
  icon: String,
  padding: {
    type: String,
    default: 'default',
    validator: (value) => ['small', 'default', 'large'].includes(value),
  },
});
const attrs = useAttrs();

const paddingClasses = computed(() => {
  if (props.type === 'transparent') {
    switch (props.padding) {
      case 'small':
        return 'p-1';
      case 'large':
        return 'p-3';
      default:
        return 'p-2';
    }
  } else {
    switch (props.padding) {
      case 'small':
        return 'px-2 py-1';
      case 'large':
        return 'px-4 py-3';
      default:
        return 'px-3 py-2';
    }
  }
});

const primary = 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active transition-all border border-primary/10 disabled:opacity-50 shadow-sm hover:shadow font-medium';
const defaultclass = 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100 active:bg-zinc-100 dark:active:bg-zinc-600 shadow-sm hover:shadow transition-all font-medium';
const dangerclass = 'bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 active:bg-red-100 dark:active:bg-red-950 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 shadow-sm hover:shadow-red-100 dark:hover:shadow-red-950/50 transition-all font-medium';
const warningclass = 'bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 active:bg-amber-100 dark:active:bg-amber-950 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 shadow-sm hover:shadow-amber-100 dark:hover:shadow-amber-950/50 transition-all font-medium';
const transparent = 'bg-transparent border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-750 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all';

const hasLoader = computed(() => {
  	return typeof props.loading !== 'undefined';
});

const isLoading = computed(() => {
  	return typeof props.loading === 'function' ? props.loading() : props.loading;
});

const returnButtonStyles = computed(() => {
	if (props.type === 'transparent') return transparent;
	if (props.type === 'primary') return primary;
	if (props.type === 'danger') return dangerclass;
	if (props.type === 'warning') return warningclass;
	
	return defaultclass;
});

const spinnerColor = computed(() => {
	if (props.type === 'primary') return 'text-primary-foreground';
	if (props.type === 'danger') return 'text-red-600 dark:text-red-400';
	if (props.type === 'warning') return 'text-amber-600 dark:text-amber-400';

	return 'text-zinc-600 dark:text-zinc-300';
});

const focusRingColor = computed(() => {
	if (props.type === 'primary')
		return 'focus-visible:ring-primary-ring';
	if (props.type === 'danger')
		return 'focus-visible:ring-red-500 dark:focus-visible:ring-red-400';
	if (props.type === 'warning')
		return 'focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400';
	if (props.type === 'transparent')
		return 'focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500';
	return 'focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500';
});
</script>

<template>
  <button
    :type="buttontype"
    class="relative group whitespace-nowrap rounded-xl w-auto cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
    :class="[returnButtonStyles, focusRingColor, paddingClasses]"
    v-bind="attrs"
    :disabled="isLoading"
  >
    <div
      class="flex flex-row items-center gap-2 transition-opacity duration-150 text-center mx-auto"
      :class="isLoading ? 'opacity-0' : 'opacity-100'"
    >
      <AppIcon v-if="icon" :icon="icon" class="text-sm" />
      <slot />
    </div>

    <div
      v-if="hasLoader"
      class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
      :class="!isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'"
    >
      <svg
        class="animate-spin h-4 w-4"
        :class="spinnerColor"
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
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  </button>
</template>
