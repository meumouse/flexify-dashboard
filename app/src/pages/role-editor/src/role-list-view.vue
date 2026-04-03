<script setup>
import {
  ref,
  watch,
  nextTick,
  computed,
  watchEffect,
  onMounted,
  onUnmounted,
  provide,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ShadowRoot } from 'vue-shadow-dom';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { useDarkMode } from './useDarkMode.js';
import Drawer from '@/components/utility/drawer/index.vue';
const { isDark } = useDarkMode();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import Modal from '@/components/utility/modal/index.vue';

const router = useRouter();
const route = useRoute();

// Refs
const adoptedStyleSheets = ref(new CSSStyleSheet());
const loading = ref(false);
const roles = ref([]);
const searchQuery = ref('');
const drawerOpen = ref(false);
const selectedRole = ref(null);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const confirmDialog = ref(null);
const createRoleModal = ref(null);
const showCreateModal = ref(false);
const newRoleName = ref('');
const newRoleSlug = ref('');
const isCreatingRole = ref(false);
const slugManuallyEdited = ref(false);

// Computed property for window width
const windowWidthComputed = computed(() => windowWidth.value);

// Filtered roles based on search
const filteredRoles = computed(() => {
  if (!searchQuery.value) {
    return roles.value;
  }
  const query = searchQuery.value.toLowerCase();
  return roles.value.filter(
    (role) =>
      role.name.toLowerCase().includes(query) ||
      role.slug.toLowerCase().includes(query)
  );
});

/**
 * Fetches all user roles from WordPress REST API
 */
const getRoles = async () => {
  loading.value = true;
  appStore.updateState('loading', true);

  const args = {
    endpoint: 'flexify-dashboard/v1/user-roles',
    params: {},
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data?.data) {
    notify({
      title: __('Failed to load roles', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  // Transform roles data to include user count and other metadata
  roles.value = await Promise.all(
    data.data.map(async (role) => {
      const userCount = await getUserCountForRole(role.value);
      return {
        slug: role.value,
        name: role.label,
        userCount: userCount,
      };
    })
  );
};

/**
 * Gets the count of users for a specific role
 *
 * @param {string} roleSlug - The role slug to get user count for
 * @returns {Promise<number>} The number of users with this role
 */
const getUserCountForRole = async (roleSlug) => {
  try {
    const args = {
      endpoint: 'wp/v2/users',
      params: {
        roles: roleSlug,
        per_page: 1,
      },
    };

    const response = await lmnFetch(args);
    return response?.totalItems || 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Handles role selection - navigate to details
 */
const selectRole = (role) => {
  // Validate role slug before navigation
  if (!role || !role.slug || !isValidRoleSlug(role.slug)) {
    notify({
      title: __('Invalid role format', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }
  router.push({ name: 'role-details', params: { roleSlug: role.slug } });
};

/**
 * Opens create role modal
 */
const openCreateModal = () => {
  newRoleName.value = '';
  newRoleSlug.value = '';
  slugManuallyEdited.value = false;
  showCreateModal.value = true;
  if (createRoleModal.value) {
    createRoleModal.value.show();
  }
};

/**
 * Closes create role modal
 */
const closeCreateModal = () => {
  showCreateModal.value = false;
  if (createRoleModal.value) {
    createRoleModal.value.close();
  }
};

/**
 * Generates slug from role name
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

/**
 * Watches role name to auto-generate slug
 */
watch(newRoleName, (newVal) => {
  if (newVal && !slugManuallyEdited.value) {
    newRoleSlug.value = generateSlug(newVal);
  }
});

/**
 * Marks slug as manually edited
 */
const onSlugInput = () => {
  slugManuallyEdited.value = true;
};

/**
 * Validates role slug format
 *
 * @param {string} slug - The role slug to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidRoleSlug = (slug) => {
  if (!slug || typeof slug !== 'string') return false;
  return /^[a-z0-9_-]+$/.test(slug);
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
 * Creates a new role
 */
const createRole = async () => {
  const trimmedName = newRoleName.value.trim();
  const trimmedSlug = newRoleSlug.value.trim() || generateSlug(trimmedName);

  if (!trimmedName) {
    notify({
      title: __('Role name is required', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  // Validate role name format
  if (!isValidRoleName(trimmedName)) {
    notify({
      title: __('Invalid role name', 'flexify-dashboard'),
      message: __(
        'Role name must be between 1 and 100 characters.',
        'flexify-dashboard'
      ),
      type: 'error',
    });
    return;
  }

  // Validate role slug format
  if (!isValidRoleSlug(trimmedSlug)) {
    notify({
      title: __('Invalid role slug', 'flexify-dashboard'),
      message: __(
        'Role slug can only contain lowercase letters, numbers, hyphens, and underscores.',
        'flexify-dashboard'
      ),
      type: 'error',
    });
    return;
  }

  // Validate slug length
  if (trimmedSlug.length > 60) {
    notify({
      title: __('Role slug too long', 'flexify-dashboard'),
      message: __('Role slug must be 60 characters or less.', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  isCreatingRole.value = true;

  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/role-editor/roles',
      type: 'POST',
      data: {
        name: trimmedName,
        slug: trimmedSlug,
        capabilities: [],
      },
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('Role created successfully', 'flexify-dashboard'),
        type: 'success',
      });
      closeCreateModal();
      await getRoles();
      // Navigate to the new role
      router.push({
        name: 'role-details',
        params: { roleSlug: data.data.slug },
      });
    }
  } catch (error) {
    notify({
      title: __('Failed to create role', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isCreatingRole.value = false;
  }
};

/**
 * Injects styles into shadow root
 */
const setStyles = () => {
  let appStyleNode = document.querySelector('#flexify-dashboard-role-editor-css');
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
  link.href = `${appStore.state.pluginBase}app/dist/assets/styles/role-editor.css`;
  document.head.appendChild(link);
  return link;
};

/**
 * Handle window resize
 */
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

watch(
  () => route.params.roleSlug,
  (newVal) => {
    if (newVal) {
      drawerOpen.value = true;
    } else {
      drawerOpen.value = false;
    }
  },
  { immediate: true, deep: true }
);

// Provide refresh function to child components
provide('refreshRolesList', getRoles);

onMounted(() => {
  getRoles();
  setStyles();

  // Initialize window width
  windowWidth.value = window.innerWidth;

  // Add resize listener
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // Remove resize listener
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div
    class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize"
    :class="isDark ? 'dark' : ''"
  >
    <!-- Roles List Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {{ __('Role Editor', 'flexify-dashboard') }}
          </h1>
          <AppButton @click="openCreateModal" type="primary" class="text-sm">
            <AppIcon icon="add" class="text-base" />
            {{ __('New Role', 'flexify-dashboard') }}
          </AppButton>
        </div>

        <!-- Search Bar -->
        <div class="relative flex items-center">
          <AppIcon
            icon="search"
            class="absolute left-3 text-lg text-zinc-400 dark:text-zinc-500 pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search roles...', 'flexify-dashboard')"
            class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>
      </div>

      <!-- Results Count -->
      <div class="flex flex-row place-content-between items-center px-6 pr-4">
        <div
          class="py-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500"
        >
          {{ filteredRoles.length }}
          {{
            filteredRoles.length === 1
              ? __('role', 'flexify-dashboard')
              : __('roles', 'flexify-dashboard')
          }}
        </div>
      </div>

      <!-- Roles List -->
      <div class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar relative">
        <div v-if="loading && !roles.length" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon
              icon="people"
              class="text-zinc-400 text-xl animate-pulse"
            />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Loading roles...', 'flexify-dashboard') }}
          </p>
        </div>

        <div v-else-if="filteredRoles.length === 0" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="people" class="text-zinc-400 text-xl" />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {{
              searchQuery
                ? __('No roles found', 'flexify-dashboard')
                : __('No roles available', 'flexify-dashboard')
            }}
          </p>
        </div>

        <div v-else class="mt-3 space-y-1">
          <div
            v-for="role in filteredRoles"
            :key="role.slug"
            @click="selectRole(role)"
            :class="[
              'flex items-center justify-between p-3 rounded-xl transition-all duration-200 text-left group -mx-3 cursor-pointer',
              route.params.roleSlug === role.slug
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
            ]"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm mb-1 truncate">
                {{ role.name }}
              </div>
              <div
                :class="[
                  'text-xs',
                  route.params.roleSlug === role.slug
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : 'text-zinc-500 dark:text-zinc-400',
                ]"
              >
                {{ role.userCount }}
                {{
                  role.userCount === 1
                    ? __('user', 'flexify-dashboard')
                    : __('users', 'flexify-dashboard')
                }}
              </div>
            </div>
            <AppIcon
              icon="chevron_right"
              :class="[
                'text-base flex-shrink-0 ml-2 transition-transform duration-200 opacity-0 group-hover:opacity-100',
                route.params.roleSlug === role.slug
                  ? 'text-zinc-900 dark:text-white opacity-100'
                  : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 group-hover:translate-x-1',
              ]"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-l-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <RouterView key="role-details-content" v-slot="{ Component }">
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
              {{ __('Role Details', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {{
                __(
                  'Select a role from the list to view and edit its capabilities.',
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

    <!-- Confirm Dialog -->
    <Confirm ref="confirmDialog" />

    <!-- Create Role Modal -->
    <Modal ref="createRoleModal">
      <div class="w-[500px] max-w-[90vw] p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {{ __('Create New Role', 'flexify-dashboard') }}
          </h2>
          <AppButton type="transparent" @click="closeCreateModal">
            <AppIcon icon="close" />
          </AppButton>
        </div>

        <div class="space-y-4">
          <div>
            <label
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              {{ __('Role Name', 'flexify-dashboard') }}
            </label>
            <AppInput
              v-model="newRoleName"
              :placeholder="__('e.g., Manager', 'flexify-dashboard')"
              @keyup.enter="createRole"
              :disabled="isCreatingRole"
            />
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {{ __('The display name for this role', 'flexify-dashboard') }}
            </p>
          </div>

          <div>
            <label
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              {{ __('Role Slug', 'flexify-dashboard') }}
            </label>
            <AppInput
              v-model="newRoleSlug"
              :placeholder="__('e.g., manager', 'flexify-dashboard')"
              @keyup.enter="createRole"
              @input="onSlugInput"
              :disabled="isCreatingRole"
            />
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {{
                __(
                  'Lowercase letters, numbers, hyphens, and underscores only',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>

          <div
            class="flex items-center gap-3 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/30"
          >
            <AppButton
              @click="closeCreateModal"
              type="default"
              :disabled="isCreatingRole"
              class="flex-1"
            >
              {{ __('Cancel', 'flexify-dashboard') }}
            </AppButton>
            <AppButton
              @click="createRole"
              type="primary"
              :loading="isCreatingRole"
              class="flex-1"
            >
              {{ __('Create Role', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped></style>

<style>
#wpbody,
#wpcontent {
  padding: 0 !important;
}

html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}
</style>
