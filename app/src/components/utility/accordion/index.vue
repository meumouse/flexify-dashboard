<script setup>
import { ref, defineProps } from "vue";
import AppIcon from "@/components/utility/icons/index.vue";

const props = defineProps({ startOpen: { default: () => false, type: Boolean }, title: { default: () => "", type: String } });
const open = ref(false);

if (props.startOpen) {
  open.value = true;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!--Title-->
    <div class="flex flex-row place-content-between cursor-pointer" @click="open = !open">
      <div class="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">{{ title }}</div>
      <AppIcon :icon="open ? 'remove' : 'add'" />
    </div>

    <!--Content-->
    <Transition>
      <slot v-if="open" />
    </Transition>
  </div>
</template>
