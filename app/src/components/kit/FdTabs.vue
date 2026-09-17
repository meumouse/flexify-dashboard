<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';

/**
 * Tabs with underline or segmented style.
 *
 * items: [{ value, label, count?, icon?, disabled? }]
 */
const model = defineModel({ type: [String, Number, Boolean, null], default: null });

defineProps({
  items: { type: Array, default: () => [] },
  /** underline | segmented */
  variant: { type: String, default: 'underline' },
  ariaLabel: { type: String, default: '' },
});

const emit = defineEmits(['change']);

const select = (item) => {
  if (item.disabled || model.value === item.value) return;
  model.value = item.value;
  emit('change', item.value);
};

const onKeydown = (event, index, items) => {
  if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  const enabled = items.filter((item) => !item.disabled);
  const current = enabled.findIndex((item) => item.value === items[index].value);
  const next = enabled[(current + direction + enabled.length) % enabled.length];
  if (next) {
    select(next);
    event.currentTarget.parentElement?.querySelector(`[data-value="${CSS.escape(String(next.value))}"]`)?.focus();
  }
};
</script>

<template>
  <div
    role="tablist"
    :aria-label="ariaLabel || undefined"
    :class="
      variant === 'segmented'
        ? 'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-gray-100 p-0.5 no-scrollbar dark:bg-gray-900'
        : 'flex max-w-full items-center gap-2 overflow-x-auto border-b border-gray-200 no-scrollbar dark:border-gray-800'
    "
  >
    <button
      v-for="(item, index) in items"
      :key="String(item.value)"
      type="button"
      role="tab"
      :data-value="String(item.value)"
      :aria-selected="model === item.value"
      :tabindex="model === item.value ? 0 : -1"
      :disabled="item.disabled"
      :class="
        cn(
          'inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-hidden focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'segmented'
            ? cn(
                'rounded-md px-3 py-2 text-theme-sm',
                model === item.value
                  ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )
            : cn(
                '-mb-px border-b-2 px-2.5 py-3 text-sm',
                model === item.value
                  ? 'border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )
        )
      "
      @click="select(item)"
      @keydown="onKeydown($event, index, items)"
    >
      <AppIcon v-if="item.icon" :icon="item.icon" class="text-base" />
      <span>{{ item.label }}</span>
      <span
        v-if="item.count !== undefined && item.count !== null"
        :class="
          cn(
            'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-theme-xs font-medium',
            model === item.value
              ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
              : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
          )
        "
      >
        {{ item.count }}
      </span>
    </button>
  </div>
</template>
