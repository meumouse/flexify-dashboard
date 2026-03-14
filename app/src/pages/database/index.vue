<script setup>
// Funcs
import { useDarkMode } from './useDarkMode.js';
const { isDark } = useDarkMode();

// Comps
import Notifications from '@/components/utility/notifications/index.vue';
import LoadingIndicator from '@/components/utility/loading-indicator/index.ts';
</script>

<template>
  <!--Menu -->
  <div
    class="flexify-dashboard-isolation max-w-[calc(100vw-var(--fd-menu-width))] overflow-hidden"
  >
    <component is="style">
      :root{font-size:14px}#wpcontent{padding:0}</component
    >
    <div
      class="overflow-hidden flexify-dashboard-normalize font-sans h-[var(--fd-body-height)] max-h-[var(--fd-body-height)] max-w-full"
      :class="isDark ? 'dark' : ''"
    >
      <Notifications />
      <div class="translate-x-0">
        <LoadingIndicator :height="3" />
      </div>
      <RouterView />
    </div>
  </div>
</template>

<style>
html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}
#wpbody-content {
  padding: 0;
}
#wpcontent {
  padding: 0 !important;
}
</style>
