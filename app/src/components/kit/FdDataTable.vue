<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import FdCheckbox from './FdCheckbox.vue';
import FdEmptyState from './FdEmptyState.vue';
import FdSkeleton from './FdSkeleton.vue';
import { cn } from '@/lib/utils.js';
import { __, sprintf } from './i18n.js';

/**
 * Data table following the TailAdmin table recipe.
 *
 * columns: [{ key, label, sortable?, align?: 'start'|'center'|'end', width?, class?, headerClass?, hidden? }]
 * Slots:
 *  - cell-{key} { row, value, index }
 *  - header-{key} { column }
 *  - expanded { row, index }
 *  - bulk-actions { selected, clear }
 *  - empty
 */
const selected = defineModel('selected', { type: Array, default: () => [] });
const sort = defineModel('sort', { type: Object, default: () => ({ key: '', direction: 'asc' }) });
const expanded = defineModel('expanded', { type: Array, default: () => [] });

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: 'id' },
  loading: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  expandable: { type: [Boolean, Function], default: false },
  skeletonRows: { type: Number, default: 8 },
  stickyHeader: { type: Boolean, default: false },
  clickableRows: { type: Boolean, default: false },
  rowClass: { type: [Function, String], default: '' },
  emptyTitle: { type: String, default: '' },
  emptyDescription: { type: String, default: '' },
  emptyIcon: { type: String, default: 'inventory' },
  /** Accessible table caption */
  caption: { type: String, default: '' },
});

const emit = defineEmits(['row-click', 'sort-change']);

const visibleColumns = computed(() => props.columns.filter((column) => !column.hidden));
const columnCount = computed(() => visibleColumns.value.length + (props.selectable ? 1 : 0) + (props.expandable ? 1 : 0));

const keyOf = (row, index) => (typeof props.rowKey === 'function' ? props.rowKey(row, index) : row?.[props.rowKey] ?? index);

const pageKeys = computed(() => props.rows.map((row, index) => keyOf(row, index)));
const allSelected = computed(() => pageKeys.value.length > 0 && pageKeys.value.every((key) => selected.value.includes(key)));
const someSelected = computed(() => !allSelected.value && pageKeys.value.some((key) => selected.value.includes(key)));

const toggleAll = () => {
  if (allSelected.value) {
    selected.value = selected.value.filter((key) => !pageKeys.value.includes(key));
  } else {
    selected.value = [...new Set([...selected.value, ...pageKeys.value])];
  }
};

const clearSelection = () => {
  selected.value = [];
};

const canExpand = (row) => (typeof props.expandable === 'function' ? props.expandable(row) : props.expandable);
const isExpanded = (key) => expanded.value.includes(key);

const toggleExpanded = (key) => {
  expanded.value = isExpanded(key) ? expanded.value.filter((item) => item !== key) : [...expanded.value, key];
};

const toggleSort = (column) => {
  if (!column.sortable) return;
  const direction = sort.value?.key === column.key && sort.value?.direction === 'asc' ? 'desc' : 'asc';
  sort.value = { key: column.key, direction };
  emit('sort-change', sort.value);
};

const ariaSort = (column) => {
  if (!column.sortable || sort.value?.key !== column.key) return undefined;
  return sort.value.direction === 'asc' ? 'ascending' : 'descending';
};

const alignClass = (align) => (align === 'end' ? 'text-end justify-end' : align === 'center' ? 'text-center justify-center' : 'text-start justify-start');

const resolveRowClass = (row, index) => (typeof props.rowClass === 'function' ? props.rowClass(row, index) : props.rowClass);

const onRowClick = (row, index, event) => {
  if (!props.clickableRows) return;
  if (event.target.closest('a, button, input, label, [role="menuitem"], [data-no-row-click]')) return;
  emit('row-click', row, index);
};

const selectedLabel = computed(() => sprintf(__('%s selected', 'flexify-dashboard'), selected.value.length));
</script>

<template>
  <div class="relative">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="selectable && selected.length && $slots['bulk-actions']"
        class="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-brand-25 px-5 py-3 dark:border-gray-800 dark:bg-brand-500/[0.08] sm:px-6"
      >
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ selectedLabel }}</span>
        <div class="flex flex-wrap items-center gap-2">
          <slot name="bulk-actions" :selected="selected" :clear="clearSelection" />
        </div>
        <button type="button" class="ms-auto text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" @click="clearSelection">
          {{ __('Clear selection', 'flexify-dashboard') }}
        </button>
      </div>
    </Transition>

    <div class="max-w-full overflow-x-auto custom-scrollbar">
      <table class="min-w-full">
        <caption v-if="caption" class="sr-only">{{ caption }}</caption>
        <thead :class="stickyHeader && 'sticky top-0 z-10 bg-white dark:bg-gray-900'">
          <tr class="border-y border-gray-100 dark:border-gray-800">
            <th v-if="selectable" scope="col" class="w-12 py-3 pe-2 ps-5 sm:ps-6">
              <FdCheckbox size="sm" :model-value="allSelected" :indeterminate="someSelected" :disabled="loading || !rows.length" :aria-label="__('Select all', 'flexify-dashboard')" @update:model-value="toggleAll" />
            </th>
            <th v-if="expandable" scope="col" class="w-10 py-3"><span class="sr-only">{{ __('Expand', 'flexify-dashboard') }}</span></th>
            <th
              v-for="(column, columnIndex) in visibleColumns"
              :key="column.key"
              scope="col"
              :aria-sort="ariaSort(column)"
              :style="column.width ? { width: column.width } : undefined"
              :class="cn('whitespace-nowrap px-4 py-3 first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6', !selectable && !expandable && columnIndex === 0 && 'ps-5 sm:ps-6', column.headerClass)"
            >
              <slot :name="`header-${column.key}`" :column="column">
                <button
                  v-if="column.sortable"
                  type="button"
                  :class="cn('group inline-flex w-full items-center gap-1 text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300', alignClass(column.align))"
                  @click="toggleSort(column)"
                >
                  {{ column.label }}
                  <AppIcon
                    :icon="sort?.key === column.key ? (sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold'"
                    :class="cn('text-sm', sort?.key === column.key ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 opacity-60 group-hover:opacity-100')"
                  />
                </button>
                <p v-else :class="cn('flex text-theme-xs font-medium text-gray-500 dark:text-gray-400', alignClass(column.align))">{{ column.label }}</p>
              </slot>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <template v-if="loading">
            <tr v-for="index in skeletonRows" :key="`skeleton-${index}`">
              <td v-if="selectable" class="py-4 pe-2 ps-5 sm:ps-6"><FdSkeleton class="h-4 w-4 rounded-sm" /></td>
              <td v-if="expandable" class="py-4"></td>
              <td v-for="column in visibleColumns" :key="column.key" class="px-4 py-4 first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6">
                <FdSkeleton class="h-4" :class="column.key === visibleColumns[0].key ? 'w-48' : 'w-20'" />
              </td>
            </tr>
          </template>

          <tr v-else-if="!rows.length">
            <td :colspan="columnCount">
              <slot name="empty">
                <FdEmptyState :icon="emptyIcon" :title="emptyTitle || __('No items found', 'flexify-dashboard')" :description="emptyDescription" />
              </slot>
            </td>
          </tr>

          <template v-else>
          <template v-for="(row, index) in rows" :key="keyOf(row, index)">
            <tr
              :class="
                cn(
                  'transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]',
                  selectable && selected.includes(keyOf(row, index)) && 'bg-brand-25 hover:bg-brand-25 dark:bg-brand-500/[0.06] dark:hover:bg-brand-500/[0.06]',
                  clickableRows && 'cursor-pointer',
                  resolveRowClass(row, index)
                )
              "
              @click="onRowClick(row, index, $event)"
            >
              <td v-if="selectable" class="py-3.5 pe-2 ps-5 sm:ps-6">
                <FdCheckbox v-model="selected" size="sm" :value="keyOf(row, index)" :aria-label="__('Select row', 'flexify-dashboard')" />
              </td>
              <td v-if="expandable" class="py-3.5">
                <button
                  v-if="canExpand(row)"
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                  :aria-expanded="isExpanded(keyOf(row, index))"
                  :aria-label="__('Toggle details', 'flexify-dashboard')"
                  @click="toggleExpanded(keyOf(row, index))"
                >
                  <AppIcon icon="chevron_right" class="text-lg transition-transform" :class="isExpanded(keyOf(row, index)) && 'rotate-90'" />
                </button>
              </td>
              <td
                v-for="column in visibleColumns"
                :key="column.key"
                :class="cn('px-4 py-3.5 text-theme-sm text-gray-500 first:ps-5 last:pe-5 dark:text-gray-400 sm:first:ps-6 sm:last:pe-6', column.align === 'end' && 'text-end', column.align === 'center' && 'text-center', column.class)"
              >
                <slot :name="`cell-${column.key}`" :row="row" :value="row?.[column.key]" :index="index">
                  {{ row?.[column.key] }}
                </slot>
              </td>
            </tr>
            <tr v-if="expandable && isExpanded(keyOf(row, index))" class="bg-gray-50/60 dark:bg-white/[0.015]">
              <td :colspan="columnCount" class="px-5 py-4 sm:px-6">
                <slot name="expanded" :row="row" :index="index" />
              </td>
            </tr>
          </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
