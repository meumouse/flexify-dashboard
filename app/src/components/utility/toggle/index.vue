<script setup>
import { defineProps, ref, computed, watchEffect } from "vue";

// Import comps
import AppIcon from "@/components/utility/icons/index.vue";

const props = defineProps({
  options: {
    default: () => {
      return {
        false: { label: "No", value: false },
        true: { label: "Yes", value: true },
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
  bgStyle.value.height = "100%";
};

/**
 * Returns bg width
 */
const returnItemStyle = computed(() => {
  let width = 100 / Object.keys(props.options).length;
  return `width:calc(${width}%);`;
});

const returnActiveClass = (item) => {
  return item.value === model.value ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-400 hover:text-inherit";
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
  <div class="relative rounded-lg flex text-sm w-full bg-zinc-100 dark:bg-zinc-800 grid" :style="`grid-template-columns: repeat(${Object.keys(props.options).length}, minmax(0, 1fr))`">
    <div
      v-if="showBack"
      class="absolute rounded-lg transition-all bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 b-1 fd-border-rounder z-1"
      :style="bgStyle"
    ></div>

    <template v-for="(item, index) in options">
      <a type="button" class="z-[2] px-2 py-[4px] text-center cursor-pointer select-none" :class="returnActiveClass(item)" @click="setActive(item.value)">
        <div v-if="item.label" class="whitespace-nowrap" v-html="item.label"></div>
        <div v-if="item.icon" class="flex flex-row place-content-center">
          <AppIcon :icon="item.icon" class="text-lg" />
        </div>
      </a>
    </template>
  </div>
</template>
