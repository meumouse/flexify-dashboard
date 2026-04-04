<script setup>
import { computed } from 'vue';
import LoginAsideBrand from '@/pages/login/src/login-aside-brand.vue';

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
  siteInfo: {
    type: Object,
    required: true,
  },
  siteInfoLoading: {
    type: Boolean,
    default: false,
  },
  initialLetter: {
    type: String,
    required: true,
  },
});

const siteName = computed(() => props.siteInfo.siteName || props.config.siteName || '');
const siteDescription = computed(() => props.siteInfo.siteDescription || props.config.siteDescription || '');
const logoUrl = computed(() => props.siteInfo.logoUrl || props.config.asideLogoUrl || '');
const gridPatternUrl = computed(() => props.config.gridPatternUrl || '');
const asideStyle = computed(() => ({
  '--fd-login-aside-color': props.siteInfo.asideColor || props.config.asideColor || '#008aff',
  '--fd-login-aside-start':
    props.siteInfo.asideGradientStart || props.config.asideGradientStart || '#0070e0',
  '--fd-login-aside-end':
    props.siteInfo.asideGradientEnd || props.config.asideGradientEnd || '#002f73',
  '--fd-login-aside-glow':
    props.siteInfo.asideGlowColor || props.config.asideGlowColor || '#1392ff',
}));
</script>

<template>
  <aside
    class="fd-login-aside relative hidden h-full w-full items-center lg:grid lg:min-h-screen lg:w-full"
    :style="asideStyle"
  >
    <div
      class="fd-login-aside-image"
      :style="config.loginImage ? `background-image:url('${config.loginImage}')` : ''"
    ></div>
    <img
      v-if="gridPatternUrl"
      :src="gridPatternUrl"
      alt="grid"
      class="fd-login-grid-pattern fd-login-grid-pattern--top"
    />
    <img
      v-if="gridPatternUrl"
      :src="gridPatternUrl"
      alt="grid"
      class="fd-login-grid-pattern fd-login-grid-pattern--bottom"
    />

    <div class="fd-login-aside-content relative z-[1] flex w-full items-center justify-center">
      <LoginAsideBrand
        :href="config.homeUrl || config.loginUrl || '/'"
        :site-name="siteName"
        :site-description="siteDescription"
        :logo-url="logoUrl"
        :loading="siteInfoLoading"
        :initial-letter="initialLetter"
      />
    </div>
  </aside>
</template>
