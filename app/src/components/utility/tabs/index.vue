<script setup>
import { defineProps, ref, computed, watchEffect } from "vue";

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
const tabRef = ref(null);
const tabContainer = ref(null);
const showBack = ref(true);

const bgStyle = ref({
  width: null,
  left: null,
  right: null,
  ["z-index"]: 1,
  bottom: "0px",
});

/**
 * Returns background style of back
 */
const setBgStyle = () => {
  if (tabRef.value === null) return;

  let val = String(model.value); // Convert boolean values to strings

  const keys = Object.keys(props.options);
  const index = keys.findIndex((item) => item == val);

  // No index so bail
  if (index < 0) return (showBack.value = false);

  const activeKey = keys[index];

  const target = tabRef.value[index];

  const rect = target.getBoundingClientRect();
  const containerRect = tabContainer.value.getBoundingClientRect();
  const left = rect.left - containerRect.left;

  showBack.value = true;

  bgStyle.value.width = `${rect.width}px`;
  bgStyle.value.left = `${left}px`;
};

const returnActiveClass = (item) => {
  return item.value === model.value ? "text-brand-500 dark:text-brand-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200";
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
  <div class="relative">
    <div ref="tabContainer" class="relative flex max-w-full gap-2 border-b border-gray-200 no-scrollbar dark:border-gray-800" style="overflow-x: auto">
      <template v-for="(item, index) in options">
        <a ref="tabRef" type="button" class="cursor-pointer select-none px-2.5 py-3 text-center text-sm font-medium transition-colors" style="z-index: 2" :class="returnActiveClass(item)" @click="setActive(item.value)">
          <div class="whitespace-nowrap" v-html="item.label"></div>
        </a>
      </template>
    </div>
    <div v-if="showBack" class="absolute border-b-2 border-brand-500 transition-all dark:border-brand-400" :style="bgStyle"></div>
  </div>
</template>
