<script setup>
import { ref, computed, watchEffect, onMounted, nextTick } from 'vue';

// Configure veaury for React 19 support
import { setVeauryOptions } from 'veaury';
import { createRoot } from 'react-dom/client';
setVeauryOptions({
  react: {
    createRoot,
  },
});

import { encodeToHash } from '@/assets/js/functions/encodeToHash.js';
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppSearch from '@/components/app/search/index.vue';
import AppMenu from '@/components/app/menu/index.vue';
import WpToolBar from '@/components/app/wp-toolbar/index.vue';
import { useColorScheme } from '@/assets/js/functions/useColorScheme.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import ComponentRender from '../component-render/index.vue';
import FdSheet from '@/components/kit/FdSheet.vue';
import FdDropdown from '@/components/kit/FdDropdown.vue';
import FdTooltip from '@/components/kit/FdTooltip.vue';
import FdAvatar from '@/components/kit/FdAvatar.vue';
import FdSpinner from '@/components/kit/FdSpinner.vue';

// Import toolbar components registration
import './src/toolbar-components.js';

// Store
import { useAppStore } from '@/store/app/app.js';
const props = defineProps(['frontend']);
const appStore = useAppStore();
const menuopen = ref(false);
const userMenuOpen = ref(false);
const gravatar = ref('');
const loading = ref(false);
const toolbarContainer = ref(null);
const { userPreference, setColorScheme, globalOverride, prefersDark } = useColorScheme();

// Toolbar render hooks
const leftToolbarComponents = ref([]);
const rightToolbarComponents = ref([]);

const headerButton =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 lg:h-11 lg:w-11';

const roundButton =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:h-11 lg:w-11';

const isAdministrator = computed(() => (appStore.state.userRoles || []).includes('administrator'));

const userMenuLinks = computed(() => {
  const links = [
    { id: 'profile', label: __('Edit profile', 'flexify-dashboard'), icon: 'person', url: `${appStore.state.adminUrl}profile.php` },
    { id: 'view-site', label: __('Visit site', 'flexify-dashboard'), icon: 'home', url: appStore.state.siteURL },
  ];

  if (isAdministrator.value) {
    links.push({ id: 'settings', label: __('Site settings', 'flexify-dashboard'), icon: 'settings', url: `${appStore.state.adminUrl}options-general.php` });
  }

  return links;
});

const themeOptions = computed(() => [
  { value: 'light', icon: 'light_mode', label: __('Light', 'flexify-dashboard') },
  { value: 'dark', icon: 'dark_mode', label: __('Dark', 'flexify-dashboard') },
  { value: 'system', icon: 'desktop', label: __('System', 'flexify-dashboard') },
]);

const toggleSidebar = () => {
  appStore.state.menu_minimised = !appStore.state.menu_minimised;
};

const toggleDarkMode = () => {
  setColorScheme(prefersDark.value ? 'light' : 'dark');
};

// Methods
const setGravatar = async () => {
  if (!appStore.state.userEmail) return;
  const hashHex = await encodeToHash(appStore.state.userEmail);
  gravatar.value = `https://gravatar.com/avatar/${hashHex}?d=404&s=88`;
};

/**
 * Logs out the current user
 */
const logoutUser = async () => {
  loading.value = true;

  const args = { endpoint: 'flexify-dashboard/v1/logout', params: {}, type: 'POST' };
  await lmnFetch(args);

  loading.value = false;

  window.location = appStore.state.loginUrl;
};

watchEffect(() => {
  if (toolbarContainer.value) {
    const rect = toolbarContainer.value.getBoundingClientRect();
    document.documentElement.style.setProperty('--fd-toolbar-height', `${rect.height}px`);
    document.documentElement.style.setProperty('--wp-admin--admin-bar--height', `var(--fd-toolbar-height)`);
  }
});

/**
 * Loads toolbar render components via filter hooks
 */
onMounted(async () => {
  // Dispatch event for plugins to register toolbar components
  const event = new CustomEvent('flexify-dashboard/toolbar/ready');
  document.dispatchEvent(event);

  await nextTick();

  // Register left-side components
  leftToolbarComponents.value = await applyFilters('flexify-dashboard/toolbar/render/left', leftToolbarComponents.value);

  // Register right-side components
  rightToolbarComponents.value = await applyFilters('flexify-dashboard/toolbar/render/right', rightToolbarComponents.value);
});

setGravatar();
</script>

<template>
  <div
    id="fd-toolbar"
    ref="toolbarContainer"
    class="pointer-events-auto flex max-w-full flex-row items-center gap-3 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900 max-lg:overflow-hidden lg:gap-4 xl:px-6"
    :class="frontend ? '' : 'py-3 lg:py-4'"
  >
    <component is="style" v-if="frontend">
      #fd-toolbar { height: 32px; } @media screen and (max-width: 782px) { #fd-toolbar { height: 46px; } }
    </component>

    <template v-if="!frontend">
      <!-- Desktop: collapse sidebar -->
      <FdTooltip :text="appStore.state.menu_minimised ? __('Expand sidebar', 'flexify-dashboard') : __('Collapse sidebar', 'flexify-dashboard')" side="bottom">
        <button type="button" :class="headerButton" class="hidden lg:flex" :aria-label="__('Toggle sidebar', 'flexify-dashboard')" @click="toggleSidebar">
          <AppIcon :icon="appStore.state.menu_minimised ? 'menu' : 'left_panel_close'" class="text-xl" />
        </button>
      </FdTooltip>

      <!-- Mobile: open menu drawer -->
      <button type="button" :class="headerButton" class="lg:hidden" :aria-label="__('Toggle menu', 'flexify-dashboard')" @click="menuopen = !menuopen">
        <AppIcon icon="menu" class="text-xl" />
      </button>

      <FdSheet v-model:open="menuopen" side="left" size="sm" bare :title="__('Menu', 'flexify-dashboard')">
        <div class="h-full max-h-full w-full overflow-hidden" :class="prefersDark ? 'dark' : ''">
          <AppMenu :mobile="true" class="h-full max-h-full w-full" />
        </div>
      </FdSheet>
    </template>

    <a v-if="appStore.state?.flexify_dashboard_settings?.logo && frontend" :href="appStore.state.adminUrl" class="me-4 h-5">
      <img
        :src="prefersDark && appStore.state?.flexify_dashboard_settings?.dark_logo ? appStore.state.flexify_dashboard_settings.dark_logo : appStore.state.flexify_dashboard_settings.logo"
        class="h-full"
      />
    </a>

    <a v-else-if="frontend" :href="appStore.state.adminUrl" class="me-4">
      <AppIcon icon="flexify-dashboard" class="text-xl text-brand-500" />
    </a>

    <AppSearch v-if="!frontend && !appStore.state?.flexify_dashboard_settings?.disable_search" />

    <div class="relative flex min-w-0 grow flex-row items-center max-lg:overflow-hidden">
      <!-- Left-side components -->
      <template v-if="leftToolbarComponents.length > 0">
        <ComponentRender v-for="(component, index) in leftToolbarComponents" :key="component.metadata?.id || `left-${index}`" :item="component" />
      </template>

      <div class="no-scrollbar flex w-full flex-row items-center gap-4 max-lg:overflow-auto">
        <WpToolBar />
      </div>
      <div
        id="fd-toolbar-overlay"
        class="pointer-events-none absolute top-0 right-0 bottom-0 hidden w-16 bg-gradient-to-l from-white to-transparent max-lg:block dark:from-gray-900"
      ></div>
    </div>

    <div class="flex shrink-0 flex-row items-center gap-2 lg:gap-3">
      <AppSearch v-if="frontend && !appStore.state?.flexify_dashboard_settings?.disable_search" />

      <!-- Right-side components -->
      <template v-if="rightToolbarComponents.length > 0">
        <ComponentRender v-for="(component, index) in rightToolbarComponents" :key="component.metadata?.id || `right-${index}`" :item="component" />
      </template>

      <!-- Dark mode toggle -->
      <FdTooltip v-if="!globalOverride" :text="prefersDark ? __('Light mode', 'flexify-dashboard') : __('Dark mode', 'flexify-dashboard')" side="bottom">
        <button type="button" :class="roundButton" :aria-label="__('Toggle dark mode', 'flexify-dashboard')" @click="toggleDarkMode">
          <AppIcon :icon="prefersDark ? 'light_mode' : 'dark_mode'" class="text-xl" />
        </button>
      </FdTooltip>

      <!-- User menu -->
      <FdDropdown v-model:open="userMenuOpen" align="end" width="w-[260px]" content-class="p-3">
        <template #trigger>
          <button type="button" class="flex items-center gap-3 rounded-full text-gray-700 dark:text-gray-400" :aria-label="__('User menu', 'flexify-dashboard')">
            <FdAvatar :src="gravatar" :name="appStore.state.userName" size="md" class="lg:h-11 lg:w-11" />
            <span v-if="!frontend" class="hidden max-w-32 truncate text-theme-sm font-medium xl:block">{{ appStore.state.userName }}</span>
            <AppIcon v-if="!frontend" icon="expand_more" class="hidden text-lg transition-transform xl:block" :class="userMenuOpen && 'rotate-180'" />
          </button>
        </template>

        <div class="px-1 pb-3">
          <span class="block truncate text-theme-sm font-medium text-gray-700 dark:text-gray-300">{{ appStore.state.userName }}</span>
          <span class="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">{{ appStore.state.userEmail }}</span>
        </div>

        <ul class="flex flex-col gap-1 border-y border-gray-200 py-3 dark:border-gray-800">
          <li v-for="link in userMenuLinks" :key="link.id">
            <a
              :href="link.url"
              class="group flex items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <AppIcon :icon="link.icon" class="text-xl text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
              {{ link.label }}
            </a>
          </li>
        </ul>

        <div v-if="!globalOverride" class="flex items-center justify-between gap-3 px-1 py-3">
          <span class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ __('Theme', 'flexify-dashboard') }}</span>
          <div class="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900" role="radiogroup" :aria-label="__('Theme', 'flexify-dashboard')">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="userPreference === option.value"
              :title="option.label"
              class="flex h-7 w-8 items-center justify-center rounded-md transition-colors"
              :class="userPreference === option.value ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
              @click="setColorScheme(option.value)"
            >
              <AppIcon :icon="option.icon" class="text-base" />
            </button>
          </div>
        </div>

        <button
          type="button"
          class="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          :class="globalOverride && 'mt-3'"
          :disabled="loading"
          @click="logoutUser"
        >
          <FdSpinner v-if="loading" class="h-5 w-5" />
          <AppIcon v-else icon="logout" class="text-xl text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
          {{ __('Sign out', 'flexify-dashboard') }}
        </button>
      </FdDropdown>
    </div>
  </div>
</template>
