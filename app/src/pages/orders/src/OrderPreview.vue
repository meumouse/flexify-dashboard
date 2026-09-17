<script setup>
import { computed, ref, watch } from 'vue';
import { FdBadge, FdButton, FdDropdown, FdSheet } from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useOrderHelpers } from './useOrderHelpers.js';

const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  order: { type: Object, default: null },
});

const emit = defineEmits(['status-changed', 'open-details']);

const { wc, orderStatus, orderTitle, customerName, formatDate, orderPrice, formatAddress, statusActions, decode, sprintf } = useOrderHelpers();

const paymentLabel = (order) => sprintf(order.date_paid ? __('Paid via %s', 'flexify-dashboard') : __('Payment via %s', 'flexify-dashboard'), order.payment_method_title);

const current = ref(null);
const updating = ref(false);

watch(
  () => props.order,
  (order) => {
    current.value = order ? { ...order } : null;
  },
  { immediate: true }
);

const billingLines = computed(() => formatAddress(current.value?.billing));
const shippingLines = computed(() => formatAddress(current.value?.shipping));

const subtotal = computed(() => (current.value?.line_items || []).reduce((total, item) => total + (Number(item.subtotal) || 0), 0));

const changeStatus = async (status) => {
  updating.value = true;
  const response = await wc(`orders/${current.value.id}`, { type: 'PUT', data: { status } });
  updating.value = false;

  if (!response?.data) return;

  current.value = { ...current.value, status: response.data.status };
  notify({ title: __('Order status updated', 'flexify-dashboard'), type: 'success' });
  emit('status-changed', response.data);
};

const goToDetails = () => {
  open.value = false;
  emit('open-details', current.value);
};
</script>

<template>
  <FdSheet v-model:open="open" size="lg" :title="current ? orderTitle(current) : ''" :description="current ? formatDate(current.date_created, true) : ''">
    <div v-if="current" class="space-y-6">
      <div class="flex flex-wrap items-center gap-3">
        <FdBadge :color="orderStatus(current.status).color" size="md">{{ orderStatus(current.status).label }}</FdBadge>
        <span v-if="current.payment_method_title" class="text-theme-sm text-gray-500 dark:text-gray-400">
          {{ paymentLabel(current) }}
        </span>
      </div>

      <section>
        <h3 class="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Items', 'flexify-dashboard') }}</h3>
        <ul class="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          <li v-for="item in current.line_items" :key="item.id" class="flex items-center gap-3 px-4 py-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img v-if="item.image?.src" :src="item.image.src" alt="" class="h-full w-full object-cover" loading="lazy" />
              <AppIcon v-else icon="inventory" class="text-lg text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ decode(item.name) }}</p>
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">
                {{ item.quantity }} × {{ orderPrice(item.price, current) }}<template v-if="item.sku"> · {{ item.sku }}</template>
              </p>
            </div>
            <span class="whitespace-nowrap text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ orderPrice(item.total, current) }}</span>
          </li>
        </ul>

        <dl class="mt-4 space-y-2 text-theme-sm">
          <div class="flex justify-between text-gray-500 dark:text-gray-400">
            <dt>{{ __('Subtotal', 'flexify-dashboard') }}</dt>
            <dd>{{ orderPrice(subtotal, current) }}</dd>
          </div>
          <div v-if="Number(current.discount_total)" class="flex justify-between text-gray-500 dark:text-gray-400">
            <dt>{{ __('Discount', 'flexify-dashboard') }}</dt>
            <dd><bdi>-{{ orderPrice(current.discount_total, current) }}</bdi></dd>
          </div>
          <div v-if="current.shipping_lines?.length" class="flex justify-between text-gray-500 dark:text-gray-400">
            <dt>{{ __('Shipping', 'flexify-dashboard') }}</dt>
            <dd>{{ orderPrice(current.shipping_total, current) }}</dd>
          </div>
          <div v-if="Number(current.total_tax)" class="flex justify-between text-gray-500 dark:text-gray-400">
            <dt>{{ __('Taxes', 'flexify-dashboard') }}</dt>
            <dd>{{ orderPrice(current.total_tax, current) }}</dd>
          </div>
          <div class="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
            <dt>{{ __('Total', 'flexify-dashboard') }}</dt>
            <dd>{{ orderPrice(current.total, current) }}</dd>
          </div>
        </dl>
      </section>

      <section class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 class="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Billing', 'flexify-dashboard') }}</h3>
          <p v-for="line in billingLines" :key="line" class="text-theme-sm text-gray-500 dark:text-gray-400">{{ line }}</p>
          <a v-if="current.billing?.email" :href="`mailto:${current.billing.email}`" dir="ltr" class="mt-2 block truncate text-theme-sm text-brand-500 hover:text-brand-600">{{ current.billing.email }}</a>
          <a v-if="current.billing?.phone" :href="`tel:${current.billing.phone}`" dir="ltr" class="block text-theme-sm text-brand-500 hover:text-brand-600">{{ current.billing.phone }}</a>
        </div>
        <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 class="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Shipping', 'flexify-dashboard') }}</h3>
          <template v-if="shippingLines.length">
            <p v-for="line in shippingLines" :key="line" class="text-theme-sm text-gray-500 dark:text-gray-400">{{ line }}</p>
          </template>
          <p v-else class="text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No shipping address.', 'flexify-dashboard') }}</p>
          <p v-for="line in current.shipping_lines" :key="line.id" class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {{ line.method_title }}
          </p>
        </div>
      </section>

      <section v-if="current.customer_note" class="rounded-xl bg-warning-50 p-4 dark:bg-warning-500/10">
        <h3 class="mb-1 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Customer note', 'flexify-dashboard') }}</h3>
        <p class="whitespace-pre-line text-theme-sm text-gray-600 dark:text-gray-300">{{ current.customer_note }}</p>
      </section>
    </div>

    <template #footer>
      <FdDropdown v-if="current" :items="statusActions(changeStatus, current.status)" width="w-52" side="top">
        <template #trigger>
          <FdButton variant="outline" icon-right="expand_more" :loading="updating">{{ __('Change status', 'flexify-dashboard') }}</FdButton>
        </template>
      </FdDropdown>
      <FdButton icon-right="arrow_forward" @click="goToDetails">{{ __('View details', 'flexify-dashboard') }}</FdButton>
    </template>
  </FdSheet>
</template>

