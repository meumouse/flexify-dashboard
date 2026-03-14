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
        class="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4"
      >
        <AppIcon icon="search" class="text-2xl text-zinc-400" />
      </div>
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {{ __('Start searching', 'flexify-dashboard') }}
      </h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm">
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
          class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide"
        >
          {{ __('Try these:', 'flexify-dashboard') }}
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(example, index) in EXAMPLE_SEARCHES.slice(0, 4)"
            :key="index"
            @click.prevent="handleExampleClick(example.query)"
            class="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all group"
          >
            <div class="flex items-center gap-2">
              <AppIcon
                :icon="example.icon"
                class="text-zinc-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 text-sm transition-colors"
              />
              <div class="flex flex-col">
                <span
                  class="text-xs font-medium text-zinc-900 dark:text-zinc-100"
                  >{{ example.label }}</span
                >
                <code class="text-xs text-zinc-500 dark:text-zinc-400">{{
                  example.query
                }}</code>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Keyboard Shortcuts Guide -->
      <div
        class="w-full max-w-sm border-t border-zinc-200 dark:border-zinc-800 pt-6"
      >
        <div
          class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide"
        >
          {{ __('Keyboard Shortcuts', 'flexify-dashboard') }}
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 font-mono"
              >↑ ↓</kbd
            >
            <span class="text-zinc-600 dark:text-zinc-400">{{
              __('Navigate', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 font-mono"
              >Enter</kbd
            >
            <span class="text-zinc-600 dark:text-zinc-400">{{
              __('Select', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 font-mono"
              >Esc</kbd
            >
            <span class="text-zinc-600 dark:text-zinc-400">{{
              __('Close', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <kbd
              class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 font-mono"
              >Cmd+K</kbd
            >
            <span class="text-zinc-600 dark:text-zinc-400">{{
              __('Open', 'flexify-dashboard')
            }}</span>
          </div>
        </div>
      </div>

      <!-- Show Tutorial Button -->
      <button
        v-if="hasSeenOnboarding"
        @click.prevent="handleShowTutorial"
        class="mt-6 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
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
