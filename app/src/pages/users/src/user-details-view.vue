<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import md5 from 'md5';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';

// Import components registration
import './components/index.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import Tabs from '@/components/utility/tabs/index.vue';
import ComponentRender from '@/components/app/component-render/index.vue';

const route = useRoute();
const router = useRouter();

// Refs
const loading = ref(false);
const userItem = ref(null);
const activityLogEnabled = computed(() => {
  return appStore.state.flexify_dashboard_settings?.enable_activity_logger === true;
});

const registeredCategories = ref([]);
const registeredComponents = ref([]);
const activeTab = ref('details');

/**
 * Check if required plugins are active for a component
 * @param {Object} component - Component metadata
 * @returns {Boolean}
 */
const hasRequiredPluginsForComponent = (component) => {
  if (!component?.metadata?.requires_plugins) return true;
  if (!Array.isArray(component.metadata.requires_plugins)) return true;
  if (
    !appStore.state.activePlugins ||
    !Array.isArray(appStore.state.activePlugins)
  )
    return false;

  const activePlugins = appStore.state.activePlugins;

  // Create a set of active plugin paths and slugs for quick lookup
  const activePluginPaths = new Set();
  const activePluginSlugs = new Set();

  activePlugins.forEach((plugin) => {
    if (plugin.path) activePluginPaths.add(plugin.path);
    if (plugin.slug) activePluginSlugs.add(plugin.slug);
  });

  // Check if all required plugins are active
  for (let requiredPlugin of component.metadata.requires_plugins) {
    const isActive =
      activePluginPaths.has(requiredPlugin) ||
      activePluginSlugs.has(requiredPlugin);

    if (!isActive) {
      return false;
    }
  }

  return true;
};

/**
 * Tab options for the user details view - dynamically built from registered categories
 */
const tabOptions = computed(() => {
  const tabs = {};

  registeredCategories.value.forEach((category) => {
    // Only show activity tab if activity log is enabled
    if (category.value === 'activity' && !activityLogEnabled.value) {
      return;
    }

    // Check if any component in this category has required plugins
    const categoryComponents = registeredComponents.value.filter(
      (c) => c.metadata?.category === category.value
    );

    // If category has components, check if any are active (have required plugins)
    if (categoryComponents.length > 0) {
      const hasActiveComponents = categoryComponents.some((component) => {
        return hasRequiredPluginsForComponent(component);
      });

      // If category has components but none are active due to missing plugins, hide the tab
      if (!hasActiveComponents) {
        return;
      }
    }

    tabs[category.value] = {
      label: category.label,
      value: category.value,
    };
  });

  return tabs;
});

/**
 * Get components filtered by active tab and requirements
 */
const activeTabComponents = computed(() => {
  return registeredComponents.value.filter((component) => {
    // Check if component belongs to active tab
    if (component.metadata?.category !== activeTab.value) {
      return false;
    }

    // Check if component has required plugins
    if (!hasRequiredPluginsForComponent(component)) {
      return false;
    }

    return true;
  });
});

/**
 * Watch for tab changes and reset to details if current tab becomes unavailable
 */
watch(
  () => tabOptions.value,
  (newTabs) => {
    const tabKeys = Object.keys(newTabs);
    if (!tabKeys.includes(activeTab.value)) {
      activeTab.value = 'details';
    }
  },
  { deep: true }
);

/**
 * Fetches user item data by ID from WordPress REST API
 */
const getUserItem = async () => {
  if (!route.params.userId) return;

  loading.value = true;
  appStore.updateState('loading', true);

  const args = {
    endpoint: `wp/v2/users/${route.params.userId}`,
    params: {
      context: 'edit',
    },
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data?.data) {
    notify({
      title: __('User not found', 'flexify-dashboard'),
      type: 'error',
    });
    router.push('/');
    return;
  }

  userItem.value = data.data;
};

/**
 * Handle user updated event from form component
 */
const handleUserUpdated = async () => {
  await getUserItem();
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
  });
};

/**
 * Get Gravatar URL for a user's email
 * @param {string} email - User's email address
 * @param {number} size - Avatar size in pixels (default: 48)
 * @returns {string} Gravatar URL with transparent blank fallback
 */
const getGravatarUrl = (email, size = 48) => {
  if (!email) return null;
  const emailHash = md5(email.toLowerCase().trim());
  // Use d=blank to return transparent image if no Gravatar exists
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=blank`;
};

/**
 * Get user initials from name or username
 * @param {Object} userItem - User item object
 * @returns {string} User initials (1-2 characters)
 */
const getUserInitials = (userItem) => {
  const name = userItem?.name || userItem?.slug || '';
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Use first letter of first and last name
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
  // Use first two letters of single name
  return name.substring(0, 2).toUpperCase();
};

// Lifecycle
onMounted(async () => {
  await getUserItem();

  // Register categories
  registeredCategories.value = await applyFilters(
    'flexify-dashboard/user-details/categories/register',
    registeredCategories.value
  );

  // Register components
  registeredComponents.value = await applyFilters(
    'flexify-dashboard/user-details/components/register',
    registeredComponents.value
  );

  // Dispatch event for plugins to register components
  const event = new CustomEvent('flexify-dashboard/user-details/ready', {
    detail: {
      userId: route.params.userId,
      userData: userItem.value,
    },
  });
  document.dispatchEvent(event);
});

// Watch for route changes
watch(
  () => route.params.userId,
  async (newUserId) => {
    if (newUserId) {
      await getUserItem();

      // Re-dispatch event for plugins to re-register components with new user data
      const event = new CustomEvent('flexify-dashboard/user-details/ready', {
        detail: {
          userId: newUserId,
          userData: userItem.value,
        },
      });
      document.dispatchEvent(event);
    }
  }
);

// Watch for userItem changes to update registered components
watch(
  () => userItem.value,
  async (newUserData) => {
    if (newUserData) {
      // Re-dispatch event for plugins to re-register components with new user data
      const event = new CustomEvent('flexify-dashboard/user-details/ready', {
        detail: {
          userId: route.params.userId,
          userData: newUserData,
        },
      });
      document.dispatchEvent(event);
    }
  },
  { deep: true }
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
          <AppIcon icon="person" class="text-xl text-zinc-400 animate-pulse" />
        </div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="userItem">
      <!-- Header Section with Avatar and Basic Info -->
      <div
        class="flex-shrink-0 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/30"
      >
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <div
            class="w-12 h-12 bg-zinc-300 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative"
          >
            <!-- User initials on muted circle (background) -->
            <div
              class="absolute inset-0 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-sm font-medium"
            >
              {{ getUserInitials(userItem) }}
            </div>
            <!-- Gravatar image (transparent if no Gravatar exists) -->
            <img
              v-if="userItem.email && getGravatarUrl(userItem.email)"
              :src="getGravatarUrl(userItem.email, 48)"
              :alt="userItem.name || userItem.slug"
              class="w-full h-full object-cover relative z-10"
            />
          </div>

          <!-- User Info -->
          <div class="flex-1 min-w-0">
            <h2
              class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1 truncate"
            >
              {{ userItem.name || userItem.slug }}
            </h2>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {{ userItem.email }}
            </p>
          </div>

          <!-- Meta Info -->
          <div
            class="flex-shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400"
          >
            <div>{{ __('User ID', 'flexify-dashboard') }}: {{ userItem.id }}</div>
            <div class="mt-1">
              {{ __('Registered', 'flexify-dashboard') }}
              {{ formatDate(userItem.registered_date) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div
        class="flex-shrink-0 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/30"
      >
        <Tabs v-model="activeTab" :options="tabOptions" />
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-auto">
        <!-- Render registered components for active tab -->
        <template
          v-for="component in activeTabComponents"
          :key="component.metadata?.id || component.metadata?.title"
        >
          <div class="p-6">
            <ComponentRender
              :item="component"
              :user-id="route.params.userId"
              :user-data="userItem"
              :update-user="handleUserUpdated"
            />
          </div>
        </template>

        <!-- Fallback message if no components registered for active tab -->
        <div
          v-if="
            activeTabComponents.length === 0 && registeredComponents.length > 0
          "
          class="p-6 max-w-2xl"
        >
          <div class="text-center py-8 text-zinc-500 dark:text-zinc-400">
            {{ __('No components available for this tab', 'flexify-dashboard') }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
