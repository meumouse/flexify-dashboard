<script setup>
import { computed } from 'vue';
import LoginAsidePanel from '@/pages/login/src/login-aside-panel.vue';
import LoginFormPanel from '@/pages/login/src/login-form-panel.vue';
import LoginShell from '@/pages/login/src/login-shell.vue';
import { useLoginScreen } from '@/pages/login/src/useLoginScreen.js';

const config = window.flexifyDashboardLoginConfig || {};

const hexToRgbValue = (hexColor, fallback = '0 138 255') => {
  if (typeof hexColor !== 'string') {
    return fallback;
  }

  const normalized = hexColor.trim().replace('#', '');

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `${r} ${g} ${b}`;
};

const {
  username,
  password,
  remember,
  recoveryLogin,
  showPassword,
  loading,
  recoveryLoading,
  errorMessage,
  notice,
  recaptchaError,
  recaptchaEnabled,
  siteInfo,
  siteInfoLoading,
  loginActionUrl,
  initialLetter,
  isLoginScreen,
  isRecoveryScreen,
  submitDisabled,
  recoverySubmitDisabled,
  setRecaptchaContainer,
  togglePassword,
  showLoginScreen,
  showRecoveryScreen,
  submit,
  submitRecovery,
} = useLoginScreen(config);

const asideStyle = computed(() => ({
  '--fd-login-aside-bg': siteInfo.value?.asideColor || config.asideColor || '#008aff',
  '--fd-login-aside-start':
    siteInfo.value?.asideGradientStart || config.asideGradientStart || '#27a1ff',
  '--fd-login-aside-end':
    siteInfo.value?.asideGradientEnd || config.asideGradientEnd || '#0060b3',
  '--fd-login-aside-glow':
    siteInfo.value?.asideGlowColor || config.asideGlowColor || '#1392ff',
  '--fd-base-400': hexToRgbValue(
    siteInfo.value?.asideGradientStart || config.asideGradientStart || '#27a1ff',
    '39 161 255'
  ),
  '--fd-base-500': hexToRgbValue(
    siteInfo.value?.asideColor || config.asideColor || '#008aff',
    '0 138 255'
  ),
  '--fd-base-600': hexToRgbValue(
    siteInfo.value?.asideGradientEnd || config.asideGradientEnd || '#0060b3',
    '0 96 179'
  ),
}));
</script>

<template>
  <LoginShell :style="asideStyle">
    <template #form>
      <LoginFormPanel
        v-model:username="username"
        v-model:password="password"
        v-model:remember="remember"
        v-model:recovery-login="recoveryLogin"
        v-model:show-password="showPassword"
        :config="config"
        :site-info="siteInfo"
        :site-info-loading="siteInfoLoading"
        :login-action-url="loginActionUrl"
        :initial-letter="initialLetter"
        :is-login-screen="isLoginScreen"
        :is-recovery-screen="isRecoveryScreen"
        :error-message="errorMessage"
        :notice="notice"
        :loading="loading"
        :recovery-loading="recoveryLoading"
        :recaptcha-enabled="recaptchaEnabled"
        :recaptcha-error="recaptchaError"
        :submit-disabled="submitDisabled"
        :recovery-submit-disabled="recoverySubmitDisabled"
        :set-recaptcha-container="setRecaptchaContainer"
        @toggle-password="togglePassword"
        @show-login="showLoginScreen"
        @show-recovery="showRecoveryScreen"
        @submit="submit"
        @submit-recovery="submitRecovery"
      />
    </template>

    <template #aside>
      <LoginAsidePanel
        :config="config"
        :site-info="siteInfo"
        :site-info-loading="siteInfoLoading"
        :initial-letter="initialLetter"
      />
    </template>
  </LoginShell>
</template>
