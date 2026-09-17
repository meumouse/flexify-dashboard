<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

const props = defineProps({
  dateRange: {
    type: Array,
    required: true,
  },
  appData: {
    type: Object,
    required: true,
  },
});

// Refs
const comments = ref([]);
const loading = ref(false);
const error = ref(null);

/**
 * Load comments based on date range
 */
const loadComments = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Format dates for WordPress REST API (ISO 8601 format required)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Fetch comments from WordPress REST API
    const response = await lmnFetch({
      endpoint: 'wp/v2/comments',
      type: 'GET',
      params: {
        context: 'edit',
        per_page: 10,
        orderby: 'date',
        order: 'desc',
        after: startDate,
        before: endDate,
        status: 'approve', // Include all comment statuses
        _embed: true, // Include author and post data
      },
    });

    if (response && response.data) {
      // Transform WordPress comments to our format
      comments.value = response.data.map((comment) => ({
        id: comment.id,
        content: comment.content.rendered,
        author: comment.author_name,
        authorEmail: comment.author_email,
        date: comment.date,
        status: comment.status,
        postTitle:
          comment._embedded?.up?.[0]?.title?.rendered || 'Unknown Post',
        postLink: comment._embedded?.up?.[0]?.link || '#',
        authorUrl: comment.author_url,
        authorAvatar: comment.author_avatar_urls?.['24'] || '',
      }));
    } else {
      comments.value = [];
    }
  } catch (err) {
    console.error('Error loading comments:', err);
    error.value = 'Failed to load comments';
    comments.value = [];
  } finally {
    loading.value = false;
  }
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Get status color
 */
const getStatusColor = (status) => {
  const colors = {
    approved: 'text-success-600 dark:text-success-400',
    hold: 'text-warning-600 dark:text-warning-400',
    spam: 'text-error-600 dark:text-error-400',
    trash: 'text-gray-600 dark:text-gray-400',
  };
  return colors[status] || colors.hold;
};

/**
 * Strip HTML tags from content
 */
const stripHtml = (html) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

/**
 * Truncate text
 */
const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Computed
const totalComments = computed(() => comments.value.length);
const approvedCount = computed(
  () => comments.value.filter((c) => c.status === 'approved').length
);
const pendingCount = computed(
  () => comments.value.filter((c) => c.status === 'hold').length
);
const spamCount = computed(
  () => comments.value.filter((c) => c.status === 'spam').length
);
const adminUrl = computed(() => props.appData?.state?.adminUrl || '');

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    loadComments();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload comments based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadComments();
});
</script>

<template>
  <div
    class="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col h-full"
  >
    <!-- Card Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ __('Recent Comments', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ __('Latest comments and discussions', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-brand-500 rounded-full"></div>
        <span class="text-xs text-gray-500 dark:text-gray-400"
          >{{ totalComments }} {{ __('total', 'flexify-dashboard') }}</span
        >
      </div>
    </div>

    <!-- Stats Overview -->
    <div
      class="grid grid-cols-3 gap-4 mb-6 rounded-2xl bg-white dark:bg-white/[0.03] py-4"
    >
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ approvedCount }}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ __('Approved', 'flexify-dashboard') }}
        </div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ pendingCount }}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ __('Pending', 'flexify-dashboard') }}
        </div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ spamCount }}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ __('Spam', 'flexify-dashboard') }}
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="flex items-center gap-3 p-3">
          <div class="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <AppIcon icon="error" class="text-3xl text-gray-400 mx-auto mb-3" />
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ error }}</p>
    </div>

    <!-- Comments List -->
    <div v-else-if="comments.length > 0" class="space-y-2">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="group flex items-start gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200"
      >
        <!-- Comment Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1" v-if="1 == 2">
            <h4
              class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200"
            >
              {{ comment.author }}
            </h4>
          </div>

          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {{ truncateText(stripHtml(comment.content)) }}
          </p>

          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">{{
              __('on', 'flexify-dashboard')
            }}</span>
            <a
              :href="comment.postLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              {{ comment.postTitle }}
            </a>
            <span class="text-xs text-gray-400 dark:text-gray-500">•</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatDate(comment.date) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <div
        class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-3"
      >
        <AppIcon icon="comment" class="text-xl text-gray-400" />
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ __('No comments found', 'flexify-dashboard') }}
      </p>
    </div>

    <!-- View all -->
    <div class="grow flex items-end justify-end">
      <a
        v-if="comments.length > 0"
        :href="`${adminUrl}comments.php`"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 flex items-center gap-2"
        ><span>{{ __('View all', 'flexify-dashboard') }}</span>
        <AppIcon
          icon="chevron_right"
          class="text-xs transition-transform duration-200 group-hover:translate-x-1"
        />
      </a>
    </div>
  </div>
</template>
