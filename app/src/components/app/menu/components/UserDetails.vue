<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Teleport } from 'vue';
import { ShadowRoot } from 'vue-shadow-dom';
import { encodeToHash } from '@/assets/js/functions/encodeToHash.js';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import {
  setupColorScheme,
  useColorScheme,
} from '@/assets/js/functions/useColorScheme.js';
import { useShadowStyles } from '@/composables/useShadowStyles.js';

const { prefersDark, setColorScheme, colorScheme, userPreference } =
  useColorScheme();

// Refs
const gravatar = ref(false);
const showUserDropdown = ref(false); // Controls if teleport/shadow root is mounted
const isDropdownVisible = ref(false); // Controls the actual visibility for animation
const userDropdownRef = ref(null);
const triggerRef = ref(null); // Reference to the entire trigger container
const dropdownPosition = ref({ top: 0, left: 0 });
const adoptedStyleSheets = ref(new CSSStyleSheet());
const stylesSet = ref(false);
const isHoveringTrigger = ref(false);
const isHoveringDropdown = ref(false);
let closeTimeout = null;
let unmountTimeout = null;

// Use shadow styles composable
const { setStyles } = useShadowStyles(adoptedStyleSheets);

/**
 * Cancels any pending close/unmount operations
 */
const cancelPendingClose = () => {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  if (unmountTimeout) {
    clearTimeout(unmountTimeout);
    unmountTimeout = null;
  }
};

/**
 * Opens the dropdown with animation
 */
const openDropdown = async () => {
  // Cancel any pending close operations
  cancelPendingClose();

  // If already visible, just ensure it stays open
  if (isDropdownVisible.value) return;

  // Set styles once
  if (!stylesSet.value) {
    setStyles();
    stylesSet.value = true;
  }

  // Mount the teleport/shadow root first
  showUserDropdown.value = true;

  // Wait for mount, then trigger visibility for animation
  await nextTick();
  await nextTick(); // Double nextTick to ensure shadow DOM is ready

  // Recheck that we still want to show (user may have left)
  if (!isHoveringTrigger.value && !isHoveringDropdown.value) {
    showUserDropdown.value = false;
    return;
  }

  isDropdownVisible.value = true;

  // Calculate position after visible
  await nextTick();
  calculateDropdownPosition();
};

/**
 * Closes the dropdown with animation
 */
const closeDropdown = () => {
  // Don't close if hovering over trigger or dropdown
  if (isHoveringTrigger.value || isHoveringDropdown.value) return;

  // Hide with animation first
  isDropdownVisible.value = false;

  // Unmount after animation completes
  unmountTimeout = setTimeout(() => {
    if (
      !isDropdownVisible.value &&
      !isHoveringTrigger.value &&
      !isHoveringDropdown.value
    ) {
      showUserDropdown.value = false;
    }
  }, 150); // Match leave animation duration
};

/**
 * Attempts to close the dropdown after a delay
 */
const scheduleClose = () => {
  // Small delay to allow mouse to move between trigger and dropdown
  closeTimeout = setTimeout(() => {
    closeDropdown();
  }, 100);
};

/**
 * Handles mouse enter on trigger area
 */
const onTriggerMouseEnter = () => {
  isHoveringTrigger.value = true;
  cancelPendingClose();
  openDropdown();
};

/**
 * Handles mouse leave on trigger area
 */
const onTriggerMouseLeave = () => {
  isHoveringTrigger.value = false;
  scheduleClose();
};

/**
 * Handles mouse enter on dropdown
 */
const onDropdownMouseEnter = () => {
  isHoveringDropdown.value = true;
  cancelPendingClose();
};

/**
 * Handles mouse leave on dropdown
 */
const onDropdownMouseLeave = () => {
  isHoveringDropdown.value = false;
  scheduleClose();
};

// User dropdown menu items
const userMenuItems = computed(() => {
  const tabs = [
    {
      id: 'profile',
      name: __('Edit Profile', 'flexify-dashboard'),
      icon: 'person',
      url: `${appStore.state.adminUrl}profile.php`,
      divider: false,
    },
    {
      id: 'view-site',
      name: __('Visit site', 'flexify-dashboard'),
      icon: 'home',
      url: `${appStore.state.siteURL}`,
      divider: false,
    },
    {
      id: 'site-settings',
      name: __('Site Settings', 'flexify-dashboard'),
      icon: 'settings',
      url: `${appStore.state.adminUrl}options-general.php`,
      divider: false,
    },
    {
      id: 'logout',
      name: __('Sign Out', 'flexify-dashboard'),
      icon: 'logout',
      url: ``,
      action: logoutUser,
      divider: false,
      destructive: true,
    },
  ];

  if (!appStore.state.userRoles.includes('administrator')) {
    tabs.splice(2, 1);
  }

  return tabs;
});

// Props
const props = defineProps({
  openSearch: {
    type: Function,
    default: null,
  },
  minimized: {
    type: Boolean,
    default: false,
  },
});

/**
 * Handles user menu action clicks
 * @param {Object} item - The menu item that was clicked
 */
const handleUserMenuAction = (item) => {
  if (item.action) {
    item.action();
  } else if (item.url) {
    window.location.href = item.url;
  }
  // Force close without animation for immediate navigation
  cancelPendingClose();
  isHoveringTrigger.value = false;
  isHoveringDropdown.value = false;
  isDropdownVisible.value = false;
  showUserDropdown.value = false;
};

/**
 * Logs out the current user
 */
const logoutUser = async () => {
  const args = { endpoint: 'flexify-dashboard/v1/logout', params: {}, type: 'POST' };
  const data = await lmnFetch(args);

  window.location.href = appStore.state.loginUrl;
};

/**
 * Fetches user gravatar
 */
// Methods
const setGravatar = async () => {
  const hashHex = await encodeToHash(appStore.state.userEmail);
  gravatar.value = `https://gravatar.com/avatar/${hashHex}?d=blank`;
};

/**
 * Calculates the position for the dropdown menu
 * Positions it above the trigger container, aligned to the left
 */
const calculateDropdownPosition = () => {
  if (!triggerRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();

  // Wait for dropdown to render, then calculate exact position
  requestAnimationFrame(() => {
    if (userDropdownRef.value && triggerRef.value) {
      const dropdownRect = userDropdownRef.value.getBoundingClientRect();
      const dropdownHeight = dropdownRect.height;
      const updatedTriggerRect = triggerRef.value.getBoundingClientRect();

      // Position above the trigger with 8px gap
      let top = updatedTriggerRect.top - dropdownHeight - 24;
      let left = updatedTriggerRect.left;

      // Adjust if off-screen to the right
      if (left + dropdownRect.width > window.innerWidth) {
        left = updatedTriggerRect.right - dropdownRect.width;
      }

      // Adjust if off-screen to the left
      if (left < 0) {
        left = 16; // 16px padding from edge
      }

      // Adjust if off-screen at top - position below instead
      if (top < 0) {
        top = updatedTriggerRect.bottom + 8;
      }

      dropdownPosition.value = { top, left };
    }
  });
};

onMounted(() => {
  setGravatar();
});

onUnmounted(() => {
  cancelPendingClose();
});
</script>

<template>
  <!-- USER DETAILS with Dropdown -->
  <div
    class="flex flex-row items-center gap-3 shrink relative"
    :class="minimized ? 'place-content-center' : ''"
    @mouseenter="onTriggerMouseEnter"
    @mouseleave="onTriggerMouseLeave"
  >
    <!-- User Dropdown -->
    <Teleport to="body" v-if="showUserDropdown">
      <div tag="div" class="flexify-dashboard-isolation">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
          :class="prefersDark ? 'dark' : ''"
          class="flexify-dashboard-normalize"
        >
          <div
            v-if="isDropdownVisible"
            ref="userDropdownRef"
            :style="`top: ${dropdownPosition.top}px; left: ${dropdownPosition.left}px;`"
            class="bg-[#313d4a] rounded-lg shadow-lg border border-[#444e59] min-w-[240px] fixed z-[9999] text-zinc-100"
            @mouseenter="onDropdownMouseEnter"
            @mouseleave="onDropdownMouseLeave"
          >
            <!-- User info header -->
            <div
              class="px-4 py-3 border-b border-[#444e59]"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 bg-zinc-700 dark:bg-zinc-600 text-white rounded-full font-medium flex items-center justify-center relative overflow-hidden"
                >
                  <span
                    class="lowercase text-sm"
                    style="top: calc(((-1em / 1.5) + 1ex) / 2)"
                    >{{ appStore.state.userName.charAt(0) }}</span
                  >
                  <img
                    v-if="gravatar"
                    :src="gravatar"
                    class="absolute w-full h-full object-cover"
                  />
                </div>
                <div class="flex flex-col leading-tight grow min-w-0">
                  <span
                    class="font-medium text-zinc-100 truncate text-sm"
                    >{{ appStore.state.userName }}</span
                  >
                  <span
                    class="text-xs text-zinc-400 truncate"
                    >{{ appStore.state.userEmail }}</span
                  >
                </div>
              </div>
            </div>

            <!-- Menu items -->
            <div class="py-1">
              <template v-for="item in userMenuItems" :key="item.id">
                <button
                  @click="handleUserMenuAction(item)"
                  class="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-[#1c2434] transition-colors"
                  :class="
                    item.destructive
                      ? 'text-red-300 hover:text-red-200'
                      : 'text-zinc-100'
                  "
                >
                  <AppIcon :icon="item.icon" class="text-sm opacity-70" />
                  <span class="text-sm">{{ item.name }}</span>
                </button>
                <div
                  v-if="item.divider"
                  class="h-px bg-[#444e59] my-1 mx-4"
                ></div>
              </template>
            </div>

            <!-- Quick actions footer -->
            <div
              class="px-4 py-3 border-t border-[#444e59]"
            >
              <div class="space-y-3">
                <!-- Theme selector -->
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-medium text-zinc-300"
                    >{{ __('Theme', 'flexify-dashboard') }}</span
                  >
                  <div
                    class="flex bg-[#1c2434] rounded-lg p-0.5"
                  >
                    <button
                      @click="setColorScheme('light')"
                      class="px-2 py-1 text-xs rounded-md transition-colors"
                      :class="
                        userPreference === 'light'
                          ? 'bg-[#313d4a] text-zinc-100 shadow-sm'
                          : 'text-zinc-400 hover:bg-[#1c2434] hover:text-zinc-100'
                      "
                      :title="__('Light Mode', 'flexify-dashboard')"
                    >
                      <AppIcon icon="light_mode" class="text-sm" />
                    </button>
                    <button
                      @click="setColorScheme('dark')"
                      class="px-2 py-1 text-xs rounded-md transition-colors"
                      :class="
                        userPreference === 'dark'
                          ? 'bg-[#313d4a] text-zinc-100 shadow-sm'
                          : 'text-zinc-400 hover:bg-[#1c2434] hover:text-zinc-100'
                      "
                      :title="__('Dark Mode', 'flexify-dashboard')"
                    >
                      <AppIcon icon="dark_mode" class="text-sm" />
                    </button>
                    <button
                      @click="setColorScheme('system')"
                      class="px-2 py-1 text-xs rounded-md transition-colors"
                      :class="
                        userPreference === 'system'
                          ? 'bg-[#313d4a] text-zinc-100 shadow-sm'
                          : 'text-zinc-400 hover:bg-[#1c2434] hover:text-zinc-100'
                      "
                      :title="__('System', 'flexify-dashboard')"
                    >
                      <AppIcon icon="settings" class="text-sm" />
                    </button>
                  </div>
                </div>

                <!-- Search button (only when openSearch is provided) -->
                <div
                  v-if="openSearch"
                  class="flex items-center justify-between"
                >
                  <span class="text-xs text-zinc-400">{{
                    __('Quick Actions', 'flexify-dashboard')
                  }}</span>
                  <button
                    @click="
                      () => {
                        openSearch();
                        cancelPendingClose();
                        isHoveringTrigger = false;
                        isHoveringDropdown = false;
                        isDropdownVisible = false;
                        showUserDropdown = false;
                      }
                    "
                    class="p-1.5 rounded hover:bg-[#1c2434] transition-colors"
                    :title="__('Focus Search', 'flexify-dashboard')"
                  >
                    <AppIcon
                      icon="search"
                      class="text-sm text-zinc-300"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Teleport>

    <!-- Minimized trigger (avatar only) -->
    <div
      v-if="minimized"
      ref="triggerRef"
      class="w-7 aspect-square bg-zinc-700 dark:bg-indigo-700 text-white rounded-full font-semibold flex place-content-center items-center justify-center shrink-0 relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600"
    >
      <span class="uppercase">{{ appStore.state.userName.charAt(0) }}</span>
      <img
        v-if="gravatar"
        :src="gravatar"
        class="absolute w-full h-full z-[2] object-cover"
      />
    </div>

    <!-- Full trigger (card with avatar and info) -->
    <div
      v-else
      ref="triggerRef"
      class="p-2 bg-[#313d4a] rounded-xl flex flex-row items-center gap-3 w-full border border-[#444e59]"
    >
      <div
        class="w-8 aspect-square bg-zinc-700 dark:bg-zinc-600 text-white rounded-full font-medium flex items-center justify-center shrink-0 relative overflow-hidden cursor-pointer hover:bg-zinc-600 dark:hover:bg-zinc-500 transition-colors"
      >
        <span
          class="lowercase relative text-sm"
          style="top: calc(((-1em / 1.5) + 1ex) / 2)"
          >{{ appStore.state.userName.charAt(0) }}</span
        >
        <img
          v-if="gravatar"
          :src="gravatar"
          class="absolute w-full h-full object-cover"
        />
      </div>
      <div
        class="flex flex-col leading-tight grow min-w-0 cursor-pointer hover:bg-[#1c2434] rounded-lg p-2 -m-2 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span
            class="truncate font-medium text-zinc-100 text-sm"
            >{{ appStore.state.userName }}</span
          >
          <AppIcon
            :icon="showUserDropdown ? 'keyboard_arrow_up' : 'expand_more'"
            class="text-sm text-zinc-300 transition-transform"
            :class="showUserDropdown ? 'rotate-0' : 'rotate-0'"
          />
        </div>
        <span class="text-xs text-zinc-400 truncate">{{
          appStore.state.userEmail
        }}</span>
      </div>
    </div>
  </div>
</template>

