<script setup>
import { defineModel, ref, onMounted, watch, watchEffect, computed } from "vue";
import { pagination, columns, expandAllChildren } from "./constants.js";

// Store
import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();

// Comps
import ContextMenu from "@/components/utility/context-menu/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";
import AppSelect from "@/components/utility/select/index.vue";
import AppToggle from "@/components/utility/toggle/index.vue";
import AppCheckbox from "@/components/utility/checkbox-input/index.vue";
import CategorySelect from "./category-select.vue";
import InlineUserSelect from "./inline-user-select.vue";
import DateRangePicker from "@/components/utility/date-range-picker/index.vue";
import { VueDraggableNext } from "vue-draggable-next";

// Refs
const filtertrigger = ref(null);
const contextmenu = ref(null);
const startWatch = ref(null);
const orderOptions = [
  { label: __("Ascending", "vendbase"), value: "ASC" },
  { label: __("Descending", "vendbase"), value: "DESC" },
];

// Local Storage Keys
const getStorageKey = (suffix) => `flexify_dashboard_${pagination.value.post_type}_${suffix}`;

// Load settings from localStorage
const loadSettings = () => {
  try {
    // Load expand all setting
    const savedExpandAll = localStorage.getItem(getStorageKey("expand_all"));
    if (savedExpandAll !== null) {
      expandAllChildren.value = JSON.parse(savedExpandAll);
    }

    // Load column settings
    const savedColumns = localStorage.getItem(getStorageKey("columns"));
    if (savedColumns) {
      const parsedColumns = JSON.parse(savedColumns);

      // Update existing columns with saved settings
      columns.value.forEach((column, index) => {
        const savedColumn = parsedColumns.find((sc) => sc.key === column.key);
        if (savedColumn) {
          column.active = savedColumn.active;
          // Only update order if the saved column exists in current columns
          const savedIndex = parsedColumns.findIndex((sc) => sc.key === column.key);
          if (savedIndex !== -1 && savedIndex !== index) {
            // Reorder columns array
            const [movedColumn] = columns.value.splice(index, 1);
            columns.value.splice(savedIndex, 0, movedColumn);
          }
        }
      });
    }
  } catch (error) {
    console.error("Error loading settings from localStorage:", error);
  }
};

// Save settings to localStorage
const saveSettings = () => {
  try {
    // Save expand all setting
    localStorage.setItem(getStorageKey("expand_all"), JSON.stringify(expandAllChildren.value));

    // Save column settings (only order and active state)
    const columnSettings = columns.value.map((column) => ({
      key: column.key,
      active: column.active,
    }));
    localStorage.setItem(getStorageKey("columns"), JSON.stringify(columnSettings));
  } catch (error) {}
};

/**
 * Computed property that returns available sorting options based on columns
 * @computed orderByOptions
 * @returns {Array<Object>} Array of objects containing sort options
 * @property {string} value - Sort key value
 * @property {string} label - Display label for the sort option
 */
const orderByOptions = computed(() => {
  return columns.value.filter((column) => column.sort_key).map((column) => ({ value: column.sort_key, label: column.label }));
});

// Watch for changes to save to localStorage
watch(() => expandAllChildren.value, saveSettings);
watch(
  () => columns.value,
  () => {
    if (startWatch.value) {
      saveSettings();
    }
  },
  { deep: true }
);

const stop = watchEffect(() => {
  if (columns.value.length) {
    loadSettings();
    startWatch.value = true;
    stop();
  }
});

const returnThisPos = (evt) => {
  const target = filtertrigger.value;
  const rect = target.getBoundingClientRect();
  return { clientY: rect.bottom + 10, clientX: rect.left - 340 + rect.width };
};

const openFilterPanel = (event) => {
  contextmenu.value.show(event, returnThisPos());
};
</script>

<template>
  <div ref="filtertrigger">
    <AppButton type="default" class="text-sm" @click="openFilterPanel">{{ __("Settings", "flexify-dashboard") }}</AppButton>
  </div>

  <ContextMenu ref="contextmenu">
    <div class="flex flex-col gap-6 p-3">
      <!-- Filters -->
      <div class="font-semibold">{{ __("Filters", "flexify-dashboard") }}</div>
      <div class="w-[340px] grid grid-cols-3 gap-3 pl-3">
        <template v-if="appStore.state.supports_categories">
          <div class="text-zinc-400 dark:text-zinc-400 flex flex-col place-content-center">
            <span>{{ __("Categories", "flexify-dashboard") }}</span>
          </div>
          <CategorySelect v-model="pagination.categories" class="col-span-2 w-full" :placeholder="__('Search', 'flexify-dashboard')" />
        </template>

        <div class="text-zinc-400 dark:text-zinc-400 flex flex-col place-content-center">
          <span>{{ __("Date range", "flexify-dashboard") }}</span>
        </div>
        <DateRangePicker :value="pagination.dateRange" @updated="(d) => (pagination.dateRange = d)" class="col-span-2 w-full" />
      </div>

      <!-- Pagination -->
      <div class="font-semibold">{{ __("Table settings", "flexify-dashboard") }}</div>
      <div class="w-[340px] grid grid-cols-3 gap-2 pl-3">
        <div class="text-zinc-400 dark:text-zinc-400 flex flex-col place-content-center">
          <span>{{ __("Per page", "flexify-dashboard") }}</span>
        </div>
        <AppInput type="number" :min="1" :max="100" v-model="pagination.per_page" class="col-span-2" />

        <div class="text-zinc-400 dark:text-zinc-400 flex flex-col place-content-center">
          <span>{{ __("Order", "flexify-dashboard") }}</span>
        </div>
        <AppSelect v-model="pagination.order" :options="orderOptions" class="col-span-2" />

        <div class="text-zinc-400 dark:text-zinc-400 flex flex-col place-content-center">
          <span>{{ __("Order by", "flexify-dashboard") }}</span>
        </div>
        <AppSelect v-model="pagination.orderby" :options="orderByOptions" class="col-span-2" />

        <div class="text-zinc-400 dark:text-zinc-400 flex flex-col place-content-center">
          <span>{{ __("Expand all posts", "flexify-dashboard") }}</span>
        </div>
        <div class="col-span-2">
          <AppToggle v-model="expandAllChildren" />
        </div>

        <div class="text-zinc-400 dark:text-zinc-400 flex flex-col pt-1">
          <span>{{ __("Columns", "flexify-dashboard") }}</span>
        </div>
        <div class="col-span-2 flex flex-col gap-2 pl-2 pt-2">
          <VueDraggableNext
            v-if="Array.isArray(columns)"
            class="contents"
            :group="{ name: 'columns', pull: false, put: false, revertClone: false }"
            :list="columns"
            animation="300"
            :sort="true"
            handle=".dragger"
          >
            <template v-for="(column, index) in columns" :key="index" :index="index">
              <div class="flex flex-row gap-2" v-if="column.key != 'post_actions'">
                <div class="flex flex-row items-center gap-2 cursor-pointer grow" @click="column.active = !column.active">
                  <AppCheckbox v-model="column.active" />
                  <span class="transition-opacity" :class="!column.active ? 'opacity-60' : ''" v-html="column.label.includes('<') ? column.key : column.label"></span>
                </div>
                <AppButton type="transparent" class="dragger"><AppIcon icon="drag_indicator" /></AppButton>
              </div>
            </template>
          </VueDraggableNext>
        </div>
      </div>
    </div>
  </ContextMenu>
</template>
