<script setup>
import { ref, computed } from "vue";
const props = defineProps(["status", "text"]);

const returnStatusClasses = computed(() => {
  if (props.status === "success") return "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
  if (props.status === "warning") return "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800";
  if (props.status === "danger") return "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
  return "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800";
});

const returnStatusIndicatorClasses = computed(() => {
  if (props.status === "success") return "bg-green-500 dark:bg-green-400";
  if (props.status === "warning") return "bg-amber-500 dark:bg-amber-400";
  if (props.status === "danger") return "bg-red-500 dark:bg-red-400";
  return "bg-zinc-400 dark:bg-zinc-500";
});

const returnStatusGlowClasses = computed(() => {
  if (props.status === "success") return "bg-green-400 dark:bg-green-400";
  if (props.status === "warning") return "bg-amber-400 dark:bg-amber-400";
  if (props.status === "danger") return "bg-red-400 dark:bg-red-400";
  return "bg-zinc-400 dark:bg-zinc-500";
});
</script>

<template>
  <div class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all" :class="returnStatusClasses">
    <span class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" :class="returnStatusGlowClasses" style="animation-duration: 2s" />
      <span class="relative inline-flex rounded-full h-2 w-2" :class="returnStatusIndicatorClasses" />
    </span>
    <span class="leading-none">{{ text }}</span>
  </div>
</template>