<script setup>
import LoginField from '@/pages/login/src/login-field.vue';
import LoginSubmitButton from '@/pages/login/src/login-submit-button.vue';

const recoveryLogin = defineModel('recoveryLogin', {
  type: String,
  default: '',
});

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  recaptchaEnabled: {
    type: Boolean,
    default: false,
  },
  recaptchaError: {
    type: String,
    default: '',
  },
  setRecaptchaContainer: {
    type: Function,
    default: null,
  },
});

defineEmits(['submitRecovery', 'showLogin']);
</script>

<template>
  <form class="mt-8 grid gap-5" @submit.prevent="$emit('submitRecovery')">
    <LoginField
      id="fd-login-recovery"
      class="!mb-[1rem]"
      v-model="recoveryLogin"
      :label="__('Email or username', 'flexify-dashboard')"
      required-label="*"
      input-name="user_login"
      input-type="text"
      inputmode="email"
      autocomplete="username"
      :placeholder="__('info@gmail.com', 'flexify-dashboard')"
      icon="email"
    />

    <div
      v-if="recaptchaEnabled"
      class="space-y-2"
    >
      <div :ref="setRecaptchaContainer" class="fd-recaptcha-holder"></div>
      <p
        v-if="recaptchaError"
        class="text-sm text-rose-600 dark:text-rose-300"
      >
        {{ recaptchaError }}
      </p>
    </div>

    <LoginSubmitButton
      :loading="loading"
      :disabled="disabled"
    >
      {{ __('Send recovery link', 'flexify-dashboard') }}
    </LoginSubmitButton>

    <button
      type="button"
      class="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-[0.95rem] font-semibold text-gray-700 transition-[border-color,color,box-shadow] duration-150 hover:border-[rgb(var(--fd-base-500)/1)] hover:text-[rgb(var(--fd-base-500)/1)] hover:shadow-[0_8px_24px_rgb(var(--fd-base-500)/0.08)] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      @click="$emit('showLogin')"
    >
      {{ __('Back to sign in', 'flexify-dashboard') }}
    </button>
  </form>
</template>
