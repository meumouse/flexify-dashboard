<script setup>
import {
  ref,
  onMounted,
  computed,
  watchEffect,
  nextTick,
  watch,
  provide,
} from 'vue';

// Import comps
import Notifications from '@/components/utility/notifications/index.vue';
import LoadingIndicator from '@/components/utility/loading-indicator/index.ts';
import AdminMenu from '@/components/app/menu/index.vue';
import ToolBar from '@/components/app/toolbar/index.vue';

// Funcs
import { isObject } from '@/assets/js/functions/isObject.js';
import {
  setupColorScheme,
  useColorScheme,
} from '@/assets/js/functions/useColorScheme.js';
import { ADOPTED_STYLE_SHEETS_KEY } from '@/composables/useAdoptedStyleSheets.js';
import { useShadowStyles } from '@/composables/useShadowStyles.js';
setupColorScheme();
const { prefersDark } = useColorScheme();

// Refs
const adoptedStyleSheets = ref(new CSSStyleSheet());
const animationsEnabled = ref(false);
const bodyHolder = ref(null);

// Provide adoptedStyleSheets globally for child components
provide(ADOPTED_STYLE_SHEETS_KEY, adoptedStyleSheets);

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

const returnCustomCSS = computed(() => {
  return appStore.state.flexify_dashboard_settings?.custom_css || '';
});

/**
 * Get current page identifier for magic dark mode
 * @returns {string} Page identifier (URL path or page parameter)
 */
const getCurrentPageIdentifier = () => {
  const url = new URL(window.location.href);
  const urlParams = new URLSearchParams(url.search);

  // If there's a 'page' parameter, use that (for plugin settings pages)
  if (urlParams.has('page')) {
    return urlParams.get('page');
  }

  // Otherwise use the pathname
  const pathname = url.pathname;
  const adminPath =
    appStore.state.adminUrl?.replace(window.location.origin, '') ||
    '/wp-admin/';

  // Extract the page filename from the path
  if (pathname.includes(adminPath)) {
    const relativePath = pathname.replace(adminPath, '');
    return relativePath || 'index.php';
  }

  // Fallback to full pathname
  return pathname;
};

/**
 * Check if current page is in the magic dark mode pages array
 * @returns {boolean} True if page should have magic dark mode
 */
const isCurrentPageInMagicDarkModeList = () => {
  const magicDarkModePages =
    appStore.state.flexify_dashboard_settings?.magic_dark_mode_pages || [];
  const currentPage = getCurrentPageIdentifier();
  return magicDarkModePages.includes(currentPage);
};

/**
 * Computed property to determine if magic dark mode should be enabled
 */
const shouldUseMagicDarkMode = computed(() => {
  // Only enable if dark mode is active and current page is in the magic dark mode pages list
  return prefersDark.value && isCurrentPageInMagicDarkModeList();
});

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

//setStyles();
onMounted(mountViewTransitions);

window.addEventListener('pagehide', (event) => {
  appStore.updateState('loading', false);
});

// Watch for changes to the settings options and update accordingly
document.addEventListener('flexify-dashboard-settings-update', (event) => {
  // Bail if not an object
  if (!isObject(event.detail)) return;
  // Update settings using updateState to ensure reactivity
  appStore.updateState('flexify_dashboard_settings', {
    ...appStore.state.flexify_dashboard_settings,
    ...event.detail,
  });
});

const menuClasses = computed(() => {
  const baseClasses = 'flexify-dashboard-normalize box-border font-sans';
  const darkClass = prefersDark.value ? 'dark' : '';
  return `${baseClasses} ${darkClass} max-h-screen h-screen sticky top-0`;
});

watch(
  () => prefersDark.value,
  (newVal) => {
    if (newVal) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  { immediate: true }
);

/**
 * Apply or remove magic dark mode class on #wpbody-content
 */
const applyMagicDarkModeClass = () => {
  nextTick(() => {
    const wpbodyContent = document.getElementById('wpbody-content');
    const wpcontent = document.getElementById('wpcontent');

    let wrapper = wpbodyContent || wpcontent;

    if (wrapper) {
      if (shouldUseMagicDarkMode.value) {
        wrapper.classList.add('dark-mode-magic');
      } else {
        wrapper.classList.remove('dark-mode-magic');
      }
    }
  });
};

/**
 * Watch for changes to magic dark mode setting and apply/remove class on #wpbody-content
 */
watch(
  shouldUseMagicDarkMode,
  (enabled) => {
    applyMagicDarkModeClass();
  },
  { immediate: true }
);

/**
 * Watch for URL changes (navigation) and reapply magic dark mode
 */
watch(
  () => window.location.href,
  () => {
    applyMagicDarkModeClass();
  }
);

/**
 * Watch for settings changes to ensure reactivity
 */
watch(
  () => appStore.state.flexify_dashboard_settings?.magic_dark_mode_pages,
  () => {
    applyMagicDarkModeClass();
  },
  { deep: true }
);

// Also apply on mount after a short delay to ensure DOM is ready
onMounted(() => {
  setTimeout(() => {
    applyMagicDarkModeClass();
    animationsEnabled.value = true;
  }, 100);
});

const stopWatcher = watchEffect(() => {
  if (bodyHolder.value) {
    const wpwrap = document.getElementById('wpcontent');
    bodyHolder.value.appendChild(wpwrap);
    stopWatcher();
  }
});

document.documentElement.classList.add('fd-rounded');
document.documentElement.classList.add('uixp');
</script>

<template>
  <div class="fd-container">
    <component is="style"> :root{font-size:14px} </component>
    <component is="style" v-html="returnCustomCSS"></component>
    <component is="style" v-if="animationsEnabled">
      #fd-menu{transition: width 0.3s ease-in-out;} #fd-toolbar{transition:
      left 0.3s ease-in-out;}
    </component>
    <div class="flexify-dashboard-loading-indicator flexify-dashboard-isolation">
      <LoadingIndicator :height="3" class="z-[999]" />
    </div>
    <!-- Menu with combined classes -->
    <div class="fd-layout">
      <div :class="menuClasses" class="flexify-dashboard-isolation flex relative top-0">
        <AdminMenu id="fd-menu" :class="menuClasses" />
      </div>

      <div class="fd-right-column">
        <div
          id="fd-toolbar"
          class="flexify-dashboard-isolation sticky top-0 z-[2]"
          :class="[prefersDark ? 'dark' : '']"
        >
          <ToolBar />
        </div>

        <div class="fd-body-container font-sans">
          <div id="fd-body-holder" ref="bodyHolder" class=""></div>
        </div>
      </div>

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

      <Notifications />
    </div>
  </div>
</template>

<style>
@reference "@/assets/css/tailwind.css";

body,
html {
  @apply text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950;
}

#wpfooter {
  display: none !important;
}

.fd-container {
  @apply bg-white dark:bg-zinc-900 min-h-full w-full max-w-full text-zinc-700 dark:text-zinc-300;
}

.fd-layout {
  @apply shrink-0 bg-white dark:bg-zinc-950 flex flex-row flex-nowrap;
}

.fd-body-container {
  @apply grow w-full;
}

.fd-right-column {
  @apply grow flex flex-col relative top-0;
}

#fd-toolbar {
  @apply sticky top-0 z-[9];
}

.is-fullscreen-mode #fd-toolbar {
  @apply hidden pointer-events-none;
}

.flexify-dashboard-loading-indicator {
  @apply fixed top-0 left-0 right-0 z-[999];
}

html.fd-rounded {
  padding-top: 0;
}

html.fd-rounded #fd-body-holder table.fixed {
  position: static;
}

html.fd-rounded #adminmenu,
html.fd-rounded #adminmenuback,
html.fd-rounded #wpwrap {
	z-index: -1;
	display: none !important;
}

#fd-wpadminbar #wpadminbar {
	display: flex !important;
    position: relative;
	z-index: 99;
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
}

#wpadminbar a.ab-item {
	color: #3C434A !important;
    background-color: transparent !important;
}

html.fd-rounded #adminmenuwrap {
	z-index: -1;
	display: block !important;
}

html.fd-rounded body.is-fullscreen-mode .block-editor__container {
  	z-index: 3 !important;
}

#wpcontent,
#wpfooter {
  	margin-left: 0;
}
</style>
