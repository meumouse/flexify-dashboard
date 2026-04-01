<script setup>
import { useAttrs, defineProps, computed } from "vue";

import AppIcon from "@/components/utility/icons/index.vue";

const attrs = useAttrs();
const props = defineProps(["checked"]);

const isChecked = computed(() => {
  return props.checked;
});
</script>

<template>
  <div
    class="relative inline-flex text-brand-600 border border-zinc-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-zinc-800 focus:ring-2 dark:border-zinc-600 transition-colors h-4 w-4 overflow-hidden"
    :class="isChecked ? 'bg-brand-500' : 'bg-zinc-100 dark:bg-zinc-700'" tabindex="1">
    <Transition>
      <div class="absolute inset-0 flex flex-col place-content-center z-[10] pointer-events-none" v-if="isChecked">
        <AppIcon icon="tick" class="text-white mx-auto" />
      </div>
    </Transition>

  </div>
</template>
