<script setup>
import { ref } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import { returnPostData } from './returnPostData.js';
import { selected } from './constants.js';

// Props
const props = defineProps({
  posts: {
    type: Array,
    default: () => [],
  },
  selectedPosts: {
    type: Array,
    default: () => [],
  },
  selectedPostId: {
    type: [Number, String],
    default: null,
  },
});

// Emits
const emit = defineEmits(['selectPost', 'toggleSelection']);

/**
 * Handle post item click (for preview view)
 */
const handlePostClick = (post, event) => {
  // Don't navigate if clicking on checkbox
  if (event.target.closest('.post-checkbox')) {
    return;
  }
  emit('selectPost', post);
};

/**
 * Handle checkbox toggle
 */
const handleCheckboxToggle = (post, event) => {
  event.stopPropagation();
  emit('toggleSelection', post, event);
};

/**
 * Check if post is selected
 */
const isSelected = (post) => {
  return props.selectedPosts.includes(post.id);
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  // Handle HTML date strings
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = dateString;
  const text = tempDiv.textContent || tempDiv.innerText || '';
  if (text) return text;
  return new Date(dateString).toLocaleDateString();
};

/**
 * Get status value from post object
 */
const getStatusValue = (post) => {
  if (!post.status) return '';
  if (typeof post.status === 'object' && post.status.value) {
    return post.status.value;
  }
  if (typeof post.status === 'string') {
    return post.status;
  }
  return '';
};

/**
 * Get status label from post object
 */
const getStatusLabel = (post) => {
  if (!post.status) return '';
  if (typeof post.status === 'object' && post.status.label) {
    return post.status.label;
  }
  if (typeof post.status === 'string') {
    return post.status;
  }
  return '';
};

/**
 * Get status badge color classes
 */
const getStatusClasses = (statusValue) => {
  const statusMap = {
    publish: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    draft: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    trash: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    private: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  };
  return statusMap[statusValue] || statusMap.draft;
};

/**
 * Get author name from post object
 */
const getAuthorName = (post) => {
  if (!post.author) return '';
  if (typeof post.author === 'object' && post.author.name) {
    return post.author.name;
  }
  if (typeof post.author === 'string') {
    return post.author;
  }
  return '';
};

/**
 * Get featured image URL from post data
 */
const getFeaturedImage = (post) => {
  // Check for featured image URL in title column (set by REST API)
  if (post.title && typeof post.title === 'object' && post.title.image_url) {
    return post.title.image_url;
  }
  return null;
};

/**
 * Strip HTML from title
 */
const getTitleText = (post) => {
  if (!post.title) return '';
  if (typeof post.title === 'object' && post.title.value) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.title.value;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  if (typeof post.title === 'string') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.title;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  return '';
};
</script>

<template>
  <div class="py-2 flex flex-col gap-1">
    <div
      v-for="post in posts"
      :key="post.id"
      @click="handlePostClick(post, $event)"
      class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all group -mx-3 relative"
      :class="
        selectedPostId == post.id
          ? 'bg-zinc-100 dark:bg-zinc-800/60'
          : ''
      "
    >
      <!-- Post Thumbnail -->
      <div class="flex-shrink-0 relative">
        <!-- Checkbox - shows on hover, positioned centered over thumbnail -->
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 post-checkbox cursor-pointer"
          :class="
            isSelected(post)
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          "
          @click.stop="handleCheckboxToggle(post, $event)"
        >
          <div
            class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
            :class="
              isSelected(post)
                ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100'
                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600'
            "
          >
            <AppIcon
              v-if="isSelected(post)"
              icon="check"
              class="text-xs text-white dark:text-zinc-900"
            />
          </div>
        </div>

        <div
          class="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden flex items-center justify-center"
        >
          <img
            v-if="getFeaturedImage(post)"
            :src="getFeaturedImage(post)"
            :alt="getTitleText(post)"
            class="w-full h-full object-cover"
          />
          <AppIcon
            v-else
            icon="article"
            class="text-zinc-500 dark:text-zinc-400"
          />
        </div>
      </div>

      <!-- Post Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <span
            class="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate"
            :title="getTitleText(post)"
            :class="
              selectedPostId == post.id
                ? 'text-zinc-900 dark:text-white'
                : 'text-zinc-600 dark:text-zinc-400'
            "
          >
            {{ getTitleText(post) || __('Untitled', 'flexify-dashboard') }}
          </span>
          <span
            v-if="getStatusValue(post)"
            class="px-2 py-0.5 text-[10px] font-medium rounded-md whitespace-nowrap"
            :class="getStatusClasses(getStatusValue(post))"
          >
            {{ getStatusLabel(post) }}
          </span>
        </div>
        <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
          <span v-if="getAuthorName(post)">{{ getAuthorName(post) }}</span>
          <span v-if="post.date && getAuthorName(post)">•</span>
          <span v-if="post.date">{{ formatDate(post.date) }}</span>
          <span
            v-if="post.children && post.children.length > 0"
            class="ml-1 text-zinc-400 dark:text-zinc-500"
          >
            • {{ post.children.length }}
            {{
              post.children.length === 1
                ? __('child', 'flexify-dashboard')
                : __('children', 'flexify-dashboard')
            }}
          </span>
        </div>
      </div>

      <!-- Post Actions Indicator -->
      <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <AppIcon
          icon="more_vert"
          class="text-zinc-400 dark:text-zinc-500 text-sm"
        />
      </div>
    </div>
  </div>
</template>

