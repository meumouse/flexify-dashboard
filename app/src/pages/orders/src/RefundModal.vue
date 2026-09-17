<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { FdAlert, FdButton, FdCheckbox, FdInput, FdModal } from '@/components/kit';
import { notify } from '@/assets/js/functions/notify.js';
import { useOrderHelpers } from './useOrderHelpers.js';

const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  order: { type: Object, required: true },
  supportsGatewayRefund: { type: Boolean, default: false },
  /** Extra item data from the context endpoint, keyed by item id */
  items: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['refunded']);

const { wc, orderPrice, toDecimal, decode, currency, totalRefunded, sprintf } = useOrderHelpers();

const saving = ref(false);
const error = ref('');
const lines = ref([]);
const form = reactive({ amount: '', reason: '', restock: true, manual: false });

/**
 * Quantities already refunded for each line item.
 */
const refundedQuantities = computed(() =>
  Object.fromEntries((props.order.line_items || []).map((item) => [item.id, Number(props.items?.[item.id]?.refunded_qty) || 0]))
);

const available = computed(() => Math.max(0, (Number(props.order.total) || 0) - totalRefunded(props.order)));

const linesTotal = computed(() => lines.value.reduce((total, line) => total + (Number(line.quantity) || 0) * line.unit, 0));

watch(open, (value) => {
  if (!value) return;

  error.value = '';
  form.reason = '';
  form.restock = true;
  form.manual = !props.supportsGatewayRefund;
  form.amount = '';

  lines.value = (props.order.line_items || []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unit = quantity ? ((Number(item.total) || 0) + (Number(item.total_tax) || 0)) / quantity : 0;

    return {
      id: item.id,
      name: decode(item.name),
      max: Math.max(0, quantity - (refundedQuantities.value[item.id] || 0)),
      quantity: 0,
      unit,
      taxes: item.taxes || [],
      total: Number(item.total) || 0,
      totalTax: Number(item.total_tax) || 0,
      originalQuantity: quantity,
    };
  });
});

watch(linesTotal, (value) => {
  if (value > 0) form.amount = value.toFixed(currency.value.decimals ?? 2).replace('.', currency.value.decimal_separator || ',');
});

const submit = async () => {
  error.value = '';
  const amount = Number(toDecimal(form.amount));

  if (!amount || amount <= 0) {
    error.value = __('Enter a refund amount greater than zero.', 'flexify-dashboard');
    return;
  }

  if (amount > available.value + 0.001) {
    error.value = sprintf(__('The refund amount cannot exceed %s.', 'flexify-dashboard'), orderPrice(available.value, props.order));
    return;
  }

  const lineItems = lines.value
    .filter((line) => Number(line.quantity) > 0)
    .map((line) => {
      const ratio = line.originalQuantity ? Number(line.quantity) / line.originalQuantity : 0;

      return {
        id: line.id,
        quantity: Number(line.quantity),
        refund_total: Number((line.total * ratio).toFixed(4)),
        refund_tax: line.taxes.map((tax) => ({ id: tax.id, refund_total: Number(((Number(tax.total) || 0) * ratio).toFixed(4)) })),
      };
    });

  saving.value = true;

  const response = await wc(`orders/${props.order.id}/refunds`, {
    type: 'POST',
    data: {
      amount: toDecimal(form.amount),
      reason: form.reason,
      api_refund: !form.manual,
      api_restock: form.restock,
      line_items: lineItems,
    },
  });

  saving.value = false;

  if (!response?.data) return;

  notify({ title: __('Refund created', 'flexify-dashboard'), type: 'success' });
  open.value = false;
  emit('refunded', response.data);
};
</script>

<template>
  <FdModal v-model:open="open" size="lg" :title="__('Refund order', 'flexify-dashboard')" :description="sprintf(__('Available to refund: %s', 'flexify-dashboard'), orderPrice(available, order))">
    <div class="space-y-5">
      <FdAlert v-if="error" variant="error" :title="error" />

      <div v-if="lines.length" class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table class="w-full text-theme-sm">
          <thead class="bg-gray-50 text-theme-xs text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
            <tr>
              <th class="px-4 py-2.5 text-start font-medium">{{ __('Item', 'flexify-dashboard') }}</th>
              <th class="px-4 py-2.5 text-end font-medium">{{ __('Unit price', 'flexify-dashboard') }}</th>
              <th class="w-28 px-4 py-2.5 text-end font-medium">{{ __('Qty to refund', 'flexify-dashboard') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="line in lines" :key="line.id">
              <td class="px-4 py-3 text-gray-800 dark:text-white/90">
                {{ line.name }}
                <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ sprintf(__('%d available', 'flexify-dashboard'), line.max) }}</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-end text-gray-500 dark:text-gray-400">{{ orderPrice(line.unit, order) }}</td>
              <td class="px-4 py-3">
                <FdInput v-model.number="line.quantity" type="number" min="0" :max="line.max" step="1" size="sm" :disabled="!line.max" :aria-label="__('Quantity to refund', 'flexify-dashboard')" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <FdInput v-model="form.amount" :label="__('Refund amount', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" required />
        <FdInput v-model="form.reason" :label="__('Reason (optional)', 'flexify-dashboard')" />
      </div>

      <div class="space-y-3">
        <FdCheckbox v-model="form.restock" :label="__('Restock refunded items', 'flexify-dashboard')" />
        <FdCheckbox
          v-if="supportsGatewayRefund"
          v-model="form.manual"
          :label="__('Refund manually', 'flexify-dashboard')"
          :description="__('Record the refund without sending it to the payment gateway.', 'flexify-dashboard')"
        />
        <FdAlert
          v-else
          variant="info"
          :title="__('Manual refund', 'flexify-dashboard')"
          :message="__('The payment method does not support automatic refunds. Remember to return the money to the customer manually.', 'flexify-dashboard')"
        />
      </div>
    </div>

    <template #footer>
      <FdButton variant="outline" @click="open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
      <FdButton variant="danger" :loading="saving" @click="submit">
        {{ form.amount ? sprintf(__('Refund %s', 'flexify-dashboard'), orderPrice(toDecimal(form.amount), order)) : __('Refund', 'flexify-dashboard') }}
      </FdButton>
    </template>
  </FdModal>
</template>
