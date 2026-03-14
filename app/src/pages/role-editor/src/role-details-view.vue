<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { useDarkMode } from './useDarkMode.js';
const { isDark } = useDarkMode();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppCheckbox from '@/components/utility/checkbox-basic/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';

const route = useRoute();
const router = useRouter();

// Inject refresh function from parent
const refreshRolesList = inject('refreshRolesList', null);

// Refs
const loading = ref(false);
const roleData = ref(null);
const allCapabilities = ref([]);
const groupedCapabilities = ref({});
const selectedCapabilities = ref([]);
const hasChanges = ref(false);
const isSaving = ref(false);
const searchQuery = ref('');
const expandedCategories = ref({});
const confirmDialog = ref(null);
const isEditingRoleName = ref(false);
const roleNameInput = ref('');
const isSavingRoleName = ref(false);
const isDeletingRole = ref(false);

// Computed properties
const isAdministrator = computed(() => {
  return roleData.value?.slug === 'administrator';
});

const selectedCount = computed(() => {
  return selectedCapabilities.value.length;
});

const totalCapabilitiesCount = computed(() => {
  return allCapabilities.value.length;
});

const selectedPercentage = computed(() => {
  if (totalCapabilitiesCount.value === 0) return 0;
  return Math.round((selectedCount.value / totalCapabilitiesCount.value) * 100);
});

// Filtered capabilities based on search
const filteredCapabilities = computed(() => {
  if (!searchQuery.value) {
    return groupedCapabilities.value;
  }

  const query = searchQuery.value.toLowerCase();
  const filtered = {};

  Object.keys(groupedCapabilities.value).forEach((category) => {
    const caps = groupedCapabilities.value[category].filter((cap) =>
      cap.toLowerCase().includes(query)
    );
    if (caps.length > 0) {
      filtered[category] = caps;
    }
  });

  return filtered;
});

// Category labels
const categoryLabels = {
  general: __('General', 'flexify-dashboard'),
  posts: __('Posts', 'flexify-dashboard'),
  pages: __('Pages', 'flexify-dashboard'),
  media: __('Media', 'flexify-dashboard'),
  users: __('Users', 'flexify-dashboard'),
  plugins: __('Plugins', 'flexify-dashboard'),
  themes: __('Themes', 'flexify-dashboard'),
  settings: __('Settings', 'flexify-dashboard'),
  other: __('Other', 'flexify-dashboard'),
};

/**
 * Validates role slug format
 *
 * @param {string} slug - The role slug to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidRoleSlug = (slug) => {
  if (!slug || typeof slug !== 'string') return false;
  // WordPress role slugs: lowercase letters, numbers, hyphens, underscores
  return /^[a-z0-9_-]+$/.test(slug);
};

/**
 * Fetches role details from WordPress REST API
 */
const getRoleDetails = async () => {
  if (!route.params.roleSlug) return;

  // Validate role slug format before making API call
  if (!isValidRoleSlug(route.params.roleSlug)) {
    notify({
      title: __('Invalid role format', 'flexify-dashboard'),
      type: 'error',
    });
    router.push({ name: 'role-editor' });
    return;
  }

  loading.value = true;
  appStore.updateState('loading', true);

  try {
    const args = {
      endpoint: `flexify-dashboard/v1/role-editor/role/${route.params.roleSlug}`,
      params: {},
    };

    const data = await lmnFetch(args);

    if (!data?.data) {
      notify({
        title: __('Role not found', 'flexify-dashboard'),
        type: 'error',
      });
      router.push({ name: 'role-editor' });
      return;
    }

    roleData.value = data.data;
    roleNameInput.value = data.data.name;
    selectedCapabilities.value = [...(data.data.capabilities || [])];

    // Fetch all available capabilities
    await getAllCapabilities();
  } catch (error) {
    notify({
      title: __('Failed to load role', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
    appStore.updateState('loading', false);
  }
};

/**
 * Fetches all available capabilities
 */
const getAllCapabilities = async () => {
  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/role-editor/capabilities',
      params: {},
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      allCapabilities.value = data.data.all || [];
      groupedCapabilities.value = data.data.grouped || {};

      // Categories are collapsed by default
      Object.keys(groupedCapabilities.value).forEach((category) => {
        expandedCategories.value[category] = false;
      });
    }
  } catch (error) {
    console.error('Failed to fetch capabilities:', error);
  }
};

/**
 * Toggles a capability selection
 */
const toggleCapability = (capability) => {
  const index = selectedCapabilities.value.indexOf(capability);
  if (index > -1) {
    selectedCapabilities.value.splice(index, 1);
  } else {
    selectedCapabilities.value.push(capability);
  }
  hasChanges.value = true;
};

/**
 * Checks if a capability is selected
 */
const isCapabilitySelected = (capability) => {
  return selectedCapabilities.value.includes(capability);
};

/**
 * Toggles category expansion
 */
const toggleCategory = (category) => {
  expandedCategories.value[category] = !expandedCategories.value[category];
};

/**
 * Checks if category is expanded
 */
const isCategoryExpanded = (category) => {
  return expandedCategories.value[category] === true;
};

/**
 * Starts editing role name
 */
const startEditingRoleName = () => {
  isEditingRoleName.value = true;
  roleNameInput.value = roleData.value.name;
};

/**
 * Cancels editing role name
 */
const cancelEditingRoleName = () => {
  isEditingRoleName.value = false;
  roleNameInput.value = roleData.value.name;
};

/**
 * Validates role name format
 *
 * @param {string} name - The role name to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidRoleName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
};

/**
 * Saves role name
 */
const saveRoleName = async () => {
  const trimmedName = roleNameInput.value.trim();
  
  if (!trimmedName || trimmedName === roleData.value.name) {
    cancelEditingRoleName();
    return;
  }

  // Validate role name format
  if (!isValidRoleName(trimmedName)) {
    notify({
      title: __('Invalid role name', 'flexify-dashboard'),
      message: __('Role name must be between 1 and 100 characters.', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  isSavingRoleName.value = true;

  try {
    const args = {
      endpoint: `flexify-dashboard/v1/role-editor/role/${roleData.value.slug}/name`,
      type: 'POST',
      data: {
        name: trimmedName,
      },
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      roleData.value.name = data.data.name;
      isEditingRoleName.value = false;
      notify({
        title: __('Role name updated', 'flexify-dashboard'),
        type: 'success',
      });
      // Refresh the roles list to reflect the name change
      if (refreshRolesList) {
        await refreshRolesList();
      }
    }
  } catch (error) {
    notify({
      title: __('Failed to update role name', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSavingRoleName.value = false;
  }
};

/**
 * Selects all capabilities in a category
 */
const selectAllInCategory = (category) => {
  const caps = groupedCapabilities.value[category] || [];
  caps.forEach((cap) => {
    if (!selectedCapabilities.value.includes(cap)) {
      selectedCapabilities.value.push(cap);
    }
  });
  hasChanges.value = true;
};

/**
 * Deselects all capabilities in a category
 */
const deselectAllInCategory = (category) => {
  const caps = groupedCapabilities.value[category] || [];
  caps.forEach((cap) => {
    const index = selectedCapabilities.value.indexOf(cap);
    if (index > -1) {
      selectedCapabilities.value.splice(index, 1);
    }
  });
  hasChanges.value = true;
};

/**
 * Checks if all capabilities in category are selected
 */
const areAllSelectedInCategory = (category) => {
  const caps = groupedCapabilities.value[category] || [];
  return caps.length > 0 && caps.every((cap) => isCapabilitySelected(cap));
};

/**
 * Validates capabilities array format
 *
 * @param {Array} capabilities - Array of capability strings
 * @returns {boolean} True if valid, false otherwise
 */
const isValidCapabilitiesArray = (capabilities) => {
  if (!Array.isArray(capabilities)) return false;
  return capabilities.every(
    (cap) => typeof cap === 'string' && /^[a-z0-9_]+$/.test(cap)
  );
};

/**
 * Saves role capabilities
 */
const saveCapabilities = async () => {
  if (!hasChanges.value || !roleData.value) return;

  // Validate capabilities format
  if (!isValidCapabilitiesArray(selectedCapabilities.value)) {
    notify({
      title: __('Invalid capabilities format', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  // Extra confirmation for administrator role
  if (isAdministrator.value) {
    const confirmed = await confirmDialog.value.show({
      title: __('Warning: Administrator Role', 'flexify-dashboard'),
      message: __(
        'You are about to modify the administrator role capabilities. This is extremely dangerous and could lock you out of your site permanently. Are you absolutely sure you want to proceed?',
        'flexify-dashboard'
      ),
      okButton: __('Yes, I understand the risk', 'flexify-dashboard'),
      cancelButton: __('Cancel', 'flexify-dashboard'),
      icon: 'warning',
    });

    if (!confirmed) {
      return;
    }
  }

  isSaving.value = true;

  try {
    const args = {
      endpoint: `flexify-dashboard/v1/role-editor/role/${roleData.value.slug}`,
      type: 'POST',
      data: {
        capabilities: selectedCapabilities.value,
      },
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('Capabilities updated', 'flexify-dashboard'),
        type: 'success',
      });
      hasChanges.value = false;
      await getRoleDetails(); // Refresh role data
    }
  } catch (error) {
    notify({
      title: __('Failed to update capabilities', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSaving.value = false;
  }
};

/**
 * Formats capability name for display
 */
const formatCapabilityName = (capability) => {
  // Convert snake_case to Title Case
  return capability
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Checks if role can be deleted
 */
const canDeleteRole = computed(() => {
  if (!roleData.value) return false;

  // Cannot delete default WordPress roles
  const defaultRoles = [
    'administrator',
    'editor',
    'author',
    'contributor',
    'subscriber',
  ];
  if (defaultRoles.includes(roleData.value.slug)) {
    return false;
  }

  // Cannot delete if role has users
  if (roleData.value.userCount > 0) {
    return false;
  }

  return true;
});

/**
 * Deletes the current role
 */
const deleteRole = async () => {
  if (!roleData.value || !canDeleteRole.value) return;

  // Validate role slug before deletion
  if (!isValidRoleSlug(roleData.value.slug)) {
    notify({
      title: __('Invalid role format', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  const confirmed = await confirmDialog.value.show({
    title: __('Delete Role', 'flexify-dashboard'),
    message: __(
      'Are you sure you want to delete the role "%s"? This action cannot be undone.',
      'flexify-dashboard'
    ).replace('%s', roleData.value.name),
    okButton: __('Delete', 'flexify-dashboard'),
    cancelButton: __('Cancel', 'flexify-dashboard'),
    icon: 'warning',
  });

  if (!confirmed) return;

  isDeletingRole.value = true;

  try {
    const args = {
      endpoint: `flexify-dashboard/v1/role-editor/role/${roleData.value.slug}`,
      type: 'DELETE',
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('Role deleted successfully', 'flexify-dashboard'),
        type: 'success',
      });
      // Refresh the roles list before navigating
      if (refreshRolesList) {
        await refreshRolesList();
      }
      router.push({ name: 'role-editor' });
    }
  } catch (error) {
    notify({
      title: __('Failed to delete role', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isDeletingRole.value = false;
  }
};

// Watchers
watch(
  () => route.params.roleSlug,
  () => {
    getRoleDetails();
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex-1 flex flex-col h-full max-h-full overflow-hidden">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3"
        >
          <AppIcon icon="people" class="text-xl text-zinc-400 animate-pulse" />
        </div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="roleData">
      <!-- Administrator Warning Banner -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="isAdministrator"
          class="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 rounded-xl flex items-start gap-3"
        >
          <div class="flex-shrink-0 mt-0.5">
            <AppIcon
              icon="warning"
              class="text-red-600 dark:text-red-400 text-xl"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h3
              class="text-sm font-semibold text-red-900 dark:text-red-100 mb-1"
            >
              {{ __('Extreme Caution Required', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-red-800 dark:text-red-200 leading-relaxed">
              {{
                __(
                  'You are editing the Administrator role. Modifying capabilities incorrectly could permanently lock you out of your WordPress site. Only make changes if you are absolutely certain of what you are doing. It is strongly recommended to test changes on a staging site first.',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>
        </div>
      </Transition>

      <!-- Header -->
      <div
        class="px-6 pt-6 pb-4 border-b border-zinc-200/50 dark:border-zinc-700/30"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <div
                v-if="!isEditingRoleName"
                class="flex items-center gap-2 group"
              >
                <h2
                  class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  {{ roleData.name }}
                </h2>
                <button
                  @click="startEditingRoleName"
                  class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  :title="__('Edit role name', 'flexify-dashboard')"
                >
                  <AppIcon
                    icon="edit"
                    class="text-sm text-zinc-500 dark:text-zinc-400"
                  />
                </button>
              </div>
              <div v-else class="flex items-center gap-2 flex-1 max-w-md">
                <AppInput
                  v-model="roleNameInput"
                  @keyup.enter="saveRoleName"
                  @keyup.escape="cancelEditingRoleName"
                  class="flex-1"
                  :disabled="isSavingRoleName"
                />
                <AppButton
                  @click="saveRoleName"
                  :loading="isSavingRoleName"
                  type="primary"
                  class="text-sm px-2 py-1"
                >
                  {{ __('Save', 'flexify-dashboard') }}
                </AppButton>
                <AppButton
                  @click="cancelEditingRoleName"
                  type="default"
                  class="text-sm px-2 py-1"
                  :disabled="isSavingRoleName"
                >
                  {{ __('Cancel', 'flexify-dashboard') }}
                </AppButton>
              </div>
              <span
                v-if="isAdministrator"
                class="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md"
              >
                {{ __('Admin', 'flexify-dashboard') }}
              </span>
            </div>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ roleData.userCount }}
              {{
                roleData.userCount === 1
                  ? __('user', 'flexify-dashboard')
                  : __('users', 'flexify-dashboard')
              }}
              {{ __('with this role', 'flexify-dashboard') }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <AppButton
              v-if="canDeleteRole"
              @click="deleteRole"
              :disabled="isDeletingRole || isSaving"
              :loading="isDeletingRole"
              type="danger"
              class="text-sm"
            >
              <AppIcon icon="delete" class="text-base" />
              {{ __('Delete Role', 'flexify-dashboard') }}
            </AppButton>
            <AppButton
              @click="saveCapabilities"
              :disabled="!hasChanges || isSaving"
              :loading="isSaving"
              type="primary"
              :class="
                isAdministrator ? 'border-red-300 dark:border-red-700' : ''
              "
            >
              {{ __('Save Changes', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>

        <!-- Capabilities Summary -->
        <div
          class="flex items-center gap-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/30"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-2 h-2 rounded-full"
              :class="
                hasChanges ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
              "
            ></div>
            <span class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {{ selectedCount }} / {{ totalCapabilitiesCount }}
              {{ __('capabilities selected', 'flexify-dashboard') }}
            </span>
          </div>
          <div class="flex-1 max-w-xs">
            <div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
              <div
                class="bg-zinc-900 dark:bg-zinc-100 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: `${selectedPercentage}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div
        class="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-700/30 bg-zinc-50/50 dark:bg-zinc-900/20"
      >
        <div class="relative">
          <AppIcon
            icon="search"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-base pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search capabilities...', 'flexify-dashboard')"
            class="w-full bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/30 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-all"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
          >
            <AppIcon icon="close" class="text-sm" />
          </button>
        </div>
      </div>

      <!-- Capabilities List -->
      <div class="flex-1 overflow-auto px-6 py-6 custom-scrollbar">
        <div
          v-if="Object.keys(filteredCapabilities).length === 0"
          class="text-center py-12"
        >
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="search" class="text-zinc-400 text-xl" />
          </div>
          <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
            {{ __('No capabilities found', 'flexify-dashboard') }}
          </p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ __('Try adjusting your search terms', 'flexify-dashboard') }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(capabilities, category) in filteredCapabilities"
            :key="category"
            class="border border-zinc-200/50 dark:border-zinc-700/30 rounded-xl overflow-hidden bg-white dark:bg-zinc-800/30"
          >
            <!-- Category Header -->
            <button
              @click="toggleCategory(category)"
              class="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
            >
              <div class="flex items-center gap-3">
                <AppIcon
                  :icon="
                    isCategoryExpanded(category) ? 'expand_less' : 'expand_more'
                  "
                  class="text-zinc-400 dark:text-zinc-500 transition-transform group-hover:text-zinc-600 dark:group-hover:text-zinc-400"
                />
                <span
                  class="font-semibold text-sm text-zinc-900 dark:text-zinc-100"
                >
                  {{ categoryLabels[category] || category }}
                </span>
                <span
                  class="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded"
                >
                  {{ capabilities.length }}
                </span>
                <span
                  v-if="areAllSelectedInCategory(category)"
                  class="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1"
                >
                  <AppIcon icon="check_circle" class="text-xs" />
                  {{ __('All selected', 'flexify-dashboard') }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click.stop="selectAllInCategory(category)"
                  :disabled="areAllSelectedInCategory(category)"
                  class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-2.5 py-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ __('Select All', 'flexify-dashboard') }}
                </button>
                <button
                  @click.stop="deselectAllInCategory(category)"
                  class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-2.5 py-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  {{ __('Deselect All', 'flexify-dashboard') }}
                </button>
              </div>
            </button>

            <!-- Capabilities List -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-[2000px]"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 max-h-[2000px]"
              leave-to-class="opacity-0 max-h-0"
            >
              <div
                v-if="isCategoryExpanded(category)"
                class="divide-y divide-zinc-100/50 dark:divide-zinc-800/30"
              >
                <label
                  v-for="capability in capabilities"
                  :key="capability"
                  class="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                  @click="toggleCapability(capability)"
                >
                  <AppCheckbox
                    :checked="isCapabilitySelected(capability)"
                    class="flex-shrink-0"
                  />
                  <div class="flex-1 min-w-0">
                    <div
                      class="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors"
                    >
                      {{ formatCapabilityName(capability) }}
                    </div>
                    <div
                      class="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1 opacity-70"
                    >
                      {{ capability }}
                    </div>
                  </div>
                  <AppIcon
                    v-if="isCapabilitySelected(capability)"
                    icon="check_circle"
                    class="text-green-500 dark:text-green-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </label>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="hasChanges"
          class="px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-700/30 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between shadow-lg"
        >
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {{ __('You have unsaved changes', 'flexify-dashboard') }}
            </p>
            <span
              v-if="isAdministrator"
              class="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded"
            >
              {{ __('Admin Role', 'flexify-dashboard') }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <AppButton
              @click="getRoleDetails"
              type="default"
              :disabled="isSaving"
            >
              {{ __('Cancel', 'flexify-dashboard') }}
            </AppButton>
            <AppButton
              @click="saveCapabilities"
              type="primary"
              :loading="isSaving"
              :class="
                isAdministrator
                  ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                  : ''
              "
            >
              {{ __('Save Changes', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </template>

    <Confirm ref="confirmDialog" />
  </div>
</template>

<style scoped>
</style>
