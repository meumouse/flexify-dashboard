<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
import { EXAMPLE_SEARCHES } from '../state/constants.js';

const props = defineProps({
  hasSeenOnboarding: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['example-click', 'show-tutorial']);

const handleExampleClick = (query) => {
  emit('example-click', query);
};

const handleShowTutorial = () => {
  emit('show-tutorial');
};
</script>

<template>
  <Transition name="fade">
    <div
      class="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div
        class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
      >
        <AppIcon icon="search" class="text-2xl text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {{ __('Start searching', 'flexify-dashboard') }}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
        {{
          __(
            'Search for posts, pages, users, categories, or use quick actions.',
            'flexify-dashboard'
          )
        }}
      </p>

      <!-- Example Searches -->
      <div class="flex flex-col gap-2 w-full max-w-sm mb-6">
        <div
          class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide"
        >
          {{ __('Try these:', 'flexify-dashboard') }}
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(example, index) in EXAMPLE_SEARCHES.slice(0, 4)"
            :key="index"
            @click.prevent="handleExampleClick(example.query)"
            class="p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-all group"
          >
            <div class="flex items-center gap-2">
              <AppIcon
                :icon="example.icon"
                class="text-gray-400 group-hover:text-brand-500 dark:group-hover:text-brand-400 text-sm transition-colors"
              />
              <div class="flex flex-col">
                <span
                  class="text-xs font-medium text-gray-900 dark:text-gray-100"
                  >{{ example.label }}</span
                >
                <code class="text-xs text-gray-500 dark:text-gray-400">{{
                  example.query
                }}</code>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Keyboard Shortcuts Guide -->
      <div
        class="w-full max-w-sm border-t border-gray-200 dark:border-gray-800 pt-6"
      >
        <div
          class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide"
        >
          {{ __('Keyboard Shortcuts', 'flexify-dashboard') }}
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono"
              >↑ ↓</kbd
            >
            <span class="text-gray-600 dark:text-gray-400">{{
              __('Navigate', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono"
              >Enter</kbd
            >
            <span class="text-gray-600 dark:text-gray-400">{{
              __('Select', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono"
              >Esc</kbd
            >
            <span class="text-gray-600 dark:text-gray-400">{{
              __('Close', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono"
              >Cmd+K</kbd
            >
            <span class="text-gray-600 dark:text-gray-400">{{
              __('Open', 'flexify-dashboard')
            }}</span>
          </div>
        </div>
      </div>

      <!-- Show Tutorial Button -->
      <button
        v-if="hasSeenOnboarding"
        @click.prevent="handleShowTutorial"
        class="mt-6 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
      >
        {{ __('Show tutorial again', 'flexify-dashboard') }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

kbd {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
    'Liberation Mono', monospace;
}
</style>
