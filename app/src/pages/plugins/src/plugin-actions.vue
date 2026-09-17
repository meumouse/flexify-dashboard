<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
      @click="handleAction('activate')"
    >
      Activate
    </button>

    <button
      type="button"
      class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
      @click="handleAction('deactivate')"
    >
      Deactivate
    </button>

    <button
      type="button"
      class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
      @click="handleAction('install')"
    >
      Install
    </button>

    <button
      type="button"
      class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
      @click="handleAction('update')"
    >
      Update
    </button>

    <button
      type="button"
      class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
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
