<script setup>
import { ref } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { useRouter, useRoute } from 'vue-router';
import { formatDateString } from '@/assets/js/functions/formatDateString.js';
import { returnStatusType } from '@/assets/js/functions/returnStatusType.js';

const router = useRouter();
const route = useRoute();

// Props
const props = defineProps({
  menus: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['selectMenu', 'delete']);

// Local refs
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuItem = ref(null);

/**
 * Handle menu item click (for editor view)
 */
const handleMenuClick = (item) => {
  emit('selectMenu', item);
};

/**
 * Handle context menu
 */
const showItemContextMenu = (event, item) => {
  event.preventDefault();
  contextMenuItem.value = item;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  showContextMenu.value = true;
};

/**
 * Hide context menu
 */
const hideContextMenu = () => {
  showContextMenu.value = false;
  contextMenuItem.value = null;
};

/**
 * Handle delete item
 */
const handleDeleteItem = (item) => {
  emit('delete', [item.id]);
  hideContextMenu();
};

/**
 * Return status formatted
 */
const returnStatusFormatted = (status) => {
  if (status == 'publish') return __('Published', 'flexify-dashboard');
  if (status == 'draft') return __('Draft', 'flexify-dashboard');
  return status;
};

// Close context menu when clicking outside
document.addEventListener('click', hideContextMenu);
</script>

<template>
  <div class="relative">
    <!-- Menu List -->
    <div class="py-2 flex flex-col gap-1">
      <RouterLink
        v-for="item in menus"
        :key="item.id"
        :to="`/edit/${item.id}`"
        @contextmenu="showItemContextMenu($event, item)"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all group -mx-3"
        :class="
          route.params.menuid == item.id
            ? 'bg-zinc-100 dark:bg-zinc-800/60'
            : ''
        "
      >
        <!-- Menu Icon -->
        <div class="flex-shrink-0 mr-2">
          <div
            class="w-2 h-2 flex items-center justify-center rounded-full"
            :class="item.status == 'publish' ? 'bg-green-500' : 'bg-orange-500'"
          ></div>
        </div>

        <!-- Menu Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span
              class="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate"
              :title="
                item.title?.rendered ||
                item.title?.raw ||
                __('Untitled', 'flexify-dashboard')
              "
              :class="
                route.params.menuid == item.id
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              "
            >
              {{
                item.title?.rendered ||
                item.title?.raw ||
                __('Untitled', 'flexify-dashboard')
              }}
            </span>
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {{ returnStatusFormatted(item.status) }} •
            {{ formatDateString(item.modified) }}
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- Context Menu -->
    <div
      v-if="showContextMenu && contextMenuItem"
      :style="{
        left: contextMenuPosition.x + 'px',
        top: contextMenuPosition.y + 'px',
      }"
      class="fixed z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-32"
      @click.stop
    >
      <button
        @click="handleDeleteItem(contextMenuItem)"
        class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
      >
        <AppIcon icon="delete" class="text-sm" />
        {{ __('Delete', 'flexify-dashboard') }}
      </button>
    </div>
  </div>
</template>
