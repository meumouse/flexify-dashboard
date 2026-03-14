<script setup>
import { defineModel, useAttrs, defineProps, computed } from "vue";
import AppIcon from "@/components/utility/icons/index.vue";
const attrs = useAttrs();
const props = defineProps(["options", "categories"]);
const model = defineModel();
</script>

<template>
  <div class="relative flex flex-row items-stretch">
    <select
      v-bind="attrs"
      v-model="model"
      class="bg-white dark:bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-600/10 dark:focus:border-indigo-600/10 block w-full px-2 py-1 appearance-none pr-8"
    >
      <template v-for="item in options">
        <option :value="item.value" :disabled="item.disabled ? true : false" v-html="item.label"></option>
      </template>

      <template v-if="categories" v-for="cat in categories">
        <optgroup :label="cat.label">
          <template v-for="item in cat.items">
            <option :value="item.value" v-html="item.label"></option>
          </template>
        </optgroup>
      </template>
    </select>
    <div class="absolute right-0 top-0 bottom-0 px-2 py-1 z-[1] flex pointer-events-none">
      <AppIcon icon="unfold" class="text-lg my-auto" />
    </div>
  </div>
</template>
