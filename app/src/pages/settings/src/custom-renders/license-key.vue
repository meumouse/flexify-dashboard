<script setup>
import { ref, computed } from 'vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import StatusTag from '@/components/utility/status-tag/index.vue';
import { isNonProduction } from '@/assets/js/functions/isNonProduction.js';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  licenseStatus: {
    type: Object,
    default: () => ({
      is_valid: false,
      license_key: '',
      license_title: '',
      expire_date: '',
      support_end: '',
      renew_link: '',
      status_source: 'none',
    }),
  },
  onActivate: {
    type: Function,
    required: true,
  },
  onRemove: {
    type: Function,
    required: true,
  },
  keyactions: {
    type: Boolean,
    default: false,
  },
});

const newKey = ref('');

const hasLicense = computed(() => {
  return Boolean(props.licenseStatus?.is_valid);
});

const licenseStatusLabel = computed(() => {
  return props.licenseStatus?.is_valid
    ? __('Valid', 'flexify-dashboard')
    : __('Invalid', 'flexify-dashboard');
});

const featuresLabel = computed(() => {
  return props.licenseStatus?.is_valid
    ? __('Pro', 'flexify-dashboard')
    : __('Free', 'flexify-dashboard');
});

const licenseTypeLabel = computed(() => {
  return (
    props.licenseStatus?.license_title || __('Not available', 'flexify-dashboard')
  );
});

const licenseExpiryLabel = computed(() => {
  const expireDate = props.licenseStatus?.expire_date;

  if (!expireDate) {
    return __('Not available', 'flexify-dashboard');
  }

  const normalized = String(expireDate).toLowerCase();

  if (normalized === 'no expiry' || normalized === 'never' || normalized === 'unlimited') {
    return __('Never expires', 'flexify-dashboard');
  }

  return expireDate;
});

const maskedLicenseKey = computed(() => {
  const licenseKey = props.licenseStatus?.license_key || props.modelValue?.license_key || '';

  if (!licenseKey) {
    return __('Not available', 'flexify-dashboard');
  }

  const parts = String(licenseKey).split('-');

  if (parts.length <= 2) {
    const visibleStart = licenseKey.slice(0, 4);
    const visibleEnd = licenseKey.slice(-4);
    return `${visibleStart}XXXXXXXX${visibleEnd}`;
  }

  return parts
    .map((part, index) => {
      if (index === 0 || index === parts.length - 1) {
        return part;
      }

      return 'XXXXXXXX';
    })
    .join('-');
});
</script>

<template>
  <div>
    <div v-if="hasLicense">
      <div class="flex flex-row gap-3 items-center">
        <StatusTag status="success" :text="__('Licence Active', 'flexify-dashboard')" class="text-lg" />
        <AppButton
          type="warning"
          @click="onRemove"
          :loading="keyactions"
        >
          {{ __('Remove key', 'flexify-dashboard') }}
        </AppButton>
      </div>
      <div class="mt-3 text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
        <p class="font-medium text-zinc-900 dark:text-zinc-100">
          {{ __('License information:', 'flexify-dashboard') }}
        </p>
        <p>
          {{ __('License status:', 'flexify-dashboard') }} {{ licenseStatusLabel }}
        </p>
        <p>
          {{ __('Features:', 'flexify-dashboard') }} {{ featuresLabel }}
        </p>
        <p>
          {{ __('License type:', 'flexify-dashboard') }} {{ licenseTypeLabel }}
        </p>
        <p>
          {{ __('License expires on:', 'flexify-dashboard') }}
          {{ licenseExpiryLabel }}
        </p>
        <p>
          {{ __('Your license key:', 'flexify-dashboard') }} {{ maskedLicenseKey }}
        </p>
      </div>
    </div>

    <div v-else>
      <div class="grid grid-cols-3 gap-3">
        <AppInput
          v-model="newKey"
          class="col-span-2"
          icon="key"
          :placeholder="__('Flexify Dashboard licence key', 'flexify-dashboard')"
        />
        <AppButton
          type="default"
          :disabled="!newKey"
          @click="onActivate(newKey)"
          :loading="keyactions"
        >
          <span class="mx-auto">{{ __('Activate', 'flexify-dashboard') }}</span>
        </AppButton>
      </div>
      <div
        v-if="isNonProduction()"
        class="bg-emerald-100 dark:bg-emerald-600/20 border border-emerald-400 dark:border-emerald-700 p-2 rounded-lg text-sm mt-3"
      >
        {{
          __(
            'Development server detected, no need to activate your licence key.',
            'flexify-dashboard'
          )
        }}
      </div>
    </div>
  </div>
</template>

