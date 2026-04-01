<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
import { EXAMPLE_SEARCHES } from '../state/constants.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['dismiss', 'example-click']);

const handleExampleClick = (query) => {
  emit('example-click', query);
};

const handleDismiss = () => {
  emit('dismiss');
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="flex flex-col gap-4 p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      <div class="flex items-start justify-between">
        <div class="flex flex-col gap-2">
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {{ __('Welcome to Global Search', 'flexify-dashboard') }}
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            {{
              __(
                'Quickly find posts, pages, users, and more. Here are some tips to get started:',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>
        <button
          @click.prevent="handleDismiss"
          class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Close onboarding"
        >
          <AppIcon icon="close" class="text-lg" />
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3 mt-2">
        <div
          v-for="(example, index) in EXAMPLE_SEARCHES"
          :key="index"
          @click="handleExampleClick(example.query)"
          class="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-all group"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center group-hover:bg-brand-200 dark:group-hover:bg-brand-900/50 transition-colors"
            >
              <AppIcon
                :icon="example.icon"
                class="text-brand-600 dark:text-brand-400 text-sm"
              />
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-medium text-zinc-900 dark:text-zinc-100">{{
                example.label
              }}</span>
              <code class="text-xs text-zinc-500 dark:text-zinc-400">{{
                example.query
              }}</code>
            </div>
          </div>
        </div>
      </div>

      <div
        class="flex items-center gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800"
      >
        <div
          class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <AppIcon icon="keyboard" class="text-sm" />
          <span
            >{{ __('Press', 'flexify-dashboard') }}
            <kbd
              class="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-xs"
              >Cmd/Ctrl + K</kbd
            >
            {{ __('to open search', 'flexify-dashboard') }}</span
          >
        </div>
      </div>

      <button
        @click.prevent="handleDismiss"
        class="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors w-full"
      >
        {{ __('Got it, thanks!', 'flexify-dashboard') }}
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
