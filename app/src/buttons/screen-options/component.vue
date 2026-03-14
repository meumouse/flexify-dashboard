<script setup>
import { ref, defineProps } from 'vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { useAppStore } from '@/store/app/app.js';

const props = defineProps({
  appData: Object,
  id: String,
  className: String,
});

const appStore = useAppStore();
const screenOptions = ref(false);
const optionsVisible = ref(true);

/**
 * Checks if screen options are available
 */
const setScreenActions = () => {
  const options = document.querySelector('#screen-options-wrap');
  if (!options) optionsVisible.value = false;
};

/**
 * Toggles screen options visibility
 */
const toggleScreenLinks = () => {
  const wrap = document.querySelector('#screen-options-wrap');
  const meta = document.querySelector('#screen-meta');

  // No screen links so bail
  if (!wrap || !meta) return;

  if (!screenOptions.value) {
    wrap.style.display = 'block';
    meta.style.display = 'block';
    wrap.classList.remove('hidden');
    screenOptions.value = true;
  } else {
    wrap.style.display = 'none';
    meta.style.display = 'none';
    screenOptions.value = false;
  }
};

setScreenActions();
</script>

<template>
  <AppButton
    v-if="
      optionsVisible &&
      !appStore.state?.flexify_dashboard_settings?.hide_screenoptions
    "
    type="transparent"
    :title="__('Screen options', 'flexify-dashboard')"
    @click="toggleScreenLinks"
    class="max-md:hidden"
    :class="className"
  >
    <AppIcon icon="tune" class="text-xl" />
  </AppButton>
</template>

