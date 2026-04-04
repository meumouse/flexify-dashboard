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
});

defineEmits(['submitRecovery', 'showLogin']);
</script>

<template>
  <form class="mt-8 grid gap-5" @submit.prevent="$emit('submitRecovery')">
    <LoginField
      id="fd-login-recovery"
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

    <LoginSubmitButton
      :loading="loading"
      :disabled="disabled"
    >
      {{ __('Send recovery link', 'flexify-dashboard') }}
    </LoginSubmitButton>

    <button
      type="button"
      class="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-[0.95rem] font-semibold text-gray-700 transition-[border-color,color,box-shadow] duration-150 hover:border-[#008aff] hover:text-[#008aff] hover:shadow-[0_8px_24px_rgba(0,138,255,0.08)] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      @click="$emit('showLogin')"
    >
      {{ __('Back to sign in', 'flexify-dashboard') }}
    </button>
  </form>
</template>
