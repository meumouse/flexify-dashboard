<script setup>
import { ref } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppCheckbox from '@/components/utility/media-library/src/checkbox.vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// Props
const props = defineProps({
  comments: {
    type: Array,
    default: () => [],
  },
  selectedComments: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['selectComment', 'delete', 'toggleSelection']);

// Local refs
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextCommentItem = ref(null);

/**
 * Handle comment item click (for details view)
 */
const handleCommentClick = (item, event) => {
  // Don't navigate if clicking on checkbox
  if (event.target.closest('.comment-checkbox')) {
    return;
  }
  emit('selectComment', item);
};

/**
 * Handle checkbox toggle
 */
const handleCheckboxToggle = (item, event) => {
  event.stopPropagation();
  emit('toggleSelection', item, event);
};

/**
 * Check if comment item is selected
 */
const isSelected = (item) => {
  return props.selectedComments.includes(item.id);
};

/**
 * Handle context menu
 */
const showItemContextMenu = (event, item) => {
  event.preventDefault();
  contextCommentItem.value = item;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  showContextMenu.value = true;
};

/**
 * Hide context menu
 */
const hideContextMenu = () => {
  showContextMenu.value = false;
  contextCommentItem.value = null;
};

/**
 * Handle delete item
 */
const handleDeleteItem = (item) => {
  emit('delete', [item.id]);
  hideContextMenu();
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get status badge color
 */
const getStatusColor = (status) => {
  const colors = {
    approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    spam: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    trash: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
  };
  return colors[status] || colors.approved;
};

/**
 * Strip HTML tags from content for preview
 */
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

/**
 * Truncate text
 */
const truncate = (text, length = 60) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Close context menu when clicking outside
document.addEventListener('click', hideContextMenu);
</script>

<template>
  <div class="relative">
    <!-- Comment List -->
    <div class="py-2 flex flex-col gap-1">
      <div
        v-for="item in comments"
        :key="item.id"
        @click="handleCommentClick(item, $event)"
        @contextmenu="showItemContextMenu($event, item)"
        class="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all group -mx-3 relative"
        :class="
          route.params.commentId == item.id
            ? 'bg-zinc-100 dark:bg-zinc-800/60'
            : ''
        "
      >
        <!-- Comment Avatar -->
        <div class="flex-shrink-0 relative">
          <!-- Checkbox - shows on hover, positioned centered over avatar -->
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 comment-checkbox cursor-pointer"
            :class="
              isSelected(item)
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            "
            @click.stop="handleCheckboxToggle(item, $event)"
          >
            <AppCheckbox :isactive="isSelected(item)" />
          </div>

          <div
            class="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden"
          >
            <img
              v-if="item.author_avatar_urls?.['96']"
              :src="item.author_avatar_urls['96']"
              :alt="item.author_name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <AppIcon icon="person" class="text-zinc-500 dark:text-zinc-400" />
            </div>
          </div>
        </div>

        <!-- Comment Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span
              class="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate"
              :title="item.author_name"
              :class="
                route.params.commentId == item.id
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              "
            >
              {{ item.author_name }}
            </span>
            <span
              :class="[
                'px-2 py-0.5 text-[10px] font-medium rounded uppercase',
                getStatusColor(item.status),
              ]"
            >
              {{ item.status }}
            </span>
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1 line-clamp-2">
            {{ truncate(stripHtml(item.content)) }}
          </div>
          <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{{ formatDate(item.date) }}</span>
            <span v-if="item.postData || item.post_title">•</span>
            <a
              v-if="item.postData?.edit_link"
              :href="item.postData.edit_link"
              @click.stop
              target="_blank"
              class="truncate hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline transition-colors flex items-center gap-1"
              :title="item.postData.title"
            >
              <AppIcon icon="open_in_new" class="text-[10px]" />
              {{ item.postData.title }}
            </a>
            <span v-else-if="item.post_title" class="truncate" :title="item.post_title">
              {{ item.post_title }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="showContextMenu && contextCommentItem"
      :style="{
        left: contextMenuPosition.x + 'px',
        top: contextMenuPosition.y + 'px',
      }"
      class="fixed z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-32"
      @click.stop
    >
      <button
        @click="handleDeleteItem(contextCommentItem)"
        class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
      >
        <AppIcon icon="delete" class="text-sm" />
        {{ __('Delete', 'flexify-dashboard') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

