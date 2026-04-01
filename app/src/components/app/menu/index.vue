<script setup>
import { ref, computed, watchEffect, watch, nextTick, onMounted } from 'vue';

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { processMenu } from './utils/processMenu.js';
import { returnIconOverrides } from './utils/returnIconOverrides.js';
import { returnDashIconClasses } from './utils/returnDashIconClasses.js';
import { flattenedSubItems } from './utils/flattenedSubItems.js';
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';
import { useColorScheme } from '@/assets/js/functions/useColorScheme.js';
const { prefersDark } = useColorScheme();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import ResizerHandler from '@/components/app/panel-resizer/index.vue';
import AdminNotices from '@/components/app/admin-notices/index.vue';
import NotificationsPanel from '@/components/app/admin-notices/NotificationsPanel.vue';
import UserDetails from './components/UserDetails.vue';
import ComponentRender from '@/components/app/component-render/index.vue';
import RemoteSiteSelect from '@/components/utility/remote-site-select/index.vue';
import MenuSearch from './components/MenuSearch.vue';
import MenuMinimized from './components/MenuMinimized.vue';
import MenuExpanded from './components/MenuExpanded.vue';
import FavoritesSection from './components/FavoritesSection.vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// State
import { loading, menu, OGmenu } from './state/constants.js';

// Composables
import { useFavorites } from './composables/useFavorites.js';
import { useMenuCache } from './composables/useMenuCache.js';
import { useRemoteFiltering } from './composables/useRemoteFiltering.js';

const { favorites } = useFavorites();
const { cacheMenu, getMenuFromLocalStorage } = useMenuCache();
const {
  selectedRemoteSite,
  canSeeRemoteSiteSwitcher,
  isRemoteSiteActive,
  filterMenuForRemoteSite,
} = useRemoteFiltering();

// Local refs
const menupanel = ref(null);
const panelWidth = ref(240);
const menus = ref([]);
const showNotifications = ref(false);
const props = defineProps(['mobile']);

// Sidebar render hooks
const preMenuComponents = ref([]);
const postMenuComponents = ref([]);

/**
 * Computed property that filters menu items based on remote site status.
 * @returns {Array} Filtered array of menu items.
 */
const returnMenuItems = computed(() => {
  if (!Array.isArray(menu.value)) return [];

  let filteredMenu = menu.value.filter((item) => !item.settings?.hidden);

  // Filter submenu items for hidden status and preserve open state
  filteredMenu = filteredMenu.map((item) => {
    if (Array.isArray(item.submenu)) {
      return {
        ...item,
        // Preserve open state for manual toggling
        open: item.open || false,
        submenu: item.submenu.filter((subItem) => !subItem.settings?.hidden),
      };
    }
    // Preserve open state even if no submenu
    return {
      ...item,
      open: item.open || false,
    };
  });

  // If remote site is active, filter to only show allowed Flexify Dashboard pages
  if (isRemoteSiteActive.value) {
    filteredMenu = filterMenuForRemoteSite(filteredMenu);
  }

  return filteredMenu;
});

/**
 * Computed property that returns whether the menu is minimised
 */
const isMenuMinified = computed(() => {
  if (props.mobile) return false;
  return appStore.state.menu_minimised;
});

/**
 * Computed property that returns whether admin menu search is enabled
 */
const isMenuSearchEnabled = computed(() => {
  return appStore.state?.flexify_dashboard_settings?.enable_admin_menu_search === true;
});

const getMenuForUser = async () => {
  // Ensure the original menu has been parsed before moving on
  await setMenu();

  // Attempt to fetch menu from cache
  const cachedMenu = getMenuFromLocalStorage();
  if (Array.isArray(cachedMenu)) {
    menu.value = cachedMenu;
    filterMenu();
    return;
  } else if (cachedMenu == 'no_menus') {
    menu.value = [...OGmenu.value];
    return;
  }

  setTimeout(getRemoteMenus, 1);
};

const getRemoteMenus = async () => {
  // Ensure the original menu has been parsed before moving on
  await setMenu();

  // Attempt to fetch menu from cache
  const cachedMenu = getMenuFromLocalStorage();
  if (Array.isArray(cachedMenu)) {
    menu.value = cachedMenu;
    filterMenu();
    return;
  } else if (cachedMenu == 'no_menus') {
    menu.value = [...OGmenu.value];
    return;
  }

  loading.value = true;

  const args = {
    endpoint: 'wp/v2/flexify-dashboard-menus',
    params: { per_page: 100, status: 'publish' },
  };
  const data = await lmnFetch(args);

  loading.value = false;

  if (!data) {
    menu.value = [...OGmenu.value];
    return;
  }

  menus.value = data.data;

  setActiveMenu();
};

const setActiveMenu = () => {
  // No custom menus so bail
  if (!menus.value.length) {
    menu.value = [...OGmenu.value];
    cacheMenu('no_menus');
    return;
  }

  for (let remoteMenu of menus.value) {
    const activeForEveryone =
      remoteMenu.meta?.menu_settings?.applies_to_everyone;

    // Menu is set to be active for everyone
    if (activeForEveryone && Array.isArray(remoteMenu.meta?.menu_items)) {
      // Do not set empty menus to active to avoid lock out
      if (!remoteMenu.meta?.menu_items.length) continue;

      // Update menu
      menu.value = [...remoteMenu.meta?.menu_items];
      cacheMenu(remoteMenu.meta?.menu_items);
      filterMenu();
      return;
    }

    const userRoles = appStore.state.userRoles;
    const includesRoles = remoteMenu.meta?.menu_settings?.includes
      ? remoteMenu.meta?.menu_settings?.includes.filter(
          (item) => item.type == 'role'
        )
      : [];
    const includesUsers = remoteMenu.meta?.menu_settings?.includes
      ? remoteMenu.meta?.menu_settings?.includes.filter(
          (item) => item.type == 'user'
        )
      : [];

    // Check if user is matched
    const matchedUser = includesUsers.find(
      (item) => item.id == appStore.state.userID
    );

    // Check if user role matches
    let matchedRole = false;
    for (let role of userRoles) {
      const match = includesRoles.find((item) => item.value == role);
      if (match) {
        matchedRole = true;
        break;
      }
    }

    const excludedRoles = remoteMenu.meta?.menu_settings?.excludes
      ? remoteMenu.meta?.menu_settings?.excludes.filter(
          (item) => item.type == 'role'
        )
      : [];
    const excludedUsers = remoteMenu.meta?.menu_settings?.excludes
      ? remoteMenu.meta?.menu_settings?.excludes.filter(
          (item) => item.type == 'user'
        )
      : [];

    // Check if user is excluded
    const matchedExcludedUser = excludedUsers.find(
      (item) => item.id == appStore.state.userID
    );

    // Check if user role matches
    let matchedExcludedRole = false;
    for (let role of userRoles) {
      const match = excludedRoles.find((item) => item.value == role);
      if (match) {
        matchedExcludedRole = true;
        break;
      }
    }

    // User is either matched by role or user id and not excluded by role or user id
    if (
      (matchedUser || matchedRole) &&
      !matchedExcludedUser &&
      !matchedExcludedRole
    ) {
      // Update menu
      menu.value = [...remoteMenu.meta?.menu_items];
      cacheMenu(remoteMenu.meta?.menu_items);
      filterMenu();
      return;
    }
  }
  // Menus applied so set default
  menu.value = [...OGmenu.value];
  cacheMenu('no_menus');
};

/**
 * Removes items that no longer exist and adds new items
 *
 * @since 1.0.9
 */
const filterMenu = () => {
  let activeItem =
    document.querySelector('#adminmenu a.current') ||
    document.querySelector('#adminmenu .wp-menu-open a') ||
    document.querySelector("#adminmenu a[aria-current='page']");
  let activeURL = '';

  // Get active items URL
  if (activeItem) {
    if (activeItem.tagName && activeItem.tagName.toLowerCase() === 'a') {
      activeURL = activeItem.getAttribute('href');
    }
  }

  // Remove items that no longer exist
  menu.value = menu.value
    .filter((item) => checkIfItemExists(item.id) || item.custom)
    .map((item) => ({
      ...item,
      active: activeURL == item.url,
      // Preserve open state for manual submenu toggling
      open: item.open || false,
    }));

  // Remove sub items that no longer exist
  for (let toplevel of menu.value) {
    // Bail if it's a sep
    if (toplevel.type == 'separator' || !Array.isArray(toplevel.submenu))
      continue;
    toplevel.submenu = toplevel.submenu
      .filter((item) => checkIfItemExists(item.id) || item.custom)
      .map((item) => ({ ...item, active: activeURL == item.url }));
  }

  // Check for items that are new and push to the menu
  for (let [index, toplevel] of OGmenu.value.entries()) {
    // Push to the menu if it's new
    if (!isItemInCustomMenu(toplevel.id)) {
      menu.value.splice(index, 0, toplevel);
    }

    // Continue if there is no submenu
    if (!toplevel.submenu) continue;

    // Loop submenu items to check for new items
    for (let [subindex, sub] of toplevel.submenu.entries()) {
      // Item exists in the menu so continue
      if (isItemInCustomMenu(sub.id)) continue;

      // Find correct top level item to push it to
      const parent = menu.value.find((item) => item.id == toplevel.id);

      if (parent) {
        parent.submenu.splice(subindex, 0, sub);
      } else {
        toplevel.submenu = [sub];
        menu.value.splice(index, 0, toplevel);
      }
    }
  }
};

const flattenedCustomMenuSubItems = computed(() => {
  return menu.value.reduce((acc, item) => {
    if (Array.isArray(item.submenu)) {
      acc.push(...item.submenu);
    }
    return acc;
  }, []);
});

const isItemInCustomMenu = (id) => {
  const existingTopLevel = menu.value.find((item) => item.id == id);
  const existingSubLevel = flattenedCustomMenuSubItems.value.find(
    (item) => item.id == id
  );
  return existingTopLevel || existingSubLevel;
};

const checkIfItemExists = (id) => {
  const existingTopLevel = OGmenu.value.find((item) => item.id == id);
  const existingSubLevel = flattenedSubItems.value.find(
    (item) => item.id == id
  );
  return existingTopLevel || existingSubLevel;
};

/**
 * Updates the width of the panel.
 * @param {number} newWidth - The new width to set for the panel.
 */
const updatePanelWidth = (newWidth) => {
  panelWidth.value = newWidth;
};

/**
 * Sets the menu
 */
const setMenu = async () => {
  const menuNode = document.querySelector('#adminmenumain');
  const { processedMenu } = await processMenu(menuNode);

  OGmenu.value = processedMenu;
};

/**
 * Sets the CSS custom property for menu width
 * @param {number} width - The width value in pixels
 * @param {string} extra - Additional spacing to add (default: '1px')
 */
const setMenuWidthProperty = (width, extra = '1px') => {
  document.documentElement.style.setProperty(
    '--fd-menu-width',
    `calc(${width}px + ${extra})`
  );
};

watchEffect(() => {
  const extra = '1px';

  if (isMenuMinified.value && menupanel.value) {
    setTimeout(() => {
      const rect = menupanel.value.getBoundingClientRect();
      const widther = rect.width;
      setMenuWidthProperty(widther, extra);
    }, 0);
  } else if (showNotifications.value) {
    // Use wider width when notifications panel is open
    const widther = Math.max(360, panelWidth.value);
    setMenuWidthProperty(widther, extra);
  } else {
    let widther = 240;
    widther = panelWidth.value;
    setMenuWidthProperty(widther, extra);
  }
});

watch(
  () => menu.value,
  () => {
    appStore.state.adminMenu = menu.value;
  },
  { deep: true }
);

// Close notifications panel when menu is minimized
watch(isMenuMinified, (minimized) => {
  if (minimized && showNotifications.value) {
    showNotifications.value = false;
  }
});

/**
 * Loads sidebar render components via filter hooks
 */
onMounted(async () => {
  // Dispatch event for plugins to register sidebar components
  const event = new CustomEvent('flexify-dashboard/sidebar/ready');
  document.dispatchEvent(event);

  await nextTick();

  // Register pre-menu components
  preMenuComponents.value = await applyFilters(
    'flexify-dashboard/sidebar/render/premenu',
    preMenuComponents.value
  );

  // Register post-menu components
  postMenuComponents.value = await applyFilters(
    'flexify-dashboard/sidebar/render/postmenu',
    postMenuComponents.value
  );
});

const updateMenuFromFetch = async () => {
  try {
    await nextTick();

    const url = `${appStore.state.adminUrl}/admin.php?page=plugin-manager`;
    const response = await fetch(url);

    // Generic error
    if (!response.ok) {
      return;
    }

    // Get HTML content
    const htmlContent = await response.text();

    // Create a DOM parser to handle the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Find the metrics script tag
    const menuNode = doc.getElementById('adminmenumain');

    if (!menuNode) return;

    // Stops plugin redirection links from altering the active link
    const links = menuNode.querySelectorAll('a');
    for (let link of links) {
      link.classList.remove('current');
      link.classList.remove('wp-menu-open');
      if (link.getAttribute('aria-current') == 'page') {
        link.removeAttribute('aria-current');
      }

      if (link.classList.contains('toplevel_page_plugin-manager')) {
        link.classList.add('current');
      }
    }

    const linksListItems = menuNode.querySelectorAll('li');
    for (let listItem of linksListItems) {
      listItem.classList.remove('current');
      listItem.classList.remove('wp-menu-open');
    }

    // Update menu
    const existingMenuNode = document.getElementById('adminmenumain');
    existingMenuNode.replaceWith(menuNode);
    await nextTick();
    // Process new menu
    await setMenu();
    filterMenu();
  } catch (err) {}
};

document.addEventListener('flexify-dashboard-plugin-activated', updateMenuFromFetch);
document.addEventListener('flexify-dashboard-plugin-deactivated', updateMenuFromFetch);

/**
 * Handles menu cache rotation event by refreshing the menu
 *
 * @since 1.0.9
 * @async
 * @function
 * @returns {Promise<void>}
 */
const handleMenuCacheRotated = async () => {
  // Clear local cache and refresh menu
  await getMenuForUser();
};

// Listen for menu cache rotation events
window.addEventListener('flexify-dashboard-menu-cache-rotated', handleMenuCacheRotated);

getMenuForUser();

setMenuWidthProperty(panelWidth.value);
</script>

<template>
  <div
    class="flex flex-col gap-1 w-full h-full relative max-h-full overflow-hidden bg-[#1c2434] dark:bg-[#24303f] border-r border-white/10"
    ref="menupanel"
    :class="isMenuMinified ? 'py-4' : 'p-4 px-6 pt-2 pb-3'"
    :style="
      isMenuMinified
        ? 'width:auto'
        : showNotifications
        ? `width:${Math.max(360, panelWidth)}px; max-width:100%`
        : `width:${mobile ? '100%' : panelWidth}px`
    "
    v-if="OGmenu"
  >
    <div
      class="flex flex-row items-center pb-2 border-b border-white/10"
      :class="
        isMenuMinified ? 'place-content-center mb-3' : 'place-content-between'
      "
    >
      <template v-if="!isMenuMinified">
        <a
          :href="appStore.state.adminUrl"
          class="pt-2 place-self-start"
          v-if="!appStore.state?.flexify_dashboard_settings?.logo"
        >
          <AppIcon icon="flexify-dashboard" class="text-5xl text-white" />
        </a>

        <a :href="appStore.state.adminUrl" v-else class="h-10">
          <img
            :src="
              prefersDark && appStore.state?.flexify_dashboard_settings?.dark_logo
                ? appStore.state.flexify_dashboard_settings.dark_logo
                : appStore.state.flexify_dashboard_settings.logo
            "
            class="h-full"
          />
        </a>
      </template>

      <div
        class="flex items-center -mr-1"
        :class="isMenuMinified ? 'flex-col-reverse' : 'flex-row'"
      >
        <AdminNotices v-model="showNotifications" :disabled="isMenuMinified" />

        <AppButton
          v-if="!mobile"
          type="transparent"
          :title="__('Minify menu', 'flexify-dashboard')"
          @click="
            appStore.state.menu_minimised = !appStore.state.menu_minimised
          "
          class="hidden md:block"
        >
          <AppIcon
            :icon="
              appStore.state.menu_minimised
                ? 'right_panel_close'
                : 'left_panel_close'
            "
            class="text-xl text-slate-400 hover:text-white transition-colors"
          />
        </AppButton>
      </div>
    </div>

    <component is="style"> {{ returnIconOverrides }}</component>
    <component is="style"> {{ returnDashIconClasses }}</component>

    <!-- Remote Site Switcher -->
    <div
      v-if="!isMenuMinified && canSeeRemoteSiteSwitcher && !showNotifications"
      class="mt-2"
    >
      <RemoteSiteSelect v-model="selectedRemoteSite" />
    </div>

    <div
      v-if="loading"
      class="flex flex-col gap-6 mt-6"
      :class="!isMenuMinified ? 'p-3' : ''"
    >
      <div v-for="index in 4" class="flex flex-col gap-3">
        <div
          class="h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
        ></div>
        <div
          class="h-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
          :class="!isMenuMinified ? 'ml-8 w-2/3' : 'w-full'"
        ></div>
        <div
          class="h-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
          :class="!isMenuMinified ? 'ml-8 w-1/4' : 'w-full'"
        ></div>
        <div
          class="h-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
          :class="!isMenuMinified ? 'ml-8 w-1/3' : 'w-full'"
        ></div>
      </div>
    </div>

    <!-- Notifications Panel (inline in menu - only in expanded mode) -->
    <!-- Using v-show to preserve DOM and moved WordPress notices -->
    <div
      v-show="showNotifications && !isMenuMinified"
      class="flex-1 min-h-0 flex flex-col"
    >
      <NotificationsPanel
        @close="showNotifications = false"
        :is-open="showNotifications"
      />
    </div>

    <!-- Minimised menu -->
    <template v-if="isMenuMinified">
      <MenuMinimized :menuItems="returnMenuItems" :menupanel="menupanel" />
    </template>

    <!-- Standard menu -->
    <div
      v-if="!isMenuMinified && !showNotifications"
      key="menu-expanded"
      class="flex-1 min-h-0 flex flex-col"
    >
      <!-- Pre-menu components -->
      <template v-if="preMenuComponents.length > 0">
        <ComponentRender
          v-for="(component, index) in preMenuComponents"
          :key="component.metadata?.id || `premenu-${index}`"
          :item="component"
        />
      </template>

      <!-- Menu Search (if enabled) -->
      <div v-if="isMenuSearchEnabled && !loading" class="mb-2">
        <MenuSearch
          class="mt-2"
          :menuItems="returnMenuItems"
          :isMenuMinified="isMenuMinified"
        />
      </div>

      <!-- Favorites Section -->
      <FavoritesSection :menupanel="menupanel" :mobile="mobile" />

      <!-- Standard Expanded Menu -->
      <MenuExpanded
        :menuItems="returnMenuItems"
        :menupanel="menupanel"
        :mobile="mobile"
      />

      <!-- Post-menu components -->
      <template v-if="postMenuComponents.length > 0">
        <ComponentRender
          v-for="(component, index) in postMenuComponents"
          :key="component.metadata?.id || `postmenu-${index}`"
          :item="component"
        />
      </template>

      <!-- USER DETAILS with Dropdown -->
      <UserDetails v-if="!isMenuMinified" />
    </div>
    <ResizerHandler
      @resize="updatePanelWidth"
      :minWidth="160"
      :panelRef="menupanel"
    />
  </div>
</template>

<style scoped>
/* Transition animations for view switching */
.slide-fade-enter-active {
  transition: all 0.2s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.15s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.dashicons-before:before {
	font-family: dashicons;
	display: block;
	line-height: 1;
	font-weight: 400;
	font-style: normal;
	text-decoration: inherit;
	text-transform: none;
	text-rendering: auto;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	transition: color 0.1s ease-in;
}

.wp-menu-image.svg {
  background-repeat: no-repeat;
  background-position: center center;
  background-size: contain;
  width: 1.2rem;
  height: 1.2rem;
  filter: contrast(0.5);
}

.flexify-dashboard-sidebar-panel {
  background: linear-gradient(180deg, #0f172a 0%, #0b1326 55%, #08101f 100%);
  color: #e2e8f0;
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: inset -1px 0 0 rgba(15, 23, 42, 0.4);
}

.active .wp-menu-image.svg {
  filter: contrast(0);
}

#toplevel_page_latepoint .dashicons-before::before {
  font-family: 'latepointadmin' !important;
  content: '';
}

.wp-menu-image {
  filter: contrast(0.5);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: contain;
}

.active .wp-menu-image {
  filter: contrast(0);
}

#toplevel_page_woofunnels .dashicons-before:before {
  background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMi4wLjEsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAyMzMuMSAxNDcuMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjMzLjEgMTQ3LjI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+DQoJLnN0MHtmaWxsOiNGMEY1RkE7fQ0KPC9zdHlsZT4NCjxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjMyLDMuOCAxNTAuNCwxNDMuMSAxMTcuOSwxNDMuMSAxOTguOSwzLjggIi8+DQo8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjE2Ny40LDMuOCA4Ni44LDE0My4xIDUuMiwzLjggMTAyLjgsMy44IDg4LjIsMzIuNCA4Ni4zLDMyLjQgNTQuNywzMi40IDg2LjMsODguMiAxMzQuNCwzLjggIi8+DQo8L3N2Zz4NCg==');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
}

#toplevel_page_elementor .dashicons-before:before {
  content: '\e813';
  font-family: eicons !important;
}

body.is-fullscreen-mode.learndash-post-type #sfwd-header {
  left: 0 !important;
}
</style>

<style>
#fd-menu .custom-scrollbar {
  scrollbar-color: #313d4a transparent !important;
  scrollbar-width: thin !important;
}

#fd-menu .custom-scrollbar::-webkit-scrollbar {
  width: 5px !important;
}

#fd-menu .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #313d4a !important;
  border-radius: 9999px;
}

#fd-menu .custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
