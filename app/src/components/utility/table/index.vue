<script setup>
// Import from vue
import {
  ref,
  computed,
  defineExpose,
  defineEmits,
  watch,
  watchEffect,
  nextTick,
  defineModel,
} from 'vue';

// Import comps
import AppIcon from '@/components/utility/icons/index.vue';
import TableLoader from '@/components/utility/table-loader/index.vue';
import uiButton from '@/components/utility/app-button/index.vue';
import uiCheckbox from '@/components/utility/checkbox-basic/index.vue';
import uiCheckboxModern from '@/components/utility/checkbox-modern/index.vue';
import EmptyTable from '@/components/utility/table-empty/index.vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Define emits
const emit = defineEmits([
  'previous',
  'next',
  'search',
  'selected',
  'griddragenter',
  'griddragover',
  'griddragleave',
  'griddrop',
]);

// Define props and data
const props = defineProps({
  columns: { default: () => [], type: Array },
  data: { default: () => [], type: Array },
  rowRightClick: { type: Function },
  rowClick: { type: Function },
  pagination: { type: Object },
  fetching: { type: Boolean },
  defaultMode: { default: () => 'list', type: String },
  onlyMode: { type: String },
  hideSelect: { type: Boolean },
  hasBorders: { type: Boolean },
  searchPlaceHolder: { type: String, default: 'Search...' },
  loading: { type: Boolean, default: false },
});

// Set mode
const mode = ref(props.defaultMode);
const updatingSelected = ref(false);

// Selected
const selected = defineModel('selected', { default: [] });
const table = ref(null);

const returnColumns = computed(() => {
  return props.columns.filter((item) => item.active);
});

const itemRangeStart = computed(() => {
  return (props.pagination.page - 1) * props.pagination.per_page + 1;
});
const itemRangeEnd = computed(() => {
  const end = props.pagination.page * props.pagination.per_page;
  return Math.min(end, props.pagination.total);
});

// Watch for changes to selected
watch(
  selected,
  (newValue, oldValue) => {
    emit('selected', newValue);
  },
  { deep: true }
);

watchEffect(() => {
  if (!Array.isArray(selected.value)) {
    selected.value = [];
  }
});

const returnTdClass = (data, index, row) => {
  let classes =
    props.hideSelect && index === 0 ? ['group-hover:rounded-l-xl'] : [];
  if (index == returnColumns.value.length - 1) {
    classes.push('group-hover:rounded-r-xl');
  }

  if (
    index == returnColumns.value.length - 1 &&
    selected.value.includes(row.id)
  ) {
    classes.push('rounded-r-xl');
  }

  if (props.hasBorders) {
    classes = [...classes, 'border-b', 'border-zinc-200 dark:border-zinc-700'];
  }

  if (index === 0) {
    classes = [
      ...classes,
      'sticky',
      'left-[42px]',
      'z-[1]',
      'group-hover:bg-none',
      'dark:group-hover:bg-none',
    ];
  }

  if (index === 0 && selected.value.includes(row.id) && props.hideSelect) {
    classes = [...classes, 'group-hover:rounded-l-xl'];
  }

  if (index === 0 && !selected.value.includes(row.id)) {
    classes = [
      ...classes,
      'bg-gradient-to-r',
      'from-white',
      'via-white',
      'via-white',
      'via-white',
      'via-white',
      'dark:from-zinc-900',
      'dark:via-zinc-900',
      'dark:via-zinc-900',
      'dark:via-zinc-900',
      'dark:via-zinc-900',
    ];
  }

  return classes.join(' ');
};

const toggleSelection = (value) => {
  if (props.data.length === selected.value.length) {
    selected.value = [];
  } else {
    // Create a new array with existing values
    const newSelection = [];
    props.data.forEach((item) => {
      newSelection.push(item.id);
    });
    // Assign the new array to selected.value
    selected.value = newSelection;
  }
};

/**
 * Returns delay for row
 */
const returnTransitionDelay = (index) => {
  let time = index / 30;
  time = time > 0.6 ? 0.6 : time;
  return `${time.toFixed(3)}s`;
};

/**
 * Handles right clicks on rows
 */
const handleRightClick = (evt, index) => {
  if (!props.rowRightClick) return;
  evt.preventDefault();
  props.rowRightClick(evt, index);
};

/**
 * Handles right clicks on rows
 */
const handleClick = (evt, index) => {
  if (!props.rowClick) return;
  evt.preventDefault();
  props.rowClick(evt, index);
};

/**
 * Returns col width when set
 */
const returnColumnWidth = (col) => {
  if (!col.width) return;
  return `width:${col.width}`;
};

const maybeChangeSort = (column) => {
  // Don't do anything if no sort key
  if (!column.sort_key) return;

  // Toggle direction if already selected
  if (props.pagination.orderby == column.sort_key) {
    props.pagination.order = props.pagination.order == 'DESC' ? 'ASC' : 'DESC';
  }

  // update orderby property
  props.pagination.orderby = column.sort_key;

  emit('search');
};

/**
 * Returns current mode
 */
const returnMode = computed(() => {
  return mode.value;
});

/**
 * Returns current mode
 */
const returnTable = computed(() => {
  return table.value;
});

watchEffect(() => {
  let selectedData = [];
  updatingSelected.value = true;

  for (let id of selected.value) {
    const found = props.data.find((item) => item.id == id);
    selectedData.push(found);
  }

  appStore.updateState('selected', selectedData);

  nextTick(() => {
    updatingSelected.value = false;
  });
});

watch(
  () => appStore.state.selected,
  () => {
    // Stops an update loop
    if (updatingSelected.value) return;

    let ids = appStore.state.selected.map((item) => item.id);
    selected.value = ids;
  },
  { deep: true }
);

// Expose method
defineExpose({
  returnMode,
  returnTable,
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-row gap-4 items-center w-full">
      <!-- 
    * Search 
    *
    * Main search input for data
    -->
      <div class="flex-grow">
        <div class="relative max-w-[50%]">
          <AppIcon
            icon="search"
            class="text-zinc-400 absolute left-4 top-1/2 translate-y-[-50%] text-lg"
          ></AppIcon>
          <input
            v-model="pagination.search"
            @keyup.enter="emit('search')"
            type="text"
            class="py-2 px-0 pl-16 bg-transparent border border-transparent w-full items-center transition-all outline-none focus:outline-none"
            :placeholder="searchPlaceHolder"
          />
          <Transition>
            <div
              v-if="pagination.search"
              class="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 absolute right-2 top-1/2 translate-y-[-50%]"
            >
              <AppIcon icon="return" class="text-zinc-400 text-lg" />
            </div>
          </Transition>
        </div>
      </div>

      <!-- 
    * Right actions 
    *
    * Provides the slot for extra filters etc
    -->
      <div class="flex gap-3 items-center">
        <slot name="right-actions"></slot>
      </div>
    </div>

    <!-- 
   * Table section
   *
   * Handler for data when in table mode
   -->
    <div class="max-w-full overflow-x-auto">
      <table
        class="table-auto w-full border-separate border-spacing-0 wp-list-table"
        ref="table"
      >
        <thead>
          <tr class="text-left font-medium">
            <th
              v-if="!hideSelect"
              class="font-normal text-zinc-400 w-1 p-4 border-t border-b border-zinc-200 dark:border-zinc-700/80 sticky left-0 bg-white dark:bg-zinc-900 z-[1]"
            >
              <uiCheckbox
                @click="toggleSelection"
                :checked="
                  selected.length === data.length && !loading && data.length > 0
                "
              />
            </th>
            <th
              v-for="(column, index) in returnColumns"
              :key="column.key"
              class="font-normal text-zinc-400 p-4 border-t border-b border-zinc-200 dark:border-zinc-700 text-sm"
              :class="[
                {
                  'sticky left-[42px] z-[1] bg-gradient-to-r from-white via-white via-white via-white via-white dark:from-zinc-900 dark:from-zinc-900 dark:via-zinc-900 dark:via-zinc-900':
                    index === 0,
                },
                {
                  'cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors':
                    column.sort_key,
                },
                column.column_classes,
              ]"
              :style="returnColumnWidth(column)"
              @click="maybeChangeSort(column)"
            >
              <!-- Use scoped slot for custom cell rendering -->
              <slot :name="'head-' + column.key" :column="column">
                <div class="flex flex-row items-center gap-1">
                  <span
                    v-html="column.label"
                    class="whitespace-nowrap transition-colors"
                    :class="
                      column.sort_key && pagination.orderby == column.sort_key
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : ''
                    "
                  >
                  </span>
                  <AppIcon
                    :icon="
                      pagination.order == 'DESC'
                        ? 'arrow_downward'
                        : 'arrow_upward'
                    "
                    v-if="
                      column.sort_key && pagination.orderby == column.sort_key
                    "
                  />
                </div>
              </slot>
            </th>
          </tr>
        </thead>

        <!-- 
     * Table body
     *
     * Handles table body data
     -->
        <tbody v-if="fetching">
          <!-- 
          * Spacer
          *
          * Provides empty space
          -->
          <tr v-if="!hasBorders">
            <td :colspan="returnColumns.length">
              <div class="h-4"></div>
            </td>
          </tr>
          <TableLoader :columns="returnColumns.length + 1" :rows="10" />
        </tbody>
        <TransitionGroup tag="tbody" name="tableitem" v-else :css="false">
          <!-- 
    * Empty data
    *
    * Provides slot for empty data
    -->
          <tr
            v-if="!data.length && !pagination.search.length && !fetching"
            key="emptydata"
          >
            <td :colspan="returnColumns.length">
              <slot name="empty"></slot>
            </td>
          </tr>
          <!-- 
    * Empty query data
    *
    * Shows nothing found message for when there is a search term
    -->
          <tr
            v-if="!data.length && pagination.search.length && !fetching"
            key="emptyquery"
          >
            <td :colspan="returnColumns.length">
              <EmptyTable
                title="Nothing found"
                :description="`Nothing found for search term: '${pagination.search}'`"
              />
            </td>
          </tr>

          <!-- 
    * Spacer
    *
    * Provides empty space
    -->
          <tr v-if="!hasBorders">
            <td :colspan="returnColumns.length">
              <div class="h-4"></div>
            </td>
          </tr>

          <!-- 
    * Loop
    *
    * Main data loop for table body
    -->
          <tr
            v-for="(row, index) in data"
            :key="row.id ? row.id : index"
            :style="`transition-delay:${returnTransitionDelay(index)}`"
            @contextmenu="handleRightClick($event, index)"
            class="group"
          >
            <td
              v-if="!hideSelect"
              class="px-4 py-3 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-all cursor-pointer group-hover:rounded-l-xl sticky left-0 z-[1] bg-white border-b border-zinc-100 dark:border-zinc-800"
              :class="
                selected.includes(row.id)
                  ? 'bg-zinc-100 dark:bg-zinc-800 rounded-l-xl'
                  : 'dark:bg-zinc-900'
              "
            >
              <uiCheckboxModern :value="row.id" v-model="selected" />
            </td>
            <td
              @click="handleClick($event, index)"
              class="px-4 py-3 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-all cursor-pointer border-b border-zinc-100 dark:border-zinc-800"
              v-for="(column, colindex) in returnColumns"
              :key="column.key"
              :class="[
                `${returnTdClass(column, colindex, row)} ${
                  column.classes
                } ${row?.cell_classes?.[column.key].join(' ')}`,
                selected.includes(row.id) ? 'bg-zinc-100 dark:bg-zinc-800' : '',
              ]"
            >
              <!-- Use scoped slot for custom cell rendering -->
              <slot :name="'row-' + column.key" :row="row" :index="index" />
            </td>
          </tr>
        </TransitionGroup>

        <!-- 
    * Main pagination
    *
    * Pagination for tables with more than one page
    -->
      </table>
    </div>

    <div
      v-if="pagination && data.length && pagination.pages > 1"
      class="flex flex-row gap-6 place-content-between items-center p-4 w-full"
    >
      <span class="text-zinc-400 text-sm">
        {{ itemRangeStart }} - {{ itemRangeEnd }} of
        {{ pagination.total }}</span
      >
      <div class="flex gap-2 items-center">
        <span class="text-zinc-400 text-sm"
          >{{ pagination.page }} of {{ pagination.pages }}</span
        >
        <uiButton
          :disabled="pagination.page === 1"
          @click="emit('first')"
          type="transparent"
        >
          <AppIcon icon="first_page" />
        </uiButton>
        <uiButton
          :disabled="pagination.page === 1"
          @click="emit('previous')"
          type="transparent"
        >
          <AppIcon icon="chevron_left" />
        </uiButton>
        <uiButton
          @click="emit('next')"
          :disabled="pagination.page === pagination.pages"
          type="transparent"
        >
          <AppIcon icon="chevron_right" />
        </uiButton>
        <uiButton
          :disabled="pagination.page === pagination.pages"
          @click="emit('last')"
          type="transparent"
        >
          <AppIcon icon="last_page" />
        </uiButton>
      </div>
    </div>
  </div>
</template>

<style>
.tableitem-move,
.tableitem-enter-active,
.tableitem-leave-active {
  transition: all 0.5s ease;
}

.tableitem-enter-from,
.tableitem-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

td,
th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
