<script setup>
import LoginField from '@/pages/login/src/login-field.vue';
import LoginAlert from '@/pages/login/src/login-alert.vue';
import LoginFooterNote from '@/pages/login/src/login-footer-note.vue';
import LoginPasswordField from '@/pages/login/src/login-password-field.vue';
import LoginSubmitButton from '@/pages/login/src/login-submit-button.vue';
import LoginCheckbox from '@/pages/login/src/login-checkbox.vue';
import LoginRecoveryPanel from '@/pages/login/src/login-recovery-panel.vue';

const username = defineModel('username', {
  type: String,
  default: '',
});

const remember = defineModel('remember', {
  type: Boolean,
  default: false,
});

const recoveryLogin = defineModel('recoveryLogin', {
  type: String,
  default: '',
});

const showPassword = defineModel('showPassword', {
  type: Boolean,
  default: false,
});

const password = defineModel('password', {
  type: String,
  default: '',
});

defineProps({
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
  loginActionUrl: {
    type: String,
    required: true,
  },
  initialLetter: {
    type: String,
    required: true,
  },
  isLoginScreen: {
    type: Boolean,
    default: true,
  },
  isRecoveryScreen: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  recoveryLoading: {
    type: Boolean,
    default: false,
  },
  notice: {
    type: Object,
    default: null,
  },
  recaptchaEnabled: {
    type: Boolean,
    default: false,
  },
  recaptchaError: {
    type: String,
    default: '',
  },
  submitDisabled: {
    type: Boolean,
    default: false,
  },
  recoverySubmitDisabled: {
    type: Boolean,
    default: false,
  },
  setRecaptchaContainer: {
    type: Function,
    required: true,
  },
});

defineEmits([
  'submit',
  'submitRecovery',
  'togglePassword',
  'showLogin',
  'showRecovery',
]);
</script>

<template>
  <section class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-6 py-8 dark:bg-gray-950 lg:px-16">
    <div class="fd-login-mobile-glow"></div>
    <div class="mx-auto w-full max-w-[30rem]">
      <div class="w-full">
        <a
          v-if="siteInfoLoading || siteInfo.logoUrl || config.authLogoUrl"
          :href="config.homeUrl || config.loginUrl || loginActionUrl"
          class="mb-6 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 no-underline shadow-[0_12px_32px_rgba(16,24,40,0.08)] lg:hidden"
        >
          <span
            v-if="siteInfoLoading"
            class="block h-8 w-32 animate-pulse rounded-md bg-slate-200"
          ></span>
          <img
            v-else
            :src="siteInfo.logoUrl || config.authLogoUrl"
            :alt="
              siteInfo.siteName ||
              config.siteName ||
              __('Logo', 'flexify-dashboard')
            "
            class="block max-h-12 max-w-44 object-contain"
          />
        </a>

        <template v-if="isLoginScreen">
          <div class="mb-3 text-[clamp(2.1rem,2.7vw,3.2rem)] font-semibold leading-none tracking-[-0.03em] text-gray-900 dark:text-white">
            {{ __('Sign In', 'flexify-dashboard') }}
          </div>
          <p class="m-0 text-base leading-[1.55] text-gray-500 dark:text-gray-400">
            {{ __('Enter your email and password to sign in!', 'flexify-dashboard') }}
          </p>
        </template>

        <template v-else>
          <div class="mb-3 text-[clamp(2.1rem,2.7vw,3.2rem)] font-semibold leading-none tracking-[-0.03em] text-gray-900 dark:text-white">
            {{ __('Recover Password', 'flexify-dashboard') }}
          </div>
          <p class="m-0 text-base leading-[1.55] text-gray-500 dark:text-gray-400">
            {{
              __(
                'Enter your email or username and we will send you a recovery link.',
                'flexify-dashboard'
              )
            }}
          </p>
        </template>

        <div class="mt-6 space-y-4">
          <LoginAlert
            v-if="notice"
            :type="notice.type"
            :message="notice.message"
          />

          <LoginAlert
            v-if="errorMessage"
            type="error"
            :message="errorMessage"
          />
        </div>

        <form
          v-if="isLoginScreen"
          class="mt-8"
          :action="loginActionUrl"
          method="post"
          novalidate
          @submit.prevent="$emit('submit')"
        >
          <div class="space-y-5">
            <input
              v-if="config.redirectTo"
              type="hidden"
              name="redirect_to"
              :value="config.redirectTo"
            />

            <input
              type="hidden"
              name="testcookie"
              value="1"
            />

            <LoginField
              id="fd-login-username"
              v-model="username"
              :label="__('Email', 'flexify-dashboard')"
              required-label="*"
              input-name="log"
              input-type="email"
              inputmode="email"
              autocomplete="username"
              :placeholder="__('info@gmail.com', 'flexify-dashboard')"
            />

            <LoginPasswordField
              v-model:password="password"
              :show-password="showPassword"
              @toggle="$emit('togglePassword')"
            />

            <div class="flex items-center justify-between gap-4 mb-5!">
              <LoginCheckbox
                id="checkboxLabelOne"
                v-model="remember"
                input-name="rememberme"
                input-value="forever"
                :label="__('Keep me logged in', 'flexify-dashboard')"
              />

              <a
                :href="config.lostPasswordUrl"
                class="cursor-pointer text-sm text-gray-500 no-underline transition-all duration-150 hover:text-brand-600 dark:text-brand-400 dark:hover:bg-white/5 dark:hover:text-brand-300"
                @click.prevent="$emit('showRecovery')"
              >
                {{ __('Forgot password?', 'flexify-dashboard') }}
              </a>
            </div>

            <div>
              <LoginSubmitButton
                :loading="loading"
                :disabled="submitDisabled"
              />
            </div>
          </div>
        </form>

        <LoginRecoveryPanel
          v-else-if="isRecoveryScreen"
          v-model:recovery-login="recoveryLogin"
          :loading="recoveryLoading"
          :disabled="recoverySubmitDisabled"
          @submit-recovery="$emit('submitRecovery')"
          @show-login="$emit('showLogin')"
        />

        <div
          v-if="recaptchaEnabled"
          class="mt-5 space-y-2"
        >
          <div :ref="setRecaptchaContainer" class="fd-recaptcha-holder"></div>
          <p
            v-if="recaptchaError"
            class="text-sm text-rose-600 dark:text-rose-300"
          >
            {{ recaptchaError }}
          </p>
        </div>

        <LoginFooterNote
          v-if="config.registrationUrl && isLoginScreen"
          :href="config.registrationUrl"
        />
      </div>
    </div>
  </section>
</template>
