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
      class="appearance-none w-4 h-4 ..."
      v-bind="attrs"
    />
    <Transition>
      <div class="absolute inset-0 flex flex-col place-content-center pointer-events-none" v-if="isChecked">
        <AppIcon icon="tick" class="text-white mx-auto" />
      </div>
    </Transition>
  </div>
</template>