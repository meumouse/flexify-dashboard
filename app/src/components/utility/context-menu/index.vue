<script setup>
import { ref, defineProps, defineExpose } from 'vue';
import ShadowContainer from '@/components/utility/shadow-container/index.vue';

// setup props
const props = defineProps({
  teleport: {
    type: Boolean,
    required: false,
    default: false,
  },
  offsetY: {
    type: Number,
    required: false,
    default: 0,
  },
  offsetX: {
    type: Number,
    required: false,
    default: 0,
  },
});

// Setup refs
const isVisible = ref(false);
const contextmenu = ref(null);
const position = ref({
  y: 0,
  x: 0,
});

/**
 * Shows the context menu
 * evt (Object)
 * @since 0.0.1
 */
const show = async (evt, fixedPosition) => {
  // Force a click event so other context menus will close
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  document.dispatchEvent(event);

  // Set pos
  let pos = {
    clientX: evt.clientX,
    clientY: evt.clientY,
  };

  // Update pos if fixed position was passed
  if (fixedPosition) {
    pos = fixedPosition;
  }

  position.value.x = pos.clientX + props.offsetX;
  position.value.y = pos.clientY + props.offsetY;
  isVisible.value = true;

  requestAnimationFrame(() => {
    if (isVisible.value) {
      setupClickOutside();
      checkForOffScreen();
    }
  });
};

/**
 * Checks if context menu is offscreen
 * no args
 * @since 0.0.1
 */
const checkForOffScreen = () => {
  let bounds = contextmenu.value.getBoundingClientRect();
  let bottom = bounds.bottom;
  let right = bounds.right;
  let left = bounds.left;

  if (bottom > window.innerHeight) {
    position.value.y = position.value.y - (bottom - window.innerHeight) - 20;
  }
  if (right > window.innerWidth) {
    position.value.x = position.value.x - (right - window.innerWidth) - 40;
  }

  if (left < 0) {
    position.value.x = 32;
  }
};

/**
 * Closes the context menu and removes the event listener
 * no args
 * @since 0.0.1
 */
const close = () => {
  removeClickOutside();
  isVisible.value = false;
};

/**
 * Closes the context menu and removes the event listener
 * no args
 * @since 0.0.1
 */
const isOpen = () => {
  return isVisible.value;
};

/**
 * Mounts the click listener
 * no args
 * @since 0.0.1
 */
const setupClickOutside = () => {
  document.addEventListener('click', onClickOutside);
  document.addEventListener('contextmenu', onClickOutside);
};

/**
 * Removes the click listener
 * no args
 * @since 0.0.1
 */
const removeClickOutside = () => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('contextmenu', onClickOutside);
};

/**
 * Watches for clicks outside the context menu
 * evt (Object)
 * @since 0.0.1
 */
const onClickOutside = (event) => {
  // It has already closed so remove watchers
  if (!contextmenu.value) {
    return close();
  }
  if (!contextmenu.value.contains(event.target)) {
    return close();
  }
};

/**
 * Returns the position for the context menu
 * no args
 * @since 0.0.1
 */
const returnPosition = () => {
  let transform = '';
  return `top: ${position.value.y}px; left: ${position.value.x}px;${transform}`;
};

defineExpose({
  show,
  close,
  isOpen,
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-in" class="flexify-dashboard-isolation">
      <div
        class="flexify-dashboard-isolation text-zinc-700 dark:text-zinc-300"
        v-if="isVisible"
      >
        <div
          v-if="isVisible"
          ref="contextmenu"
          :style="returnPosition()"
          @click.prevent.stop
          class="bg-white dark:bg-zinc-900 z-[9999] shadow-sm rounded-xl border border-zinc-600/10 dark:border-zinc-800 p-3 fixed text-sm"
        >
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
