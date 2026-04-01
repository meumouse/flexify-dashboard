<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const currentLayout = computed({
  get: () => props.modelValue.layout || 'default',
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      layout: value,
    });
  },
});

const layouts = [
  {
    value: 'default',
    label: __('Default', 'flexify-dashboard'),
  },
  {
    value: 'rounded',
    label: __('Rounded', 'flexify-dashboard'),
  },
  {
    value: 'bubble',
    label: __('Bubble', 'flexify-dashboard'),
  },
];
</script>

<template>
  <div class="col-span-2 flex flex-row items-start gap-3 flex-wrap">
    <!-- Default Layout -->
    <div
      class="rounded flex flex-row h-32 aspect-video border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all"
      :class="
        currentLayout === 'default'
          ? 'outline-2 outline-brand-600 outline outline-offset-2'
          : ''
      "
      @click="currentLayout = 'default'"
      :title="layouts[0].label"
    >
      <div
        class="w-12 border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 p-1"
      >
        <div
          class="h-3 w-3 bg-zinc-100 dark:bg-zinc-800 rounded-full"
        ></div>
        <div class="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-2/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
      </div>
      <div class="flex flex-col h-full grow">
        <div
          class="h-4 border-b border-zinc-200 dark:border-zinc-800 w-full"
        ></div>
      </div>
    </div>

    <!-- Rounded Layout -->
    <div
      class="rounded flex flex-row h-32 aspect-video border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all"
      :class="
        currentLayout === 'rounded'
          ? 'outline-2 outline-brand-600 outline outline-offset-2'
          : ''
      "
      @click="currentLayout = 'rounded'"
      :title="layouts[1].label"
    >
      <div class="w-12 flex flex-col gap-1 p-1">
        <div
          class="h-3 w-3 bg-zinc-100 dark:bg-zinc-800 rounded-full"
        ></div>
        <div class="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-2/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        <div class="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
      </div>
      <div class="flex flex-col h-full grow pt-4 pb-4">
        <div
          class="grow border-l border-t border-b border-zinc-200 dark:border-zinc-800 w-full shadow-sm rounded-tl rounded-bl"
        ></div>
      </div>
    </div>

    <!-- Bubble Layout -->
    <div
      class="rounded flex flex-row h-32 aspect-video border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all"
      :class="
        currentLayout === 'bubble'
          ? 'outline-2 outline-brand-600 outline outline-offset-2'
          : ''
      "
      @click="currentLayout = 'bubble'"
      :title="layouts[2].label"
    >
      <div class="p-2 h-full bg-zinc-100/50 dark:bg-zinc-900">
        <div
          class="w-12 shadow-sm flex flex-col gap-1 p-1 rounded bg-white dark:bg-zinc-800/40 h-full"
        >
          <div
            class="h-3 w-3 bg-zinc-100 dark:bg-zinc-800 rounded-full"
          ></div>
          <div class="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded"></div>
          <div class="h-2 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
          <div class="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
          <div class="h-2 w-2/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
          <div class="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
        </div>
      </div>
      <div
        class="flex flex-col h-full grow bg-zinc-100/50 dark:bg-zinc-900"
      >
        <div class="h-4 w-full flex flex-row gap-1 p-1 pt-2">
          <div class="h-1 w-3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div class="h-1 w-4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div class="h-1 w-3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </div>
    </div>
  </div>
</template>

