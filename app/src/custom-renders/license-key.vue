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
  return props.modelValue.license_key || props.modelValue.instance_id;
});
</script>

<template>
  <div>
    <div v-if="hasLicense">
      <div class="flex flex-row gap-3">
        <StatusTag
          status="success"
          :text="__('Licence Active', 'flexify-dashboard')"
          class="text-lg"
        />
        <AppButton
          type="warning"
          @click="onRemove"
          :loading="keyactions"
        >
          {{ __('Remove key', 'flexify-dashboard') }}
        </AppButton>
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

