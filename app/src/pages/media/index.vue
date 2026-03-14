<script setup>


// Funcs
import { useDarkMode } from './src/useDarkMode.js';
const { isDark } = useDarkMode();

// Comps
import Notifications from '@/components/utility/notifications/index.vue';



</script>

<template>
  <!--Menu -->
  <div
    tag="div"
    class="flexify-dashboard-isolation"
  >
    <component is="style">
      :root{font-size:14px}#wpcontent{padding:0}</component
    >
    <div
      class="overflow-hidden flexify-dashboard-normalize font-sans h-[var(--fd-body-height)] max-h-[var(--fd-body-height)]"
      :class="isDark ? 'dark' : ''"
    >
      <Notifications />
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
