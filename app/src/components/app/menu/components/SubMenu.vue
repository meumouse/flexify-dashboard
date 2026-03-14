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
          class="fd-submenu fixed bg-[rgba(28,36,52,0.9)] backdrop-blur-md z-[9999] shadow-xl rounded-xl border border-white/10 p-3 text-sm translate-x-0 fd-normalize"
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
