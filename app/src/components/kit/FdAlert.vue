<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { alertColors } from './recipes.js';

const props = defineProps({
  /** success | error | warning | info */
  variant: { type: String, default: 'info' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  dismissible: { type: Boolean, default: false },
});

const emit = defineEmits(['dismiss']);
const palette = computed(() => alertColors[props.variant] || alertColors.info);
</script>

<template>
  <div :class="cn('rounded-xl border p-4', palette.box)" role="alert">
    <div class="flex items-start gap-3">
      <AppIcon :icon="palette.iconName" :class="cn('mt-0.5 shrink-0 text-xl', palette.icon)" />
      <div class="min-w-0 flex-1">
        <h4 v-if="title" class="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">{{ title }}</h4>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <slot>{{ message }}</slot>
        </div>
        <div v-if="$slots.actions" class="mt-3 flex flex-wrap gap-3">
          <slot name="actions" />
        </div>
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        :aria-label="__('Dismiss', 'flexify-dashboard')"
        @click="emit('dismiss')"
      >
        <AppIcon icon="close" class="text-lg" />
      </button>
    </div>
  </div>
</template>
