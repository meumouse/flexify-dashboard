<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  FdAvatar,
  FdBadge,
  FdButton,
  FdCard,
  FdConfirmDialog,
  FdDataTable,
  FdDropdown,
  FdPageHeader,
  FdPagination,
  FdSearchInput,
  FdSelect,
  FdStatStrip,
  FdTabs,
  FdTooltip,
} from '@/components/kit';
import { notify } from '@/assets/js/functions/notify.js';
import AppIcon from '@/components/utility/icons/index.vue';
import { useOrderHelpers } from './useOrderHelpers.js';
import OrderPreview from './OrderPreview.vue';

const route = useRoute();
const router = useRouter();
const {
  store,
  wc,
  fd,
  can,
  orderStatus,
  customerName,
  relativeDate,
  formatDate,
  orderPrice,
  itemsCount,
  totalRefunded,
  shippingSummary,
  statusActions,
  classicOrderUrl,
  price,
  sprintf,
} = useOrderHelpers();

const ORDER_FIELDS = [
  'id',
  'number',
  'status',
  'currency',
  'currency_symbol',
  'date_created',
  'date_paid',
  'total',
  'total_tax',
  'shipping_total',
  'discount_total',
  'customer_id',
  'customer_note',
  'billing',
  'shipping',
  'payment_method',
  'payment_method_title',
  'line_items',
  'shipping_lines',
  'fee_lines',
  'coupon_lines',
  'refunds',
  'created_via',
].join(',');

const orders = ref([]);
const total = ref(0);
const loading = ref(true);
const summary = ref(null);
const summaryLoading = ref(true);
const selected = ref([]);
const bulkLoading = ref(false);
const confirmDialog = ref(null);
const previewOrder = ref(null);
const previewOpen = ref(false);

const PERIODS = { 7: 7, 30: 30, 90: 90 };

const readQuery = () => ({
  status: String(route.query.status || 'any'),
  search: String(route.query.search || ''),
  date: String(route.query.date || ''),
  payment_method: String(route.query.payment_method || ''),
  created_via: String(route.query.created_via || ''),
  origin: String(route.query.origin || ''),
  customer: String(route.query.customer || ''),
  page: Math.max(1, Number(route.query.page) || 1),
  per_page: Number(route.query.per_page) || 20,
  orderby: String(route.query.orderby || 'date'),
  order: String(route.query.order || 'desc'),
});

const filters = reactive(readQuery());
const period = ref(String(route.query.period || '30'));

const sort = computed({
  get: () => ({ key: filters.orderby === 'id' ? 'order' : filters.orderby, direction: filters.order }),
  set: (value) => {
    filters.orderby = value.key === 'order' ? 'id' : value.key;
    filters.order = value.direction;
  },
});

const hasActiveFilters = computed(() => !!(filters.search || filters.date || filters.payment_method || filters.created_via || filters.origin || filters.customer));
const showMoreFilters = ref(!!(filters.payment_method || filters.created_via || filters.origin));
const customerLabel = ref(String(route.query.customer_name || ''));

const paymentOptions = computed(() => store.value.payment_gateways.map((gateway) => ({ value: gateway.value, label: gateway.label })));

const createdViaOptions = computed(() => [
  { value: 'checkout', label: __('Classic checkout', 'flexify-dashboard') },
  { value: 'store-api', label: __('Block checkout', 'flexify-dashboard') },
  { value: 'admin', label: __('Created in admin', 'flexify-dashboard') },
  { value: 'rest-api', label: __('REST API', 'flexify-dashboard') },
]);

const originOptions = computed(() => [
  { value: 'organic', label: __('Organic', 'flexify-dashboard') },
  { value: 'referral', label: __('Referral', 'flexify-dashboard') },
  { value: 'utm', label: __('Campaign', 'flexify-dashboard') },
  { value: 'typein', label: __('Direct', 'flexify-dashboard') },
  { value: 'admin', label: __('Web admin', 'flexify-dashboard') },
  { value: 'mobile_app', label: __('Mobile app', 'flexify-dashboard') },
  { value: 'pos', label: __('Point of sale', 'flexify-dashboard') },
]);

const filterByCustomer = (order) => {
  if (!order.customer_id) return;
  customerLabel.value = customerName(order);
  filters.customer = String(order.customer_id);
};

// Poll the counters to tell the user when new orders arrive.
const POLL_INTERVAL = 60000;
const newOrders = ref(0);
let knownTotal = null;
let pollTimer = null;

const pollNewOrders = async () => {
  if (document.visibilityState !== 'visible' || knownTotal === null) return;

  const response = await fd('orders/summary');
  const total = Number(response?.data?.total);

  if (Number.isFinite(total) && total > knownTotal) {
    newOrders.value = total - knownTotal;
  }
};

const showNewOrders = () => {
  newOrders.value = 0;
  knownTotal = null;

  if (filters.page !== 1 || filters.status !== 'any') {
    filters.status = 'any';
    filters.page = 1;
  }

  refresh();
};

const dateOptions = computed(() => [
  { value: 'today', label: __('Today', 'flexify-dashboard') },
  { value: '7', label: __('Last 7 days', 'flexify-dashboard') },
  { value: '30', label: __('Last 30 days', 'flexify-dashboard') },
  { value: 'month', label: __('This month', 'flexify-dashboard') },
  { value: '90', label: __('Last 90 days', 'flexify-dashboard') },
  { value: 'year', label: __('This year', 'flexify-dashboard') },
]);

const dateRange = (value) => {
  if (!value) return {};

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (value === 'today') {
    // start of today
  } else if (value === 'month') {
    start.setDate(1);
  } else if (value === 'year') {
    start.setMonth(0, 1);
  } else if (PERIODS[value]) {
    start.setDate(start.getDate() - (PERIODS[value] - 1));
  }

  return { after: start.toISOString() };
};

const statusTabs = computed(() => {
  const counts = summary.value?.counts || {};
  const tabs = [{ value: 'any', label: __('All', 'flexify-dashboard'), count: summary.value?.total }];

  store.value.order_statuses
    .filter((status) => status.value !== 'checkout-draft')
    .forEach((status) => {
      const count = counts[status.value];
      if (count > 0 || ['processing', 'on-hold', 'completed'].includes(status.value) || filters.status === status.value) {
        tabs.push({ value: status.value, label: status.label, count });
      }
    });

  if (counts.trash > 0 || filters.status === 'trash') {
    tabs.push({ value: 'trash', label: __('Trash', 'flexify-dashboard'), count: counts.trash });
  }

  return tabs;
});

const statItems = computed(() => {
  const counts = summary.value?.counts || {};
  const revenue = summary.value?.period || {};

  return [
    { key: 'pending', label: orderStatus('pending').label || __('Pending payment', 'flexify-dashboard'), value: (counts.pending ?? 0).toLocaleString(), tone: counts.pending ? 'warning' : 'default', clickable: true, active: filters.status === 'pending' },
    { key: 'processing', label: orderStatus('processing').label || __('Processing', 'flexify-dashboard'), value: (counts.processing ?? 0).toLocaleString(), tone: 'brand', clickable: true, active: filters.status === 'processing' },
    { key: 'on-hold', label: orderStatus('on-hold').label || __('On hold', 'flexify-dashboard'), value: (counts['on-hold'] ?? 0).toLocaleString(), clickable: true, active: filters.status === 'on-hold' },
    {
      key: 'revenue',
      label: sprintf(__('Net revenue (%s days)', 'flexify-dashboard'), period.value),
      value: price(revenue.net_revenue ?? 0),
      hint: sprintf(__('%s orders', 'flexify-dashboard'), (revenue.orders_count ?? 0).toLocaleString()),
      tone: 'success',
    },
  ];
});

const columns = computed(() => [
  { key: 'order', label: __('Order', 'flexify-dashboard'), sortable: true },
  { key: 'customer', label: __('Customer', 'flexify-dashboard') },
  { key: 'status', label: __('Status', 'flexify-dashboard') },
  { key: 'items', label: __('Items', 'flexify-dashboard'), align: 'center' },
  { key: 'total', label: __('Total', 'flexify-dashboard'), align: 'end' },
  { key: 'payment', label: __('Payment', 'flexify-dashboard') },
  { key: 'shipping', label: __('Shipping', 'flexify-dashboard') },
  { key: 'date', label: __('Date', 'flexify-dashboard'), sortable: true },
  { key: 'actions', label: '', align: 'end', width: '56px' },
]);

const isTrash = computed(() => filters.status === 'trash');

const syncQuery = () => {
  const query = {};
  const defaults = { status: 'any', page: 1, per_page: 20, orderby: 'date', order: 'desc' };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    if (defaults[key] !== undefined && String(defaults[key]) === String(value)) return;
    query[key] = String(value);
  });

  if (period.value !== '30') query.period = period.value;
  if (filters.customer && customerLabel.value) query.customer_name = customerLabel.value;

  router.replace({ query });
};

let requestId = 0;

const loadOrders = async () => {
  const current = ++requestId;
  loading.value = true;

  const params = {
    page: filters.page,
    per_page: filters.per_page,
    status: filters.status,
    orderby: filters.orderby,
    order: filters.order,
    search: filters.search,
    customer: filters.customer,
    fd_payment_method: filters.payment_method,
    fd_created_via: filters.created_via,
    fd_origin: filters.origin,
    _fields: ORDER_FIELDS,
    ...dateRange(filters.date),
  };

  const response = await wc('orders', { params });

  if (current !== requestId) return;

  orders.value = Array.isArray(response?.data) ? response.data : [];
  total.value = Number(response?.totalItems) || 0;
  loading.value = false;
};

const loadSummary = async () => {
  summaryLoading.value = true;

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (Number(period.value) - 1));

  const iso = (date) => date.toISOString().slice(0, 10);
  const response = await fd('orders/summary', { params: { date_from: iso(from), date_to: iso(to) } });

  summary.value = response?.data || null;
  summaryLoading.value = false;

  if (Number.isFinite(Number(summary.value?.total))) {
    knownTotal = Number(summary.value.total);
    newOrders.value = 0;
  }
};

const refresh = () => {
  selected.value = [];
  loadOrders();
  loadSummary();
};

const reloadFromFilters = () => {
  syncQuery();
  loadOrders();
};

watch(
  () => [filters.status, filters.search, filters.date, filters.payment_method, filters.created_via, filters.origin, filters.customer, filters.per_page, filters.orderby, filters.order].join('|'),
  () => {
    selected.value = [];

    if (filters.page !== 1) {
      filters.page = 1;
      return;
    }

    reloadFromFilters();
  }
);

watch(() => filters.page, reloadFromFilters);

watch(period, () => {
  syncQuery();
  loadSummary();
});

const selectStat = (item) => {
  if (item.key === 'revenue') return;
  filters.status = filters.status === item.key ? 'any' : item.key;
};

const clearFilters = () => {
  filters.search = '';
  filters.date = '';
  filters.payment_method = '';
  filters.created_via = '';
  filters.origin = '';
  filters.customer = '';
  customerLabel.value = '';
};

const openDetails = (order) => router.push({ name: 'order-details', params: { id: order.id } });

const openPreview = (order) => {
  previewOrder.value = order;
  previewOpen.value = true;
};

const runBulk = async (action, value, ids = selected.value) => {
  if (!ids.length) return;

  bulkLoading.value = true;
  const response = await fd('orders/bulk', { type: 'POST', data: { ids, action, value } });
  bulkLoading.value = false;

  if (!response?.data) return;

  const { updated = [], failed = [] } = response.data;

  if (updated.length) {
    notify({ title: sprintf(__('%d order(s) updated', 'flexify-dashboard'), updated.length), type: 'success' });
  }

  if (failed.length) {
    notify({ title: sprintf(__('%d order(s) could not be updated', 'flexify-dashboard'), failed.length), message: failed[0]?.message || '', type: 'error' });
  }

  refresh();
};

const confirmDelete = async (action, ids = selected.value) => {
  const permanent = action === 'delete';

  const confirmed = await confirmDialog.value.show({
    title: permanent ? __('Delete permanently?', 'flexify-dashboard') : __('Move to trash?', 'flexify-dashboard'),
    message: permanent
      ? sprintf(__('%d order(s) will be permanently deleted. This action cannot be undone.', 'flexify-dashboard'), ids.length)
      : sprintf(__('%d order(s) will be moved to the trash.', 'flexify-dashboard'), ids.length),
    confirmLabel: permanent ? __('Delete permanently', 'flexify-dashboard') : __('Move to trash', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (confirmed) runBulk(action, undefined, ids);
};

const rowActions = (order) => {
  if (order.status === 'trash') {
    return [
      { label: __('Restore', 'flexify-dashboard'), icon: 'undo', onSelect: () => runBulk('restore', undefined, [order.id]) },
      { separator: true },
      { label: __('Delete permanently', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => confirmDelete('delete', [order.id]) },
    ];
  }

  return [
    { label: __('View details', 'flexify-dashboard'), icon: 'receipt_long', onSelect: () => openDetails(order) },
    ...(order.customer_id ? [{ label: __('Orders from this customer', 'flexify-dashboard'), icon: 'person', onSelect: () => filterByCustomer(order) }] : []),
    { label: __('Quick preview', 'flexify-dashboard'), icon: 'visibility', onSelect: () => openPreview(order) },
    { heading: __('Change status', 'flexify-dashboard') },
    ...statusActions((status) => runBulk('status', status, [order.id]), order.status),
    { separator: true },
    { label: __('Open in classic editor', 'flexify-dashboard'), icon: 'open_in_new', href: classicEditUrl(order) },
    ...(can('delete_shop_orders') ? [{ label: __('Move to trash', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => confirmDelete('trash', [order.id]) }] : []),
  ];
};

const classicEditUrl = (order) => classicOrderUrl(order.id);

const exportCsv = () => {
  const rows = orders.value.filter((order) => !selected.value.length || selected.value.includes(order.id));
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = [__('Order', 'flexify-dashboard'), __('Date', 'flexify-dashboard'), __('Status', 'flexify-dashboard'), __('Customer', 'flexify-dashboard'), __('Email', 'flexify-dashboard'), __('Phone', 'flexify-dashboard'), __('Items', 'flexify-dashboard'), __('Total', 'flexify-dashboard'), __('Payment', 'flexify-dashboard'), __('City', 'flexify-dashboard'), __('State', 'flexify-dashboard')];
  const lines = rows.map((order) =>
    [
      order.number,
      order.date_created,
      orderStatus(order.status).label,
      customerName(order),
      order.billing?.email,
      order.billing?.phone,
      itemsCount(order),
      order.total,
      order.payment_method_title,
      order.shipping?.city || order.billing?.city,
      order.shipping?.state || order.billing?.state,
    ]
      .map(escape)
      .join(',')
  );

  const blob = new Blob([`﻿${[header.map(escape).join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const pageLinks = computed(() => [
  { label: __('Export current page (CSV)', 'flexify-dashboard'), icon: 'download', onSelect: exportCsv },
  { separator: true },
  { label: __('Add order in classic screen', 'flexify-dashboard'), icon: 'open_in_new', href: store.value.urls.new_order },
  { label: __('Customers', 'flexify-dashboard'), icon: 'person', href: `${store.value.urls.users}?role=customer` },
  { label: __('WooCommerce settings', 'flexify-dashboard'), icon: 'settings', href: store.value.urls.settings },
  { label: __('Classic orders screen', 'flexify-dashboard'), icon: 'open_in_new', href: store.value.urls.classic_orders },
]);

onMounted(() => {
  loadOrders();
  loadSummary();
  pollTimer = window.setInterval(pollNewOrders, POLL_INTERVAL);
});

onBeforeUnmount(() => window.clearInterval(pollTimer));
</script>

<template>
  <div>
    <FdPageHeader :title="__('Orders', 'flexify-dashboard')" :description="__('Track, fulfil and manage your store orders.', 'flexify-dashboard')">
      <template #actions>
        <FdTabs
          v-model="period"
          variant="segmented"
          :items="[
            { value: '7', label: __('7 days', 'flexify-dashboard') },
            { value: '30', label: __('30 days', 'flexify-dashboard') },
            { value: '90', label: __('90 days', 'flexify-dashboard') },
          ]"
          :aria-label="__('Revenue period', 'flexify-dashboard')"
        />
        <FdDropdown :items="pageLinks" width="w-60">
          <template #trigger>
            <FdButton variant="outline" icon-right="expand_more">{{ __('More', 'flexify-dashboard') }}</FdButton>
          </template>
        </FdDropdown>
        <FdButton v-if="can('edit_shop_orders')" icon="add" @click="router.push({ name: 'order-new' })">{{ __('Add order', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdPageHeader>

    <FdStatStrip class="mb-6" :items="statItems" :loading="summaryLoading" @select="selectStat" />

    <FdCard padding="none">
      <div class="px-5 pt-2 sm:px-6">
        <FdTabs v-model="filters.status" :items="statusTabs" :aria-label="__('Order status', 'flexify-dashboard')" />
      </div>

      <div class="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:px-6">
        <FdSearchInput v-model="filters.search" class="w-full sm:w-80" :placeholder="__('Search order, customer or email', 'flexify-dashboard')" />
        <FdSelect v-model="filters.date" :options="dateOptions" :placeholder="__('Any date', 'flexify-dashboard')" class="sm:w-48" />
        <FdButton variant="outline" icon="filter_alt" :aria-expanded="showMoreFilters" @click="showMoreFilters = !showMoreFilters">{{ __('Filters', 'flexify-dashboard') }}</FdButton>
        <div class="flex items-center gap-2 sm:ms-auto">
          <FdButton v-if="hasActiveFilters" variant="ghost" icon="close" @click="clearFilters">{{ __('Clear filters', 'flexify-dashboard') }}</FdButton>
          <FdTooltip :text="__('Refresh', 'flexify-dashboard')">
            <FdButton variant="outline" icon="refresh" icon-only :aria-label="__('Refresh', 'flexify-dashboard')" @click="refresh" />
          </FdTooltip>
        </div>
      </div>

      <div v-if="showMoreFilters || filters.customer" class="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
        <template v-if="showMoreFilters">
          <FdSelect v-if="paymentOptions.length" v-model="filters.payment_method" :options="paymentOptions" :placeholder="__('Any payment method', 'flexify-dashboard')" class="sm:w-52" />
          <FdSelect v-model="filters.created_via" :options="createdViaOptions" :placeholder="__('Any channel', 'flexify-dashboard')" class="sm:w-48" />
          <FdSelect v-model="filters.origin" :options="originOptions" :placeholder="__('Any origin', 'flexify-dashboard')" class="sm:w-44" />
        </template>
        <span v-if="filters.customer" class="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-50 py-1 ps-3 pe-1.5 text-theme-sm text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 sm:self-auto">
          {{ sprintf(__('Customer: %s', 'flexify-dashboard'), customerLabel || `#${filters.customer}`) }}
          <button type="button" class="rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/20" :aria-label="__('Remove customer filter', 'flexify-dashboard')" @click="filters.customer = ''">
            <AppIcon icon="close" class="text-sm" />
          </button>
        </span>
      </div>

      <div v-if="newOrders" class="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-3 text-theme-sm text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300 sm:px-6" role="status">
        <span class="flex items-center gap-2">
          <AppIcon icon="notifications" class="text-lg" />
          {{ sprintf(__('%d new order(s) received', 'flexify-dashboard'), newOrders) }}
        </span>
        <FdButton size="xs" @click="showNewOrders">{{ __('Show new orders', 'flexify-dashboard') }}</FdButton>
      </div>

      <FdDataTable
        v-model:selected="selected"
        v-model:sort="sort"
        :columns="columns"
        :rows="orders"
        :loading="loading"
        :skeleton-rows="Math.min(filters.per_page, 10)"
        selectable
        clickable-rows
        empty-icon="shopping_bag"
        :empty-title="hasActiveFilters ? __('No orders match your filters', 'flexify-dashboard') : __('No orders yet', 'flexify-dashboard')"
        :empty-description="hasActiveFilters ? __('Try adjusting the search or date range.', 'flexify-dashboard') : __('New orders will appear here as soon as customers check out.', 'flexify-dashboard')"
        :caption="__('Orders', 'flexify-dashboard')"
        @row-click="openDetails"
      >
        <template #bulk-actions>
          <template v-if="!isTrash">
            <FdDropdown :items="statusActions((status) => runBulk('status', status))" align="start" width="w-52">
              <template #trigger>
                <FdButton size="xs" variant="outline" icon-right="expand_more" :loading="bulkLoading">{{ __('Change status', 'flexify-dashboard') }}</FdButton>
              </template>
            </FdDropdown>
            <FdButton size="xs" variant="outline" icon="download" @click="exportCsv">{{ __('Export CSV', 'flexify-dashboard') }}</FdButton>
            <FdButton v-if="can('delete_shop_orders')" size="xs" variant="danger-outline" icon="delete" @click="confirmDelete('trash')">{{ __('Trash', 'flexify-dashboard') }}</FdButton>
          </template>
          <template v-else>
            <FdButton size="xs" variant="outline" icon="undo" :loading="bulkLoading" @click="runBulk('restore')">{{ __('Restore', 'flexify-dashboard') }}</FdButton>
            <FdButton size="xs" variant="danger-outline" icon="delete" @click="confirmDelete('delete')">{{ __('Delete permanently', 'flexify-dashboard') }}</FdButton>
          </template>
        </template>

        <template #cell-order="{ row }">
          <div class="whitespace-nowrap">
            <RouterLink :to="{ name: 'order-details', params: { id: row.id } }" class="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400">#{{ row.number }}</RouterLink>
            <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ row.created_via === 'admin' ? __('Created in admin', 'flexify-dashboard') : __('Online store', 'flexify-dashboard') }}</p>
          </div>
        </template>

        <template #cell-customer="{ row }">
          <div class="flex min-w-48 items-center gap-3">
            <FdAvatar :name="customerName(row)" size="sm" />
            <div class="min-w-0">
              <p class="truncate font-medium text-gray-800 dark:text-white/90">{{ customerName(row) }}</p>
              <p class="truncate text-theme-xs text-gray-500 dark:text-gray-400">{{ row.billing?.email || '—' }}</p>
            </div>
          </div>
        </template>

        <template #cell-status="{ row }">
          <FdBadge :color="orderStatus(row.status).color">{{ orderStatus(row.status).label }}</FdBadge>
        </template>

        <template #cell-items="{ row }">
          <span class="font-medium text-gray-800 dark:text-white/90">{{ itemsCount(row) }}</span>
        </template>

        <template #cell-total="{ row }">
          <div class="whitespace-nowrap text-end">
            <p class="font-medium text-gray-800 dark:text-white/90">{{ orderPrice(row.total, row) }}</p>
            <p v-if="totalRefunded(row)" class="text-theme-xs text-error-500">
              {{ sprintf(__('%s refunded', 'flexify-dashboard'), orderPrice(totalRefunded(row), row)) }}
            </p>
          </div>
        </template>

        <template #cell-payment="{ row }">
          <span class="whitespace-nowrap">{{ row.payment_method_title || '—' }}</span>
        </template>

        <template #cell-shipping="{ row }">
          <div class="min-w-32">
            <p class="truncate text-gray-700 dark:text-gray-300">{{ shippingSummary(row).location || '—' }}</p>
            <p v-if="shippingSummary(row).method" class="truncate text-theme-xs text-gray-500 dark:text-gray-400">{{ shippingSummary(row).method }}</p>
          </div>
        </template>

        <template #cell-date="{ row }">
          <FdTooltip :text="formatDate(row.date_created, true)">
            <span class="whitespace-nowrap">{{ relativeDate(row.date_created) }}</span>
          </FdTooltip>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1" data-no-row-click>
            <FdTooltip v-if="row.status !== 'trash'" :text="__('Quick preview', 'flexify-dashboard')">
              <FdButton variant="ghost" size="xs" icon="visibility" icon-only :aria-label="__('Quick preview', 'flexify-dashboard')" @click="openPreview(row)" />
            </FdTooltip>
            <FdDropdown :items="rowActions(row)" width="w-56">
              <template #trigger>
                <FdButton variant="ghost" size="xs" icon="more_vert" icon-only :aria-label="__('Actions', 'flexify-dashboard')" />
              </template>
            </FdDropdown>
          </div>
        </template>
      </FdDataTable>

      <template #footer>
        <FdPagination v-model:page="filters.page" v-model:per-page="filters.per_page" :total="total" :disabled="loading" />
      </template>
    </FdCard>

    <OrderPreview v-model:open="previewOpen" :order="previewOrder" @status-changed="refresh" @open-details="openDetails" />
    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>
