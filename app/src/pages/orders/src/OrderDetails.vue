<script setup>
import { computed, defineAsyncComponent, onMounted, ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import {
  FdAvatar,
  FdBadge,
  FdButton,
  FdCard,
  FdConfirmDialog,
  FdDropdown,
  FdEmptyState,
  FdPageHeader,
  FdSkeleton,
  FdTooltip,
} from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';
import { useCountries, useOrderHelpers } from './useOrderHelpers.js';
import OrderNotes from './OrderNotes.vue';
import RefundModal from './RefundModal.vue';
import AddressModal from './AddressModal.vue';

const ComponentRender = defineAsyncComponent(() => import('@/components/app/component-render/index.vue'));

const props = defineProps({
  id: { type: Number, required: true },
});

const router = useRouter();
const {
  store,
  wc,
  fd,
  can,
  orderStatus,
  orderTitle,
  customerName,
  formatDate,
  orderPrice,
  itemsCount,
  totalRefunded,
  statusActions,
  classicOrderUrl,
  decode,
  sprintf,
} = useOrderHelpers();
const { loadCountries, countryName } = useCountries();

const order = ref(null);
const context = ref(null);
const loading = ref(true);
const notFound = ref(false);
const statusUpdating = ref(false);
const actionRunning = ref(false);
const refundOpen = ref(false);
const addressModal = ref({ open: false, type: 'billing' });
const confirmDialog = ref(null);
const notesRef = ref(null);
const extensionCards = shallowRef([]);
const siblings = ref({ previous: null, next: null });

const status = computed(() => orderStatus(order.value?.status));
const refunded = computed(() => totalRefunded(order.value));
const netTotal = computed(() => (Number(order.value?.total) || 0) - refunded.value);

const itemsSubtotal = computed(() => (order.value?.line_items || []).reduce((total, item) => total + (Number(item.subtotal) || 0), 0));

const canRefund = computed(() => {
  if (!order.value || !can('edit_shop_orders')) return false;
  if (['pending', 'failed', 'cancelled', 'checkout-draft', 'trash'].includes(order.value.status)) return false;
  return (Number(order.value.total) || 0) - refunded.value > 0;
});

const canEditItems = computed(() => can('edit_shop_orders') && ['pending', 'on-hold', 'checkout-draft'].includes(order.value?.status));

const addressLines = (address = {}) =>
  [
    [address.first_name, address.last_name].filter(Boolean).join(' '),
    address.company,
    address.address_1,
    address.address_2,
    [address.city, address.state].filter(Boolean).join(' - '),
    address.postcode,
    address.country ? countryName(address.country) : '',
  ].filter((line) => line && String(line).trim());

const hasShipping = computed(() => {
  const shipping = order.value?.shipping || {};
  return !!(shipping.address_1 || shipping.city || shipping.first_name || shipping.company);
});

const mapsUrl = (address = {}) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address.address_1, address.address_2, address.city, address.state, address.postcode, address.country].filter(Boolean).join(', '))}`;

const breadcrumbs = computed(() => [
  { label: __('Orders', 'flexify-dashboard'), to: { name: 'orders' } },
  { label: order.value ? `#${order.value.number}` : `#${props.id}` },
]);

const load = async () => {
  loading.value = true;

  const [orderResponse, contextResponse] = await Promise.all([wc(`orders/${props.id}`), fd(`orders/${props.id}/context`)]);

  if (!orderResponse?.data) {
    notFound.value = true;
    loading.value = false;
    return;
  }

  order.value = orderResponse.data;
  context.value = contextResponse?.data || null;
  loading.value = false;

  loadCountries();
  loadSiblings();

  const cards = await applyFilters('flexify-dashboard/orders/detail/sidebar', [], { order: order.value, context: context.value });
  extensionCards.value = Array.isArray(cards) ? cards : [];
};

/**
 * Find the newer and older orders around the current one.
 */
const loadSiblings = async () => {
  if (!order.value?.date_created_gmt) return;

  const base = { per_page: 1, orderby: 'date', status: 'any', exclude: String(props.id), dates_are_gmt: 'true', _fields: 'id,number' };
  const date = order.value.date_created_gmt;

  const [newer, older] = await Promise.all([
    wc('orders', { params: { ...base, after: date, order: 'asc' } }),
    wc('orders', { params: { ...base, before: date, order: 'desc' } }),
  ]);

  siblings.value = {
    previous: Array.isArray(newer?.data) && newer.data[0] ? newer.data[0] : null,
    next: Array.isArray(older?.data) && older.data[0] ? older.data[0] : null,
  };
};

const goTo = (sibling) => sibling && router.push({ name: 'order-details', params: { id: sibling.id } });

const reload = async () => {
  const [orderResponse, contextResponse] = await Promise.all([wc(`orders/${props.id}`), fd(`orders/${props.id}/context`)]);
  if (orderResponse?.data) order.value = orderResponse.data;
  if (contextResponse?.data) context.value = contextResponse.data;
  notesRef.value?.reload();
};

const changeStatus = async (value) => {
  statusUpdating.value = true;
  const response = await wc(`orders/${props.id}`, { type: 'PUT', data: { status: value } });
  statusUpdating.value = false;

  if (!response?.data) return;

  order.value = response.data;
  notify({ title: sprintf(__('Order marked as %s', 'flexify-dashboard'), orderStatus(value).label), type: 'success' });
  notesRef.value?.reload();
};

const runAction = async (action) => {
  actionRunning.value = true;
  const response = await fd(`orders/${props.id}/action`, { type: 'POST', data: { action: action.value } });
  actionRunning.value = false;

  if (!response?.data?.success) return;

  notify({ title: __('Order action applied', 'flexify-dashboard'), message: action.label, type: 'success' });
  reload();
};

const trashOrder = async () => {
  const confirmed = await confirmDialog.value.show({
    title: __('Move to trash?', 'flexify-dashboard'),
    message: sprintf(__('%s will be moved to the trash.', 'flexify-dashboard'), orderTitle(order.value)),
    confirmLabel: __('Move to trash', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await fd('orders/bulk', { type: 'POST', data: { ids: [props.id], action: 'trash' } });

  if (response?.data?.updated?.length) {
    notify({ title: __('Order moved to the trash', 'flexify-dashboard'), type: 'success' });
    router.push({ name: 'orders' });
  }
};

const openAddress = (type) => {
  addressModal.value = { open: true, type };
};

const onOrderSaved = (data) => {
  order.value = data;
};

const onRefunded = () => reload();

const actionItems = computed(() => {
  const items = (context.value?.actions || []).map((action) => ({ label: action.label, icon: 'bolt', onSelect: () => runAction(action) }));

  if (items.length) items.push({ separator: true });

  items.push(
    { label: __('Print', 'flexify-dashboard'), icon: 'print', onSelect: () => window.print() },
    { label: __('Open in classic editor', 'flexify-dashboard'), icon: 'open_in_new', href: context.value?.native_edit_url || classicOrderUrl(props.id) }
  );

  if (can('delete_shop_orders') && order.value?.status !== 'trash') {
    items.push({ separator: true }, { label: __('Move to trash', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: trashOrder });
  }

  return items;
});

const itemMeta = (item) => context.value?.items?.[item.id]?.meta || [];
const itemImage = (item) => context.value?.items?.[item.id]?.image || item.image?.src || '';
const itemEditUrl = (item) => context.value?.items?.[item.id]?.edit_url || '';
const itemRefundedQty = (item) => Number(context.value?.items?.[item.id]?.refunded_qty) || 0;

const deviceIcon = computed(() => {
  const device = String(context.value?.attribution?.device || '').toLowerCase();
  if (device.includes('mobile')) return 'mobile';
  if (device.includes('tablet')) return 'tablet';
  return 'desktop';
});

onMounted(load);
</script>

<template>
  <div>
    <!-- Loading -->
    <template v-if="loading">
      <div class="mb-6 space-y-2">
        <FdSkeleton class="h-4 w-32" />
        <FdSkeleton class="h-7 w-56" />
      </div>
      <div class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <FdSkeleton class="h-80 w-full rounded-2xl" />
          <FdSkeleton class="h-64 w-full rounded-2xl" />
        </div>
        <div class="space-y-6">
          <FdSkeleton class="h-48 w-full rounded-2xl" />
          <FdSkeleton class="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </template>

    <!-- Not found -->
    <FdCard v-else-if="notFound">
      <FdEmptyState icon="search_off" :title="__('Order not found', 'flexify-dashboard')" :description="__('The order may have been deleted or you do not have permission to view it.', 'flexify-dashboard')">
        <FdButton icon="arrow_back" variant="outline" @click="router.push({ name: 'orders' })">{{ __('Back to orders', 'flexify-dashboard') }}</FdButton>
      </FdEmptyState>
    </FdCard>

    <template v-else-if="order">
      <FdPageHeader :title="orderTitle(order)" :breadcrumbs="breadcrumbs">
        <template #title>
          <span class="flex flex-wrap items-center gap-3">
            {{ orderTitle(order) }}
            <FdBadge :color="status.color" size="md">{{ status.label }}</FdBadge>
          </span>
        </template>
        <template #actions>
          <div class="flex items-center gap-1">
            <FdTooltip :text="siblings.previous ? sprintf(__('Newer order #%s', 'flexify-dashboard'), siblings.previous.number) : __('No newer orders', 'flexify-dashboard')">
              <FdButton variant="outline" icon="chevron_left" icon-only :disabled="!siblings.previous" :aria-label="__('Newer order', 'flexify-dashboard')" @click="goTo(siblings.previous)" />
            </FdTooltip>
            <FdTooltip :text="siblings.next ? sprintf(__('Older order #%s', 'flexify-dashboard'), siblings.next.number) : __('No older orders', 'flexify-dashboard')">
              <FdButton variant="outline" icon="chevron_right" icon-only :disabled="!siblings.next" :aria-label="__('Older order', 'flexify-dashboard')" @click="goTo(siblings.next)" />
            </FdTooltip>
          </div>
          <FdDropdown :items="actionItems" width="w-64">
            <template #trigger>
              <FdButton variant="outline" icon-right="expand_more" :loading="actionRunning">{{ __('Actions', 'flexify-dashboard') }}</FdButton>
            </template>
          </FdDropdown>
          <FdButton v-if="canEditItems" variant="outline" icon="edit" @click="router.push({ name: 'order-edit', params: { id: order.id } })">{{ __('Edit items', 'flexify-dashboard') }}</FdButton>
          <FdButton v-if="canRefund" variant="outline" icon="undo" @click="refundOpen = true">{{ __('Refund', 'flexify-dashboard') }}</FdButton>
          <FdDropdown :items="statusActions(changeStatus, order.status)" width="w-52">
            <template #trigger>
              <FdButton icon-right="expand_more" :loading="statusUpdating">{{ __('Change status', 'flexify-dashboard') }}</FdButton>
            </template>
          </FdDropdown>
        </template>
      </FdPageHeader>

      <p class="-mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-theme-sm text-gray-500 dark:text-gray-400">
        <span class="flex items-center gap-1.5"><AppIcon icon="calendar_today" class="text-base" />{{ formatDate(order.date_created, true) }}</span>
        <span v-if="order.payment_method_title" class="flex items-center gap-1.5"><AppIcon icon="payments" class="text-base" />{{ order.payment_method_title }}</span>
        <span class="flex items-center gap-1.5"><AppIcon icon="shopping_bag" class="text-base" />{{ sprintf(__('%d item(s)', 'flexify-dashboard'), itemsCount(order)) }}</span>
      </p>

      <div class="grid gap-6 xl:grid-cols-3">
        <!-- Main column -->
        <div class="min-w-0 space-y-6 xl:col-span-2">
          <FdCard :title="__('Items', 'flexify-dashboard')" padding="none">
            <div class="overflow-x-auto custom-scrollbar">
              <table class="w-full min-w-[560px] text-theme-sm">
                <thead>
                  <tr class="border-y border-gray-100 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th class="px-5 py-3 text-start font-medium sm:px-6">{{ __('Product', 'flexify-dashboard') }}</th>
                    <th class="px-4 py-3 text-end font-medium">{{ __('Price', 'flexify-dashboard') }}</th>
                    <th class="px-4 py-3 text-center font-medium">{{ __('Qty', 'flexify-dashboard') }}</th>
                    <th class="px-5 py-3 text-end font-medium sm:px-6">{{ __('Total', 'flexify-dashboard') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-for="item in order.line_items" :key="item.id">
                    <td class="px-5 py-4 sm:px-6">
                      <div class="flex items-start gap-3">
                        <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                          <img v-if="itemImage(item)" :src="itemImage(item)" alt="" class="h-full w-full object-cover" loading="lazy" />
                          <AppIcon v-else icon="inventory" class="text-xl text-gray-400" />
                        </div>
                        <div class="min-w-0">
                          <component
                            :is="itemEditUrl(item) ? 'a' : 'span'"
                            :href="itemEditUrl(item) || undefined"
                            class="font-medium text-gray-800 dark:text-white/90"
                            :class="itemEditUrl(item) && 'hover:text-brand-500 dark:hover:text-brand-400'"
                          >
                            {{ decode(item.name) }}
                          </component>
                          <p v-if="item.sku" class="text-theme-xs text-gray-500 dark:text-gray-400">{{ __('SKU', 'flexify-dashboard') }}: {{ item.sku }}</p>
                          <dl v-if="itemMeta(item).length" class="mt-1 space-y-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                            <div v-for="meta in itemMeta(item)" :key="meta.key" class="flex gap-1">
                              <dt class="font-medium">{{ meta.key }}:</dt>
                              <dd>{{ meta.value }}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 text-end text-gray-500 dark:text-gray-400">{{ orderPrice(item.price, order) }}</td>
                    <td class="px-4 py-4 text-center text-gray-800 dark:text-white/90">
                      × {{ item.quantity }}
                      <span v-if="itemRefundedQty(item)" class="block text-theme-xs text-error-500">-{{ itemRefundedQty(item) }}</span>
                    </td>
                    <td class="whitespace-nowrap px-5 py-4 text-end font-medium text-gray-800 dark:text-white/90 sm:px-6">
                      <span v-if="Number(item.subtotal) > Number(item.total)" class="me-1 text-theme-xs font-normal text-gray-400 line-through">{{ orderPrice(item.subtotal, order) }}</span>
                      {{ orderPrice(item.total, order) }}
                    </td>
                  </tr>
                  <tr v-for="fee in order.fee_lines" :key="`fee-${fee.id}`">
                    <td class="px-5 py-3 text-gray-700 dark:text-gray-300 sm:px-6" colspan="3">
                      <span class="flex items-center gap-2"><AppIcon icon="add" class="text-base text-gray-400" />{{ decode(fee.name) }}</span>
                    </td>
                    <td class="whitespace-nowrap px-5 py-3 text-end text-gray-800 dark:text-white/90 sm:px-6">{{ orderPrice(fee.total, order) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex flex-col gap-6 border-t border-gray-100 px-5 py-5 dark:border-gray-800 sm:flex-row sm:justify-between sm:px-6">
              <div class="flex flex-wrap content-start gap-2">
                <FdBadge v-for="coupon in order.coupon_lines" :key="coupon.id" color="light" icon="sell">{{ coupon.code }}</FdBadge>
              </div>

              <dl class="w-full space-y-2.5 text-theme-sm sm:max-w-xs">
                <div class="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                  <dt>{{ __('Items subtotal', 'flexify-dashboard') }}</dt>
                  <dd class="text-gray-800 dark:text-white/90">{{ orderPrice(itemsSubtotal, order) }}</dd>
                </div>
                <div v-if="Number(order.discount_total)" class="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                  <dt>{{ __('Coupons', 'flexify-dashboard') }}</dt>
                  <dd class="text-success-600 dark:text-success-500">-{{ orderPrice(order.discount_total, order) }}</dd>
                </div>
                <div v-for="line in order.shipping_lines" :key="`ship-${line.id}`" class="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                  <dt class="truncate">{{ sprintf(__('Shipping: %s', 'flexify-dashboard'), decode(line.method_title)) }}</dt>
                  <dd class="text-gray-800 dark:text-white/90">{{ orderPrice(line.total, order) }}</dd>
                </div>
                <div v-if="Number(order.total_tax)" class="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                  <dt>{{ __('Taxes', 'flexify-dashboard') }}</dt>
                  <dd class="text-gray-800 dark:text-white/90">{{ orderPrice(order.total_tax, order) }}</dd>
                </div>
                <div class="flex justify-between gap-4 border-t border-gray-100 pt-2.5 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
                  <dt>{{ __('Order total', 'flexify-dashboard') }}</dt>
                  <dd>{{ orderPrice(order.total, order) }}</dd>
                </div>
                <template v-if="refunded">
                  <div class="flex justify-between gap-4 text-error-600 dark:text-error-500">
                    <dt>{{ __('Refunded', 'flexify-dashboard') }}</dt>
                    <dd>-{{ orderPrice(refunded, order) }}</dd>
                  </div>
                  <div class="flex justify-between gap-4 font-semibold text-gray-800 dark:text-white/90">
                    <dt>{{ __('Net payment', 'flexify-dashboard') }}</dt>
                    <dd>{{ orderPrice(netTotal, order) }}</dd>
                  </div>
                </template>
              </dl>
            </div>

            <div v-if="order.refunds?.length" class="border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
              <h4 class="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Refunds', 'flexify-dashboard') }}</h4>
              <ul class="space-y-1.5">
                <li v-for="refund in order.refunds" :key="refund.id" class="flex items-center justify-between gap-4 text-theme-sm">
                  <span class="text-gray-500 dark:text-gray-400">
                    {{ sprintf(__('Refund #%s', 'flexify-dashboard'), refund.id) }}<template v-if="refund.reason"> — {{ refund.reason }}</template>
                  </span>
                  <span class="whitespace-nowrap text-error-600 dark:text-error-500">{{ orderPrice(refund.total, order) }}</span>
                </li>
              </ul>
            </div>
          </FdCard>

          <FdCard v-if="order.customer_note" :title="__('Customer note', 'flexify-dashboard')">
            <p class="whitespace-pre-line text-theme-sm text-gray-700 dark:text-gray-300">{{ order.customer_note }}</p>
          </FdCard>

          <OrderNotes ref="notesRef" :order-id="order.id" />
        </div>

        <!-- Sidebar -->
        <div class="min-w-0 space-y-6">
          <FdCard :title="__('Customer', 'flexify-dashboard')">
            <template #actions>
              <FdTooltip v-if="context?.customer?.profile_url" :text="__('View profile', 'flexify-dashboard')">
                <FdButton variant="ghost" size="xs" icon="open_in_new" icon-only :href="context.customer.profile_url" :aria-label="__('View profile', 'flexify-dashboard')" />
              </FdTooltip>
            </template>

            <div class="flex items-center gap-3">
              <FdAvatar :src="context?.customer?.avatar || ''" :name="customerName(order)" size="lg" />
              <div class="min-w-0">
                <p class="truncate font-medium text-gray-800 dark:text-white/90">{{ customerName(order) }}</p>
                <p class="text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ order.customer_id ? __('Registered customer', 'flexify-dashboard') : __('Guest', 'flexify-dashboard') }}
                </p>
              </div>
            </div>

            <div v-if="context?.customer" class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
                <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ __('Orders', 'flexify-dashboard') }}</p>
                <p class="font-semibold text-gray-800 dark:text-white/90">{{ Number(context.customer.orders_count || 0).toLocaleString() }}</p>
              </div>
              <div v-if="context.customer.total_spent !== null" class="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
                <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ __('Total spent', 'flexify-dashboard') }}</p>
                <p class="truncate font-semibold text-gray-800 dark:text-white/90">{{ orderPrice(context.customer.total_spent, order) }}</p>
              </div>
            </div>

            <ul class="mt-4 space-y-2 text-theme-sm">
              <li v-if="order.billing?.email" class="flex items-center gap-2">
                <AppIcon icon="email" class="shrink-0 text-base text-gray-400" />
                <a :href="`mailto:${order.billing.email}`" class="truncate text-brand-500 hover:text-brand-600 dark:text-brand-400">{{ order.billing.email }}</a>
              </li>
              <li v-if="order.billing?.phone" class="flex items-center gap-2">
                <AppIcon icon="mobile" class="shrink-0 text-base text-gray-400" />
                <a :href="`tel:${order.billing.phone}`" class="text-brand-500 hover:text-brand-600 dark:text-brand-400">{{ order.billing.phone }}</a>
              </li>
            </ul>
          </FdCard>

          <FdCard :title="__('Billing address', 'flexify-dashboard')">
            <template #actions>
              <FdButton variant="ghost" size="xs" icon="edit" icon-only :aria-label="__('Edit billing address', 'flexify-dashboard')" @click="openAddress('billing')" />
            </template>
            <address v-if="addressLines(order.billing).length" class="space-y-0.5 text-theme-sm not-italic text-gray-600 dark:text-gray-400">
              <p v-for="(line, index) in addressLines(order.billing)" :key="index">{{ line }}</p>
            </address>
            <p v-else class="text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No billing address.', 'flexify-dashboard') }}</p>
          </FdCard>

          <FdCard :title="__('Shipping address', 'flexify-dashboard')">
            <template #actions>
              <FdTooltip v-if="hasShipping" :text="__('View on map', 'flexify-dashboard')">
                <FdButton variant="ghost" size="xs" icon="location_on" icon-only :href="mapsUrl(order.shipping)" target="_blank" rel="noopener noreferrer" :aria-label="__('View on map', 'flexify-dashboard')" />
              </FdTooltip>
              <FdButton variant="ghost" size="xs" icon="edit" icon-only :aria-label="__('Edit shipping address', 'flexify-dashboard')" @click="openAddress('shipping')" />
            </template>
            <address v-if="hasShipping" class="space-y-0.5 text-theme-sm not-italic text-gray-600 dark:text-gray-400">
              <p v-for="(line, index) in addressLines(order.shipping)" :key="index">{{ line }}</p>
            </address>
            <p v-else class="text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No shipping address set.', 'flexify-dashboard') }}</p>
            <div v-for="line in order.shipping_lines" :key="line.id" class="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
              <AppIcon icon="local_shipping" class="shrink-0 text-base text-gray-400" />
              <span class="truncate">{{ decode(line.method_title) }}</span>
            </div>
          </FdCard>

          <FdCard :title="__('Payment', 'flexify-dashboard')">
            <dl class="space-y-3 text-theme-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-gray-500 dark:text-gray-400">{{ __('Method', 'flexify-dashboard') }}</dt>
                <dd class="text-end text-gray-800 dark:text-white/90">{{ order.payment_method_title || '—' }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-gray-500 dark:text-gray-400">{{ __('Paid on', 'flexify-dashboard') }}</dt>
                <dd class="text-end text-gray-800 dark:text-white/90">{{ order.date_paid ? formatDate(order.date_paid, true) : __('Not paid', 'flexify-dashboard') }}</dd>
              </div>
              <div v-if="context?.payment?.transaction_id" class="flex justify-between gap-4">
                <dt class="text-gray-500 dark:text-gray-400">{{ __('Transaction ID', 'flexify-dashboard') }}</dt>
                <dd class="min-w-0 text-end">
                  <a v-if="context.payment.transaction_url" :href="context.payment.transaction_url" target="_blank" rel="noopener noreferrer" class="break-all text-brand-500 hover:text-brand-600 dark:text-brand-400">
                    {{ context.payment.transaction_id }}
                  </a>
                  <span v-else class="break-all text-gray-800 dark:text-white/90">{{ context.payment.transaction_id }}</span>
                </dd>
              </div>
            </dl>
          </FdCard>

          <FdCard v-if="context?.attribution || context?.customer?.ip_address" :title="__('Order attribution', 'flexify-dashboard')">
            <dl class="space-y-3 text-theme-sm">
              <div v-if="context.attribution" class="flex justify-between gap-4">
                <dt class="text-gray-500 dark:text-gray-400">{{ __('Origin', 'flexify-dashboard') }}</dt>
                <dd class="text-end text-gray-800 dark:text-white/90">
                  {{ context.attribution.label }}<template v-if="context.attribution.source"> · {{ context.attribution.source }}</template>
                </dd>
              </div>
              <div v-if="context.attribution?.device" class="flex justify-between gap-4">
                <dt class="text-gray-500 dark:text-gray-400">{{ __('Device', 'flexify-dashboard') }}</dt>
                <dd class="flex items-center gap-1.5 text-gray-800 dark:text-white/90"><AppIcon :icon="deviceIcon" class="text-base text-gray-400" />{{ context.attribution.device }}</dd>
              </div>
              <div v-if="context.customer?.ip_address" class="flex justify-between gap-4">
                <dt class="text-gray-500 dark:text-gray-400">{{ __('IP address', 'flexify-dashboard') }}</dt>
                <dd class="text-end text-gray-800 dark:text-white/90">{{ context.customer.ip_address }}</dd>
              </div>
            </dl>
          </FdCard>

          <FdCard v-if="context?.custom_fields?.length" :title="__('Custom fields', 'flexify-dashboard')">
            <dl class="space-y-3 text-theme-sm">
              <div v-for="(field, index) in context.custom_fields" :key="`${field.key}-${index}`">
                <dt class="text-theme-xs text-gray-500 dark:text-gray-400">{{ field.key }}</dt>
                <dd class="break-words text-gray-800 dark:text-white/90">{{ field.value || '—' }}</dd>
              </div>
            </dl>
          </FdCard>

          <FdCard v-for="(card, index) in extensionCards" :key="card.metadata?.id || `extension-${index}`" :title="card.title || ''">
            <ComponentRender :item="card" :order="order" :context="context" />
          </FdCard>
        </div>
      </div>

      <RefundModal v-model:open="refundOpen" :order="order" :items="context?.items || {}" :supports-gateway-refund="!!context?.payment?.supports_refunds" @refunded="onRefunded" />
      <AddressModal v-model:open="addressModal.open" :order="order" :type="addressModal.type" @saved="onOrderSaved" />
      <FdConfirmDialog ref="confirmDialog" />
    </template>
  </div>
</template>
