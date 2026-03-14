<script setup>
import { ref, onMounted, computed, watchEffect, nextTick } from 'vue';
import { ShadowRoot } from 'vue-shadow-dom';

// Import comps
import Notifications from '@/components/utility/notifications/index.vue';
import LoadingIndicator from '@/components/utility/loading-indicator/index.ts';
import AdminMenu from '@/components/app/menu/index.vue';
import ToolBar from '@/components/app/toolbar/index.vue';

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { watchNodeSize } from '@/assets/js/functions/watchNodeSize.js';
import { hexToRgb } from '@/assets/js/functions/hexToRgb.js';
import { isObject } from '@/assets/js/functions/isObject.js';
import { autoDarkMode } from '@/assets/js/functions/autoDarkMode.js';
import { mountHelpers } from './src/mountHelpers.js';
import {
  setupColorScheme,
  useColorScheme,
} from '@/assets/js/functions/useColorScheme.js';
setupColorScheme();
const { prefersDark } = useColorScheme();

// Refs
const adoptedStyleSheets = ref(new CSSStyleSheet());
const loading = ref(true);
const requiresSetup = ref(false);
const bodyholder = ref(null);
const shadowRootHolder = ref(null);

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

/**
 * Injects styles into shadow root
 */
const setStyles = () => {
  let appStyleNode = document.querySelector('#flexify-dashboard-frontend-css');

  const appStyles = appStyleNode.sheet;
  for (const rule of [...appStyles.cssRules].reverse()) {
    adoptedStyleSheets.value.insertRule(rule.cssText);
  }
  setCustomProperties();

  let temporaryCSS = document.querySelector('#fd-temp-style');
  if (temporaryCSS) temporaryCSS.remove();

  //appStyleNode.remove();
};

const returnCustomCSS = computed(() => {
  return appStore.state.flexify_dashboard_settings?.custom_css || '';
});

const returnLayout = computed(() => {
  return appStore.state.flexify_dashboard_settings?.layout;
});

const setCustomProperties = () => {
  // Base colors
  if (Array.isArray(appStore.state.flexify_dashboard_settings.base_theme_scale)) {
    const baseCssValues = appStore.state.flexify_dashboard_settings.base_theme_scale;
    for (let color of baseCssValues) {
      const hexArray = hexToRgb(color.color);
      const variableName = `--fd-base-${color.step}`;
      document.documentElement.style.setProperty(
        variableName,
        hexArray.join(' ')
      );
    }
  }

  // Accent colors
  if (Array.isArray(appStore.state.flexify_dashboard_settings.accent_theme_scale)) {
    const baseCssValues = appStore.state.flexify_dashboard_settings.accent_theme_scale;

    for (let color of baseCssValues) {
      const hexArray = hexToRgb(color.color);
      const variableName = `--fd-accent-${color.step}`;
      document.documentElement.style.setProperty(
        variableName,
        hexArray.join(' ')
      );
    }
  }
};

/**
 * Get's site settings
 */
const getSettings = async () => {
  // If user can't manage options we need to bail;
  if (!appStore.state.canManageOptions) return;

  appStore.updateState('loading', true);

  const args = { endpoint: 'wp/v2/settings', params: {} };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) {
    finishLoading();
    return;
  }
  const flexify_dashboard_settings = response.data.flexify_dashboard_settings;

  if (!flexify_dashboard_settings || Array.isArray(flexify_dashboard_settings)) {
    //requiresSetup.value = true;
    appStore.updateState('flexify_dashboard_settings', {});
    finishLoading();
    return;
  }

  appStore.updateState('flexify_dashboard_settings', flexify_dashboard_settings);

  finishLoading();
};

const finishLoading = () => {
  //appStore.updateState("loading", false);
  loading.value = false;
};

const mountViewTransitions = async () => {
  // No view transition support
  if (!document.startViewTransition) return;

  let isNavigating = false;

  window.navigation.addEventListener('navigate', (event) => {
    const toUrl = new URL(event.destination.url);

    // Only handle navigate events for same-origin navigation
    if (location.origin !== toUrl.origin) return;

    // Don't intercept if it's a reload or if we're already navigating
    if (
      event.navigationType === 'reload' ||
      event.navigationType === 'replace' ||
      isNavigating
    )
      return;

    // Don't load on hash changes
    if (toUrl) {
      if (toUrl.hash) return;
    }

    appStore.updateState('loading', true);

    setTimeout(() => {
      appStore.updateState('loading', false);
    }, 5000);
  });
};

watchEffect(() => {
  if (prefersDark.value) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
});

document.body.classList.add('fd-body');

setStyles();
onMounted(mountViewTransitions);

window.addEventListener('pagehide', (event) => {
  appStore.updateState('loading', false);
});

// Watch for changes to the settings options and update accordingly
document.addEventListener('flexify-dashboard-settings-update', (event) => {
  // Bail if not an object
  if (!isObject(event.detail)) return;
  // Update settings
  appStore.state.flexify_dashboard_settings = {
    ...appStore.state.flexify_dashboard_settings,
    ...event.detail,
  };
});
</script>

<template>
  <ShadowRoot
    tag="div"
    :adopted-style-sheets="[adoptedStyleSheets]"
    :class="toolbarContainerClasses"
    style="font-size: 14px"
  >
    <div class="flexify-dashboard-isolation">
      <div
        class="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 flexify-dashboard-normalize absolute left-0 top-0 right-0 text-base text-zinc-700 dark:text-zinc-300"
        style="z-index: 99999"
        :class="prefersDark ? 'dark' : ''"
      >
        <component is="style" v-html="returnCustomCSS"></component>
        <ToolBar :class="toolbarClasses" id="fd-toolbar" :frontend="true" />
      </div>

      <component is="style">
        :host, :root { font-size: 32px; line-height: 1.5; font-family: Arial,
        sans-serif;} ```css :host .text-xs { font-size: 0.75em; line-height:
        1em; } :host .text-sm { font-size: 0.875em; line-height: 1.25em; } :host
        .text-base { font-size: 1em; line-height: 1.5em; } :host .text-lg {
        font-size: 1.125em; line-height: 1.75em; } :host .text-xl { font-size:
        1.25em; line-height: 1.75em; } :host .text-2xl { font-size: 1.5em;
        line-height: 2em; } :host .text-3xl { font-size: 1.875em; line-height:
        2.25em; } ```
      </component>

      <template
        v-if="
          Array.isArray(appStore.state.flexify_dashboard_settings.external_stylesheets)
        "
        v-for="(style, index) in appStore.state.flexify_dashboard_settings
          .external_stylesheets"
      >
        <link
          rel="stylesheet"
          :id="`fd-external-${index}-css`"
          :href="style"
          media="all"
        />
      </template>
    </div>
  </ShadowRoot>
</template>
