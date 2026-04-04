<script setup>
import { computed, onMounted, ref } from 'vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import StatusTag from '@/components/utility/status-tag/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const loading = ref(false);
const saving = ref(false);
const disconnecting = ref(false);
const siteKey = ref('');
const secretKey = ref('');
const configured = ref(false);

const statusText = computed(() =>
  configured.value
    ? __('Configured', 'flexify-dashboard')
    : __('Not configured', 'flexify-dashboard')
);

const syncModel = (value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    google_recaptcha_site_key: value,
  });
};

const loadStatus = async () => {
  loading.value = true;

  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-recaptcha/status',
      type: 'GET',
    });

    if (!response?.data) {
      return;
    }

    configured.value = Boolean(response.data.configured);
    siteKey.value = response.data.site_key || props.modelValue.google_recaptcha_site_key || '';
    syncModel(siteKey.value);
  } finally {
    loading.value = false;
  }
};

const saveCredentials = async () => {
  if (!siteKey.value.trim() || !secretKey.value.trim()) {
    notify({
      title: __('Enter both keys before saving', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  saving.value = true;

  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-recaptcha/credentials',
      type: 'POST',
      data: {
        site_key: siteKey.value.trim(),
        secret_key: secretKey.value.trim(),
      },
    });

    if (!response?.data?.success) {
      return;
    }

    configured.value = true;
    siteKey.value = response.data.site_key || siteKey.value.trim();
    secretKey.value = '';
    syncModel(siteKey.value);

    notify({
      title: __('Google reCAPTCHA credentials saved', 'flexify-dashboard'),
      type: 'success',
    });
  } finally {
    saving.value = false;
  }
};

const disconnect = async () => {
  disconnecting.value = true;

  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-recaptcha/disconnect',
      type: 'POST',
      data: {},
    });

    if (!response?.data?.success) {
      return;
    }

    configured.value = false;
    siteKey.value = '';
    secretKey.value = '';
    syncModel('');

    notify({
      title: __('Google reCAPTCHA disconnected', 'flexify-dashboard'),
      type: 'success',
    });
  } finally {
    disconnecting.value = false;
  }
};

onMounted(() => {
  loadStatus();
});
</script>

<template>
  <div class="col-span-2">
    <div
      class="rounded-2xl border border-zinc-200 dark:border-zinc-700/40 bg-zinc-50 dark:bg-zinc-900/40 p-5 space-y-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <StatusTag
            :status="configured ? 'success' : 'warning'"
            :text="statusText"
          />
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            {{
              __(
                'Use these credentials in the modern administrative login and password recovery forms with Google reCAPTCHA v2 checkbox.',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>

        <AppButton
          v-if="configured"
          type="danger"
          padding="small"
          @click="disconnect"
          :loading="disconnecting"
        >
          {{ __('Disconnect', 'flexify-dashboard') }}
        </AppButton>
      </div>

      <div
        v-if="loading"
        class="text-sm text-zinc-500 dark:text-zinc-400"
      >
        {{ __('Loading integration status...', 'flexify-dashboard') }}
      </div>

      <template v-else>
        <div class="space-y-2">
          <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {{ __('Site key', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="siteKey"
            type="text"
            :placeholder="__('Enter your Google reCAPTCHA site key', 'flexify-dashboard')"
            autocomplete="off"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {{ configured ? __('Replace secret key', 'flexify-dashboard') : __('Secret key', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="secretKey"
            type="password"
            :placeholder="__('Enter your Google reCAPTCHA secret key', 'flexify-dashboard')"
            autocomplete="new-password"
          />
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            {{
              configured
                ? __('To update the integration, enter the current site key you want to keep and a new secret key.', 'flexify-dashboard')
                : __('The secret key is stored securely and never exposed in the generic settings payload.', 'flexify-dashboard')
            }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <AppButton type="primary" @click="saveCredentials" :loading="saving">
            {{ configured ? __('Update credentials', 'flexify-dashboard') : __('Save credentials', 'flexify-dashboard') }}
          </AppButton>
          <span class="text-xs text-zinc-500 dark:text-zinc-400">
            {{
              __(
                'After saving, enable Google reCAPTCHA in Settings > Login to require it on the administrative login and password recovery forms.',
                'flexify-dashboard'
              )
            }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
