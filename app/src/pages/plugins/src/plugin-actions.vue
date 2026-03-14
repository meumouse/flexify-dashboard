<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
      @click="handleAction('activate')"
    >
      Activate
    </button>

    <button
      type="button"
      class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
      @click="handleAction('deactivate')"
    >
      Deactivate
    </button>

    <button
      type="button"
      class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
      @click="handleAction('install')"
    >
      Install
    </button>

    <button
      type="button"
      class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
      @click="handleAction('update')"
    >
      Update
    </button>

    <button
      type="button"
      class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
      @click="handleAction('delete')"
    >
      Delete
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  plugin: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([ 'action' ]);

function handleAction(action) {
  emit('action', {
    action,
    plugin: props.plugin,
  });
}
</script>
