<template>
  <div
    ref="handleRef"
    class="absolute top-0 h-full w-1 cursor-ew-resize transition-opacity duration-300 ease-in-out bg-brand-500/20"
    :class="[{ 'opacity-100': isHandleVisible || isDragging, 'opacity-0': !isHandleVisible && !isDragging }, isRTL || position == 'left' ? 'left-0' : 'right-0']"
    @mousedown.stop="startResize"
    @click.stop
    @mouseenter="showTrigger"
    @mouseleave="hideTrigger"
  ></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";

const props = defineProps({
  minWidth: {
    type: Number,
    default: 200,
  },
  maxWidth: {
    type: Number,
    default: window.innerWidth,
  },
  tolerance: {
    type: Number,
    default: 30,
  },
  storageKey: {
    type: String,
    default: "uipc_panel_width",
  },
  position: {
    type: String,
    default: "right",
  },
});

const emit = defineEmits(["resize"]);
const handleRef = ref(null);
const isDragging = ref(false);
const isHandleVisible = ref(false);
const isRTL = computed(() => document.documentElement.dir == "rtl");

const showTrigger = () => {
  isHandleVisible.value = true;
};
const hideTrigger = () => {
  isHandleVisible.value = false;
};

const panelRef = computed(() => {
  return handleRef?.value?.parentElement;
});

const startResize = (event) => {
  event.preventDefault();
  isDragging.value = true;
  window.addEventListener("mousemove", handleResize);
  window.addEventListener("mouseup", stopResize);
};

const handleResize = (event) => {
  event.stopPropagation();

  const panelRect = panelRef.value.getBoundingClientRect();
  let newWidth;

  if (!isRTL.value && props.position != "left") {
    newWidth = Math.max(props.minWidth, Math.min(event.clientX - panelRect.left, props.maxWidth));
  } else {
    newWidth = Math.max(props.minWidth, Math.min(panelRect.right - event.clientX, props.maxWidth));
  }

  emit("resize", newWidth);
};

const loadSavedWidth = () => {
  const savedWidth = localStorage.getItem(props.storageKey);
  if (savedWidth) {
    const width = parseInt(savedWidth);

    // Don't set if somehow bigger than current window
    if (width > window.innerWidth) return;
    emit("resize", width);
    return width;
  }
  return null;
};

const stopResize = () => {
  event.stopPropagation();
  isDragging.value = false;
  window.removeEventListener("mousemove", handleResize);
  window.removeEventListener("mouseup", stopResize);
  saveWidth();
};

const saveWidth = () => {
  if (panelRef.value) {
    localStorage.setItem(props.storageKey, panelRef.value.offsetWidth.toString());
  }
};

loadSavedWidth();
</script>
