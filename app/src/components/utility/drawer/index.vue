<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  closeOnOverlayClick: {
    type: Boolean,
    default: true,
  },
  closeOnEscape: {
    type: Boolean,
    default: true,
  },
  size: {
    type: String,
    default: 'default', // 'small', 'default', 'large', 'full'
    validator: (value) => ['small', 'default', 'large', 'full'].includes(value),
  },
  zIndex: {
    type: Number,
    default: 70,
  },
});

const emit = defineEmits(['update:modelValue', 'close', 'open']);

// Reactive state
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isMobile = ref(false);
const panelRef = ref(null);

// Size configurations
const sizeClasses = computed(() => {
  const sizes = {
    small: 'w-80 max-w-[80vw]',
    default: 'w-96 max-w-[85vw]',
    large: 'w-[44rem] max-w-[90vw]',
    full: 'w-full',
  };
  return sizes[props.size] || sizes.default;
});

const mobileHeightClass = computed(() => {
  const heights = {
    small: 'max-h-[60vh]',
    default: 'max-h-[75vh]',
    large: 'max-h-[85vh]',
    full: 'max-h-[95vh]',
  };
  return heights[props.size] || heights.default;
});

// Methods
const close = () => {
  isOpen.value = false;
  emit('close');
};

const open = () => {
  isOpen.value = true;
  emit('open');
};

const handleOverlayClick = (event) => {
  if (props.closeOnOverlayClick && event.target === event.currentTarget) {
    close();
  }
};

const handleEscapeKey = (event) => {
  if (props.closeOnEscape && event.key === 'Escape' && isOpen.value) {
    close();
  }
};

// Check if device is mobile
const checkIsMobile = () => {
  isMobile.value = window.innerWidth < 1024; // lg breakpoint
};

// Body scroll lock
const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  document.body.style.overflow = '';
};

// Lifecycle
onMounted(() => {
  checkIsMobile();
  window.addEventListener('resize', checkIsMobile);
  document.addEventListener('keydown', handleEscapeKey);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIsMobile);
  document.removeEventListener('keydown', handleEscapeKey);
  unlockBodyScroll();
});

// Watch for open/close state changes
watch(
  isOpen,
  (newValue) => {
    if (newValue) {
      lockBodyScroll();
      nextTick(() => {
        // Focus management for accessibility
        if (panelRef.value) {
          const focusableElement = panelRef.value.querySelector(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElement) {
            focusableElement.focus();
          }
        }
      });
    } else {
      unlockBodyScroll();
    }
  },
  { immediate: true }
);
</script>

<template>
  <!-- Overlay -->
  <Transition
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/60 backdrop-blur-xs"
      :style="{ zIndex: zIndex }"
      @click="handleOverlayClick"
    >
      <!-- Desktop: Right slide panel -->
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="transform translate-x-full"
        enter-to-class="transform translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="transform translate-x-0"
        leave-to-class="transform translate-x-full"
      >
        <div
          v-if="!isMobile"
          ref="panelRef"
          class="absolute right-6 top-6 bottom-6 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-800 shadow-2xl flex flex-col w-[40dvw]"
          :class="sizeClasses"
          @click.stop
        >
          <!-- Desktop Header -->
          <div
            v-if="showHeader"
            class="flex-shrink-0 px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/50"
          >
            <div class="flex items-center justify-between">
              <div v-if="title || subtitle" class="flex-1 min-w-0">
                <h3
                  v-if="title"
                  class="text-lg font-semibold text-zinc-900 dark:text-white truncate leading-none"
                >
                  {{ title }}
                </h3>
                <p
                  v-if="subtitle"
                  class="text-sm text-zinc-600 dark:text-zinc-400 mt-1 truncate leading-none"
                >
                  {{ subtitle }}
                </p>
              </div>
              <div v-else class="flex-1">
                <slot name="header" />
              </div>
              <AppButton
                v-if="showCloseButton"
                @click="close"
                type="transparent"
              >
                <AppIcon icon="close" class="w-5 h-5" />
              </AppButton>
            </div>
          </div>

          <!-- Desktop Content -->
          <div class="flex-1 overflow-hidden flex flex-col">
            <slot />
          </div>

          <!-- Desktop Footer -->
          <div
            v-if="$slots.footer"
            class="flex-shrink-0 border-t border-zinc-200/60 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50"
          >
            <slot name="footer" />
          </div>
        </div>
      </Transition>

      <!-- Mobile: Bottom drawer -->
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="transform translate-y-full"
        enter-to-class="transform translate-y-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="transform translate-y-0"
        leave-to-class="transform translate-y-full"
      >
        <div
          v-if="isMobile"
          ref="panelRef"
          class="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-200/60 dark:border-zinc-700/50 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
          :class="mobileHeightClass"
          @click.stop
        >
          <!-- Mobile Handle -->
          <div class="flex-shrink-0 flex justify-center pt-4 pb-2">
            <div
              class="w-12 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full"
            ></div>
          </div>

          <!-- Mobile Header -->
          <div
            v-if="showHeader"
            class="flex-shrink-0 px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/50"
          >
            <div class="flex items-center justify-between">
              <div v-if="title || subtitle" class="flex-1 min-w-0">
                <h3
                  v-if="title"
                  class="font-medium text-zinc-900 dark:text-white truncate text-base"
                >
                  {{ title }}
                </h3>
                <p
                  v-if="subtitle"
                  class="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate"
                >
                  {{ subtitle }}
                </p>
              </div>
              <div v-else class="flex-1">
                <slot name="header" />
              </div>
              <button
                v-if="showCloseButton"
                @click="close"
                class="flex-shrink-0 p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors ml-4"
                aria-label="Close drawer"
              >
                <AppIcon icon="close" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Mobile Content -->
          <div class="flex-1 overflow-y-auto">
            <slot />
          </div>

          <!-- Mobile Footer -->
          <div
            v-if="$slots.footer"
            class="flex-shrink-0 border-t border-zinc-200/60 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50"
          >
            <slot name="footer" />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* Custom scrollbar for mobile content */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(113, 113, 122, 0.3);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(113, 113, 122, 0.5);
}

/* Enhanced backdrop blur */
.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}

/* Shadow effects */
.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}
</style>
