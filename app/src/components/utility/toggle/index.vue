<script setup>
import { defineProps, ref, computed, watchEffect } from "vue";

// Import comps
import AppIcon from "@/components/utility/icons/index.vue";

const props = defineProps({
  options: {
    default: () => {
      return {
        false: { label: __( 'No', 'flexify-dashboard' ), value: false },
        true: { label: __( 'Yes', 'flexify-dashboard' ), value: true },
      };
    },
    type: Object,
  },
  autoselect: { default: () => true, type: Boolean },
  allowDeselect: { default: () => false, type: Boolean },
});
const model = defineModel();

const showBack = ref(true);

const bgStyle = ref({
  width: null,
  left: null,
  right: null,
});

/**
 * Returns background style of back
 */
const setBgStyle = () => {
  let val = String(model.value); // Convert boolean values to strings

  const keys = Object.keys(props.options);
  const index = keys.findIndex((item) => item == val);

  if (index < 0) {
    showBack.value = false;
    return;
  }
  showBack.value = true;

  const length = keys.length;
  let width = 100 / keys.length;
  let left = width * index;
  let holder = {};
  bgStyle.value.width = `calc(calc(100%) / ${length})`;
  bgStyle.value.left = `calc(((100%) /  ${length}) * ${index})`;
  bgStyle.value.height = "calc(100% - 4px)";
};

/**
 * Returns bg width
 */
const returnItemStyle = computed(() => {
  let width = 100 / Object.keys(props.options).length;
  return `width:calc(${width}%);`;
});

const returnActiveClass = (item) => {
  return item.value === model.value ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white";
};

const setActive = (value) => {
  if (model.value === value && props.allowDeselect) model.value = null;
  else model.value = value;
  setBgStyle();
};

watchEffect(() => {
  // If undefined select first option
  if ((typeof model.value === "undefined" || model.value === null) && props.autoselect) {
    const key = Object.keys(props.options)[0];
    setActive(props.options[key].value);
  } else {
    setBgStyle();
  }
});
</script>

<template>
  <div class="relative grid w-full rounded-lg bg-gray-100 p-0.5 text-theme-sm dark:bg-gray-900" :style="`grid-template-columns: repeat(${Object.keys(props.options).length}, minmax(0, 1fr))`">
    <div
      v-if="showBack"
      class="absolute top-0.5 z-1 rounded-md bg-white shadow-theme-xs transition-all dark:bg-gray-800"
      :style="bgStyle"
    ></div>

    <template v-for="(item, index) in options">
      <a type="button" class="z-[2] cursor-pointer select-none rounded-md px-3 py-1.5 text-center font-medium transition-colors" :class="returnActiveClass(item)" @click="setActive(item.value)">
        <div v-if="item.label" class="whitespace-nowrap" v-html="item.label"></div>
        <div v-if="item.icon" class="flex flex-row place-content-center">
          <AppIcon :icon="item.icon" class="text-lg" />
        </div>
      </a>
    </template>
  </div>
</template>
