<script setup>
import { ref } from 'vue';
import FdButton from './FdButton.vue';
import FdModal from './FdModal.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { __ } from './i18n.js';

/**
 * Promise based confirmation dialog.
 *
 * const confirm = ref();
 * const ok = await confirm.value.show({ title, message, confirmLabel, variant: 'danger' });
 */
const open = ref(false);
const options = ref({});
let resolver = null;

const show = (opts = {}) => {
  options.value = {
    title: __('Are you sure?', 'flexify-dashboard'),
    message: '',
    confirmLabel: __('Confirm', 'flexify-dashboard'),
    cancelLabel: __('Cancel', 'flexify-dashboard'),
    variant: 'primary',
    icon: '',
    ...opts,
  };
  open.value = true;

  return new Promise((resolve) => {
    resolver = resolve;
  });
};

const finish = (value) => {
  open.value = false;
  resolver?.(value);
  resolver = null;
};

const iconTone = {
  danger: 'bg-error-50 text-error-500 dark:bg-error-500/15',
  warning: 'bg-warning-50 text-warning-500 dark:bg-warning-500/15',
  primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15',
};

defineExpose({ show });
</script>

<template>
  <FdModal v-model:open="open" size="sm" hide-close @close="finish(false)">
    <div class="flex flex-col items-center gap-4 pt-2 text-center">
      <div
        v-if="options.icon || options.variant === 'danger'"
        :class="cn('flex h-14 w-14 items-center justify-center rounded-full', iconTone[options.variant] || iconTone.primary)"
      >
        <AppIcon :icon="options.icon || 'warning'" class="text-2xl" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ options.title }}</h3>
        <p v-if="options.message" class="mt-2 text-sm text-gray-500 dark:text-gray-400" v-html="options.message"></p>
      </div>
    </div>
    <template #footer>
      <div class="flex w-full gap-3">
        <FdButton variant="outline" block @click="finish(false)">{{ options.cancelLabel }}</FdButton>
        <FdButton :variant="options.variant === 'danger' ? 'danger' : options.variant === 'warning' ? 'warning' : 'primary'" block @click="finish(true)">
          {{ options.confirmLabel }}
        </FdButton>
      </div>
    </template>
  </FdModal>
</template>
