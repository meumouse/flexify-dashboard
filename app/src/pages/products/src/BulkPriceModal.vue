<script setup>
import { computed, reactive, watch } from 'vue';
import { FdButton, FdInput, FdModal, FdTabs } from '@/components/kit';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

const open = defineModel('open', { type: Boolean, default: false });

defineProps({
  count: { type: Number, default: 0 },
});

const emit = defineEmits(['apply']);
const { currency, toDecimal } = useWooCommerce();

const form = reactive({
  target: 'regular',
  operation: 'increase',
  mode: 'percent',
  amount: '',
});

watch(open, (value) => {
  if (value) Object.assign(form, { target: 'regular', operation: 'increase', mode: 'percent', amount: '' });
});

const valid = computed(() => form.amount !== '' && Number(toDecimal(form.amount)) >= 0);

const apply = () => {
  if (!valid.value) return;

  emit('apply', {
    target: form.target,
    operation: form.operation,
    mode: form.operation === 'set' ? 'fixed' : form.mode,
    amount: toDecimal(form.amount),
  });

  open.value = false;
};
</script>

<template>
  <FdModal v-model:open="open" size="sm" :title="__('Adjust prices', 'flexify-dashboard')" :description="sprintf(__('%d selected product(s). Variations of variable products are updated too.', 'flexify-dashboard'), count)">
    <form id="fd-bulk-price" class="space-y-5" @submit.prevent="apply">
      <div>
        <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">{{ __('Price', 'flexify-dashboard') }}</p>
        <FdTabs
          v-model="form.target"
          variant="segmented"
          :items="[
            { value: 'regular', label: __('Regular price', 'flexify-dashboard') },
            { value: 'sale', label: __('Sale price', 'flexify-dashboard') },
          ]"
        />
      </div>
      <div>
        <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">{{ __('Operation', 'flexify-dashboard') }}</p>
        <FdTabs
          v-model="form.operation"
          variant="segmented"
          :items="[
            { value: 'increase', label: __('Increase', 'flexify-dashboard') },
            { value: 'decrease', label: __('Decrease', 'flexify-dashboard') },
            { value: 'set', label: __('Set to', 'flexify-dashboard') },
          ]"
        />
      </div>
      <div v-if="form.operation !== 'set'">
        <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">{{ __('Adjust by', 'flexify-dashboard') }}</p>
        <FdTabs
          v-model="form.mode"
          variant="segmented"
          :items="[
            { value: 'percent', label: __('Percentage', 'flexify-dashboard') },
            { value: 'fixed', label: __('Fixed amount', 'flexify-dashboard') },
          ]"
        />
      </div>
      <FdInput
        v-model="form.amount"
        :label="__('Amount', 'flexify-dashboard')"
        inputmode="decimal"
        :prefix="form.operation === 'set' || form.mode === 'fixed' ? currency.symbol : ''"
        :suffix="form.operation !== 'set' && form.mode === 'percent' ? '%' : ''"
        required
      />
    </form>
    <template #footer>
      <FdButton variant="outline" @click="open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
      <FdButton type="submit" form="fd-bulk-price" :disabled="!valid">{{ __('Apply', 'flexify-dashboard') }}</FdButton>
    </template>
  </FdModal>
</template>
