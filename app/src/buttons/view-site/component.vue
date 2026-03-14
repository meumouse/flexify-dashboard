<script setup>
import { defineProps } from 'vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { useAppStore } from '@/store/app/app.js';

const props = defineProps({
  appData: Object,
  id: String,
  className: String,
});

const appStore = useAppStore();

console.log(appStore.state);
</script>

<template>
  <a :href="appStore.state.siteURL" v-if="!appStore.state.frontPage">
    <AppButton
      type="transparent"
      :title="__('View site', 'flexify-dashboard')"
      :class="className"
    >
      <AppIcon icon="home" class="text-xl" />
    </AppButton>
  </a>
  <a :href="appStore.state.adminUrl" v-else-if="appStore.state.frontPage">
    <AppButton
      type="transparent"
      :title="__('View dashboard', 'flexify-dashboard')"
      :class="className"
    >
      <AppIcon icon="dashboard" class="text-xl" />
    </AppButton>
  </a>
</template>
