<script setup>
import {
  ref,
  computed,
  watchEffect,
  defineProps,
  onMounted,
  nextTick,
} from 'vue';

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
import AppButton from '@/components/utility/app-button/index.vue';
import AppSearch from '@/components/app/search/index.vue';
import AppMenu from '@/components/app/menu/index.vue';
import ContextMenu from '@/components/utility/context-menu/index.vue';
import AppCheckbox from '@/components/utility/checkbox-input/index.vue';
import WpToolBar from '@/components/app/wp-toolbar/index.vue';
import { useColorScheme } from '@/assets/js/functions/useColorScheme.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import ComponentRender from '../component-render/index.vue';
import { Drawer, DrawerContent, DrawerClose } from '@/components/ui/drawer';
import ShadowContainer from '@/components/utility/shadow-container/index.vue';

// Import toolbar components registration
import './src/toolbar-components.js';

// Store
import { useAppStore } from '@/store/app/app.js';
const props = defineProps(['frontend']);
const appStore = useAppStore();
const menuopen = ref(false);
const gravatar = ref(false);
const contextmenu = ref(null);
const loading = ref(false);
const toolbarContainer = ref(null);
const { userPreference, setColorScheme, globalOverride, prefersDark } =
  useColorScheme();

// Toolbar render hooks
const leftToolbarComponents = ref([]);
const rightToolbarComponents = ref([]);

const toggleFullScreen = () => {
  if (appStore.state.fullScreen) appStore.updateState('fullScreen', false);
  else appStore.updateState('fullScreen', true);
};

// Methods
const setGravatar = async () => {
  const hashHex = await encodeToHash(appStore.state.userEmail);
  gravatar.value = `https://gravatar.com/avatar/${hashHex}?d=blank`;
};

/**
 * Logs out the current user
 */
const logoutUser = async () => {
  loading.value = true;

  const args = { endpoint: 'flexify-dashboard/v1/logout', params: {}, type: 'POST' };
  const data = await lmnFetch(args);

  loading.value = false;

  window.location = appStore.state.loginUrl;
};

watchEffect(() => {
  if (toolbarContainer.value) {
    const rect = toolbarContainer.value.getBoundingClientRect();
    document.documentElement.style.setProperty(
      '--fd-toolbar-height',
      `${rect.height}px`
    );
    document.documentElement.style.setProperty(
      '--wp-admin--admin-bar--height',
      `var(--fd-toolbar-height)`
    );
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
  leftToolbarComponents.value = await applyFilters(
    'flexify-dashboard/toolbar/render/left',
    leftToolbarComponents.value
  );

  // Register right-side components
  rightToolbarComponents.value = await applyFilters(
    'flexify-dashboard/toolbar/render/right',
    rightToolbarComponents.value
  );
});

setGravatar();
</script>

<template>
  <div
    id="fd-toolbar"
    class="px-6 flex flex-row items-center pointer-events-auto max-w-full gap-6 max-lg:overflow-hidden bg-zinc-50 dark:bg-zinc-950"
    ref="toolbarContainer"
    :class="frontend ? '' : 'py-3'"
  >
    <component is="style" v-if="frontend">
      #fd-toolbar { height: 32px; } @media screen and (max-width: 782px) {
      #fd-toolbar { height: 46px; } }
    </component>

    <div
      class="flex flex-row items-center gap-4 hidden max-lg:flex"
      v-if="!frontend"
    >
      <AppButton
        type="transparent"
        :title="__('Toggle menu', 'flexify-dashboard')"
        @click="menuopen = !menuopen"
      >
        <AppIcon icon="menu" class="text-xl" />
      </AppButton>

      <Drawer v-model:open="menuopen" direction="bottom">
        <DrawerContent class="max-h-[96vh] overflow-hidden">
          <ShadowContainer
            :teleport="false"
            :wrapperClass="'w-screen h-[92vh] max-h-[92vh] overflow-hidden'"
          >
            <AppMenu :mobile="true" class="w-screen h-full max-h-full" />
          </ShadowContainer>
        </DrawerContent>
      </Drawer>
    </div>

    <div
      class="relative grow max-lg:overflow-hidden flex flex-row items-center"
    >
      <!-- Left-side components -->
      <template v-if="leftToolbarComponents.length > 0">
        <ComponentRender
          v-for="(component, index) in leftToolbarComponents"
          :key="component.metadata?.id || `left-${index}`"
          :item="component"
        />
      </template>

      <a
        v-if="appStore.state?.flexify_dashboard_settings?.logo && frontend"
        :href="appStore.state.adminUrl"
        class="h-5 mr-6"
      >
        <img
          :src="
            prefersDark && appStore.state?.flexify_dashboard_settings?.dark_logo
              ? appStore.state.flexify_dashboard_settings.dark_logo
              : appStore.state.flexify_dashboard_settings.logo
          "
          class="h-full"
        />
      </a>

      <a v-else-if="frontend" :href="appStore.state.adminUrl" class="mr-6">
        <AppIcon icon="uipress" class="text-xl dark:text-white" />
      </a>

      <div
        class="flex flex-row items-center gap-4 w-full max-lg:overflow-auto no-scrollbar pr-16"
      >
        <WpToolBar />
      </div>
      <div
        class="hidden max-lg:block absolute right-0 w-16 top-0 bottom-0 bg-gradient-to-l from-white to-transparent dark:from-zinc-950 pointer-events-none"
        id="fd-toolbar-overlay"
      ></div>
    </div>

    <div class="flex flex-row items-center">
      <AppSearch v-if="!appStore.state?.flexify_dashboard_settings?.disable_search" />

      <!-- Right-side components -->
      <template v-if="rightToolbarComponents.length > 0">
        <ComponentRender
          v-for="(component, index) in rightToolbarComponents"
          :key="component.metadata?.id || `right-${index}`"
          :item="component"
        />
      </template>

      <div
        class="w-6 aspect-square bg-zinc-700 dark:bg-indigo-700 text-white rounded-full font-semibold flex place-content-center items-center justify-center shrink-0 relative overflow-hidden ml-2 cursor-pointer dark:hover:bg-indigo-800 hover:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700"
        @click="contextmenu.show"
      >
        <span
          class="lowercase relative text-sm"
          style="top: calc(((-1em / 1.5) + 1ex) / 2)"
          >{{ appStore.state.userName.charAt(0) }}</span
        >
        <img v-if="gravatar" :src="gravatar" class="absolute w-full h-full" />
      </div>

      <!-- User menu -->
      <ContextMenu ref="contextmenu" :teleport="true">
        <div class="flex flex-col gap-2 w-40">
          <template v-if="!globalOverride">
            <div class="">{{ __('Theme', 'flexify-dashboard') }}</div>
            <div class="flex flex-col gap-2">
              <label
                class="flex flex-row items-center gap-2 px-2 mt-2 cursor-pointer"
                @click.stop.prevent="setColorScheme('system')"
              >
                <AppCheckbox
                  :dynamic="userPreference == 'system' ? true : false"
                />
                <span class="dark:text-zinc-400">{{
                  __('System', 'flexify-dashboard')
                }}</span>
              </label>

              <label
                class="flex flex-row items-center gap-2 px-2 cursor-pointer"
                @click.stop.prevent="setColorScheme('light')"
              >
                <AppCheckbox
                  :dynamic="userPreference == 'light' ? true : false"
                />
                <span class="dark:text-zinc-400">{{
                  __('Light', 'flexify-dashboard')
                }}</span>
              </label>

              <label
                class="flex flex-row items-center gap-2 px-2 cursor-pointer"
                @click.stop.prevent="setColorScheme('dark')"
              >
                <AppCheckbox
                  :dynamic="userPreference == 'dark' ? true : false"
                />
                <span class="dark:text-zinc-400">{{
                  __('Dark', 'flexify-dashboard')
                }}</span>
              </label>
            </div>

            <div
              class="my-2 mb-1 border-t border-zinc-200 dark:border-zinc-700"
            ></div>
          </template>

          <AppButton
            type="transparent"
            class="shrink-0"
            :loading="loading"
            @click="logoutUser"
            :title="__('Logout', 'flexify-dashboard')"
          >
            <span
              class="flex flex-row items-center gap-2 place-content-between"
            >
              <span>{{ __('Logout', 'flexify-dashboard') }}</span>
              <AppIcon icon="logout" class="text-lg" />
            </span>
          </AppButton>
        </div>
      </ContextMenu>
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
}
</style>
