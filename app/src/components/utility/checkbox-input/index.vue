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
      class="appearance-none w-4 h-4 text-indigo-600 bg-zinc-100 border-zinc-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600 checked:bg-indigo-500"
      v-bind="attrs" />
    <Transition>
      <div class="absolute inset-0 flex flex-col place-content-center pointer-events-none" v-if="model">
        <AppIcon icon="tick" class="text-white mx-auto" />
      </div>
    </Transition>
  </div>
</template>
