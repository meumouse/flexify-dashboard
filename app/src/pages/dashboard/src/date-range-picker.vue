<script setup>
import { ref, onMounted, watch, computed, useAttrs } from 'vue';

// Import date picker
import VueDatePicker from '@vuepic/vue-datepicker';

// Import dark mode composable
import { useDarkMode } from './useDarkMode.js';
const { isDark } = useDarkMode();

// Emits and props
const emit = defineEmits(['updated']);
const props = defineProps(['value', 'minDate']);
const attrs = useAttrs();

// Import comps
import ContextMenu from '@/components/utility/context-menu/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';

// Setup refs
const date = ref('');
const contextmenu = ref(null);

if (props.value) {
  date.value = props.value;
}

const showPicker = (evt) => {
  contextmenu.value.show(evt);
};

/**
 * Calculate predefined date ranges
 * @returns {Array} Array of predefined date range objects
 * @since 1.0.0
 */
const getPredefinedRanges = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Helper function to get start of week (Monday)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Helper function to get start of month
  const getStartOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Helper function to get start of year
  const getStartOfYear = (date) => {
    return new Date(date.getFullYear(), 0, 1);
  };

  return [
    {
      label: 'Previous 7 days',
      value: [
        new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        new Date(today),
      ],
    },
    {
      label: 'Previous 30 days',
      value: [
        new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
        new Date(today),
      ],
    },
    {
      label: 'This week to date',
      value: [getStartOfWeek(today), new Date(today)],
    },
    {
      label: 'Last week',
      value: [
        new Date(getStartOfWeek(today).getTime() - 7 * 24 * 60 * 60 * 1000),
        new Date(getStartOfWeek(today).getTime() - 1 * 24 * 60 * 60 * 1000),
      ],
    },
    {
      label: 'This month to date',
      value: [getStartOfMonth(today), new Date(today)],
    },
    {
      label: 'Last month',
      value: [
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0),
      ],
    },
    {
      label: 'This year to date',
      value: [getStartOfYear(today), new Date(today)],
    },
    {
      label: 'Last year',
      value: [
        new Date(today.getFullYear() - 1, 0, 1),
        new Date(today.getFullYear() - 1, 11, 31),
      ],
    },
  ];
};

/**
 * Select a predefined date range
 * @param {Array} range - The date range array [start, end]
 * @since 1.0.0
 */
const selectPredefinedRange = (range) => {
  date.value = range;
  emit('updated', range);
  contextmenu.value.hide();
};

const returnDatePreview = computed(() => {
  if (!Array.isArray(props.value)) return '';

  return `${displayFormat(props.value[0])} - ${displayFormat(props.value[1])}`;
});

const startDate = computed(() => {
  if (!Array.isArray(props.value) || !props.value[0]) return '';
  return displayFormat(props.value[0]);
});

const endDate = computed(() => {
  if (!Array.isArray(props.value) || !props.value[1]) return '';
  return displayFormat(props.value[1]);
});

/**
 * Format date using browser locale
 * @since 0.0.1
 */
const displayFormat = (date) => {
  if (!date) return '';

  const dateObj = new Date(date);

  // Use browser's locale for date formatting
  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

watch(
  date,
  (newDate, oldDate) => {
    if (!oldDate || !newDate) return;
    if (JSON.stringify(newDate) === JSON.stringify(oldDate)) return;
    emit('updated', newDate);
  },
  { deep: true }
);
</script>

<template>
  <div
    class="relative w-full min-w-56 px-3 py-1 pl-8 pr-3 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800/50 rounded-lg transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-600 focus-within:ring-1 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 dark:focus-within:ring-indigo-400/20 dark:focus-within:border-indigo-400 cursor-pointer"
    @click="showPicker"
    v-bind="attrs"
  >
    <!-- Calendar Icon -->
    <div
      class="absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center justify-center"
    >
      <AppIcon
        icon="calendar_today"
        class="text-sm text-zinc-400 dark:text-zinc-500"
      />
    </div>

    <!-- Date Pills Container -->
    <div class="flex items-center gap-1.5 min-h-[16px]">
      <!-- Start Date Pill -->
      <div
        v-if="startDate"
        class="inline-flex items-center px-2 py-1 bg-zinc-100 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-md"
      >
        {{ startDate }}
      </div>

      <!-- Separator -->
      <div
        v-if="startDate && endDate"
        class="text-xs text-zinc-400 dark:text-zinc-500"
      >
        –
      </div>

      <!-- End Date Pill -->
      <div
        v-if="endDate"
        class="inline-flex items-center px-2 py-1 bg-zinc-100 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-md"
      >
        {{ endDate }}
      </div>

      <!-- Placeholder when no dates selected -->
      <div
        v-if="!startDate && !endDate"
        class="text-xs text-zinc-400 dark:text-zinc-500 font-medium"
      >
        Select date range
      </div>
    </div>
  </div>

  <ContextMenu ref="contextmenu">
    <div class="flex gap-4">
      <!-- Predefined Ranges Column -->
      <div class="w-48 space-y-1">
        <div class="space-y-1">
          <button
            v-for="range in getPredefinedRanges()"
            :key="range.label"
            @click="selectPredefinedRange(range.value)"
            class="w-full text-left px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200 font-sans cursor-pointer"
          >
            {{ range.label }}
          </button>
        </div>
      </div>

      <!-- Date Picker Column -->
      <div class="flex-1">
        <VueDatePicker
          v-model="date"
          auto-apply
          :teleport="true"
          inline
          :min-date="minDate"
          :enable-time-picker="false"
          :range="{}"
          :dark="isDark"
        />
      </div>
    </div>
  </ContextMenu>
</template>

<style>
@import '@vuepic/vue-datepicker/dist/main.css';
.dp__theme_light {
  --dp-common-transition: all 0.1s ease-in;
  --dp-menu-padding: 6px 8px;
  --dp-animation-duration: 0.1s;
  --dp-menu-appear-transition-timing: cubic-bezier(0.4, 0, 1, 1);
  --dp-transition-timing: ease-out;
  --dp-action-row-transtion: all 0.2s ease-in;
  --dp-font-family: -apple-system, blinkmacsystemfont, 'Segoe UI', roboto,
    oxygen, ubuntu, cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --dp-border-radius: 4px;
  --dp-cell-border-radius: 4px;
  --dp-transition-length: 22px;
  --dp-transition-timing-general: 0.1s;
  --dp-button-height: 35px;
  --dp-month-year-row-height: 35px;
  --dp-month-year-row-button-size: 25px;
  --dp-button-icon-height: 20px;
  --dp-calendar-wrap-padding: 0 5px;
  --dp-cell-size: 35px;
  --dp-cell-padding: 5px;
  --dp-common-padding: 10px;
  --dp-input-icon-padding: 35px;
  --dp-input-padding: 6px 30px 6px 12px;
  --dp-menu-min-width: 260px;
  --dp-action-buttons-padding: 1px 6px;
  --dp-row-margin: 5px 0;
  --dp-calendar-header-cell-padding: 0.5rem;
  --dp-multi-calendars-spacing: 10px;
  --dp-overlay-col-padding: 3px;
  --dp-time-inc-dec-button-size: 32px;
  --dp-font-size: 1rem;
  --dp-preview-font-size: 0.8rem;
  --dp-time-font-size: 2rem;
  --dp-action-button-height: 22px;
  --dp-action-row-padding: 8px;
  --dp-background-color: #fff;
  --dp-text-color: #212121;
  --dp-hover-color: #f3f3f3;
  --dp-hover-text-color: #212121;
  --dp-hover-icon-color: #959595;
  --dp-primary-color: #212529;
  --dp-primary-disabled-color: #5c6670;
  --dp-primary-text-color: #f8f5f5;
  --dp-secondary-color: #c0c4cc;
  --dp-border-color: #ddd;

  --dp-menu-border-color: rgba(1, 1, 1, 0.05);
  --dp-border-radius: 16px;
  --dp-menu-padding: 16px;
  --dp-menu-min-width: 100%;

  --dp-border-color-hover: #aaaeb7;
  --dp-disabled-color: #f6f6f6;
  --dp-scroll-bar-background: #f3f3f3;
  --dp-scroll-bar-color: #959595;
  --dp-success-color: #76d275;
  --dp-success-color-disabled: #a3d9b1;
  --dp-icon-color: #959595;
  --dp-danger-color: #ff6f60;
  --dp-marker-color: #ff6f60;
  --dp-tooltip-color: #fafafa;
  --dp-disabled-color-text: #8e8e8e;
  --dp-highlight-color: rgb(25 118 210 / 10%);
  --dp-range-between-dates-background-color: var(--dp-hover-color, #f3f3f3);
  --dp-range-between-dates-text-color: var(--dp-hover-text-color, #212121);
  --dp-range-between-border-color: var(--dp-hover-color, #f3f3f3);
}
.dp__theme_dark {
  --dp-background-color: transparent;
}
.dp__menu,
.dp__menu:focus {
  border: none;
  padding: none;
  outline: none;
}
.dp__menu_inner {
  padding: none;
}
</style>
