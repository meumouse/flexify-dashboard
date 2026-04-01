<script setup>
import { useAttrs, defineProps } from "vue";

import AppIcon from "@/components/utility/icons/index.vue";

const attrs = useAttrs();
const props = defineProps(["isactive"]);
</script>

<template>
  <div class="relative inline-flex">
    <input
      type="checkbox"
      :checked="isactive"
      class="appearance-none w-4 h-4 text-brand-600 bg-zinc-100 border-zinc-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600 checked:bg-brand-500"
      v-bind="attrs"
    />
    <Transition>
      <div class="absolute inset-0 flex flex-col place-content-center" v-if="isactive">
        <AppIcon icon="tick" class="text-white mx-auto" />
      </div>
    </Transition>
  </div>
</template>
