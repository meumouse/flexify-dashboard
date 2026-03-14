<script setup>
import { ref, computed, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import PostActionList from './post-actions.vue';
import InlineStatusSelect from './inline-status-select.vue';
import InlineUserSelect from './inline-user-select.vue';
import { updatePostStatus } from './updatePostStatus.js';
import { updatePostAuthor } from './updatePostAuthor.js';

const appStore = useAppStore();

// Props
const props = defineProps({
  post: {
    type: Object,
    default: null,
  },
});

// Emits
const emit = defineEmits(['updated']);

// Local refs
const loading = ref(false);
const postData = ref(null);

/**
 * Get featured image URL from post data
 */
const getFeaturedImage = computed(() => {
  if (!props.post) return null;
  if (props.post.title && typeof props.post.title === 'object' && props.post.title.image) {
    return props.post.title.image;
  }
  return null;
});

/**
 * Strip HTML from title
 */
const getTitleText = computed(() => {
  if (!props.post) return '';
  if (props.post.title && typeof props.post.title === 'object' && props.post.title.value) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = props.post.title.value;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  if (props.post.title && typeof props.post.title === 'string') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = props.post.title;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  return '';
});

/**
 * Format date
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
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
  if (!post || !post.status) return '';
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
  if (!post || !post.status) return '';
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
  if (!post || !post.author) return '';
  if (typeof post.author === 'object' && post.author.name) {
    return post.author.name;
  }
  if (typeof post.author === 'string') {
    return post.author;
  }
  return '';
};

/**
 * Extract avatar URL from HTML string
 */
const extractAvatarUrl = (avatarHtml) => {
  if (!avatarHtml) return null;
  if (typeof avatarHtml === 'string' && avatarHtml.includes('<img')) {
    const match = avatarHtml.match(/src=['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }
  return avatarHtml;
};

/**
 * Normalize author object for InlineUserSelect component
 * Converts avatar HTML to gravatar URL if needed
 */
const normalizedAuthor = computed({
  get() {
    if (!props.post || !props.post.author) return null;
    
    const author = props.post.author;
    
    // If already in correct format, return as is
    if (author.id && author.name && (author.gravatar || author.avatar)) {
      return {
        id: author.id,
        name: author.name,
        gravatar: author.gravatar || extractAvatarUrl(author.avatar),
      };
    }
    
    // If it's an object with name/id, try to extract avatar
    if (typeof author === 'object' && author.id && author.name) {
      return {
        id: author.id,
        name: author.name,
        gravatar: extractAvatarUrl(author.avatar),
      };
    }
    
    return author;
  },
  set(value) {
    if (props.post && value) {
      props.post.author = value;
    }
  }
});

/**
 * Normalize status object for InlineStatusSelect component
 */
const normalizedStatus = computed({
  get() {
    if (!props.post || !props.post.status) return null;
    
    const status = props.post.status;
    
    // If already in correct format {value, label}, return as is
    if (typeof status === 'object' && status.value && status.label) {
      return status;
    }
    
    // If it's a string, try to find matching status from store
    if (typeof status === 'string') {
      const statusObj = appStore.state.postStatuses?.find(s => s.value === status);
      return statusObj || { value: status, label: status };
    }
    
    return status;
  },
  set(value) {
    if (props.post && value) {
      props.post.status = value;
    }
  }
});

/**
 * Handle post edit
 */
const handleEdit = () => {
  if (props.post?.is_editable && props.post?.edit_url) {
    window.location.href = props.post.edit_url;
  }
};

/**
 * Handle post view
 */
const handleView = () => {
  if (props.post?.view_url) {
    window.open(props.post.view_url, '_blank');
  }
};

// Watch for post changes
watch(
  () => props.post,
  (newPost) => {
    if (newPost) {
      postData.value = { ...newPost };
    } else {
      postData.value = null;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    v-if="!post"
    class="flex-1 flex items-center justify-center h-full"
  >
    <div class="text-center">
      <div
        class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
      >
        <AppIcon icon="article" class="text-2xl text-zinc-400" />
      </div>
      <h3
        class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
      >
        {{ __('Post Details', 'flexify-dashboard') }}
      </h3>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        {{
          __(
            'Select a post from the list to view details and edit properties.',
            'flexify-dashboard'
          )
        }}
      </p>
    </div>
  </div>

  <div
    v-else
    class="flex-1 overflow-auto p-6 custom-scrollbar"
  >
    <!-- Featured Image -->
    <div
      v-if="getFeaturedImage"
      class="mb-6 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800"
    >
      <img
        :src="getFeaturedImage"
        :alt="getTitleText"
        class="w-full h-auto max-h-96 object-cover"
      />
    </div>

    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-start justify-between gap-4 mb-4">
        <h1
          class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 flex-1"
        >
          {{ getTitleText || __('Untitled', 'flexify-dashboard') }}
        </h1>
        <PostActionList :post="post" />
      </div>

      <!-- Meta Info -->
      <div class="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <div class="flex items-center gap-1.5">
          <AppIcon icon="schedule" class="text-base" />
          <span>{{ formatDate(post.date) }}</span>
        </div>
        <span v-if="getAuthorName(post)" class="flex items-center gap-1.5">
          <AppIcon icon="person" class="text-base" />
          <span>{{ getAuthorName(post) }}</span>
        </span>
        <span
          v-if="getStatusValue(post)"
          class="px-2 py-1 text-xs font-medium rounded-md"
          :class="getStatusClasses(getStatusValue(post))"
        >
          {{ getStatusLabel(post) }}
        </span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex items-center gap-2 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-700">
      <AppButton
        v-if="post.is_editable"
        type="primary"
        @click="handleEdit"
        class="text-sm"
      >
        <AppIcon icon="edit" class="text-base mr-1" />
        {{ __('Edit', 'flexify-dashboard') }}
      </AppButton>
      <AppButton
        v-if="post.view_url"
        type="default"
        @click="handleView"
        class="text-sm"
      >
        <AppIcon icon="visibility" class="text-base mr-1" />
        {{ __('View', 'flexify-dashboard') }}
      </AppButton>
    </div>

    <!-- Details Section -->
    <div class="space-y-6">
      <!-- Status -->
      <div v-if="post.status !== undefined">
        <label
          class="block text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-2"
        >
          {{ __('Status', 'flexify-dashboard') }}
        </label>
        <InlineStatusSelect
          v-model="normalizedStatus"
          :post="post"
          @updated="(d) => { updatePostStatus(post, d); emit('updated'); }"
        />
      </div>

      <!-- Author -->
      <div v-if="post.author !== undefined">
        <label
          class="block text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-2"
        >
          {{ __('Author', 'flexify-dashboard') }}
        </label>
        <InlineUserSelect
          :post="post"
          v-model="normalizedAuthor"
          @updated="() => { updatePostAuthor(post); emit('updated'); }"
        />
      </div>

      <!-- Categories -->
      <div v-if="post.categories && Array.isArray(post.categories) && post.categories.length > 0">
        <label
          class="block text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-2"
        >
          {{ __('Categories', 'flexify-dashboard') }}
        </label>
        <div class="flex flex-wrap gap-1.5">
          <a
            v-for="category in post.categories"
            :key="category.id"
            :href="category.url"
            class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all duration-200 hover:scale-105 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 dark:border-indigo-800"
            v-html="category.title"
          />
        </div>
      </div>

      <!-- Tags -->
      <div v-if="post.tags && Array.isArray(post.tags) && post.tags.length > 0">
        <label
          class="block text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-2"
        >
          {{ __('Tags', 'flexify-dashboard') }}
        </label>
        <div class="flex flex-wrap gap-1.5">
          <a
            v-for="tag in post.tags"
            :key="tag.id"
            :href="tag.url"
            class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all duration-200 hover:scale-105 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 dark:border-indigo-800"
            v-html="tag.title"
          />
        </div>
      </div>

      <!-- URL -->
      <div v-if="post.view_url">
        <label
          class="block text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-2"
        >
          {{ __('URL', 'flexify-dashboard') }}
        </label>
        <a
          :href="post.view_url"
          target="_blank"
          class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
        >
          {{ post.view_url }}
        </a>
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="post.view_url" class="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-700">
      <label
        class="block text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-4"
      >
        {{ __('Preview', 'flexify-dashboard') }}
      </label>
      <div class="relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <iframe
          :src="post.view_url"
          class="w-full h-[600px] border-0"
          frameborder="0"
          allowfullscreen
          loading="lazy"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

