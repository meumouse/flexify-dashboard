<script setup>
import { ref, computed, watchEffect, nextTick, defineProps } from 'vue';
import { ShadowRoot } from 'vue-shadow-dom';
import { useShadowStyles } from '@/composables/useShadowStyles.js';
import { useColorScheme } from '@/assets/js/functions/useColorScheme.js';

const { prefersDark } = useColorScheme();
const open = ref(false);
const innerOpen = ref(false);
const props = defineProps({ position: { type: 'string', default: 'center' } });

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Refs
const panel = ref(null);

/**
 * Returns position classes
 */
const setPositionClass = computed(() => {
  if (props.position === 'center') return 'items-center place-content-center';
  if (props.position === 'top') return 'items-start place-content-center pt-32';
});
/**
 * Shows off canvas
 */
const show = () => {
  open.value = true;
  document.addEventListener('keydown', handleEscapeKey);
};

/**
 * Returns whether the modal is open
 */
const isOpen = computed(() => {
  return open.value;
});

// Watch escape keys
const handleEscapeKey = (event) => {
  if (event.key === 'Escape') close();
};

const shadowRoot = computed(() => {
  return appStore.state.shadowRootHolder || 'html';
});

const close = (evt) => {
  if (!panel.value) return;
  // Don't do anything if the click came from inside panel
  if (evt) {
    if (panel.value.contains(evt.target)) return;
  }

  open.value = false;
  document.removeEventListener('keydown', handleEscapeKey);
};

watchEffect(async () => {
  if (open.value) {
    await nextTick();
    innerOpen.value = true;
  } else {
    innerOpen.value = false;
  }
});

/**
 * Exposes open and close methods
 */
defineExpose({
  show,
  close,
  isOpen,
});
</script>

<template>
  <Teleport to="body">
    <Transition tag="div" :class="prefersDark ? 'dark' : ''">
      <div v-if="open" class="flexify-dashboard-isolation font-sans">
        <div
          @click="close"
          class="fixed top-0 left-0 right-0 h-dvh max-h-dvh max-w-dvw bg-zinc-950/60 flex flex-row z-[99999] pointer-events-auto"
          :class="setPositionClass"
        >
          <Transition name="slide-up">
            <div
              v-if="innerOpen"
              ref="panel"
              class="bg-white dark:bg-zinc-900 rounded-2xl h-auto border border-zinc-200/80 dark:border-zinc-700/40 shadow-sm max-w-screen"
            >
              <slot />
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
  transition-delay: 0.2s;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(60px);
  opacity: 0;
}

.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>
