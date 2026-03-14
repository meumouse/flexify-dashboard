<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ShadowRoot } from 'vue-shadow-dom';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { generatePassword } from '@/assets/js/functions/generatePassword.js';
import { validatePassword } from '@/assets/js/functions/validatePassword.js';
import { useDarkMode } from './useDarkMode.js';
import Drawer from '@/components/utility/drawer/index.vue';
const { isDark } = useDarkMode();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppTextArea from '@/components/utility/text-area/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import TagInput from '@/components/utility/tag-input/index.vue';
import UserList from './user-list.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import Select from '@/components/utility/select/index.vue';
import UserImport from './user-import.vue';
import { exportUsersToCSV } from '@/assets/js/functions/exportUsersToCSV.js';

const router = useRouter();
const route = useRoute();

// Refs
const adoptedStyleSheets = ref(new CSSStyleSheet());
const loading = ref(false);
const users = ref([]);
const filteredUsers = ref([]);
const searchQuery = ref('');
const roleFilter = ref('all'); // 'all' or specific role slug
const sortBy = ref('name'); // 'name', 'email', 'registered', 'role'
const sortOrder = ref('asc'); // 'asc' or 'desc'
const filtersExpanded = ref(false);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const drawerOpen = ref(false);
const createUserDrawerOpen = ref(false);
const allRoles = ref([]);
const selectedUsers = ref([]); // Array of selected user IDs
const lastSelectedIndex = ref(null); // Index of last selected user item for range selection
const confirmDialog = ref(null); // Ref for confirm component
const bulkEditDrawerOpen = ref(false); // Bulk edit drawer state
const isBulkEditing = ref(false); // Bulk edit saving state
const bulkEditForm = ref({
  name: '',
  email: '',
  roles: [],
  description: '',
});
const importDrawerOpen = ref(false);
const exportDrawerOpen = ref(false);
const exportCustomFieldsText = ref('');
const isExporting = ref(false);
const pagination = ref({
  page: 1,
  per_page: 30,
  total: 0,
  totalPages: 0,
  search: '',
  order: 'asc',
  orderby: 'name',
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

// Active filter count
const activeFiltersCount = computed(() => {
  let count = 0;
  if (roleFilter.value !== 'all') count++;
  return count;
});

const goPrevPage = async () => {
  if (!canGoPrev.value) return;
  pagination.value.page -= 1;
  await getUsersData();
};

const goNextPage = async () => {
  if (!canGoNext.value) return;
  pagination.value.page += 1;
  await getUsersData();
};

/**
 * Fetches users data from WordPress REST API
 */
const getUsersData = async () => {
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

  // Add role filter if not 'all'
  if (roleFilter.value !== 'all') {
    params.roles = roleFilter.value;
  }

  const args = {
    endpoint: 'wp/v2/users',
    params,
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data) return;

  users.value = data.data.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    username: item.slug,
    roles: item.roles || [],
    registered: item.registered_date,
    avatar_url: item.avatar_urls?.['96'] || '',
    url: item.url || '',
    description: item.description || '',
    link: item.link || '',
    first_name: item.meta?.first_name || '',
    last_name: item.meta?.last_name || '',
  }));

  pagination.value.total = data.totalItems;
  pagination.value.totalPages = data.totalPages;

  applyFilters();
};

/**
 * Fetch all available roles
 */
const fetchAllRoles = async () => {
  try {
    const data = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/user-roles',
    });

    if (data?.data) {
      allRoles.value = data.data;
    }
  } catch (error) {
    console.error('Failed to fetch roles:', error);
  }
};

/**
 * Handle user item selection - navigate to details
 */
const selectUserItem = (item) => {
  router.push({ name: 'user-details', params: { userId: item.id } });
};

/**
 * Handle user checkbox selection
 */
const toggleUserSelection = (item, event) => {
  const currentIndex = filteredUsers.value.findIndex(
    (user) => user.id === item.id
  );

  // Handle shift+click for range selection
  if (event?.shiftKey && lastSelectedIndex.value !== null) {
    const start = Math.min(lastSelectedIndex.value, currentIndex);
    const end = Math.max(lastSelectedIndex.value, currentIndex);

    // Get all items in the range
    const rangeItems = filteredUsers.value.slice(start, end + 1);
    const rangeIds = rangeItems.map((user) => user.id);

    // Add all items in range to selection (avoid duplicates)
    rangeIds.forEach((id) => {
      if (!selectedUsers.value.includes(id)) {
        selectedUsers.value.push(id);
      }
    });

    // Update last selected index
    lastSelectedIndex.value = currentIndex;
  } else {
    // Normal toggle behavior
    const index = selectedUsers.value.findIndex((id) => id === item.id);
    if (index > -1) {
      selectedUsers.value.splice(index, 1);
    } else {
      selectedUsers.value.push(item.id);
    }

    // Update last selected index
    lastSelectedIndex.value = currentIndex;
  }
};

/**
 * Check if user item is selected
 */
const isUserSelected = (item) => {
  return selectedUsers.value.includes(item.id);
};

/**
 * Computed property to check if there are selected items
 */
const hasSelection = computed(() => {
  return selectedUsers.value.length > 0;
});

/**
 * Get selected count text
 */
const selectedCountText = computed(() => {
  const count = selectedUsers.value.length;
  return count === 1
    ? __('1 user selected', 'flexify-dashboard')
    : __('%d users selected', 'flexify-dashboard').replace('%d', count);
});

/**
 * View first selected user item
 */
const viewSelectedUser = () => {
  if (selectedUsers.value.length === 0) return;
  const firstSelectedId = selectedUsers.value[0];
  router.push({ name: 'user-details', params: { userId: firstSelectedId } });
};

/**
 * Clear selection
 */
const clearSelection = () => {
  selectedUsers.value = [];
  lastSelectedIndex.value = null;
};

/**
 * Open bulk edit drawer
 */
const openBulkEdit = () => {
  bulkEditForm.value = {
    name: '',
    email: '',
    roles: [],
    description: '',
  };
  bulkEditDrawerOpen.value = true;
};

/**
 * Save bulk edit changes
 */
const saveBulkEdit = async () => {
  if (selectedUsers.value.length === 0) return;

  isBulkEditing.value = true;

  try {
    const updatePromises = selectedUsers.value.map(async (userId) => {
      const updateData = {};

      // Only include fields that have been changed
      if (bulkEditForm.value.name.trim()) {
        updateData.name = bulkEditForm.value.name.trim();
      }
      if (bulkEditForm.value.email.trim()) {
        updateData.email = bulkEditForm.value.email.trim();
      }
      if (bulkEditForm.value.description.trim()) {
        updateData.description = bulkEditForm.value.description.trim();
      }
      if (bulkEditForm.value.roles.length > 0) {
        updateData.roles = bulkEditForm.value.roles.map(
          (role) => role.slug || role
        );
      }

      // Skip if no changes
      if (Object.keys(updateData).length === 0) return;

      await lmnFetch({
        endpoint: `wp/v2/users/${userId}`,
        type: 'POST',
        data: updateData,
      });
    });

    await Promise.all(updatePromises);

    // Refresh users list
    await getUsersData();

    // Close drawer and clear selection
    bulkEditDrawerOpen.value = false;
    selectedUsers.value = [];
    lastSelectedIndex.value = null;

    notify({
      title: __('Users updated successfully', 'flexify-dashboard'),
      type: 'success',
    });
  } catch (error) {
    console.error('Bulk edit error:', error);
    notify({
      title: __('Error updating users', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isBulkEditing.value = false;
  }
};

/**
 * Handle user import completion
 */
const handleImportComplete = async () => {
  // Refresh users list after import
  await getUsersData();
};

/**
 * Export users to CSV
 */
const exportUsers = async () => {
  if (filteredUsers.value.length === 0) {
    notify({
      title: __('No users to export', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  isExporting.value = true;

  try {
    // Parse custom fields from textarea
    const customFields = exportCustomFieldsText.value
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f);

    // Fetch full user data including custom fields if needed
    const usersToExport = await Promise.all(
      filteredUsers.value.map(async (user) => {
        // If we need custom fields, fetch full user data
        if (customFields.length > 0) {
          try {
            const fullUser = await lmnFetch({
              endpoint: `wp/v2/users/${user.id}`,
              params: { context: 'edit' },
            });

            if (fullUser?.data) {
              // Extract custom meta fields
              const meta = {};
              customFields.forEach((field) => {
                meta[field] = fullUser.data.meta?.[field] || '';
              });

              return {
                ...user,
                meta,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch user ${user.id}:`, error);
          }
        }

        return user;
      })
    );

    // Export to CSV
    exportUsersToCSV(
      usersToExport,
      customFields,
      `users-export-${new Date().toISOString().split('T')[0]}`
    );

    notify({
      title: __('Export completed', 'flexify-dashboard'),
      message: __('%d users exported successfully', 'flexify-dashboard').replace(
        '%d',
        usersToExport.length
      ),
      type: 'success',
    });

    exportDrawerOpen.value = false;
  } catch (error) {
    console.error('Export error:', error);
    notify({
      title: __('Export failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isExporting.value = false;
  }
};

/**
 * Handle batch delete with confirmation
 */
const handleBatchDelete = async () => {
  if (selectedUsers.value.length === 0) return;

  const count = selectedUsers.value.length;
  const countText =
    count === 1
      ? __('this user', 'flexify-dashboard')
      : __('these %d users', 'flexify-dashboard').replace('%d', count);

  // Confirm user intent
  const userResponse = await confirmDialog.value.show({
    title: __('Are you sure?', 'flexify-dashboard'),
    message: __(
      'Are you sure you want to delete %s? This action cannot be undone.',
      'flexify-dashboard'
    ).replace('%s', countText),
    okButton: __('Yes, delete', 'flexify-dashboard'),
  });

  // User cancelled
  if (!userResponse) return;

  // Proceed with deletion
  await handleDelete(selectedUsers.value);
  clearSelection();
};

/**
 * Handle user deletion
 */
const handleDelete = async (userIds) => {
  loading.value = true;

  try {
    const deletePromises = userIds.map((id) =>
      lmnFetch({
        endpoint: `wp/v2/users/${id}`,
        type: 'DELETE',
        params: {
          force: true,
          reassign: 1, // Reassign posts to current user
        },
      })
    );

    await Promise.all(deletePromises);

    // Clear selection after deletion
    selectedUsers.value = [];
    lastSelectedIndex.value = null;

    notify({
      title: __('User deleted successfully!', 'flexify-dashboard'),
      type: 'success',
    });

    // Refresh users data from API
    await getUsersData();
  } catch (error) {
    notify({
      title: __('Delete failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

// Create user form state
const newUser = ref({
  username: '',
  email: '',
  password: '',
  name: '',
  website: '',
  description: '',
  roles: [],
  sendUserNotification: false,
});
const isCreatingUser = ref(false);
const passwordFocused = ref(false);
const passwordInputRef = ref(null);
const passwordValidationDropdownRef = ref(null);
const showPassword = ref(false);

/**
 * Computed property for password validation
 */
const passwordValidation = computed(() => {
  return validatePassword(newUser.value.password);
});

/**
 * Generates a strong password and sets it to the form
 */
const handleGeneratePassword = () => {
  newUser.value.password = generatePassword(16);
  notify({
    title: __('Password generated', 'flexify-dashboard'),
    type: 'success',
  });
};

/**
 * Handles password input focus
 */
const handlePasswordFocus = () => {
  passwordFocused.value = true;
};

/**
 * Handles password input blur
 */
const handlePasswordBlur = () => {
  // Delay to allow clicking on validation dropdown
  setTimeout(() => {
    // Check if focus moved to validation dropdown
    const activeElement = document.activeElement;
    if (
      passwordValidationDropdownRef.value &&
      passwordValidationDropdownRef.value.contains(activeElement)
    ) {
      return;
    }
    passwordFocused.value = false;
  }, 200);
};

/**
 * Toggles password visibility
 */
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

/**
 * Computed property to transform allRoles to TagInput format
 */
const availableRolesForTagInput = computed(() => {
  return allRoles.value.map((role) => ({
    id: role.value,
    name: role.label,
    slug: role.value,
  }));
});

/**
 * Computed property to get role slugs array for API
 */
const rolesForAPI = computed(() => {
  return newUser.value.roles.map((role) => role.slug);
});

/**
 * Handle create user
 */
const handleCreateUser = async () => {
  if (
    !newUser.value.username ||
    !newUser.value.email ||
    !newUser.value.password
  ) {
    notify({
      title: __('Please fill in all required fields', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  isCreatingUser.value = true;
  appStore.updateState('loading', true);

  const createData = {
    username: newUser.value.username,
    email: newUser.value.email,
    password: newUser.value.password,
    name: newUser.value.name || newUser.value.username,
    url: newUser.value.website || '',
    description: newUser.value.description || '',
    roles: rolesForAPI.value,
  };

  try {
    const args = {
      endpoint: 'wp/v2/users',
      type: 'POST',
      params: { context: 'edit' },
      data: createData,
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('User created successfully!', 'flexify-dashboard'),
        type: 'success',
      });

      // Reset form
      newUser.value = {
        username: '',
        email: '',
        password: '',
        name: '',
        website: '',
        description: '',
        roles: [],
        sendUserNotification: false,
      };
      showPassword.value = false;

      // Close drawer
      createUserDrawerOpen.value = false;

      // Refresh users list
      await getUsersData();

      // Navigate to the new user's details page
      router.push({ name: 'user-details', params: { userId: data.data.id } });
    }
  } catch (error) {
    notify({
      title: __('Failed to create user', 'flexify-dashboard'),
      message: error?.message || __('An error occurred', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isCreatingUser.value = false;
    appStore.updateState('loading', false);
  }
};

/**
 * Apply filters and sorting to users
 */
const applyFilters = () => {
  let filtered = [...users.value];

  // Filter by role
  if (roleFilter.value !== 'all') {
    filtered = filtered.filter((user) => user.roles.includes(roleFilter.value));
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
    );
  }

  // Sort items
  filtered.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy.value) {
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'registered':
        aValue = new Date(a.registered);
        bValue = new Date(b.registered);
        break;
      case 'role':
        aValue = a.roles[0] || '';
        bValue = b.roles[0] || '';
        break;
      case 'name':
      default:
        aValue = a.name || a.username;
        bValue = b.name || b.username;
        break;
    }

    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  filteredUsers.value = filtered;
};

/**
 * Injects styles into shadow root
 */
const setStyles = () => {
  let appStyleNode = document.querySelector('#flexify-dashboard-users-css');
  if (!appStyleNode) {
    appStyleNode = manuallyAddStyleSheet();
    appStyleNode.onload = () => {
      const appStyles = appStyleNode.sheet;
      for (const rule of [...appStyles.cssRules].reverse()) {
        adoptedStyleSheets.value.insertRule(rule.cssText);
      }
    };
  } else {
    const appStyles = appStyleNode.sheet;
    for (const rule of [...appStyles.cssRules].reverse()) {
      adoptedStyleSheets.value.insertRule(rule.cssText);
    }
  }
};

const manuallyAddStyleSheet = () => {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${appStore.state.pluginBase}app/dist/assets/styles/users.css`;
  document.head.appendChild(link);
  return link;
};

/**
 * Handle window resize
 */
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

// Watchers
watch([searchQuery, roleFilter, sortBy, sortOrder], () => {
  pagination.value.search = searchQuery.value;
  pagination.value.orderby = sortBy.value;
  pagination.value.order = sortOrder.value;
  pagination.value.page = 1; // Reset to first page when filters change
  getUsersData();
});

onMounted(() => {
  getUsersData();
  setStyles();
  fetchAllRoles();

  // Initialize window width
  windowWidth.value = window.innerWidth;

  // Add resize listener
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // Remove resize listener
  window.removeEventListener('resize', handleResize);
});

watch(
  () => route.params.userId,
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
    class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize"
    :class="isDark ? 'dark' : ''"
  >
    <!-- User List Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {{ __('Users', 'flexify-dashboard') }}
          </h1>
          <div class="flex items-center gap-2">
            <AppButton
              type="default"
              @click="importDrawerOpen = true"
              class="text-sm"
              :title="__('Import Users', 'flexify-dashboard')"
            >
              <AppIcon icon="upload_file" class="text-base" />
            </AppButton>
            <AppButton
              type="default"
              @click="exportDrawerOpen = true"
              class="text-sm"
              :title="__('Export Users', 'flexify-dashboard')"
            >
              <AppIcon icon="download" class="text-base" />
            </AppButton>
            <AppButton
              type="primary"
              @click="createUserDrawerOpen = true"
              class="text-sm"
            >
              <AppIcon icon="add" class="text-base" />
            </AppButton>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="relative">
          <AppIcon
            icon="search"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-base pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search users...', 'flexify-dashboard')"
            autocomplete="off"
            class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>
      </div>

      <!-- Compact Filter Bar -->
      <div class="px-6 py-3">
        <div class="flex items-center gap-2">
          <!-- Role Filter Pills -->
          <div
            class="flex-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar"
          >
            <button
              @click="roleFilter = 'all'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                roleFilter === 'all'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              {{ __('All', 'flexify-dashboard') }}
            </button>
            <button
              v-for="role in allRoles"
              :key="role.slug"
              @click="roleFilter = role.slug"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                roleFilter === role.slug
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              {{ role.label }}
            </button>
          </div>

          <!-- Sort & Filter Button -->
          <div class="flex items-center gap-1.5">
            <button
              @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
              class="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
            >
              <AppIcon
                :icon="sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'"
                class="text-sm text-zinc-600 dark:text-zinc-400"
              />
            </button>

            <button
              @click="filtersExpanded = !filtersExpanded"
              :class="[
                'relative p-2 rounded-md transition-colors',
                activeFiltersCount > 0 || filtersExpanded
                  ? 'bg-zinc-900 dark:bg-zinc-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              <AppIcon
                icon="tune"
                :class="[
                  'text-sm',
                  activeFiltersCount > 0 || filtersExpanded
                    ? 'text-white dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400',
                ]"
              />
              <span
                v-if="activeFiltersCount > 0"
                class="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center"
              >
                {{ activeFiltersCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- Expanded Filters Panel -->
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-96"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-96"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="filtersExpanded" class="mt-3 pt-3 space-y-3">
            <!-- Sort By Options -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
              >
                {{ __('Sort By', 'flexify-dashboard') }}
              </label>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="option in [
                    { value: 'name', label: 'Name', icon: 'person' },
                    { value: 'email', label: 'Email', icon: 'email' },
                    {
                      value: 'registered',
                      label: 'Registered',
                      icon: 'schedule',
                    },
                    { value: 'role', label: 'Role', icon: 'badge' },
                  ]"
                  :key="option.value"
                  @click="sortBy = option.value"
                  :class="[
                    'flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                    sortBy === option.value
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  ]"
                >
                  <AppIcon :icon="option.icon" class="text-sm" />
                  {{ __(option.label, 'flexify-dashboard') }}
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Results Count -->
      <div class="flex flex-row place-content-between items-center px-6 pr-4">
        <div
          class="py-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500"
        >
          {{ pagination.total }}
          {{
            pagination.total === 1
              ? __('user', 'flexify-dashboard')
              : __('users', 'flexify-dashboard')
          }}
        </div>

        <div class="flex flex-row items-center">
          <div class="text-xs text-zinc-500 dark:text-zinc-500 mr-2">
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

      <!-- User List -->
      <div class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar">
        <div v-if="loading && !users.length" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon
              icon="people"
              class="text-zinc-400 text-xl animate-pulse"
            />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Loading users...', 'flexify-dashboard') }}
          </p>
        </div>

        <div v-else-if="filteredUsers.length === 0" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="people" class="text-zinc-400 text-xl" />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {{
              searchQuery || roleFilter !== 'all'
                ? __('No users found', 'flexify-dashboard')
                : __('No users yet', 'flexify-dashboard')
            }}
          </p>
        </div>

        <UserList
          v-else
          :users="filteredUsers"
          :selected-users="selectedUsers"
          @select-user="selectUserItem"
          @toggle-selection="toggleUserSelection"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-l-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <RouterView key="user-details-content" v-slot="{ Component }">
        <div class="flex-1 flex items-center justify-center" v-if="!Component">
          <div class="text-center">
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon icon="people" class="text-2xl text-zinc-400" />
            </div>
            <h3
              class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
            >
              {{ __('User Details', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {{
                __(
                  'Select a user from the list to view details and edit properties.',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>
        </div>

        <component
          :is="Component"
          v-else-if="Component && windowWidthComputed > 1024"
        />

        <Drawer
          v-else-if="Component && windowWidthComputed <= 1024"
          v-model="drawerOpen"
          size="full"
          :show-header="false"
          :show-close-button="false"
          :close-on-overlay-click="true"
          :close-on-escape="true"
          @close="router.push('/')"
        >
          <component :is="Component" />
        </Drawer>
      </RouterView>
    </div>

    <!-- Create User Drawer -->
    <Drawer
      v-model="createUserDrawerOpen"
      :title="__('Create New User', 'flexify-dashboard')"
      size="large"
    >
      <div class="p-6 space-y-6 overflow-auto">
        <!-- Username -->
        <div>
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
          >
            {{ __('Username', 'flexify-dashboard') }} <span class="text-red-500">*</span>
          </label>
          <AppInput
            v-model="newUser.username"
            :placeholder="__('Username', 'flexify-dashboard')"
            autocomplete="off"
            required
          />
        </div>

        <!-- Email -->
        <div>
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
          >
            {{ __('Email', 'flexify-dashboard') }} <span class="text-red-500">*</span>
          </label>
          <AppInput
            v-model="newUser.email"
            type="email"
            :placeholder="__('user@example.com', 'flexify-dashboard')"
            autocomplete="off"
            required
          />
        </div>

        <!-- Password -->
        <div class="relative">
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
          >
            {{ __('Password', 'flexify-dashboard') }} <span class="text-red-500">*</span>
          </label>

          <!-- Password Validation Dropdown -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
          >
            <div
              v-if="passwordFocused && newUser.password"
              ref="passwordValidationDropdownRef"
              class="absolute bottom-full left-0 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 z-50 min-w-[280px]"
              @mousedown.prevent
            >
              <div
                class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2"
              >
                {{ __('Password Requirements', 'flexify-dashboard') }}
              </div>
              <div class="flex flex-col gap-2">
                <!-- Length Check -->
                <div class="flex items-center gap-2">
                  <AppIcon
                    :icon="passwordValidation.checks.length ? 'tick' : 'close'"
                    :class="[
                      'text-sm flex-shrink-0',
                      passwordValidation.checks.length
                        ? 'text-green-500'
                        : 'text-zinc-400',
                    ]"
                  />
                  <span
                    :class="[
                      'text-xs',
                      passwordValidation.checks.length
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-500 dark:text-zinc-400',
                    ]"
                  >
                    {{ __('At least 8 characters', 'flexify-dashboard') }}
                  </span>
                </div>

                <!-- Uppercase Check -->
                <div class="flex items-center gap-2">
                  <AppIcon
                    :icon="
                      passwordValidation.checks.uppercase ? 'tick' : 'close'
                    "
                    :class="[
                      'text-sm flex-shrink-0',
                      passwordValidation.checks.uppercase
                        ? 'text-green-500'
                        : 'text-zinc-400',
                    ]"
                  />
                  <span
                    :class="[
                      'text-xs',
                      passwordValidation.checks.uppercase
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-500 dark:text-zinc-400',
                    ]"
                  >
                    {{ __('One uppercase letter', 'flexify-dashboard') }}
                  </span>
                </div>

                <!-- Lowercase Check -->
                <div class="flex items-center gap-2">
                  <AppIcon
                    :icon="
                      passwordValidation.checks.lowercase ? 'tick' : 'close'
                    "
                    :class="[
                      'text-sm flex-shrink-0',
                      passwordValidation.checks.lowercase
                        ? 'text-green-500'
                        : 'text-zinc-400',
                    ]"
                  />
                  <span
                    :class="[
                      'text-xs',
                      passwordValidation.checks.lowercase
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-500 dark:text-zinc-400',
                    ]"
                  >
                    {{ __('One lowercase letter', 'flexify-dashboard') }}
                  </span>
                </div>

                <!-- Number Check -->
                <div class="flex items-center gap-2">
                  <AppIcon
                    :icon="passwordValidation.checks.number ? 'tick' : 'close'"
                    :class="[
                      'text-sm flex-shrink-0',
                      passwordValidation.checks.number
                        ? 'text-green-500'
                        : 'text-zinc-400',
                    ]"
                  />
                  <span
                    :class="[
                      'text-xs',
                      passwordValidation.checks.number
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-500 dark:text-zinc-400',
                    ]"
                  >
                    {{ __('One number', 'flexify-dashboard') }}
                  </span>
                </div>

                <!-- Special Character Check -->
                <div class="flex items-center gap-2">
                  <AppIcon
                    :icon="passwordValidation.checks.special ? 'tick' : 'close'"
                    :class="[
                      'text-sm flex-shrink-0',
                      passwordValidation.checks.special
                        ? 'text-green-500'
                        : 'text-zinc-400',
                    ]"
                  />
                  <span
                    :class="[
                      'text-xs',
                      passwordValidation.checks.special
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-500 dark:text-zinc-400',
                    ]"
                  >
                    {{ __('One special character', 'flexify-dashboard') }}
                  </span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Password Input with Inline Icons -->
          <div class="relative">
            <input
              ref="passwordInputRef"
              v-model="newUser.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="__('Password', 'flexify-dashboard')"
              autocomplete="new-password"
              required
              class="px-2 py-2 pr-20 border border-zinc-200 dark:border-zinc-700/40 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-indigo-300 dark:focus:outline-indigo-700 focus:shadow-xs text-sm bg-transparent"
              @focus="handlePasswordFocus"
              @blur="handlePasswordBlur"
            />
            <!-- Inline Action Buttons -->
            <div
              class="absolute top-0 right-0 h-full flex items-center gap-1 pr-2"
            >
              <!-- Generate Password Button -->
              <button
                type="button"
                @click="handleGeneratePassword"
                class="flex items-center justify-center p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded"
                :title="__('Generate strong password', 'flexify-dashboard')"
              >
                <AppIcon icon="refresh" class="text-lg" />
              </button>
              <!-- Password Visibility Toggle -->
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="flex items-center justify-center p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded"
                :title="
                  showPassword
                    ? __('Hide password', 'flexify-dashboard')
                    : __('Show password', 'flexify-dashboard')
                "
              >
                <AppIcon
                  :icon="showPassword ? 'visibility_off' : 'visibility'"
                  class="text-lg"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Name -->
        <div>
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
          >
            {{ __('Name', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="newUser.name"
            :placeholder="__('Display name', 'flexify-dashboard')"
            autocomplete="off"
          />
        </div>

        <!-- Website -->
        <div>
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
          >
            {{ __('Website', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="newUser.website"
            type="url"
            :placeholder="__('https://example.com', 'flexify-dashboard')"
            autocomplete="off"
          />
        </div>

        <!-- Biographical Info -->
        <div>
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
          >
            {{ __('Biographical Info', 'flexify-dashboard') }}
          </label>
          <AppTextArea
            v-model="newUser.description"
            :placeholder="__('About the user', 'flexify-dashboard')"
            :rows="4"
            autocomplete="off"
          />
        </div>

        <!-- Roles -->
        <div>
          <label
            class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
          >
            {{ __('Roles', 'flexify-dashboard') }}
          </label>
          <TagInput
            v-model="newUser.roles"
            :available-tags="availableRolesForTagInput"
            :disabled="isCreatingUser"
            :placeholder="__('Add roles...', 'flexify-dashboard')"
            :allow-create="false"
          />
        </div>

        <!-- Send User Notification -->
        <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div class="flex items-center gap-2">
            <AppToggle v-model="newUser.sendUserNotification" />
            <label
              class="text-sm text-zinc-600 dark:text-zinc-400"
              for="send-notification"
            >
              {{ __('Send user notification', 'flexify-dashboard') }}
            </label>
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {{
              __(
                'Send an email notification to the user about their new account.',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>
      </div>

      <template #footer>
        <div
          class="p-6 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800"
        >
          <AppButton
            type="transparent"
            @click="createUserDrawerOpen = false"
            :disabled="isCreatingUser"
          >
            {{ __('Cancel', 'flexify-dashboard') }}
          </AppButton>
          <AppButton
            type="primary"
            @click="handleCreateUser"
            :loading="isCreatingUser"
          >
            {{ __('Create User', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </template>
    </Drawer>

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
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-4"
      >
        <!-- Selection Count -->
        <div
          class="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
        >
          {{ selectedCountText }}
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <!-- View Button -->
          <button
            @click="viewSelectedUser"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
            :title="__('View', 'flexify-dashboard')"
          >
            <AppIcon icon="visibility" class="text-lg" />
          </button>

          <!-- Bulk Edit Button -->
          <button
            @click="openBulkEdit"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
            :title="__('Bulk Edit', 'flexify-dashboard')"
          >
            <AppIcon icon="edit" class="text-lg" />
          </button>

          <!-- Delete Button -->
          <button
            @click="handleBatchDelete"
            class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            :title="__('Delete', 'flexify-dashboard')"
          >
            <AppIcon icon="delete" class="text-lg" />
          </button>

          <!-- Clear Selection Button -->
          <button
            @click="clearSelection"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            :title="__('Clear selection', 'flexify-dashboard')"
          >
            <AppIcon icon="close" class="text-lg" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- Confirm Dialog -->
    <Confirm ref="confirmDialog" />

    <!-- Bulk Edit Drawer -->
    <Drawer
      v-model="bulkEditDrawerOpen"
      size="md"
      :show-header="true"
      :show-close-button="true"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <AppIcon icon="edit" class="text-lg" />
          <h2 class="text-lg font-semibold">
            {{ __('Bulk Edit Users', 'flexify-dashboard') }}
          </h2>
        </div>
      </template>

      <div class="space-y-6 p-6">
        <div>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {{
              selectedUsers.length === 1
                ? __(
                    'Editing 1 user. Leave fields empty to keep existing values.',
                    'flexify-dashboard'
                  )
                : __(
                    'Editing %d users. Leave fields empty to keep existing values.',
                    'flexify-dashboard'
                  ).replace('%d', selectedUsers.length)
            }}
          </p>
        </div>

        <!-- Name -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Name', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="bulkEditForm.name"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
          />
        </div>

        <!-- Email -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Email', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="bulkEditForm.email"
            type="email"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
          />
        </div>

        <!-- Roles -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Roles', 'flexify-dashboard') }}
          </label>
          <TagInput
            v-model="bulkEditForm.roles"
            :available-tags="availableRolesForTagInput"
            :disabled="isBulkEditing"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
            :allow-create="false"
          />
        </div>

        <!-- Description -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Biographical Info', 'flexify-dashboard') }}
          </label>
          <AppTextArea
            v-model="bulkEditForm.description"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
            rows="4"
          />
        </div>

        <!-- Actions -->
        <div
          class="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700"
        >
          <AppButton
            @click="bulkEditDrawerOpen = false"
            type="default"
            class="flex-1"
          >
            {{ __('Cancel', 'flexify-dashboard') }}
          </AppButton>
          <AppButton
            @click="saveBulkEdit"
            type="primary"
            :loading="isBulkEditing"
            class="flex-1"
          >
            {{ __('Save Changes', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>
    </Drawer>

    <!-- Import Drawer -->
    <UserImport
      v-model="importDrawerOpen"
      :available-roles="allRoles"
      @imported="handleImportComplete"
    />

    <!-- Export Drawer -->
    <Drawer
      v-model="exportDrawerOpen"
      size="md"
      :show-header="true"
      :show-close-button="true"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <AppIcon icon="download" class="text-lg" />
          <h2 class="text-lg font-semibold">
            {{ __('Export Users', 'flexify-dashboard') }}
          </h2>
        </div>
      </template>

      <div class="space-y-6 p-6">
        <div>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {{
              __('Export %d filtered users to CSV file', 'flexify-dashboard').replace(
                '%d',
                filteredUsers.length
              )
            }}
          </p>
        </div>

        <!-- Export Options -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3"
          >
            {{ __('Include Custom Fields', 'flexify-dashboard') }}
          </label>
          <div class="space-y-2">
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              {{
                __('Enter custom meta field keys (one per line)', 'flexify-dashboard')
              }}
            </p>
            <AppTextArea
              v-model="exportCustomFieldsText"
              :placeholder="__('meta_key_1\nmeta_key_2\n...', 'flexify-dashboard')"
              rows="6"
            />
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {{
                __(
                  'Standard fields (ID, username, email, name, roles, etc.) are always included',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>
        </div>

        <!-- Export Info -->
        <div class="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div class="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-zinc-600 dark:text-zinc-400">
                {{ __('Users to export:', 'flexify-dashboard') }}
              </span>
              <span class="font-medium text-zinc-900 dark:text-zinc-100">
                {{ filteredUsers.length }}
              </span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-zinc-600 dark:text-zinc-400">
                {{ __('Custom fields:', 'flexify-dashboard') }}
              </span>
              <span class="font-medium text-zinc-900 dark:text-zinc-100">
                {{
                  exportCustomFieldsText.split('\n').filter((f) => f.trim())
                    .length
                }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div
          class="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700"
        >
          <AppButton
            @click="exportDrawerOpen = false"
            type="default"
            class="flex-1"
            :disabled="isExporting"
          >
            {{ __('Cancel', 'flexify-dashboard') }}
          </AppButton>
          <AppButton
            @click="exportUsers"
            type="primary"
            :loading="isExporting"
            class="flex-1"
          >
            {{ __('Export to CSV', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>
    </Drawer>
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
