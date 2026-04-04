<script setup>
import LoginAsidePanel from '@/pages/login/src/login-aside-panel.vue';
import LoginFormPanel from '@/pages/login/src/login-form-panel.vue';
import LoginShell from '@/pages/login/src/login-shell.vue';
import { useLoginScreen } from '@/pages/login/src/useLoginScreen.js';

const config = window.flexifyDashboardLoginConfig || {};

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
</script>

<template>
  <LoginShell>
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
