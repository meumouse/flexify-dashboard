<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
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
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useAppStore } from '@/store/app/app.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import ProductQuickEdit from './ProductQuickEdit.vue';
import ProductVariations from './ProductVariations.vue';
import BulkPriceModal from './BulkPriceModal.vue';
import BulkCategoryModal from './BulkCategoryModal.vue';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { store, price, wc, fd, can } = useWooCommerce();

const PRODUCT_FIELDS = [
  'id',
  'name',
  'slug',
  'permalink',
  'date_created',
  'date_modified',
  'type',
  'status',
  'featured',
  'catalog_visibility',
  'sku',
  'price',
  'regular_price',
  'sale_price',
  'price_html',
  'on_sale',
  'stock_quantity',
  'stock_status',
  'manage_stock',
  'backorders',
  'categories',
  'tags',
  'images',
  'variations',
  'total_sales',
  'weight',
  'dimensions',
  'shipping_class',
  'date_on_sale_from',
  'date_on_sale_to',
].join(',');

const products = ref([]);
const loading = ref(true);
const total = ref(0);
const summary = ref(null);
const summaryLoading = ref(true);
const categories = ref([]);
const selected = ref([]);
const expanded = ref([]);
const quickEditProduct = ref(null);
const quickEditOpen = ref(false);
const priceModalOpen = ref(false);
const categoryModal = reactive({ open: false, mode: 'add' });
const confirmDialog = ref(null);
const bulkLoading = ref(false);

const readQuery = () => ({
  status: String(route.query.status || 'any'),
  search: String(route.query.search || ''),
  category: String(route.query.category || ''),
  type: String(route.query.type || ''),
  stock_status: String(route.query.stock_status || ''),
  featured: String(route.query.featured || ''),
  low_stock: String(route.query.low_stock || ''),
  page: Math.max(1, Number(route.query.page) || 1),
  per_page: Number(route.query.per_page) || 20,
  orderby: String(route.query.orderby || 'date'),
  order: String(route.query.order || 'desc'),
});

const filters = reactive(readQuery());

const sort = computed({
  get: () => ({ key: filters.orderby === 'title' ? 'name' : filters.orderby, direction: filters.order }),
  set: (value) => {
    filters.orderby = value.key === 'name' ? 'title' : value.key;
    filters.order = value.direction;
    filters.page = 1;
  },
});

const hasActiveFilters = computed(
  () => !!(filters.search || filters.category || filters.type || filters.stock_status || filters.featured || filters.low_stock)
);

const statusTabs = computed(() => {
  const counts = summary.value || {};

  return [
    { value: 'any', label: __('All', 'flexify-dashboard'), count: counts.total },
    { value: 'publish', label: __('Published', 'flexify-dashboard'), count: counts.publish },
    { value: 'draft', label: __('Drafts', 'flexify-dashboard'), count: counts.draft },
    { value: 'pending', label: __('Pending', 'flexify-dashboard'), count: counts.pending },
    { value: 'private', label: __('Private', 'flexify-dashboard'), count: counts.private },
    { value: 'trash', label: __('Trash', 'flexify-dashboard'), count: counts.trash },
  ].filter((tab) => ['any', 'publish', 'draft'].includes(tab.value) || tab.count > 0 || filters.status === tab.value);
});

const statItems = computed(() => {
  const counts = summary.value || {};

  return [
    { key: 'total', label: __('Total products', 'flexify-dashboard'), value: (counts.total ?? 0).toLocaleString(), clickable: true, active: filters.status === 'any' && !hasActiveFilters.value },
    { key: 'publish', label: __('Published', 'flexify-dashboard'), value: (counts.publish ?? 0).toLocaleString(), tone: 'success', clickable: true, active: filters.status === 'publish' && !hasActiveFilters.value },
    { key: 'outofstock', label: __('Out of stock', 'flexify-dashboard'), value: (counts.outofstock ?? 0).toLocaleString(), tone: counts.outofstock ? 'error' : 'default', clickable: true, active: filters.stock_status === 'outofstock' },
    { key: 'lowstock', label: __('Low stock', 'flexify-dashboard'), value: (counts.lowstock ?? 0).toLocaleString(), tone: counts.lowstock ? 'warning' : 'default', clickable: true, active: filters.low_stock === '1' },
  ];
});

const columns = computed(() => [
  { key: 'name', label: __('Product', 'flexify-dashboard'), sortable: true },
  { key: 'categories', label: __('Categories', 'flexify-dashboard'), class: 'max-w-56' },
  { key: 'price', label: __('Price', 'flexify-dashboard'), sortable: true },
  { key: 'stock', label: __('Stock', 'flexify-dashboard') },
  { key: 'status', label: __('Status', 'flexify-dashboard') },
  { key: 'date', label: __('Date', 'flexify-dashboard'), sortable: true },
  { key: 'actions', label: '', align: 'end', width: '56px' },
]);

const categoryOptions = computed(() => {
  const byParent = {};
  categories.value.forEach((category) => {
    (byParent[category.parent] ||= []).push(category);
  });

  const list = [];
  const walk = (parent, depth) => {
    (byParent[parent] || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((category) => {
        list.push({ value: String(category.id), label: `${'— '.repeat(depth)}${decodeHtml(category.name)}` });
        walk(category.id, depth + 1);
      });
  };
  walk(0, 0);

  return list;
});

const statusBadges = computed(() => ({
  publish: { color: 'success', label: __('Published', 'flexify-dashboard') },
  draft: { color: 'light', label: __('Draft', 'flexify-dashboard') },
  pending: { color: 'warning', label: __('Pending', 'flexify-dashboard') },
  private: { color: 'purple', label: __('Private', 'flexify-dashboard') },
  future: { color: 'info', label: __('Scheduled', 'flexify-dashboard') },
  trash: { color: 'dark', label: __('Trash', 'flexify-dashboard') },
}));

const isTrash = computed(() => filters.status === 'trash');

function decodeHtml(value) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value ?? '';
  return textarea.value;
}

const stockBadge = (product) => {
  if (product.stock_status === 'outofstock') {
    return { color: 'error', label: __('Out of stock', 'flexify-dashboard') };
  }

  if (product.stock_status === 'onbackorder') {
    return { color: 'warning', label: __('On backorder', 'flexify-dashboard') };
  }

  if (product.manage_stock && product.stock_quantity !== null && product.stock_quantity <= (store.value.low_stock_amount || 2)) {
    return { color: 'warning', label: __('Low stock', 'flexify-dashboard') };
  }

  return { color: 'success', label: __('In stock', 'flexify-dashboard') };
};

const formatDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const editUrl = (product) => (store.value.product_editor ? `#/product/${product.id}` : `${appStore.state.adminUrl}post.php?post=${product.id}&action=edit`);

const syncQuery = () => {
  const query = {};
  const defaults = { status: 'any', page: 1, per_page: 20, orderby: 'date', order: 'desc' };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    if (defaults[key] !== undefined && String(defaults[key]) === String(value)) return;
    query[key] = String(value);
  });

  router.replace({ query });
};

let requestId = 0;

const loadProducts = async () => {
  const current = ++requestId;
  loading.value = true;

  const params = {
    page: filters.page,
    per_page: filters.per_page,
    status: filters.status,
    orderby: filters.orderby,
    order: filters.order,
    _fields: PRODUCT_FIELDS,
    search: filters.search,
    category: filters.category,
    type: filters.type,
    stock_status: filters.stock_status,
  };

  if (filters.featured === '1') {
    params.featured = 'true';
  }

  let response;

  if (filters.low_stock === '1') {
    response = await lmnFetchAnalytics(params);
  } else {
    response = await wc('products', { params });
  }

  if (current !== requestId) return;

  products.value = Array.isArray(response?.data) ? response.data : [];
  total.value = Number(response?.totalItems) || 0;
  loading.value = false;
};

const lmnFetchAnalytics = (params) => lmnFetch({ endpoint: 'wc-analytics/products', params: { ...params, low_in_stock: 'true' } });

const loadSummary = async () => {
  summaryLoading.value = true;
  const response = await fd('products/summary');
  summary.value = response?.data || null;
  summaryLoading.value = false;
};

const loadCategories = async () => {
  const all = [];
  let page = 1;

  while (page <= 10) {
    const response = await wc('products/categories', { params: { per_page: 100, page, _fields: 'id,name,parent,count,slug' } });
    const items = Array.isArray(response?.data) ? response.data : [];
    all.push(...items);

    if (items.length < 100) break;
    page++;
  }

  categories.value = all;
};

const refresh = () => {
  selected.value = [];
  loadProducts();
  loadSummary();
};

const reloadFromFilters = () => {
  expanded.value = [];
  syncQuery();
  loadProducts();
};

watch(
  () => [filters.status, filters.search, filters.category, filters.type, filters.stock_status, filters.featured, filters.low_stock, filters.per_page, filters.orderby, filters.order].join('|'),
  () => {
    if (filters.page !== 1) {
      filters.page = 1;
      return;
    }

    reloadFromFilters();
  }
);

watch(() => filters.page, reloadFromFilters);

watch(
  () => filters.status,
  () => {
    selected.value = [];
  }
);

const selectStat = (item) => {
  filters.search = '';
  filters.category = '';
  filters.type = '';
  filters.featured = '';
  filters.stock_status = '';
  filters.low_stock = '';
  filters.page = 1;

  if (item.key === 'total') filters.status = 'any';
  if (item.key === 'publish') filters.status = 'publish';
  if (item.key === 'outofstock') {
    filters.status = 'any';
    filters.stock_status = 'outofstock';
  }
  if (item.key === 'lowstock') {
    filters.status = 'any';
    filters.low_stock = '1';
  }
};

const clearFilters = () => {
  filters.search = '';
  filters.category = '';
  filters.type = '';
  filters.stock_status = '';
  filters.featured = '';
  filters.low_stock = '';
  filters.page = 1;
};

const updateProduct = async (product, data, successMessage) => {
  const response = await wc(`products/${product.id}`, { type: 'PUT', data });

  if (!response?.data) return false;

  const index = products.value.findIndex((item) => item.id === product.id);
  if (index > -1) products.value[index] = { ...products.value[index], ...response.data };

  if (successMessage) notify({ title: successMessage, type: 'success' });
  loadSummary();

  return response.data;
};

const toggleFeatured = (product) => updateProduct(product, { featured: !product.featured }, product.featured ? __('Removed from featured', 'flexify-dashboard') : __('Marked as featured', 'flexify-dashboard'));

const openQuickEdit = (product) => {
  quickEditProduct.value = product;
  quickEditOpen.value = true;
};

const onQuickEditSaved = (updated) => {
  const index = products.value.findIndex((item) => item.id === updated.id);
  if (index > -1) products.value[index] = { ...products.value[index], ...updated };
  loadSummary();
};

const duplicateProduct = async (product) => {
  const response = await fd(`products/${product.id}/duplicate`, { type: 'POST' });

  if (response?.data?.id) {
    notify({ title: __('Product duplicated', 'flexify-dashboard'), message: __('The copy was saved as a draft.', 'flexify-dashboard'), type: 'success' });
    refresh();
  }
};

const runBulk = async (action, value, ids = selected.value) => {
  if (!ids.length) return;

  bulkLoading.value = true;
  const response = await fd('products/bulk', { type: 'POST', data: { ids, action, value } });
  bulkLoading.value = false;

  if (!response?.data) return;

  const { updated = [], failed = [] } = response.data;

  if (updated.length) {
    notify({ title: sprintf(__('%d product(s) updated', 'flexify-dashboard'), updated.length), type: 'success' });
  }

  if (failed.length) {
    notify({ title: sprintf(__('%d product(s) could not be updated', 'flexify-dashboard'), failed.length), message: failed[0]?.message || '', type: 'error' });
  }

  selected.value = [];
  refresh();
};

const confirmBulk = async (action, ids = selected.value) => {
  const destructive = action === 'delete';
  const confirmed = await confirmDialog.value.show({
    title: destructive ? __('Delete permanently?', 'flexify-dashboard') : __('Move to trash?', 'flexify-dashboard'),
    message: destructive
      ? sprintf(__('%d product(s) will be permanently deleted. This action cannot be undone.', 'flexify-dashboard'), ids.length)
      : sprintf(__('%d product(s) will be moved to the trash.', 'flexify-dashboard'), ids.length),
    confirmLabel: destructive ? __('Delete permanently', 'flexify-dashboard') : __('Move to trash', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (confirmed) runBulk(action, undefined, ids);
};

const rowActions = (product) => {
  if (product.status === 'trash') {
    return [
      { label: __('Restore', 'flexify-dashboard'), icon: 'undo', onSelect: () => runBulk('restore', undefined, [product.id]) },
      { separator: true },
      { label: __('Delete permanently', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => confirmBulk('delete', [product.id]) },
    ];
  }

  const items = [
    { label: __('Edit', 'flexify-dashboard'), icon: 'edit', href: editUrl(product) },
    { label: __('Quick edit', 'flexify-dashboard'), icon: 'tune', onSelect: () => openQuickEdit(product) },
    { label: __('Duplicate', 'flexify-dashboard'), icon: 'content_copy', onSelect: () => duplicateProduct(product) },
  ];

  if (product.permalink) {
    items.push({ label: __('View in store', 'flexify-dashboard'), icon: 'open_in_new', href: product.permalink, target: '_blank' });
  }

  if (can('delete_products')) {
    items.push({ separator: true }, { label: __('Move to trash', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => runBulk('trash', undefined, [product.id]) });
  }

  return items;
};

const statusActions = computed(() =>
  ['publish', 'draft', 'pending', 'private'].map((status) => ({
    label: statusBadges.value[status].label,
    onSelect: () => runBulk('status', status),
  }))
);

const stockActions = computed(() =>
  (store.value.stock_statuses.length
    ? store.value.stock_statuses
    : [
        { value: 'instock', label: __('In stock', 'flexify-dashboard') },
        { value: 'outofstock', label: __('Out of stock', 'flexify-dashboard') },
        { value: 'onbackorder', label: __('On backorder', 'flexify-dashboard') },
      ]
  ).map((option) => ({ label: option.label, onSelect: () => runBulk('stock_status', option.value) }))
);

const moreBulkActions = computed(() => [
  { label: __('Mark as featured', 'flexify-dashboard'), icon: 'star_full', onSelect: () => runBulk('featured', true) },
  { label: __('Remove from featured', 'flexify-dashboard'), icon: 'star_empty', onSelect: () => runBulk('featured', false) },
  { separator: true },
  { label: __('Add category', 'flexify-dashboard'), icon: 'category', onSelect: () => Object.assign(categoryModal, { open: true, mode: 'add' }) },
  { label: __('Remove category', 'flexify-dashboard'), icon: 'category', onSelect: () => Object.assign(categoryModal, { open: true, mode: 'remove' }) },
]);

const sprintf = (format, ...args) => (window.wp?.i18n?.sprintf ? window.wp.i18n.sprintf(format, ...args) : format.replace(/%[sd]/g, () => args.shift()));

const pageLinks = computed(() => [
  { label: __('Categories', 'flexify-dashboard'), icon: 'category', onSelect: () => router.push({ name: 'product-categories' }) },
  { label: __('Tags', 'flexify-dashboard'), icon: 'label', href: store.value.urls.product_tags },
  { label: __('Attributes', 'flexify-dashboard'), icon: 'layers', onSelect: () => router.push({ name: 'product-attributes' }) },
  ...(store.value.coupons_enabled !== false ? [{ label: __('Coupons', 'flexify-dashboard'), icon: 'sell', onSelect: () => router.push({ name: 'coupons' }) }] : []),
  { separator: true },
  { label: __('Import products', 'flexify-dashboard'), icon: 'upload', href: store.value.urls.product_import },
  { label: __('Export products', 'flexify-dashboard'), icon: 'download', href: store.value.urls.product_export },
  { separator: true },
  { label: __('Classic products screen', 'flexify-dashboard'), icon: 'open_in_new', href: store.value.urls.classic_products },
]);

onMounted(() => {
  loadProducts();
  loadSummary();
  loadCategories();
});
</script>

<template>
  <div>
    <FdPageHeader :title="__('Products', 'flexify-dashboard')" :description="__('Manage your catalog, prices and stock.', 'flexify-dashboard')">
      <template #actions>
        <FdDropdown :items="pageLinks" width="w-56">
          <template #trigger>
            <FdButton variant="outline" icon-right="expand_more">{{ __('More', 'flexify-dashboard') }}</FdButton>
          </template>
        </FdDropdown>
        <FdButton v-if="can('edit_products')" icon="add" :href="store.product_editor ? '#/new' : store.urls.new_product">{{ __('Add product', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdPageHeader>

    <FdStatStrip class="mb-6" :items="statItems" :loading="summaryLoading" @select="selectStat" />

    <FdCard padding="none">
      <div class="px-5 pt-2 sm:px-6">
        <FdTabs v-model="filters.status" :items="statusTabs" :aria-label="__('Product status', 'flexify-dashboard')" />
      </div>

      <div class="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6 xl:flex-row xl:items-center">
        <FdSearchInput v-model="filters.search" class="w-full xl:w-80" :placeholder="__('Search by name or SKU', 'flexify-dashboard')" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-1 xl:items-center">
          <FdSelect v-model="filters.category" :options="categoryOptions" :placeholder="__('All categories', 'flexify-dashboard')" class="xl:w-48" />
          <FdSelect v-model="filters.type" :options="store.product_types" :placeholder="__('All types', 'flexify-dashboard')" class="xl:w-44" />
          <FdSelect v-model="filters.stock_status" :options="store.stock_statuses" :placeholder="__('Any stock status', 'flexify-dashboard')" class="xl:w-44" />
          <FdSelect
            v-model="filters.featured"
            :options="[{ value: '1', label: __('Featured only', 'flexify-dashboard') }]"
            :placeholder="__('All products', 'flexify-dashboard')"
            class="xl:w-40"
          />
        </div>
        <div class="flex items-center gap-2 xl:ms-auto">
          <FdButton v-if="hasActiveFilters" variant="ghost" icon="close" @click="clearFilters">{{ __('Clear filters', 'flexify-dashboard') }}</FdButton>
          <FdTooltip :text="__('Refresh', 'flexify-dashboard')">
            <FdButton variant="outline" icon="refresh" icon-only :aria-label="__('Refresh', 'flexify-dashboard')" @click="refresh" />
          </FdTooltip>
        </div>
      </div>

      <FdDataTable
        v-model:selected="selected"
        v-model:sort="sort"
        v-model:expanded="expanded"
        :columns="columns"
        :rows="products"
        :loading="loading"
        :skeleton-rows="Math.min(filters.per_page, 10)"
        selectable
        :expandable="(product) => product.type === 'variable' && product.status !== 'trash'"
        empty-icon="inventory"
        :empty-title="hasActiveFilters ? __('No products match your filters', 'flexify-dashboard') : __('No products yet', 'flexify-dashboard')"
        :empty-description="hasActiveFilters ? __('Try adjusting the search or filters.', 'flexify-dashboard') : __('Create your first product to start selling.', 'flexify-dashboard')"
        :caption="__('Products', 'flexify-dashboard')"
      >
        <template #bulk-actions>
          <template v-if="!isTrash">
            <FdDropdown :items="statusActions" align="start">
              <template #trigger>
                <FdButton size="xs" variant="outline" icon-right="expand_more" :loading="bulkLoading">{{ __('Status', 'flexify-dashboard') }}</FdButton>
              </template>
            </FdDropdown>
            <FdDropdown :items="stockActions" align="start">
              <template #trigger>
                <FdButton size="xs" variant="outline" icon-right="expand_more">{{ __('Stock', 'flexify-dashboard') }}</FdButton>
              </template>
            </FdDropdown>
            <FdButton size="xs" variant="outline" icon="sell" @click="priceModalOpen = true">{{ __('Adjust prices', 'flexify-dashboard') }}</FdButton>
            <FdDropdown :items="moreBulkActions" align="start" width="w-52">
              <template #trigger>
                <FdButton size="xs" variant="outline" icon-right="expand_more">{{ __('More', 'flexify-dashboard') }}</FdButton>
              </template>
            </FdDropdown>
            <FdButton v-if="can('delete_products')" size="xs" variant="danger-outline" icon="delete" @click="confirmBulk('trash')">{{ __('Trash', 'flexify-dashboard') }}</FdButton>
          </template>
          <template v-else>
            <FdButton size="xs" variant="outline" icon="undo" :loading="bulkLoading" @click="runBulk('restore')">{{ __('Restore', 'flexify-dashboard') }}</FdButton>
            <FdButton size="xs" variant="danger-outline" icon="delete" @click="confirmBulk('delete')">{{ __('Delete permanently', 'flexify-dashboard') }}</FdButton>
          </template>
        </template>

        <template #cell-name="{ row }">
          <div class="flex min-w-64 items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img v-if="row.images?.[0]?.src" :src="row.images[0].src" :alt="row.images[0].alt || row.name" class="h-full w-full object-cover" loading="lazy" />
              <AppIcon v-else icon="image" class="text-xl text-gray-400" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <a :href="editUrl(row)" class="truncate font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400">
                  {{ decodeHtml(row.name) || __('(no title)', 'flexify-dashboard') }}
                </a>
                <button
                  v-if="row.status !== 'trash'"
                  type="button"
                  class="shrink-0 transition-colors"
                  :class="row.featured ? 'text-warning-500' : 'text-gray-300 hover:text-warning-500 dark:text-gray-600'"
                  :aria-label="row.featured ? __('Remove from featured', 'flexify-dashboard') : __('Mark as featured', 'flexify-dashboard')"
                  @click="toggleFeatured(row)"
                >
                  <AppIcon :icon="row.featured ? 'star_full' : 'star_empty'" class="text-base" />
                </button>
              </div>
              <div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-theme-xs text-gray-500 dark:text-gray-400">
                <span v-if="row.sku">{{ __('SKU', 'flexify-dashboard') }}: {{ row.sku }}</span>
                <span v-if="row.sku" class="text-gray-300 dark:text-gray-700">•</span>
                <span class="capitalize">{{ store.product_types.find((type) => type.value === row.type)?.label || row.type }}</span>
                <span v-if="row.variations?.length" class="text-gray-300 dark:text-gray-700">•</span>
                <span v-if="row.variations?.length">{{ sprintf(__('%d variations', 'flexify-dashboard'), row.variations.length) }}</span>
              </div>
            </div>
          </div>
        </template>

        <template #cell-categories="{ row }">
          <span class="line-clamp-2 min-w-32 text-theme-sm">{{ row.categories?.map((category) => decodeHtml(category.name)).join(', ') || '—' }}</span>
        </template>

        <template #cell-price="{ row }">
          <span class="fd-price whitespace-nowrap font-medium text-gray-800 dark:text-white/90" v-html="row.price_html || price(row.price) || '—'"></span>
        </template>

        <template #cell-stock="{ row }">
          <div class="flex flex-col items-start gap-1 whitespace-nowrap">
            <FdBadge :color="stockBadge(row).color">{{ stockBadge(row).label }}</FdBadge>
            <span v-if="row.manage_stock && row.stock_quantity !== null" class="text-theme-xs text-gray-500 dark:text-gray-400">
              {{ sprintf(__('%s in stock', 'flexify-dashboard'), Number(row.stock_quantity).toLocaleString()) }}
            </span>
          </div>
        </template>

        <template #cell-status="{ row }">
          <FdBadge :color="statusBadges[row.status]?.color || 'light'">{{ statusBadges[row.status]?.label || row.status }}</FdBadge>
        </template>

        <template #cell-date="{ row }">
          <span class="whitespace-nowrap">{{ formatDate(row.date_created) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <FdDropdown :items="rowActions(row)" width="w-52">
            <template #trigger>
              <FdButton variant="ghost" size="xs" icon="more_vert" icon-only :aria-label="__('Actions', 'flexify-dashboard')" />
            </template>
          </FdDropdown>
        </template>

        <template #expanded="{ row }">
          <ProductVariations :product="row" @updated="loadSummary" />
        </template>
      </FdDataTable>

      <template #footer>
        <FdPagination v-model:page="filters.page" v-model:per-page="filters.per_page" :total="total" :disabled="loading" />
      </template>
    </FdCard>

    <ProductQuickEdit v-model:open="quickEditOpen" :product="quickEditProduct" :categories="categories" @saved="onQuickEditSaved" />
    <BulkPriceModal v-model:open="priceModalOpen" :count="selected.length" @apply="(value) => runBulk('price', value)" />
    <BulkCategoryModal v-model:open="categoryModal.open" :mode="categoryModal.mode" :options="categoryOptions" :count="selected.length" @apply="(term) => runBulk(categoryModal.mode === 'add' ? 'add_category' : 'remove_category', term)" />
    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>

<style>
.fd-price del {
  margin-inline-end: 0.25rem;
  color: rgb(var(--fd-base-400));
  font-weight: 400;
}

.fd-price ins {
  text-decoration: none;
}

.fd-price .screen-reader-text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
