<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import RichText from '@/components/utility/rich-text/index.vue';

const route = useRoute();
const router = useRouter();

// Refs
const loading = ref(false);
const commentItem = ref(null);
const isSaving = ref(false);
const postData = ref(null);

// Form fields
const authorName = ref('');
const authorEmail = ref('');
const authorUrl = ref('');
const content = ref('');
const status = ref('approved');
const date = ref('');
const postId = ref(0);
const postTitle = ref('');
const postType = ref('');

/**
 * Status options with colors
 */
const statusOptions = [
  {
    value: 'approved',
    label: __('Approved', 'flexify-dashboard'),
    color: 'green',
    classes:
      'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800',
    dot: 'bg-success-500',
  },
  {
    value: 'pending',
    label: __('Pending', 'flexify-dashboard'),
    color: 'yellow',
    classes:
      'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-800',
    dot: 'bg-warning-500',
  },
  {
    value: 'spam',
    label: __('Spam', 'flexify-dashboard'),
    color: 'red',
    classes:
      'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 border-error-200 dark:border-error-800',
    dot: 'bg-error-500',
  },
  {
    value: 'trash',
    label: __('Trash', 'flexify-dashboard'),
    color: 'zinc',
    classes:
      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-500',
  },
];

/**
 * Get current status option
 */
const currentStatusOption = computed(() => {
  return (
    statusOptions.find((opt) => opt.value === status.value) || statusOptions[0]
  );
});

const statusSelectOpen = ref(false);

/**
 * Fetches comment item data by ID from WordPress REST API
 */
const getCommentItem = async () => {
  if (!route.params.commentId) return;

  loading.value = true;
  appStore.updateState('loading', true);

  const args = {
    endpoint: `wp/v2/comments/${route.params.commentId}`,
    params: {
      context: 'edit',
    },
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data?.data) {
    notify({
      title: __('Comment not found', 'flexify-dashboard'),
      type: 'error',
    });
    router.push('/');
    return;
  }

  commentItem.value = data.data;

  // Populate form fields
  authorName.value = commentItem.value.author_name || '';
  authorEmail.value = commentItem.value.author_email || '';
  authorUrl.value = commentItem.value.author_url || '';
  content.value =
    commentItem.value.content?.raw || commentItem.value.content?.rendered || '';
  status.value = commentItem.value.status || 'approved';
  date.value = commentItem.value.date || '';
  postId.value = commentItem.value.post || 0;
  postTitle.value = commentItem.value.post_title || '';
  postType.value = commentItem.value.post_type || '';

  // Fetch post data if we have a post ID
  if (postId.value && postType.value) {
    try {
      const postTypeObject = await lmnFetch({
        endpoint: `wp/v2/types/${postType.value}`,
      });

      if (postTypeObject?.data?.rest_base) {
        const postResponse = await lmnFetch({
          endpoint: `wp/v2/${postTypeObject.data.rest_base}/${postId.value}`,
          params: { context: 'edit' },
        });

        if (postResponse?.data) {
          postData.value = {
            id: postResponse.data.id,
            title:
              postResponse.data.title?.rendered ||
              postResponse.data.title?.raw ||
              '',
            link: postResponse.data.link || '',
            edit_link: `${appStore.state.adminUrl}post.php?post=${postResponse.data.id}&action=edit`,
            rest_base: postTypeObject.data.rest_base,
          };
        }
      }
    } catch (error) {
      console.error(`Failed to fetch post ${postId.value}:`, error);
    }
  }
};

/**
 * Handle form save
 */
const handleSave = async () => {
  if (!commentItem.value) return;

  isSaving.value = true;
  appStore.updateState('loading', true);

  const updateData = {
    author_name: authorName.value,
    author_email: authorEmail.value,
    author_url: authorUrl.value,
    content: content.value,
    status: status.value,
    date: date.value,
  };

  try {
    const args = {
      endpoint: `wp/v2/comments/${commentItem.value.id}`,
      type: 'POST',
      params: { context: 'edit' },
      data: updateData,
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('Comment updated successfully', 'flexify-dashboard'),
        type: 'success',
      });

      // Refresh comment data
      await getCommentItem();
    }
  } catch (error) {
    notify({
      title: __('Failed to update comment', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSaving.value = false;
    appStore.updateState('loading', false);
  }
};

/**
 * Handle comment deletion
 */
const handleDelete = async () => {
  if (!commentItem.value) return;

  const userResponse = confirm(
    __(
      'Are you sure you want to delete this comment? This action cannot be undone.',
      'flexify-dashboard'
    )
  );

  if (!userResponse) return;

  isSaving.value = true;
  appStore.updateState('loading', true);

  try {
    await lmnFetch({
      endpoint: `wp/v2/comments/${commentItem.value.id}`,
      type: 'DELETE',
      params: {
        force: true,
      },
    });

    notify({
      title: __('Comment deleted successfully', 'flexify-dashboard'),
      type: 'success',
    });

    router.push('/');
  } catch (error) {
    notify({
      title: __('Failed to delete comment', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSaving.value = false;
    appStore.updateState('loading', false);
  }
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Navigate to post
 */
const navigateToPost = () => {
  if (postId.value) {
    window.open(
      `${appStore.state.adminUrl}post.php?post=${postId.value}&action=edit`,
      '_blank'
    );
  }
};

/**
 * Close status dropdown when clicking outside
 */
const handleClickOutside = (event) => {
  const statusSelectContainer = event.target.closest('[data-status-select]');
  if (!statusSelectContainer) {
    statusSelectOpen.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await getCommentItem();
  // Use setTimeout to ensure the click handler is added after the initial render
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 0);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Watch for route changes
watch(
  () => route.params.commentId,
  async (newCommentId) => {
    if (newCommentId) {
      await getCommentItem();
    }
  }
);
</script>

<template>
  <div class="flex-1 flex flex-col h-full max-h-full overflow-hidden">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mx-auto mb-3"
        >
          <AppIcon icon="comment" class="text-xl text-gray-400 animate-pulse" />
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ __('Loading...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="commentItem">
      <!-- Header Section with Avatar and Basic Info -->
      <div
        class="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
      >
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <div
            class="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex-shrink-0"
          >
            <img
              v-if="commentItem.author_avatar_urls?.['96']"
              :src="commentItem.author_avatar_urls['96']"
              :alt="authorName"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <AppIcon
                icon="person"
                class="text-2xl text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>

          <!-- Comment Info -->
          <div class="flex-1 min-w-0">
            <h2
              class="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
            >
              {{ authorName || __('Anonymous', 'flexify-dashboard') }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ authorEmail }}
            </p>
          </div>

          <!-- Meta Info -->
          <div
            class="flex-shrink-0 text-right text-xs text-gray-500 dark:text-gray-400"
          >
            <div>{{ __('Comment ID', 'flexify-dashboard') }}: {{ commentItem.id }}</div>
            <div class="mt-1">
              {{ __('Date', 'flexify-dashboard') }}: {{ formatDate(date) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <div class="flex-1 overflow-auto">
        <div class="p-6 space-y-6 max-w-2xl">
          <!-- Author Name -->
          <div>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2"
            >
              {{ __('Author Name', 'flexify-dashboard') }}
            </label>
            <AppInput
              v-model="authorName"
              :placeholder="__('Author name', 'flexify-dashboard')"
              autocomplete="off"
            />
          </div>

          <!-- Author Email -->
          <div>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2"
            >
              {{ __('Author Email', 'flexify-dashboard') }}
            </label>
            <AppInput
              v-model="authorEmail"
              type="email"
              :placeholder="__('author@example.com', 'flexify-dashboard')"
              autocomplete="off"
            />
          </div>

          <!-- Author URL -->
          <div>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2"
            >
              {{ __('Author URL', 'flexify-dashboard') }}
            </label>
            <AppInput
              v-model="authorUrl"
              type="url"
              :placeholder="__('https://example.com', 'flexify-dashboard')"
              autocomplete="off"
            />
          </div>

          <!-- Post Reference -->
          <div v-if="postData || postTitle">
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2"
            >
              {{ __('Post', 'flexify-dashboard') }}
            </label>
            <div class="flex items-center gap-2">
              <a
                v-if="postData?.edit_link"
                :href="postData.edit_link"
                target="_blank"
                class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <span class="truncate flex-1">{{ postData.title }}</span>
                <AppIcon icon="open_in_new" class="text-base flex-shrink-0" />
              </a>
              <AppInput
                v-else
                :model-value="postTitle"
                disabled
                class="flex-1"
              />
            </div>
          </div>

          <!-- Status -->
          <div class="relative" data-status-select>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2"
            >
              {{ __('Status', 'flexify-dashboard') }}
            </label>
            <div class="relative">
              <button
                @click.stop="statusSelectOpen = !statusSelectOpen"
                :disabled="isSaving"
                class="w-full px-3 py-2.5 rounded-lg border transition-all text-left flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                :class="[
                  currentStatusOption.classes,
                  statusSelectOpen
                    ? 'ring-2 ring-gray-900 dark:ring-gray-100'
                    : 'hover:opacity-80',
                ]"
              >
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :class="currentStatusOption.dot"
                  ></span>
                  <span class="text-sm font-medium truncate">
                    {{ currentStatusOption.label }}
                  </span>
                </div>
                <AppIcon
                  icon="expand_more"
                  class="text-base flex-shrink-0 transition-transform"
                  :class="statusSelectOpen ? 'rotate-180' : ''"
                />
              </button>

              <!-- Dropdown -->
              <Transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-1"
              >
                <div
                  v-if="statusSelectOpen"
                  class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
                >
                  <div class="py-1">
                    <button
                      v-for="option in statusOptions"
                      :key="option.value"
                      @click.stop="
                        status = option.value;
                        statusSelectOpen = false;
                      "
                      class="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      :class="
                        status === option.value
                          ? 'bg-gray-50 dark:bg-gray-800'
                          : ''
                      "
                    >
                      <span
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :class="option.dot"
                      ></span>
                      <span class="text-sm font-medium flex-1">
                        {{ option.label }}
                      </span>
                      <AppIcon
                        v-if="status === option.value"
                        icon="check"
                        class="text-base text-gray-600 dark:text-gray-400 flex-shrink-0"
                      />
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Comment Content -->
          <div>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2"
            >
              {{ __('Comment', 'flexify-dashboard') }}
            </label>
            <RichText
              v-model="content"
              :placeholder="__('Comment content...', 'flexify-dashboard')"
            />
          </div>

          <!-- Date -->
          <div>
            <label
              class="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2"
            >
              {{ __('Date', 'flexify-dashboard') }}
            </label>
            <AppInput
              v-model="date"
              type="datetime-local"
              :disabled="isSaving"
            />
          </div>

          <!-- Action Buttons -->
          <div
            class="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3"
          >
            <AppButton type="primary" @click="handleSave" :loading="isSaving">
              {{ __('Update Comment', 'flexify-dashboard') }}
            </AppButton>
            <AppButton
              type="default"
              @click="handleDelete"
              :disabled="isSaving"
              class="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
            >
              {{ __('Delete', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
