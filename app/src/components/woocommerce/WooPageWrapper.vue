<script setup>
import { useDarkMode } from '@/composables/useDarkMode.js';
import Notifications from '@/components/utility/notifications/index.vue';

const { isDark } = useDarkMode();
</script>

<template>
  <div class="flexify-dashboard-isolation">
    <component is="style">:root{font-size:14px}#wpcontent{padding:0}#wpbody-content{padding:0}</component>
    <div class="font-sans" :class="isDark ? 'dark' : ''">
      <div class="h-[var(--fd-body-height)] max-h-[var(--fd-body-height)] overflow-y-auto bg-gray-50 custom-scrollbar dark:bg-gray-900">
        <div class="mx-auto w-full max-w-[1536px] p-4 pb-20 md:p-6">
          <slot />
        </div>
      </div>
      <Notifications />
    </div>
  </div>
</template>

<style>
html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height));
}

#wpbody-content {
  padding: 0;
}

#wpcontent {
  padding: 0 !important;
}
</style>
