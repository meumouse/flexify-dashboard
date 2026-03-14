<script setup>
import AppIcon from '@/components/utility/icons/index.vue';

const emit = defineEmits(['view-commands', 'clear-search']);

const handleViewCommands = () => {
  emit('view-commands');
};

const handleClearSearch = () => {
  emit('clear-search');
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
        {{ __('No results found', 'flexify-dashboard') }}
      </h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm">
        {{
          __(
            'Try a different search term or use command syntax to filter results.',
            'flexify-dashboard'
          )
        }}
      </p>
      <div class="flex flex-wrap gap-2 justify-center">
        <button
          @click.prevent="handleViewCommands"
          class="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
        >
          {{ __('View Commands', 'flexify-dashboard') }}
        </button>
        <button
          @click.prevent="handleClearSearch"
          class="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
        >
          {{ __('Clear Search', 'flexify-dashboard') }}
        </button>
      </div>
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
</style>
