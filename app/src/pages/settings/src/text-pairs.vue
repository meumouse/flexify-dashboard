<script setup>
import { defineModel, watchEffect } from "vue";

import AppButton from "@/components/utility/app-button/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";

const items = defineModel();

const pushNewItem = () => {
  items.value.push(["", ""]);
};

watchEffect(() => {
  if (!Array.isArray(items.value)) {
    items.value = [];
  }
});
</script>

<template>
  <div class="flex flex-col gap-3 items-start">
    <div class="flex flex-row items-center gap-2" v-for="(item, index) in items">
      <AppInput type="text" :placeholder="__('Find', 'flexify-dashboard')" v-model="item[0]" />
      <AppInput type="text" :placeholder="__('Replace', 'flexify-dashboard')" v-model="item[1]" />

      <AppButton type="transparent" @click="items.splice(index, 1)"><AppIcon icon="close" /></AppButton>
    </div>

    <AppButton type="default" @click="pushNewItem">{{ __("New item", "flexify-dashboard") }}</AppButton>
  </div>
</template>
