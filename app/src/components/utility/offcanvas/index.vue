<script setup>
import { ref, nextTick, onUnmounted, defineExpose, defineProps, computed, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import AppButton from "@/components/utility/app-button/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";

const router = useRouter();
const route = useRoute();
const panel = ref(null);
const open = ref(false);
const props = defineProps(["backPath"]);
const panelWidth = ref(660);
const parentOpen = ref(false);

const close = (evt) => {
  if (!panel.value) return;
  // Don't do anything if the click came from inside panel
  if (panel.value.contains(evt.target)) return;

  open.value = false;
};

const forceClose = (evt) => {
  open.value = false;
};

const show = () => {
  open.value = true;
};

watchEffect(() => {
  if (open.value) nextTick(() => (parentOpen.value = true));
  if (!open.value) nextTick(() => (parentOpen.value = false));
});

defineExpose({ close, show, forceClose });
</script>

<template>
  <div class="fixed top-0 left-0 right-0 bottom-0 bg-zinc-900/20 dark:bg-zinc-900/60 flex flex-row place-content-end z-[99999]" @click="close" v-if="open">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform translate-x-full"
      enter-to-class="transform translate-x-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="transform translate-x-0"
      leave-to-class="transform translate-x-full"
    >
      <div
        v-if="parentOpen"
        ref="panel"
        class="h-screen max-h-screen overflow-auto bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 max-w-full relative shadow-lg rounded-tl-lg rounded-bl-lg relative max-w-full dark:shadow-zinc-950"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>
