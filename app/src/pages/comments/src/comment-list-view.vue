<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { useDarkMode } from '@/composables/useDarkMode.js';
import Drawer from '@/components/utility/drawer/index.vue';
const { isDark } = useDarkMode();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import CommentList from './comment-list.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import CommentDetailsView from './comment-details-view.vue';

const router = useRouter();
const route = useRoute();

// Refs
const loading = ref(false);
const comments = ref([]);
const filteredComments = ref([]);
const searchQuery = ref('');
const statusFilter = ref('all'); // 'all', 'approved', 'pending', 'spam', 'trash'
const sortBy = ref('date'); // 'date', 'author', 'post'
const sortOrder = ref('desc'); // 'asc' or 'desc'
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const drawerOpen = ref(false);
const selectedComments = ref([]); // Array of selected comment IDs
const lastSelectedIndex = ref(null);
const confirmDialog = ref(null);
const pagination = ref({
  page: 1,
  per_page: 30,
  total: 0,
  totalPages: 0,
  search: '',
  order: 'desc',
  orderby: 'date',
});

// Computed property for window width
const windowWidthComputed = computed(() => windowWidth.value);

// Pagination helpers
const canGoPrev = computed(() => pagination.value.page > 1);
const canGoNext = computed(
  () =>
    pagination.value.totalPages > 0 &&
    pagination.value.page < pagination.value.totalPages
);

const goPrevPage = async () => {
  if (!canGoPrev.value) return;
  pagination.value.page -= 1;
  await getCommentsData();
};

const goNextPage = async () => {
  if (!canGoNext.value) return;
  pagination.value.page += 1;
  await getCommentsData();
};

/**
 * Fetches comments data from WordPress REST API
 */
const getCommentsData = async () => {
  loading.value = true;
  appStore.updateState('loading', true);

  const params = {
    page: pagination.value.page,
    per_page: pagination.value.per_page,
    search: pagination.value.search,
    order: pagination.value.order,
    orderby: pagination.value.orderby,
    context: 'edit',
  };

  // Add status filter if not 'all'
  if (statusFilter.value !== 'all') {
    params.status = statusFilter.value;
  }

  const args = {
    endpoint: 'wp/v2/comments',
    params,
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data) return;

  // Map comments and fetch post data for each
  const commentsWithPosts = await Promise.all(
    data.data.map(async (item) => {
      const commentData = {
        id: item.id,
        author_name: item.author_name || '',
        author_email: item.author_email || '',
        author_url: item.author_url || '',
        author_ip: item.author_ip || '',
        content: item.content?.rendered || item.content?.raw || '',
        date: item.date || '',
        date_gmt: item.date_gmt || '',
        status: item.status || 'approved',
        post: item.post || 0,
        post_title: item.post_title || '',
        post_type: item.post_type || '',
        link: item.link || '',
        parent: item.parent || 0,
        type: item.type || 'comment',
        author_avatar_urls: item.author_avatar_urls || {},
        postData: null,
      };

      // Fetch post data if we have a post ID
      if (item.post && item.post_type) {
        try {
          const postTypeObject = await lmnFetch({
            endpoint: `wp/v2/types/${item.post_type}`,
          });

          if (postTypeObject?.data?.rest_base) {
            const postResponse = await lmnFetch({
              endpoint: `wp/v2/${postTypeObject.data.rest_base}/${item.post}`,
              params: { context: 'edit' },
            });

            if (postResponse?.data) {
              commentData.postData = {
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
          console.error(`Failed to fetch post ${item.post}:`, error);
        }
      }

      return commentData;
    })
  );

  comments.value = commentsWithPosts;

  pagination.value.total = data.totalItems;
  pagination.value.totalPages = data.totalPages;

  applyFilters();
};

/**
 * Handle comment item selection - navigate to details
 */
const selectCommentItem = (item) => {
  router.push({ name: 'comment-details', params: { commentId: item.id } });
};

/**
 * Handle comment checkbox selection
 */
const toggleCommentSelection = (item, event) => {
  const currentIndex = filteredComments.value.findIndex(
    (comment) => comment.id === item.id
  );

  // Handle shift+click for range selection
  if (event?.shiftKey && lastSelectedIndex.value !== null) {
    const start = Math.min(lastSelectedIndex.value, currentIndex);
    const end = Math.max(lastSelectedIndex.value, currentIndex);

    const rangeItems = filteredComments.value.slice(start, end + 1);
    const rangeIds = rangeItems.map((comment) => comment.id);

    rangeIds.forEach((id) => {
      if (!selectedComments.value.includes(id)) {
        selectedComments.value.push(id);
      }
    });

    lastSelectedIndex.value = currentIndex;
  } else {
    const index = selectedComments.value.findIndex((id) => id === item.id);
    if (index > -1) {
      selectedComments.value.splice(index, 1);
    } else {
      selectedComments.value.push(item.id);
    }

    lastSelectedIndex.value = currentIndex;
  }
};

/**
 * Check if comment item is selected
 */
const isCommentSelected = (item) => {
  return selectedComments.value.includes(item.id);
};

/**
 * Computed property to check if there are selected items
 */
const hasSelection = computed(() => {
  return selectedComments.value.length > 0;
});

/**
 * Get selected count text
 */
const selectedCountText = computed(() => {
  const count = selectedComments.value.length;
  return count === 1
    ? __('1 comment selected', 'flexify-dashboard')
    : __('%d comments selected', 'flexify-dashboard').replace('%d', count);
});

/**
 * View first selected comment item
 */
const viewSelectedComment = () => {
  if (selectedComments.value.length === 0) return;
  const firstSelectedId = selectedComments.value[0];
  router.push({
    name: 'comment-details',
    params: { commentId: firstSelectedId },
  });
};

/**
 * Clear selection
 */
const clearSelection = () => {
  selectedComments.value = [];
  lastSelectedIndex.value = null;
};

/**
 * Handle batch delete with confirmation
 */
const handleBatchDelete = async () => {
  if (selectedComments.value.length === 0) return;

  const count = selectedComments.value.length;
  const countText =
    count === 1
      ? __('this comment', 'flexify-dashboard')
      : __('these %d comments', 'flexify-dashboard').replace('%d', count);

  const userResponse = await confirmDialog.value.show({
    title: __('Are you sure?', 'flexify-dashboard'),
    message: __(
      'Are you sure you want to delete %s? This action cannot be undone.',
      'flexify-dashboard'
    ).replace('%s', countText),
    okButton: __('Yes, delete', 'flexify-dashboard'),
  });

  if (!userResponse) return;

  await handleDelete(selectedComments.value);
  clearSelection();
};

/**
 * Handle batch status update
 */
const handleBatchStatusUpdate = async (newStatus) => {
  if (selectedComments.value.length === 0) return;

  loading.value = true;

  try {
    const updatePromises = selectedComments.value.map(async (commentId) => {
      await lmnFetch({
        endpoint: `wp/v2/comments/${commentId}`,
        type: 'POST',
        data: { status: newStatus },
      });
    });

    await Promise.all(updatePromises);

    await getCommentsData();
    clearSelection();

    notify({
      title: __('Comments updated successfully', 'flexify-dashboard'),
      type: 'success',
    });
  } catch (error) {
    notify({
      title: __('Error updating comments', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Handle comment deletion
 */
const handleDelete = async (commentIds) => {
  loading.value = true;

  try {
    const deletePromises = commentIds.map((id) =>
      lmnFetch({
        endpoint: `wp/v2/comments/${id}`,
        type: 'DELETE',
        params: {
          force: true,
        },
      })
    );

    await Promise.all(deletePromises);

    selectedComments.value = [];
    lastSelectedIndex.value = null;

    notify({
      title: __('Comment deleted successfully!', 'flexify-dashboard'),
      type: 'success',
    });

    await getCommentsData();
  } catch (error) {
    notify({
      title: __('Delete failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Apply filters and sorting to comments
 */
const applyFilters = () => {
  let filtered = [...comments.value];

  // Filter by status
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(
      (comment) => comment.status === statusFilter.value
    );
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (comment) =>
        comment.author_name.toLowerCase().includes(query) ||
        comment.author_email.toLowerCase().includes(query) ||
        comment.content.toLowerCase().includes(query) ||
        comment.post_title.toLowerCase().includes(query)
    );
  }

  // Sort items
  filtered.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy.value) {
      case 'author':
        aValue = a.author_name || '';
        bValue = b.author_name || '';
        break;
      case 'post':
        aValue = a.post_title || '';
        bValue = b.post_title || '';
        break;
      case 'date':
      default:
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
    }

    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  filteredComments.value = filtered;
};

/**
 * Handle window resize
 */
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

// Watchers
watch([searchQuery, statusFilter, sortBy, sortOrder], () => {
  pagination.value.search = searchQuery.value;
  pagination.value.orderby = sortBy.value;
  pagination.value.order = sortOrder.value;
  pagination.value.page = 1;
  getCommentsData();
});

onMounted(() => {
  getCommentsData();
  windowWidth.value = window.innerWidth;
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

watch(
  () => route.params.commentId,
  (newVal) => {
    if (newVal) {
      drawerOpen.value = true;
    } else {
      drawerOpen.value = false;
    }
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div
    class="flex h-full text-gray-900 dark:text-gray-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize"
    :class="isDark ? 'dark' : ''"
  >
    <!-- Comment List Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 h-full max-h-full overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-medium text-gray-900 dark:text-gray-100">
            {{ __('Comments', 'flexify-dashboard') }}
          </h1>
        </div>

        <!-- Search Bar -->
        <div class="relative">
          <AppIcon
            icon="search"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search comments...', 'flexify-dashboard')"
            autocomplete="off"
            class="w-full bg-gray-50 dark:bg-gray-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 transition-shadow"
          />
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="px-6 py-3">
        <div class="flex items-center gap-2">
          <!-- Status Filter Pills -->
          <div
            class="flex-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar"
          >
            <button
              @click="statusFilter = 'all'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                statusFilter === 'all'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
            >
              {{ __('All', 'flexify-dashboard') }}
            </button>
            <button
              @click="statusFilter = 'approved'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                statusFilter === 'approved'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
            >
              {{ __('Approved', 'flexify-dashboard') }}
            </button>
            <button
              @click="statusFilter = 'pending'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                statusFilter === 'pending'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
            >
              {{ __('Pending', 'flexify-dashboard') }}
            </button>
            <button
              @click="statusFilter = 'spam'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                statusFilter === 'spam'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
            >
              {{ __('Spam', 'flexify-dashboard') }}
            </button>
            <button
              @click="statusFilter = 'trash'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                statusFilter === 'trash'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
            >
              {{ __('Trash', 'flexify-dashboard') }}
            </button>
          </div>

          <!-- Sort Button -->
          <div class="flex items-center gap-1.5">
            <button
              @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
              class="p-2 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
            >
              <AppIcon
                :icon="sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'"
                class="text-sm text-gray-600 dark:text-gray-400"
              />
            </button>
          </div>
        </div>

        <!-- Sort By Options -->
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
          >
            {{ __('Sort By', 'flexify-dashboard') }}
          </label>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="option in [
                { value: 'date', label: 'Date', icon: 'schedule' },
                { value: 'post', label: 'Post', icon: 'article' },
              ]"
              :key="option.value"
              @click="sortBy = option.value"
              :class="[
                'flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                sortBy === option.value
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
            >
              <AppIcon :icon="option.icon" class="text-sm" />
              {{ __(option.label, 'flexify-dashboard') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Results Count -->
      <div class="flex flex-row place-content-between items-center px-6 pr-4">
        <div
          class="py-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500"
        >
          {{ pagination.total }}
          {{
            pagination.total === 1
              ? __('comment', 'flexify-dashboard')
              : __('comments', 'flexify-dashboard')
          }}
        </div>

        <div class="flex flex-row items-center">
          <div class="text-xs text-gray-500 dark:text-gray-500 mr-2">
            {{ __('Page', 'flexify-dashboard') }} {{ pagination.page }}
            <span v-if="pagination.totalPages > 0">
              / {{ pagination.totalPages }}
            </span>
          </div>
          <AppButton
            type="transparent"
            :disabled="!canGoPrev"
            @click="goPrevPage"
            :aria-disabled="!canGoPrev"
            :title="__('Previous', 'flexify-dashboard')"
          >
            <AppIcon icon="chevron_left" />
          </AppButton>
          <AppButton
            type="transparent"
            :disabled="!canGoNext"
            @click="goNextPage"
            :aria-disabled="!canGoNext"
            :title="__('Next', 'flexify-dashboard')"
          >
            <AppIcon icon="chevron_right" />
          </AppButton>
        </div>
      </div>

      <!-- Comment List -->
      <div class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar">
        <div v-if="loading && !comments.length" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon
              icon="comment"
              class="text-gray-400 text-xl animate-pulse"
            />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ __('Loading comments...', 'flexify-dashboard') }}
          </p>
        </div>

        <div v-else-if="filteredComments.length === 0" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="comment" class="text-gray-400 text-xl" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {{
              searchQuery || statusFilter !== 'all'
                ? __('No comments found', 'flexify-dashboard')
                : __('No comments yet', 'flexify-dashboard')
            }}
          </p>
        </div>

        <CommentList
          v-else
          :comments="filteredComments"
          :selected-comments="selectedComments"
          @select-comment="selectCommentItem"
          @toggle-selection="toggleCommentSelection"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 h-full max-h-full overflow-auto"
    >
      <div
        class="flex-1 flex items-center justify-center"
        v-if="!route.params.commentId"
      >
        <div class="text-center">
          <div
            class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <AppIcon icon="comment" class="text-2xl text-gray-400" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {{ __('Comment Details', 'flexify-dashboard') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {{
              __(
                'Select a comment from the list to view details and edit properties.',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>
      </div>

      <CommentDetailsView
        v-else-if="route.params.commentId && windowWidthComputed > 1024"
      />

      <Drawer
        v-else-if="route.params.commentId && windowWidthComputed <= 1024"
        v-model="drawerOpen"
        size="full"
        :show-header="false"
        :show-close-button="false"
        :close-on-overlay-click="true"
        :close-on-escape="true"
        @close="router.push('/')"
      >
        <CommentDetailsView />
      </Drawer>
    </div>

    <!-- Floating Action Panel -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="hasSelection"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-4"
      >
        <!-- Selection Count -->
        <div
          class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          {{ selectedCountText }}
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <!-- View Button -->
          <button
            @click="viewSelectedComment"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            :title="__('View', 'flexify-dashboard')"
          >
            <AppIcon icon="visibility" class="text-lg" />
          </button>

          <!-- Approve Button -->
          <button
            @click="handleBatchStatusUpdate('approved')"
            class="p-2 rounded-lg hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors text-success-600 dark:text-success-400 hover:text-success-700 dark:hover:text-success-300"
            :title="__('Approve', 'flexify-dashboard')"
          >
            <AppIcon icon="check_circle" class="text-lg" />
          </button>

          <!-- Spam Button -->
          <button
            @click="handleBatchStatusUpdate('spam')"
            class="p-2 rounded-lg hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300"
            :title="__('Mark as Spam', 'flexify-dashboard')"
          >
            <AppIcon icon="report" class="text-lg" />
          </button>

          <!-- Trash Button -->
          <button
            @click="handleBatchStatusUpdate('trash')"
            class="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
            :title="__('Trash', 'flexify-dashboard')"
          >
            <AppIcon icon="delete" class="text-lg" />
          </button>

          <!-- Delete Button -->
          <button
            @click="handleBatchDelete"
            class="p-2 rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
            :title="__('Delete Permanently', 'flexify-dashboard')"
          >
            <AppIcon icon="delete_forever" class="text-lg" />
          </button>

          <!-- Clear Selection Button -->
          <button
            @click="clearSelection"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            :title="__('Clear selection', 'flexify-dashboard')"
          >
            <AppIcon icon="close" class="text-lg" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- Confirm Dialog -->
    <Confirm ref="confirmDialog" />
  </div>
</template>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>

<style>
#wpbody,
#wpcontent {
  padding: 0 !important;
}

html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}
</style>
