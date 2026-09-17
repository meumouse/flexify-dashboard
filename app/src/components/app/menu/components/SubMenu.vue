<script setup>
import { ref, defineProps, computed, watchEffect, nextTick } from 'vue';

const anchor = ref(null);
const props = defineProps(['parent', 'mouseenter', 'mouseleave']);
const position = ref({});
const submenu = ref(null);

const setMenuPosition = () => {
  const rect = anchor.value.getBoundingClientRect();
  position.value = { left: `${rect.left}px`, top: `${rect.top}px` };

  // Link
  nextTick(() => {
    // Submenu is no longer visible so bail
    if (!submenu.value) return;

    const subrect = submenu.value.getBoundingClientRect();

    if (subrect.bottom > window.innerHeight) {
      position.value = {
        left: `${rect.left}px`,
        top: `${window.innerHeight - subrect.height}px`,
      };
    }
  });
};

watchEffect(() => {
  if (anchor.value) setMenuPosition();
});
</script>

<template>
  <div ref="anchor">
    <Teleport to="body">
      <div class="flexify-dashboard-isolation">
        <div
          class="fd-submenu fixed z-[9999] flex min-w-52 translate-x-2 flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-2 text-theme-sm shadow-theme-lg fd-normalize dark:border-gray-800 dark:bg-gray-dark"
          :style="position"
          @mouseenter="mouseenter()"
          @mouseleave="mouseleave()"
          ref="submenu"
        >
          <slot></slot>
        </div>
      </div>
    </Teleport>
  </div>
</template>
