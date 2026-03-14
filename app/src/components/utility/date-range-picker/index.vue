<script setup>
import { ref, onMounted, watch, computed, useAttrs } from "vue";


// Import date picker
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";

import { useColorScheme } from "@/assets/js/functions/useColorScheme.js";
const { prefersDark, colorScheme } = useColorScheme();

// Emits and props
const emit = defineEmits(["updated"]);
const props = defineProps(["value", "minDate"]);
const attrs = useAttrs();

// Import comps
import ContextMenu from "@/components/utility/context-menu/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";

// Setup refs
const datepicker = ref(null);
const date = ref("");
const contextmenu = ref(null);

if (props.value) {
  date.value = props.value;
}

/**
 * Returns event pos
 * @since 0.0.1
 */
const returnThisPos = (evt) => {
  const target = evt.target;
  const rect = target.getBoundingClientRect();
  return { clientY: rect.bottom + 10, clientX: rect.left };
};

const showPicker = (evt) => {
  contextmenu.value.show(evt);
};

const returnDatePreview = computed(() => {
  if (!Array.isArray(props.value)) return "";

  return `${displayFormat(props.value[0])} - ${displayFormat(props.value[1])}`;
});

/**
 * Returns event pos
 * @since 0.0.1
 */
const returnFormat = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Returns event pos
 * @since 0.0.1
 */
const displayFormat = (date) => {
  if (!date) return "";

  const timestamp = Date.parse(date);
  date = new Date(timestamp);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
</script>

<template>
  <div class="relative">
    <input
      type="text"
      :value="returnDatePreview"
      class="px-2 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-indigo-300 dark:focus:outline-indigo-700 focus:shadow-xs text-sm col-span-2 pl-8 min-w-60 dark:bg-transparent"
      @click="showPicker"
      v-bind="attrs"
      :placeholder="__('Select date', 'flexify-dashboard')"
    />

    <div class="absolute p-2 left-0 top-0 bottom-0 flex flex-col justify-center place-content-center items-center">
      <AppIcon icon="calendar_today" class="text-lg text-zinc-500 dark:text-zinc-400" />
    </div>
  </div>

  <ContextMenu ref="contextmenu">
    <div class="flex flex-col gap-1">
      <VueDatePicker v-model="date" auto-apply :teleport="true" inline :min-date="minDate" :enable-time-picker="false" :range="{}" :dark="prefersDark" />

      <div class="flex flex-row items-centers p-3 gap-3">
        <AppButton type="default" @click="contextmenu.close()">{{ __("Cancel", "flexify-dashboard") }}</AppButton>
        <AppButton
          type="primary"
          :disabled="!date"
          @click="
            emit('updated', date);
            contextmenu.close();
          "
          class="grow"
          >{{ __("Set date", "flexify-dashboard") }}</AppButton
        >
      </div>
    </div>
  </ContextMenu>
</template>

<style>
.dp__theme_light {
    --dp-common-transition: all 0.1s ease-in;
    --dp-menu-padding: 6px 8px;
    --dp-animation-duration: 0.1s;
    --dp-menu-appear-transition-timing: cubic-bezier(0.4, 0, 1, 1);
    --dp-transition-timing: ease-out;
    --dp-action-row-transtion: all 0.2s ease-in;
    --dp-font-family: -apple-system, blinkmacsystemfont, "Segoe UI", roboto, oxygen, ubuntu, cantarell, "Open Sans", "Helvetica Neue", sans-serif;
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