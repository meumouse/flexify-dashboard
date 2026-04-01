<script setup>
import {
  ref,
  watch,
  nextTick,
  computed,
  watchEffect,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  defineEmits,
} from 'vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { useDarkMode } from './src/useDarkMode.js';
import { fetchPostsData } from './src/fetchPostsData.js';
import { batchDuplicatePosts, duplicating } from './src/batchDuplicatePosts.js';
import { batchDeletePosts, deleting } from './src/batchDeletePosts.js';
import { batchPublishPosts, publishing } from './src/batchPublishPosts.js';
import { inlineTitleUpdate } from './src/inlineTitleUpdate.js';
import { updatePostAuthor } from './src/updatePostAuthor.js';
import { updatePostStatus } from './src/updatePostStatus.js';
import { returnPostData } from './src/returnPostData.js';
const { isDark } = useDarkMode();

// Comps
import Notifications from '@/components/utility/notifications/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import AppTable from '@/components/utility/table/index.vue';
import PostActionList from './src/post-actions.vue';
import InlineUserSelect from './src/inline-user-select.vue';
import InlineStatusSelect from './src/inline-status-select.vue';
import InlineImageSelect from './src/inline-image-select.vue';
import BatchEdit from './src/batch-edit.vue';
import TableFilters from './src/table-filters.vue';
import PostsList from './src/posts-list.vue';
import PostPreview from './src/post-preview.vue';

// Shared constants
import {
  selected,
  posts,
  loading,
  pagination,
  filterOptions,
  activeFilter,
  columns,
  column_classes,
  custom_styles,
  currentPostType,
  confirm,
  rowActions,
  suppresedLoading,
  openPostParents,
  expandAllChildren,
} from './src/constants.js';

// Set post type
const urlParams = new URLSearchParams(window.location.search);
const queryPostType = urlParams.get('post_type');
currentPostType.value = appStore.state.postTypes['post'];

if (queryPostType) {
  currentPostType.value = appStore.state.postTypes[queryPostType]
    ? appStore.state.postTypes[queryPostType]
    : currentPostType.value;
}

pagination.value.post_type = currentPostType.value.name;

// Ordering for pages
if (pagination.value.post_type === 'page') {
  pagination.value.orderby = 'title';
  pagination.value.order = 'ASC';
}

// Refs
const adoptedStyleSheets = ref(new CSSStyleSheet());
const postActions = ref([]);
const teleportArea = ref(false);

/**
 * Get initial view mode from localStorage or default to 'table'
 */
const getInitialViewMode = () => {
  if (typeof window === 'undefined') return 'table';
  try {
    const saved = localStorage.getItem('flexify-dashboard-posts-view-mode');
    return saved === 'sidebar' || saved === 'table' ? saved : 'table';
  } catch (e) {
    return 'table';
  }
};

const viewMode = ref(getInitialViewMode()); // 'table' or 'sidebar'
const selectedPostId = ref(null);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);

const postsAndChildrenCount = computed(() => {
  const countPosts = (postsArray) => {
    let count = 0;

    postsArray.forEach((post) => {
      // Count the current post
      count++;

      // If post has children, recursively count them
      if (post.children?.length > 0) {
        count += countPosts(post.children);
      }
    });

    return count;
  };

  return countPosts(posts.value);
});

/**
 * Computed property that returns formatted column configurations
 * @computed returnColumns
 * @returns {Array<Object>} Array of column objects with formatting and display properties
 * @property {string} key - Column identifier
 * @property {string} label - Display label for the column
 * @property {boolean} active - Whether the column is active
 * @property {string} classes - CSS classes for the column
 * @property {string} column_classes - Additional CSS classes from column_classes ref
 * @property {string} sort_key - Key used for sorting the column
 */
const returnColumns = computed(() =>
  columns.value
    .filter(({ key }) => key !== 'cb')
    .map(({ key, label, active, sort_key }) => ({
      key,
      label,
      active,
      sort_key,
      classes: `${key} column-${key}`,
      column_classes: column_classes.value?.[key]?.join(' ') ?? '',
    }))
);

/**
 * Handles opening a post with different behaviors based on modifier keys
 * @function openPost
 * @param {Event} evt - The click event
 * @param {number} index - Index of the post in the posts array
 */
const openPost = (evt, index) => {
  const postItem = posts.value[index];
  if (!postItem) return;

  const url = postItem.is_editable ? postItem.edit_url : postItem.view_url;

  // Handle different click types
  if (evt.metaKey || evt.ctrlKey) {
    // Command/Control click -> Open in new tab
    window.open(url, '_blank');
  } else if (evt.shiftKey) {
    // Shift click -> select post
    if (selected.value.includes(postItem.id)) {
      const selectedIndex = selected.value.findIndex(
        (item) => item == postItem.id
      );
      selected.value.splice(selectedIndex, 1);
    } else {
      selected.value.push(postItem.id);
    }
  } else if (evt.altKey) {
    // Alt click -> Open in new tab in background (where supported)
    window.open(url, '_blank').blur();
    window.focus();
  } else {
    // Normal click -> Open in same tab
    window.location.href = url;
  }
};

/**
 * Handles selecting a post in sidebar view
 * @function selectPost
 * @param {Object} post - The post object
 */
const selectPost = (post) => {
  if (!post) return;
  selectedPostId.value = post.id;
};

/**
 * Handles toggle selection for sidebar view
 * @function togglePostSelection
 * @param {Object} post - The post object
 * @param {Event} event - The click event
 */
const togglePostSelection = (post, event) => {
  if (!post) return;
  const currentIndex = returnPostData.value.findIndex((p) => p.id === post.id);

  // Handle shift+click for range selection
  if (event?.shiftKey && selected.value.length > 0) {
    const lastSelectedId = selected.value[selected.value.length - 1];
    const lastSelectedIndex = returnPostData.value.findIndex(
      (p) => p.id === lastSelectedId
    );

    if (lastSelectedIndex !== -1) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);

      const rangeItems = returnPostData.value.slice(start, end + 1);
      const rangeIds = rangeItems.map((p) => p.id);

      rangeIds.forEach((id) => {
        if (!selected.value.includes(id)) {
          selected.value.push(id);
        }
      });
    }
  } else {
    // Normal toggle behavior
    const index = selected.value.findIndex((id) => id === post.id);
    if (index > -1) {
      selected.value.splice(index, 1);
    } else {
      selected.value.push(post.id);
    }
  }
};

/**
 * Save view mode to localStorage
 */
const saveViewMode = (mode) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('flexify-dashboard-posts-view-mode', mode);
  } catch (e) {
    // Ignore localStorage errors (e.g., in private browsing)
    console.warn('Failed to save view mode to localStorage:', e);
  }
};

/**
 * Handle view mode change
 */
const handleViewModeChange = (mode) => {
  viewMode.value = mode;
  saveViewMode(mode);
};

/**
 * Handle window resize
 */
const handleResize = () => {
  windowWidth.value = window.innerWidth;
  // Auto-switch to table view on mobile
  if (windowWidth.value < 1024 && viewMode.value === 'sidebar') {
    handleViewModeChange('table');
  }
};

/**
 * Navigates to the first page of posts and fetches data
 * @function handleFirstPage
 */
const handleFirstPage = () => {
  pagination.value.page = 1;
  fetchPostsData(true);
};

/**
 * Navigates to the previous page of posts and fetches data
 * @function handlePreviousPage
 */
const handlePreviousPage = () => {
  if (pagination.value.page > 1) {
    pagination.value.page--;
    fetchPostsData(true);
  }
};

/**
 * Navigates to the next page of posts and fetches data
 * @function handleNextPage
 */
const handleNextPage = () => {
  if (pagination.value.page < pagination.value.pages) {
    pagination.value.page++;
    fetchPostsData(true);
  }
};

/**
 * Navigates to the last page of posts and fetches data
 * @function handleLastPage
 */
const handleLastPage = () => {
  pagination.value.page = pagination.value.pages;
  fetchPostsData(true);
};

/**
 * Computed property that returns the post type query parameter if it exists
 * @computed maybeReturnPostType
 * @returns {string} Query string with post type or empty string
 */
const maybeReturnPostType = computed(() => {
  return queryPostType ? `?post_type=${queryPostType}` : '';
});

const handleRightClick = (evt, index) => {
  const currentPost = posts.value[index];
  if (!currentPost) return;

  rowActions.value[currentPost.id].show(evt);
};

const setRowActions = (el, index, postID) => {
  if (el) {
    rowActions.value[postID] = el;
  }
};

/**
 * Updates URL parameters based on the active filter and triggers data fetch
 * @returns {Promise<void>}
 */
const handleFilterChange = async () => {
  // Reset pagination to first page
  pagination.value.page = 1;

  // Create URL object for manipulation
  const url = new URL(window.location);
  url.search = ''; // Clear existing search params

  if (
    activeFilter.value !== 'all' &&
    filterOptions.value?.[activeFilter.value]
  ) {
    await updateUrlWithFilterParams(url);
  }

  // Update browser history
  updateBrowserHistory(url);

  // Wait for Vue to update the DOM
  await nextTick();

  // Fetch new data
  return fetchPostsData();
};

/**
 * Updates URL with filter parameters
 * @param {URL} url - URL object to update
 * @returns {Promise<void>}
 */
const updateUrlWithFilterParams = async (url) => {
  const active_view = filterOptions.value[activeFilter.value];
  if (!active_view?.query_params) return;

  // Create a new URLSearchParams object with the query parameters
  const params = new URLSearchParams();

  Object.entries(active_view.query_params).forEach(([key, value]) => {
    const paramValue = Array.isArray(value) ? value.join(',') : value;
    params.set(key, paramValue);
  });

  url.search = params.toString();
};

/**
 * Updates browser history with new URL
 * @param {URL} url - URL to update history with
 */
const updateBrowserHistory = (url) => {
  window.history.replaceState(
    {
      path: url.toString(),
    },
    '',
    url
  );
};

const postExpanded = (post) => {
  return openPostParents.value.includes(post.id);
};

const togglePostExpanded = (post) => {
  const isOpen = postExpanded(post);

  if (isOpen) {
    const foundIndex = openPostParents.value.findIndex((id) => id == post.id);
    openPostParents.value.splice(foundIndex, 1);
  } else {
    openPostParents.value.push(post.id);
  }
};

const returnChildLength = (post) => {
  // If the object is null or undefined, return 0
  if (!post) return 0;

  // If there are no children, return 0
  if (!post.children || !Array.isArray(post.children)) return 0;

  // Count immediate children
  let count = post.children.length;

  // Recursively count children of each child
  for (const child of post.children) {
    count += returnChildLength(child);
  }

  return count;
};

/**
 * Watch effect for pagination search changes
 * Fetches posts data when search is cleared
 */
watch(
  () => pagination.value.search,
  (newVal, oldVal) => {
    if (!newVal && oldVal) {
      fetchPostsData();
    }
  }
);

/**
 * Watch effects for various pagination properties
 * Each triggers a fetch of posts data when changed
 */
watch(() => pagination.value.per_page, fetchPostsData);
watch(() => pagination.value.order, fetchPostsData);
watch(() => pagination.value.orderby, fetchPostsData);
watch(() => pagination.value.dateRange, fetchPostsData);
watch(() => pagination.value.categories, fetchPostsData);
watch(() => activeFilter.value, handleFilterChange);

/**
 * Watch view mode changes and save to localStorage
 */
watch(
  () => viewMode.value,
  (newMode) => {
    saveViewMode(newMode);
  }
);

onMounted(() => {
  windowWidth.value = window.innerWidth;
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

fetchPostsData();
</script>

<template>
  <component is="style"> html{font-size:14px;}#wpcontent{padding:0}</component>
  <div tag="div" class="flexify-dashboard-isolation">
    <Notifications />

    <template v-for="item in custom_styles">
      <link
        rel="stylesheet"
        :id="`${item.handle}-css`"
        :href="item.src"
        media="all"
      />
    </template>

    <Teleport to="body" v-if="viewMode === 'sidebar'">
      <component is="style">
        #wpcontent{ background: rgb(var(--fd-base-50) / var(--tw-bg-opacity,
        1)) !important; border: none !important; } .dark #wpcontent{ background:
        rgb(var(--fd-base-950) / var(--tw-bg-opacity, 1)) !important; }
      </component>
    </Teleport>

    <!-- Sidebar View -->
    <div
      v-if="viewMode === 'sidebar'"
      class="overflow-hidden flexify-dashboard-normalize font-sans h-[var(--fd-body-height)] max-h-[var(--fd-body-height)]"
      :class="isDark ? 'dark' : ''"
      id="flexify-dashboard-posts-wrap"
    >
      <div
        class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0"
      >
        <!-- Posts List Sidebar -->
        <div
          class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
        >
          <!-- Header -->
          <div class="px-6 pt-6 pb-4">
            <div class="flex items-center justify-between mb-4">
              <h1 class="text-xl font-medium text-zinc-900 dark:text-zinc-100">
                {{ currentPostType?.labels?.name || __('Posts', 'flexify-dashboard') }}
              </h1>
              <div class="flex items-center gap-2">
                <!-- View Mode Toggle -->
                <button
                  @click="handleViewModeChange('table')"
                  :class="[
                    'p-2 rounded-md transition-colors',
                    'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  ]"
                  :title="__('Table View', 'flexify-dashboard')"
                >
                  <AppIcon
                    icon="table_chart"
                    class="text-sm text-zinc-600 dark:text-zinc-400"
                  />
                </button>
                <a
                  :href="`${appStore.state.adminUrl}post-new.php${maybeReturnPostType}`"
                  :title="__('New post', 'flexify-dashboard')"
                >
                  <AppButton type="primary" class="text-sm">
                    <AppIcon icon="add" class="text-base" />
                  </AppButton>
                </a>
              </div>
            </div>

            <!-- Search Bar -->
            <div class="relative">
              <AppIcon
                icon="search"
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-base pointer-events-none"
              />
              <input
                :value="pagination.search"
                @input="
                  (e) => {
                    pagination.search = e.target.value;
                    fetchPostsData();
                  }
                "
                type="text"
                :placeholder="
                  currentPostType?.labels?.search_items ||
                  __('Search posts...', 'flexify-dashboard')
                "
                class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
              />
            </div>
          </div>

          <!-- Filter Pills -->
          <div class="px-6 pb-3">
            <div class="flex items-center gap-2">
              <!-- Status Filter Pills -->
              <div
                class="flex-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar"
              >
                <button
                  v-for="(option, key) in filterOptions"
                  :key="key"
                  @click="activeFilter = key"
                  :class="[
                    'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                    activeFilter === key
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  ]"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Results Count -->
          <div
            class="flex flex-row place-content-between items-center px-6 pr-4 pb-3"
          >
            <div
              class="py-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500"
            >
              {{ pagination.total }}
              {{
                pagination.total === 1
                  ? __('item', 'flexify-dashboard')
                  : __('items', 'flexify-dashboard')
              }}
            </div>

            <div class="flex flex-row items-center">
              <div class="text-xs text-zinc-500 dark:text-zinc-500 mr-2">
                {{ __('Page', 'flexify-dashboard') }} {{ pagination.page }}
                <span v-if="pagination.pages > 0">
                  / {{ pagination.pages }}
                </span>
              </div>
              <AppButton
                type="transparent"
                :disabled="pagination.page <= 1"
                @click="handlePreviousPage"
                :title="__('Previous', 'flexify-dashboard')"
              >
                <AppIcon icon="chevron_left" />
              </AppButton>
              <AppButton
                type="transparent"
                :disabled="pagination.page >= pagination.pages"
                @click="handleNextPage"
                :title="__('Next', 'flexify-dashboard')"
              >
                <AppIcon icon="chevron_right" />
              </AppButton>
            </div>
          </div>

          <!-- Posts List -->
          <div class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar relative">
            <div v-if="loading && !posts.length" class="p-8 text-center">
              <div
                class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <AppIcon
                  icon="article"
                  class="text-zinc-400 text-xl animate-pulse"
                />
              </div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">
                {{ __('Loading posts...', 'flexify-dashboard') }}
              </p>
            </div>

            <div
              v-else-if="returnPostData.length === 0"
              class="p-8 text-center"
            >
              <div
                class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <AppIcon icon="article" class="text-zinc-400 text-xl" />
              </div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                {{ __('No posts found', 'flexify-dashboard') }}
              </p>
              <a
                :href="`${appStore.state.adminUrl}post-new.php${maybeReturnPostType}`"
                :title="__('New post', 'flexify-dashboard')"
              >
                <AppButton type="primary" class="text-sm mt-4">
                  {{
                    currentPostType?.labels?.new_item ||
                    __('Add new', 'flexify-dashboard')
                  }}
                </AppButton>
              </a>
            </div>

            <PostsList
              v-else
              :posts="returnPostData"
              :selected-posts="selected"
              :selected-post-id="selectedPostId"
              @select-post="selectPost"
              @toggle-selection="togglePostSelection"
            />
          </div>
        </div>

        <!-- Right Content Area -->
        <div
          class="flex-1 flex flex-col rounded-l-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
        >
          <PostPreview
            :post="returnPostData.find((p) => p.id === selectedPostId) || null"
            @updated="fetchPostsData"
          />
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div
      v-else
      class="@container flexify-dashboard-normalize font-sans dark:bg-zinc-900 bg-white p-6 flex flex-col gap-6 text-zinc-500 dark:text-zinc-400"
      style="min-height: calc(100dvh - var(--wp-admin--admin-bar--height))"
      :class="isDark ? 'dark' : ''"
      id="flexify-dashboard-posts-wrap"
    >
      <div
        class="flex flex-row place-content-between col-span-3 items-center mb-6"
      >
        <div class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {{ currentPostType?.labels?.name || __('Posts', 'flexify-dashboard') }}
        </div>
      </div>

      <div class="flex flex-row place-content-between items-center">
        <AppToggle
          :options="filterOptions"
          v-model="activeFilter"
          class="w-auto"
          style="width: auto"
        />
        <div class="flex items-center gap-2">
          <!-- View Mode Toggle -->
          <button
            @click="
              handleViewModeChange(viewMode === 'table' ? 'sidebar' : 'table')
            "
            :class="[
              'p-2 rounded-md transition-colors',
              'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            ]"
            :title="
              viewMode === 'table'
                ? __('Sidebar View', 'flexify-dashboard')
                : __('Table View', 'flexify-dashboard')
            "
          >
            <AppIcon
              :icon="viewMode === 'table' ? 'view_list' : 'table_chart'"
              class="text-sm text-zinc-600 dark:text-zinc-400"
            />
          </button>
        </div>
      </div>

      <AppTable
        :pagination="pagination"
        :columns="returnColumns"
        :data="returnPostData"
        :fetching="loading"
        :searchPlaceHolder="
          currentPostType?.labels?.search_items ||
          __('Search posts', 'flexify-dashboard')
        "
        :rowClick="openPost"
        v-model:selected="selected"
        :rowRightClick="handleRightClick"
        @search="fetchPostsData"
        @previous="handlePreviousPage"
        @next="handleNextPage"
        @first="handleFirstPage"
        @last="handleLastPage"
      >
        <!--Filters-->
        <template v-slot:right-actions>
          <div class="flex flex-row gap-3 items-stretch">
            <BatchEdit
              :selected="selected"
              :fetchPostsData="fetchPostsData"
              :postType="currentPostType"
            />

            <TableFilters />

            <a
              :href="`${appStore.state.adminUrl}post-new.php${maybeReturnPostType}`"
              :title="__('New post', 'flexify-dashboard')"
            >
              <AppButton type="primary" @click="newMenu" class="text-sm">{{
                currentPostType?.labels?.new_item || __('Add new', 'flexify-dashboard')
              }}</AppButton>
            </a>
          </div>
        </template>

        <!-- Empty slot-->
        <template v-slot:empty>
          <div class="flex flex-col gap-2 p-12 items-center">
            <AppIcon icon="folder_open" style="font-size: 60px" />
            <div class="font-bold text-xl text-zinc-900 dark:text-zinc-100">
              {{ __('Nothing found', 'flexify-dashboard') }}
            </div>
            <div class="text-zinc-400 mb-6">
              {{
                __(
                  'When you create new items they will show up here.',
                  'flexify-dashboard'
                )
              }}
            </div>
            <a
              :href="`${appStore.state.adminUrl}post-new.php${maybeReturnPostType}`"
              :title="__('New post', 'flexify-dashboard')"
            >
              <AppButton type="primary" @click="newMenu" class="text-sm">{{
                currentPostType?.labels?.new_item || __('Add new', 'flexify-dashboard')
              }}</AppButton>
            </a>
          </div>
        </template>

        <!-- Table slots -->
        <template
          v-for="(item, index) in returnColumns"
          v-slot:[`row-${item.key}`]="{ row }"
          :key="item.key"
        >
          <div v-if="item.key === 'post_actions'">
            <PostActionList
              :ref="(el) => setRowActions(el, index, row.id)"
              :post="row"
              :data-id="row.id"
            />
          </div>

          <div v-else-if="item.key === 'date'">
            <div class="text-sm whitespace-nowrap" v-html="row[item.key]"></div>
          </div>

          <div v-else-if="item.key === 'status'">
            <InlineStatusSelect
              v-model="row[item.key]"
              :post="row"
              @updated="(d) => updatePostStatus(row, d)"
            />
          </div>

          <InlineUserSelect
            v-else-if="item.key === 'author'"
            :post="row"
            v-model="row[item.key]"
            @updated="updatePostAuthor(row)"
          />

          <div
            v-else-if="item.key == 'title'"
            class="flex flex-row items-center gap-4 relative"
            :style="`padding-left:${row.depth * 32}px`"
          >
            <AppButton
              type="transparent"
              @click.stop="togglePostExpanded(row)"
              :disabled="!row.children.length"
              :class="!row.children.length ? 'opacity-0' : ''"
              class="text-lg"
              v-if="
                currentPostType?.name == 'page' &&
                posts.length + 1 <= postsAndChildrenCount
              "
            >
              <AppIcon
                :icon="
                  postExpanded(row) || expandAllChildren
                    ? 'expand_more'
                    : 'chevron_right'
                "
              />
            </AppButton>

            <div
              v-if="row.depth && !row.children.length"
              class="h-full border-r border-zinc-200 dark:border-zinc-700 absolute translate-x-6"
            ></div>
            <InlineImageSelect
              v-model="row[item.key]"
              :post="row"
              :teleportArea="teleportArea"
            />
            <div class="flex flex-col">
              <div
                @click.stop
                class=""
                v-html="row[item.key].value"
                :contenteditable="true"
                @blur="inlineTitleUpdate($event, row.id)"
                @keydown.prevent.enter="$event.target.blur()"
              ></div>
              <div
                v-if="returnChildLength(row) > 1"
                class="text-sm text-zinc-500 font-normal"
              >
                {{
                  sprintf(
                    __('%s child items', 'flexify-dashboard'),
                    returnChildLength(row)
                  )
                }}
              </div>
              <div
                v-if="returnChildLength(row) === 1"
                class="text-sm text-zinc-500 font-normal"
              >
                {{
                  sprintf(
                    __('%s child item', 'flexify-dashboard'),
                    returnChildLength(row)
                  )
                }}
              </div>
            </div>
          </div>

          <div
            v-else-if="Array.isArray(row[item.key])"
            class="flex flex-wrap gap-1.5"
          >
            <template v-for="tag in row[item.key]" :key="tag.id">
              <a
                @click.stop
                :href="tag.url"
                :title="tag.title"
                :data-id="tag.id"
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all duration-200 hover:scale-105"
                :class="
                  item.key === 'categories'
                    ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900 dark:border-brand-800'
                    : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900 dark:border-brand-800'
                "
                v-html="tag.title"
              />
            </template>
          </div>

          <div class="" v-html="row[item.key]" v-else></div>
        </template>
      </AppTable>

      <Confirm ref="confirm" />

      <div ref="teleportArea"></div>
    </div>

    <!-- Batch Actions Panel (shown in both sidebar and table views) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="selected.length" :class="isDark ? 'dark' : ''">
        <div
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[101] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg px-4 py-3 flex items-center gap-4"
        >
          <div
            class="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
          >
            {{ selected.length }}
            {{
              selected.length === 1
                ? __('item selected', 'flexify-dashboard')
                : __('items selected', 'flexify-dashboard')
            }}
          </div>

          <div class="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>

          <div class="flex items-center gap-2">
            <AppButton
              type="transparent"
              @click="batchPublishPosts"
              :loading="publishing"
              :title="__('Publish items', 'flexify-dashboard')"
            >
              <AppIcon icon="publish" class="text-lg" />
            </AppButton>

            <AppButton
              type="transparent"
              @click="batchDuplicatePosts"
              :loading="duplicating"
              :title="__('Duplicate items', 'flexify-dashboard')"
            >
              <AppIcon icon="copy" class="text-lg" />
            </AppButton>

            <AppButton
              type="transparent"
              @click="batchDeletePosts"
              :loading="deleting"
              :title="__('Delete items', 'flexify-dashboard')"
            >
              <AppIcon icon="delete" class="text-rose-600 text-lg" />
            </AppButton>

            <AppButton type="transparent" @click="selected = []">
              <AppIcon icon="close" class="text-lg" />
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
@reference "@/assets/css/tailwind.css";

tbody .column-title {
  @apply text-zinc-900 dark:text-zinc-100 font-semibold;
}

.fd-comment-count {
  @apply text-sm bg-brand-500 dark:bg-brand-600/30 rounded border border-brand-600 px-1 text-zinc-100;
}

html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}

#wpbody-content {
  padding: 0;
}

#wpcontent {
  padding: 0 !important;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
