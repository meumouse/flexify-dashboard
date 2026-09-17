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
    class="relative inline-flex h-4 w-4 shrink-0 overflow-hidden rounded-sm border-[1.25px] transition-colors focus:outline-hidden focus-visible:shadow-focus-ring"
    :class="isChecked ? 'border-brand-500 bg-brand-500' : 'border-gray-300 bg-transparent dark:border-gray-700'" tabindex="0">
    <Transition>
      <div class="absolute inset-0 flex flex-col place-content-center z-[10] pointer-events-none" v-if="isChecked">
        <AppIcon icon="tick" class="mx-auto text-xs text-white" />
      </div>
    </Transition>

  </div>
</template>
