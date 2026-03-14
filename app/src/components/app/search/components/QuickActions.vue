<script setup>
import AppIcon from '@/components/utility/icons/index.vue';

const props = defineProps({
  actions: {
    type: Array,
    default: () => [],
  },
  activeIndex: {
    type: Number,
    default: -1,
  },
  getActionIndex: {
    type: Function,
    default: () => -1,
  },
});

const emit = defineEmits(['action-click']);

const handleActionClick = (action) => {
  emit('action-click', action);
};
</script>

<template>
  <div v-if="actions.length > 0">
    <div class="mb-2 capitalize text-zinc-400 dark:text-zinc-200">
      {{ __('Quick Actions', 'flexify-dashboard') }}
    </div>
    <ul class="flex flex-col">
      <li
        v-for="action in actions"
        :key="action.id"
        :class="[
          'p-2 rounded-lg transition-all cursor-pointer pl-3',
          getActionIndex(action) === activeIndex
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100',
        ]"
      >
        <a
          @click.prevent="handleActionClick(action)"
          class="flex flex-row items-center gap-3"
        >
          <AppIcon :icon="action.icon" class="text-zinc-400 text-lg" />
          <span class="grow">{{ action.name }}</span>
          <AppIcon icon="chevron_right" class="text-zinc-400" />
        </a>
      </li>
    </ul>
  </div>
</template>
