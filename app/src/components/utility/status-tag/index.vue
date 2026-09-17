<script setup>
import { ref, computed } from "vue";
const props = defineProps(["status", "text"]);

const returnStatusClasses = computed(() => {
  if (props.status === "success") return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
  if (props.status === "warning") return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400";
  if (props.status === "danger") return "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500";
  return "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80";
});

const returnStatusIndicatorClasses = computed(() => {
  if (props.status === "success") return "bg-success-500";
  if (props.status === "warning") return "bg-warning-500";
  if (props.status === "danger") return "bg-error-500";
  return "bg-gray-400";
});

const returnStatusGlowClasses = computed(() => {
  if (props.status === "success") return "bg-success-400";
  if (props.status === "warning") return "bg-warning-400";
  if (props.status === "danger") return "bg-error-400";
  return "bg-gray-400";
});
</script>

<template>
  <div class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium" :class="returnStatusClasses">
    <span class="relative flex h-1.5 w-1.5">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" :class="returnStatusGlowClasses" style="animation-duration: 2s" />
      <span class="relative inline-flex h-1.5 w-1.5 rounded-full" :class="returnStatusIndicatorClasses" />
    </span>
    <span class="leading-none">{{ text }}</span>
  </div>
</template>