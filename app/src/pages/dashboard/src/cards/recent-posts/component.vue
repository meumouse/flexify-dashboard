<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

const props = defineProps({
  dateRange: {
    type: Object,
    required: true,
  },
  appData: {
    type: Object,
    required: true,
  },
});

// Refs
const posts = ref([]);
const loading = ref(false);
const error = ref(null);

/**
 * Load posts based on date range
 */
const loadPosts = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Format dates for WordPress REST API (ISO 8601 format required)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Fetch posts from WordPress REST API
    const response = await lmnFetch({
      endpoint: 'wp/v2/posts',
      type: 'GET',
      params: {
        per_page: 10,
        orderby: 'date',
        order: 'desc',
        after: startDate,
        before: endDate,
        status: 'publish,draft,future', // Include published, draft, and scheduled posts
        _embed: true, // Include author and other embedded data
      },
    });

    if (response && response.data) {
      // Transform WordPress posts to our format
      posts.value = response.data.map((post) => ({
        id: post.id,
        title: post.title.rendered,
        status: post.status === 'future' ? 'scheduled' : post.status,
        author: post._embedded?.author?.[0]?.name || 'Unknown Author',
        date: post.date,
        views: 0, // WordPress doesn't include view counts by default
        comments: post.comment_count || 0,
        link: post.link,
        excerpt: post.excerpt?.rendered || '',
      }));
    } else {
      posts.value = [];
    }
  } catch (err) {
    console.error('Error loading posts:', err);
    error.value = 'Failed to load posts';
    posts.value = [];
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
    publish: 'text-green-600 dark:text-green-500/80',
    draft: 'text-amber-600 dark:text-amber-400',
    scheduled: 'text-brand-600 dark:text-brand-400',
  };
  return colors[status] || colors.draft;
};

/**
 * Format numbers
 */
const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

// Computed
const totalPosts = computed(() => posts.value.length);
const publishedCount = computed(
  () => posts.value.filter((p) => p.status === 'publish').length
);
const draftCount = computed(
  () => posts.value.filter((p) => p.status === 'draft').length
);

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    loadPosts();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload posts based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadPosts();
});
</script>

<template>
  <div
    class="bg-white dark:bg-[#24303f] border border-zinc-200/40 dark:border-[#2e3a47] rounded-3xl p-6 flex flex-col h-full"
  >
    <!-- Card Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {{ __('Recent Posts', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Latest content activity', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-brand-500 rounded-full"></div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400"
          >{{ totalPosts }} {{ __('total', 'flexify-dashboard') }}</span
        >
      </div>
    </div>

    <!-- Stats Overview -->
    <div
      class="grid grid-cols-3 gap-4 mb-6 rounded-2xl bg-white dark:bg-zinc-800/40 py-4"
    >
      <div class="text-center">
        <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {{ publishedCount }}
        </div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ __('Published', 'flexify-dashboard') }}
        </div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {{ draftCount }}
        </div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ __('Draft', 'flexify-dashboard') }}
        </div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {{ totalPosts - publishedCount - draftCount }}
        </div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ __('Scheduled', 'flexify-dashboard') }}
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="flex items-center gap-3 p-3">
          <div class="w-2 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
            <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <AppIcon icon="error" class="text-3xl text-zinc-400 mx-auto mb-3" />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ error }}</p>
    </div>

    <!-- Posts List -->
    <div v-else-if="posts.length > 0" class="space-y-2">
      <div
        v-for="post in posts"
        :key="post.id"
        class="group flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all duration-200"
      >
        <!-- Post Content -->
        <div class="flex-1 min-w-0">
          <a
            :href="post.link"
            target="_blank"
            rel="noopener noreferrer"
            class="block"
          >
            <h4
              class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200"
            >
              {{ post.title }}
            </h4>
          </a>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-zinc-500 dark:text-zinc-400">{{
              post.author
            }}</span>
            <span class="text-xs text-zinc-400 dark:text-zinc-500">•</span>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">{{
              formatDate(post.date)
            }}</span>
          </div>
        </div>

        <!-- Post Stats -->
        <div
          class="flex-shrink-0 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <div v-if="post.views > 0" class="flex items-center gap-1">
            <AppIcon icon="visibility" class="text-xs" />
            <span>{{ formatNumber(post.views) }}</span>
          </div>
          <div v-if="post.comments > 0" class="flex items-center gap-1">
            <AppIcon icon="comment" class="text-xs" />
            <span>{{ post.comments }}</span>
          </div>
        </div>

        <!-- Status Badge -->
        <div class="flex-shrink-0">
          <span
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200"
            :class="[
              getStatusColor(post.status),
              'bg-opacity-10',
              post.status === 'publish'
                ? 'bg-green-100 dark:bg-green-900/15'
                : '',
              post.status === 'draft'
                ? 'bg-amber-100 dark:bg-amber-900/20'
                : '',
              post.status === 'scheduled'
                ? 'bg-brand-100 dark:bg-brand-900/20'
                : '',
            ]"
          >
            {{ post.status.charAt(0).toUpperCase() + post.status.slice(1) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <div
        class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-3"
      >
        <AppIcon icon="article" class="text-xl text-zinc-400" />
      </div>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('No posts found', 'flexify-dashboard') }}
      </p>
    </div>

    <!-- View all -->
    <div class="grow flex items-end justify-end">
      <a
        v-if="posts.length > 0"
        href="{{ appStore.state.adminUrl }}edit.php"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors duration-200 flex items-center gap-2"
        ><span>{{ __('View all', 'flexify-dashboard') }}</span>
        <AppIcon
          icon="chevron_right"
          class="text-xs transition-transform duration-200 group-hover:translate-x-1"
        />
      </a>
    </div>
  </div>
</template>
