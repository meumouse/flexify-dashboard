<script setup>
import { defineModel, useAttrs, watchEffect, defineProps, defineEmits } from "vue";

import AppIcon from "@/components/utility/icons/index.vue";

const model = defineModel();
const attrs = useAttrs();
const props = defineProps(["dynamic"]);
const emit = defineEmits(["updated"]);

const isNullOrUndefined = (value) => {
  return value === null || value === undefined;
};

watchEffect(() => {
  if (isNullOrUndefined(props.dynamic)) return;
  model.value = props.dynamic;
  emit("updated", model.value);
});
</script>

<template>
  <div class="relative inline-flex">
    <input type="checkbox" v-model="model"
      class="peer h-4 w-4 cursor-pointer appearance-none rounded-sm border-[1.25px] border-gray-300 bg-transparent transition-colors checked:border-brand-500 checked:bg-brand-500 focus:outline-hidden focus-visible:shadow-focus-ring dark:border-gray-700 dark:checked:border-brand-500"
      v-bind="attrs" />
    <Transition>
      <div class="absolute inset-0 flex flex-col place-content-center pointer-events-none" v-if="model">
        <AppIcon icon="tick" class="mx-auto text-xs text-white" />
      </div>
    </Transition>
  </div>
</template>
