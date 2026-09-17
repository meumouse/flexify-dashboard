<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { __, sprintf } from './i18n.js';

const page = defineModel('page', { type: Number, default: 1 });
const perPage = defineModel('perPage', { type: Number, default: 20 });

const props = defineProps({
  total: { type: Number, default: 0 },
  perPageOptions: { type: Array, default: () => [10, 20, 50, 100] },
  showPerPage: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['change']);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, perPage.value))));
const from = computed(() => (props.total === 0 ? 0 : (page.value - 1) * perPage.value + 1));
const to = computed(() => Math.min(props.total, page.value * perPage.value));

/**
 * Compact page list: 1 … 4 5 6 … 20
 */
const pages = computed(() => {
  const total = totalPages.value;
  const current = page.value;

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const list = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) list.push('start-gap');
  for (let index = start; index <= end; index++) list.push(index);
  if (end < total - 1) list.push('end-gap');
  list.push(total);

  return list;
});

const goTo = (target) => {
  const next = Math.min(Math.max(1, target), totalPages.value);
  if (next === page.value || props.disabled) return;
  page.value = next;
  emit('change', { page: next, perPage: perPage.value });
};

const changePerPage = (event) => {
  perPage.value = Number(event.target.value);
  page.value = 1;
  emit('change', { page: 1, perPage: perPage.value });
};

const summary = computed(() => sprintf(__('Showing %1$s to %2$s of %3$s', 'flexify-dashboard'), from.value.toLocaleString(), to.value.toLocaleString(), props.total.toLocaleString()));

const navButton =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:h-10 sm:w-10';
</script>

<template>
  <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
    <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      <span>{{ summary }}</span>
      <label v-if="showPerPage" class="hidden items-center gap-2 sm:flex">
        <span class="sr-only">{{ __('Items per page', 'flexify-dashboard') }}</span>
        <select
          :value="perPage"
          :disabled="disabled"
          class="h-9 rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
          @change="changePerPage"
        >
          <option v-for="option in perPageOptions" :key="option" :value="option">{{ sprintf(__('%s / page', 'flexify-dashboard'), option) }}</option>
        </select>
      </label>
    </div>

    <nav class="flex items-center gap-1.5" :aria-label="__('Pagination', 'flexify-dashboard')">
      <button type="button" :class="navButton" :disabled="disabled || page <= 1" :aria-label="__('Previous page', 'flexify-dashboard')" @click="goTo(page - 1)">
        <AppIcon icon="chevron_left" class="text-lg rtl:rotate-180" />
      </button>

      <template v-for="item in pages" :key="item">
        <span v-if="typeof item === 'string'" class="flex h-9 w-6 items-center justify-center text-sm text-gray-400">…</span>
        <button
          v-else
          type="button"
          :aria-current="item === page ? 'page' : undefined"
          :disabled="disabled"
          :class="
            cn(
              'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors sm:h-10 sm:min-w-10',
              item === page ? 'bg-brand-500 text-white' : 'text-gray-700 hover:bg-brand-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400'
            )
          "
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </template>

      <button type="button" :class="navButton" :disabled="disabled || page >= totalPages" :aria-label="__('Next page', 'flexify-dashboard')" @click="goTo(page + 1)">
        <AppIcon icon="chevron_right" class="text-lg rtl:rotate-180" />
      </button>
    </nav>
  </div>
</template>
