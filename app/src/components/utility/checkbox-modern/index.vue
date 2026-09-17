<script setup>
import { computed, defineModel, useAttrs, defineProps } from "vue";
import AppIcon from "@/components/utility/icons/index.vue";

const model = defineModel({ default: () => [] });
const attrs = useAttrs();
const props = defineProps(["value"]);

const isChecked = computed(() => Array.isArray(model.value) && model.value.includes(props.value));
</script>

<template>
  <div class="relative inline-flex">
    <input
      type="checkbox"
      v-model="model"
      :value="value"
      class="peer h-4 w-4 cursor-pointer appearance-none rounded-sm border-[1.25px] border-gray-300 bg-transparent transition-colors checked:border-brand-500 checked:bg-brand-500 focus:outline-hidden focus-visible:shadow-focus-ring dark:border-gray-700 dark:checked:border-brand-500"
      v-bind="attrs"
    />
    <Transition>
      <div class="absolute inset-0 flex flex-col place-content-center pointer-events-none" v-if="isChecked">
        <AppIcon icon="tick" class="mx-auto text-xs text-white" />
      </div>
    </Transition>
  </div>
</template>