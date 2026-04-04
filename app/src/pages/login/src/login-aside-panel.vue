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
  '--fd-login-aside-bg': props.siteInfo.asideColor || props.config.asideColor || '#10175a',
}));
</script>

<template>
  <aside
    class="fd-login-aside relative hidden h-full w-full items-center overflow-hidden lg:grid lg:min-h-screen"
    :style="asideStyle"
  >
    <div class="fd-login-aside-inner relative z-[1] flex h-full w-full items-center justify-center">
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

      <div class="fd-login-brand-wrapper flex flex-col items-center text-center">
        <LoginAsideBrand
          :href="config.homeUrl || config.loginUrl || '/'"
          :site-name="siteName"
          :site-description="siteDescription"
          :logo-url="logoUrl"
          :loading="siteInfoLoading"
          :initial-letter="initialLetter"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.fd-login-aside {
  background-color: var( --fd-login-aside-bg );
}

.fd-login-aside-inner {
  position: relative;
}

.fd-login-grid-pattern {
  position: absolute;
  z-index: -1;
  width: 100%;
  max-width: 250px;
  opacity: 0.9;
  pointer-events: none;
  user-select: none;
}

.fd-login-grid-pattern--top {
  top: 0;
  right: 0;
}

.fd-login-grid-pattern--bottom {
  bottom: 0;
  left: 0;
  transform: rotate(180deg);
}

.fd-login-brand-wrapper {
  position: relative;
  z-index: 1;
}

:deep(.fd-login-brand) {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

:deep(.fd-login-brand__link) {
  display: block;
  margin-bottom: 1rem;
}

:deep(.fd-login-brand__description) {
  color: rgb( 156 163 175 / 1 );
  text-align: center;
}

@media ( min-width: 1280px ) {
  .fd-login-grid-pattern {
    max-width: 450px;
  }
}
</style>
