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
const screenHelp = ref(false);
const helpVisible = ref(true);

/**
 * Checks if help is available
 */
const setScreenActions = () => {
  const help = document.querySelector('#contextual-help-wrap');
  if (!help) helpVisible.value = false;
};

/**
 * Toggles help visibility
 */
const toggleHelpLinks = () => {
  const wrap = document.querySelector('#contextual-help-wrap');
  const meta = document.querySelector('#screen-meta');

  // No screen links so bail
  if (!wrap || !meta) return;

  if (!screenHelp.value) {
    wrap.style.display = 'block';
    meta.style.display = 'block';
    wrap.classList.remove('hidden');
    screenHelp.value = true;
  } else {
    wrap.style.display = 'none';
    meta.style.display = 'none';
    screenHelp.value = false;
  }
};

setScreenActions();
</script>

<template>
  <AppButton
    v-if="
      helpVisible && !appStore.state?.flexify_dashboard_settings?.hide_help_toggle
    "
    type="transparent"
    :title="__('Help', 'flexify-dashboard')"
    @click="toggleHelpLinks"
    class="max-md:hidden"
    :class="className"
  >
    <AppIcon icon="help_alt" class="text-2xl" />
  </AppButton>
</template>

