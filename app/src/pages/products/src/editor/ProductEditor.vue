<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  FdAlert,
  FdBadge,
  FdButton,
  FdCard,
  FdCheckbox,
  FdConfirmDialog,
  FdDropdown,
  FdEmptyState,
  FdInput,
  FdPageHeader,
  FdSearchInput,
  FdSelect,
  FdSkeleton,
  FdSwitch,
  FdTabs,
  FdTextarea,
} from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useAppStore } from '@/store/app/app.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';
import { openMediaFrame } from './useWpMedia.js';
import ProductAttributes from './ProductAttributes.vue';
import ProductVariationsEditor from './ProductVariationsEditor.vue';
import ProductPicker from './ProductPicker.vue';

const RichText = defineAsyncComponent(() => import('@/components/utility/rich-text/index.vue'));

const props = defineProps({
  id: { type: Number, default: 0 },
});

const router = useRouter();
const appStore = useAppStore();
const { store, currency, wc, toDecimal, can } = useWooCommerce();

const isNew = computed(() => !props.id);

const loading = ref(!isNew.value);
const notFound = ref(false);
const saving = ref(false);
const product = ref(null);
const categories = ref([]);
const categorySearch = ref('');
const newCategory = ref('');
const shippingClasses = ref([]);
const errors = reactive({});
const confirmDialog = ref(null);
const variationsRef = ref(null);
const variationsDirty = ref(false);
const savedSnapshot = ref('');
const descriptionTab = ref('description');

const form = reactive({
  name: '',
  slug: '',
  type: 'simple',
  status: 'draft',
  catalog_visibility: 'visible',
  featured: false,
  description: '',
  short_description: '',
  regular_price: '',
  sale_price: '',
  schedule_sale: false,
  date_on_sale_from: '',
  date_on_sale_to: '',
  tax_status: 'taxable',
  tax_class: '',
  sku: '',
  manage_stock: false,
  stock_quantity: '',
  stock_status: 'instock',
  backorders: 'no',
  low_stock_amount: '',
  sold_individually: false,
  virtual: false,
  downloadable: false,
  weight: '',
  length: '',
  width: '',
  height: '',
  shipping_class: '',
  external_url: '',
  button_text: '',
  images: [],
  categories: [],
  tags: '',
  attributes: [],
  purchase_note: '',
  menu_order: 0,
  reviews_allowed: true,
  upsell_ids: [],
  cross_sell_ids: [],
  grouped_products: [],
  downloads: [],
  download_limit: '',
  download_expiry: '',
});

const snapshot = () => JSON.stringify(form);
const isDirty = computed(() => savedSnapshot.value !== '' && (snapshot() !== savedSnapshot.value || variationsDirty.value));
const attributesDirty = computed(() => savedSnapshot.value !== '' && JSON.stringify(form.attributes) !== JSON.stringify(JSON.parse(savedSnapshot.value).attributes));

const typeOptions = computed(() =>
  store.value.product_types.length
    ? store.value.product_types
    : [
        { value: 'simple', label: __('Simple product', 'flexify-dashboard') },
        { value: 'variable', label: __('Variable product', 'flexify-dashboard') },
        { value: 'grouped', label: __('Grouped product', 'flexify-dashboard') },
        { value: 'external', label: __('External/Affiliate product', 'flexify-dashboard') },
      ]
);

const statusOptions = computed(() => [
  { value: 'publish', label: __('Published', 'flexify-dashboard') },
  { value: 'draft', label: __('Draft', 'flexify-dashboard') },
  { value: 'pending', label: __('Pending review', 'flexify-dashboard') },
  { value: 'private', label: __('Private', 'flexify-dashboard') },
]);

const visibilityOptions = computed(() => [
  { value: 'visible', label: __('Shop and search results', 'flexify-dashboard') },
  { value: 'catalog', label: __('Shop only', 'flexify-dashboard') },
  { value: 'search', label: __('Search results only', 'flexify-dashboard') },
  { value: 'hidden', label: __('Hidden', 'flexify-dashboard') },
]);

const backorderOptions = computed(() => [
  { value: 'no', label: __('Do not allow', 'flexify-dashboard') },
  { value: 'notify', label: __('Allow, but notify customer', 'flexify-dashboard') },
  { value: 'yes', label: __('Allow', 'flexify-dashboard') },
]);

const taxStatusOptions = computed(() => [
  { value: 'taxable', label: __('Taxable', 'flexify-dashboard') },
  { value: 'shipping', label: __('Shipping only', 'flexify-dashboard') },
  { value: 'none', label: __('None', 'flexify-dashboard') },
]);

const stockOptions = computed(() =>
  store.value.stock_statuses.length
    ? store.value.stock_statuses
    : [
        { value: 'instock', label: __('In stock', 'flexify-dashboard') },
        { value: 'outofstock', label: __('Out of stock', 'flexify-dashboard') },
        { value: 'onbackorder', label: __('On backorder', 'flexify-dashboard') },
      ]
);

const isVariable = computed(() => form.type === 'variable');
const isExternal = computed(() => form.type === 'external');
const isGrouped = computed(() => form.type === 'grouped');
const hasDownloads = computed(() => form.downloadable && form.type === 'simple');
const hasPrice = computed(() => !isVariable.value && !isGrouped.value);
const hasInventory = computed(() => !isExternal.value && !isGrouped.value);
const hasShipping = computed(() => !form.virtual && !isExternal.value && !isGrouped.value);
const featuredImage = computed(() => form.images[0] || null);
const gallery = computed(() => form.images.slice(1));

const decode = (value) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value ?? '';
  return textarea.value;
};

const localPrice = (value) => (value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.value.decimal_separator || ','));

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

const categoryTree = computed(() => {
  const byParent = {};
  categories.value.forEach((category) => (byParent[category.parent] ||= []).push(category));

  const list = [];
  const walk = (parent, depth) => {
    (byParent[parent] || [])
      .sort((a, b) => decode(a.name).localeCompare(decode(b.name)))
      .forEach((category) => {
        list.push({ ...category, label: decode(category.name), depth });
        walk(category.id, depth + 1);
      });
  };
  walk(0, 0);

  const term = categorySearch.value.trim().toLowerCase();
  return term ? list.filter((category) => category.label.toLowerCase().includes(term)).map((category) => ({ ...category, depth: 0 })) : list;
});

const breadcrumbs = computed(() => [
  { label: __('Products', 'flexify-dashboard'), to: { name: 'products' } },
  { label: isNew.value ? __('Add product', 'flexify-dashboard') : form.name || __('(no title)', 'flexify-dashboard') },
]);

const classicUrl = computed(() =>
  isNew.value ? `${appStore.state.adminUrl}post-new.php?post_type=product&fd_classic=1` : `${appStore.state.adminUrl}post.php?post=${props.id}&action=edit&fd_classic=1`
);

const fillForm = (data) => {
  Object.assign(form, {
    name: decode(data.name),
    slug: data.slug || '',
    type: data.type || 'simple',
    status: data.status === 'auto-draft' ? 'draft' : data.status || 'draft',
    catalog_visibility: data.catalog_visibility || 'visible',
    featured: !!data.featured,
    description: data.description || '',
    short_description: data.short_description || '',
    regular_price: localPrice(data.regular_price),
    sale_price: localPrice(data.sale_price),
    schedule_sale: !!(data.date_on_sale_from || data.date_on_sale_to),
    date_on_sale_from: toDateInput(data.date_on_sale_from),
    date_on_sale_to: toDateInput(data.date_on_sale_to),
    tax_status: data.tax_status || 'taxable',
    tax_class: data.tax_class || '',
    sku: data.sku || '',
    manage_stock: data.manage_stock === true,
    stock_quantity: data.stock_quantity ?? '',
    stock_status: data.stock_status || 'instock',
    backorders: data.backorders || 'no',
    low_stock_amount: data.low_stock_amount ?? '',
    sold_individually: !!data.sold_individually,
    virtual: !!data.virtual,
    downloadable: !!data.downloadable,
    weight: data.weight || '',
    length: data.dimensions?.length || '',
    width: data.dimensions?.width || '',
    height: data.dimensions?.height || '',
    shipping_class: data.shipping_class || '',
    external_url: data.external_url || '',
    button_text: data.button_text || '',
    images: (data.images || []).map((image) => ({ id: image.id, src: image.src, alt: image.alt || '' })),
    categories: (data.categories || []).map((category) => category.id),
    tags: (data.tags || []).map((tag) => decode(tag.name)).join(', '),
    attributes: (data.attributes || []).map((attribute) => ({ ...attribute, options: [...(attribute.options || [])] })),
    purchase_note: data.purchase_note || '',
    menu_order: data.menu_order ?? 0,
    reviews_allowed: data.reviews_allowed !== false,
    upsell_ids: [...(data.upsell_ids || [])],
    cross_sell_ids: [...(data.cross_sell_ids || [])],
    grouped_products: [...(data.grouped_products || [])],
    downloads: (data.downloads || []).map((file) => ({ id: file.id || '', name: file.name || '', file: file.file || '' })),
    download_limit: data.download_limit === -1 || data.download_limit === undefined ? '' : String(data.download_limit),
    download_expiry: data.download_expiry === -1 || data.download_expiry === undefined ? '' : String(data.download_expiry),
  });

  savedSnapshot.value = snapshot();
};

const loadCategories = async () => {
  const all = [];

  for (let page = 1; page <= 20; page++) {
    const response = await wc('products/categories', { params: { per_page: 100, page, _fields: 'id,name,parent' } });
    const items = Array.isArray(response?.data) ? response.data : [];
    all.push(...items);
    if (items.length < 100) break;
  }

  categories.value = all;
};

const loadShippingClasses = async () => {
  const response = await wc('products/shipping_classes', { params: { per_page: 100, _fields: 'id,name,slug' } });
  shippingClasses.value = (response?.data || []).map((item) => ({ value: item.slug, label: decode(item.name) }));
};

const load = async () => {
  loadCategories();
  loadShippingClasses();

  if (isNew.value) {
    savedSnapshot.value = snapshot();
    return;
  }

  loading.value = true;
  const response = await wc(`products/${props.id}`);

  if (!response?.data) {
    notFound.value = true;
    loading.value = false;
    return;
  }

  product.value = response.data;
  fillForm(response.data);
  loading.value = false;
};

const validate = () => {
  Object.keys(errors).forEach((key) => delete errors[key]);

  if (!form.name.trim()) errors.name = __('The product name is required.', 'flexify-dashboard');

  if (hasPrice.value && form.sale_price !== '' && form.regular_price !== '' && Number(toDecimal(form.sale_price)) >= Number(toDecimal(form.regular_price))) {
    errors.sale_price = __('The sale price must be lower than the regular price.', 'flexify-dashboard');
  }

  if (form.schedule_sale && form.date_on_sale_from && form.date_on_sale_to && form.date_on_sale_to < form.date_on_sale_from) {
    errors.date_on_sale_to = __('The end date must be after the start date.', 'flexify-dashboard');
  }

  if (isExternal.value && form.external_url && !/^https?:\/\//i.test(form.external_url)) {
    errors.external_url = __('Enter a valid URL starting with http:// or https://.', 'flexify-dashboard');
  }

  if (form.attributes.some((attribute) => !attribute.id && !String(attribute.name).trim())) {
    errors.attributes = __('Give every custom attribute a name.', 'flexify-dashboard');
  }

  return !Object.keys(errors).length;
};

const buildPayload = (status) => {
  const existingTags = product.value?.tags || [];

  const payload = {
    name: form.name.trim(),
    type: form.type,
    status,
    catalog_visibility: form.catalog_visibility,
    featured: form.featured,
    description: form.description,
    short_description: form.short_description,
    sku: form.sku.trim(),
    tax_status: form.tax_status,
    tax_class: form.tax_class,
    sold_individually: form.sold_individually,
    virtual: form.virtual,
    downloadable: form.downloadable,
    weight: String(form.weight || ''),
    dimensions: { length: String(form.length || ''), width: String(form.width || ''), height: String(form.height || '') },
    shipping_class: form.shipping_class,
    images: form.images.map((image, position) => ({ id: image.id, position })),
    categories: form.categories.map((id) => ({ id })),
    tags: form.tags
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => {
        const existing = existingTags.find((tag) => decode(tag.name).toLowerCase() === name.toLowerCase());
        return existing ? { id: existing.id } : { name };
      }),
    attributes: form.attributes.map((attribute, position) => ({
      ...(attribute.id ? { id: attribute.id } : { name: String(attribute.name).trim() }),
      position,
      visible: !!attribute.visible,
      variation: isVariable.value && !!attribute.variation,
      options: attribute.options,
    })),
    purchase_note: form.purchase_note,
    menu_order: Number(form.menu_order) || 0,
    reviews_allowed: form.reviews_allowed,
    upsell_ids: form.upsell_ids,
    cross_sell_ids: form.cross_sell_ids,
  };

  if (isGrouped.value) payload.grouped_products = form.grouped_products;

  if (hasDownloads.value) {
    payload.downloads = form.downloads
      .filter((file) => file.file.trim())
      .map((file) => ({ ...(file.id ? { id: file.id } : {}), name: file.name.trim() || file.file.split('/').pop(), file: file.file.trim() }));
    payload.download_limit = form.download_limit === '' ? -1 : Number(form.download_limit);
    payload.download_expiry = form.download_expiry === '' ? -1 : Number(form.download_expiry);
  }

  if (!isNew.value && form.slug.trim()) payload.slug = form.slug.trim();

  if (hasPrice.value) {
    payload.regular_price = toDecimal(form.regular_price);
    payload.sale_price = toDecimal(form.sale_price);
    payload.date_on_sale_from = form.schedule_sale && form.date_on_sale_from ? `${form.date_on_sale_from}T00:00:00` : '';
    payload.date_on_sale_to = form.schedule_sale && form.date_on_sale_to ? `${form.date_on_sale_to}T23:59:59` : '';
  }

  if (isExternal.value) {
    payload.external_url = form.external_url.trim();
    payload.button_text = form.button_text.trim();
  }

  if (hasInventory.value) {
    payload.manage_stock = form.manage_stock;

    if (form.manage_stock) {
      payload.stock_quantity = form.stock_quantity === '' ? null : Number(form.stock_quantity);
      payload.backorders = form.backorders;
      payload.low_stock_amount = form.low_stock_amount === '' ? null : Number(form.low_stock_amount);
    } else if (!isVariable.value) {
      payload.stock_status = form.stock_status;
    }
  }

  return payload;
};

const save = async (status = form.status) => {
  if (!validate()) {
    notify({ title: __('Please review the highlighted fields', 'flexify-dashboard'), type: 'error' });
    return;
  }

  saving.value = true;

  const variationsSaved = variationsRef.value ? await variationsRef.value.save() : true;
  const response = isNew.value
    ? await wc('products', { type: 'POST', data: buildPayload(status) })
    : await wc(`products/${props.id}`, { type: 'PUT', data: buildPayload(status) });

  saving.value = false;

  if (!response?.data) return;

  product.value = response.data;
  fillForm(response.data);

  if (variationsSaved) {
    notify({ title: status === 'publish' && product.value.status === 'publish' ? __('Product saved and published', 'flexify-dashboard') : __('Product saved', 'flexify-dashboard'), type: 'success' });
  }

  if (isNew.value) {
    router.replace({ name: 'product-edit', params: { id: response.data.id } });
  }
};

const chooseFeatured = async () => {
  const [image] = await openMediaFrame({ title: __('Product image', 'flexify-dashboard'), button: __('Set product image', 'flexify-dashboard') });
  if (image) form.images = [image, ...form.images.slice(1).filter((item) => item.id !== image.id)];
};

const addDownload = () => {
  form.downloads = [...form.downloads, { id: '', name: '', file: '' }];
};

const chooseDownloadFile = async (index) => {
  const [file] = await openMediaFrame({ title: __('Downloadable file', 'flexify-dashboard'), button: __('Use file', 'flexify-dashboard'), type: '' });
  if (!file) return;

  form.downloads = form.downloads.map((item, itemIndex) => (itemIndex === index ? { ...item, file: file.url, name: item.name || file.title } : item));
};

const removeDownload = (index) => {
  form.downloads = form.downloads.filter((_, itemIndex) => itemIndex !== index);
};

const addGallery = async () => {
  const images = await openMediaFrame({ title: __('Product gallery', 'flexify-dashboard'), button: __('Add to gallery', 'flexify-dashboard'), multiple: true });
  if (!images.length) return;

  const ids = new Set(form.images.map((image) => image.id));
  const fresh = images.filter((image) => !ids.has(image.id));

  // Without a featured image the first gallery image becomes the product image.
  form.images = [...form.images, ...fresh];
};

const removeImage = (index) => {
  form.images = form.images.filter((_, itemIndex) => itemIndex !== index);
};

const makeFeatured = (index) => {
  const image = form.images[index];
  form.images = [image, ...form.images.filter((_, itemIndex) => itemIndex !== index)];
};

const createCategory = async () => {
  const name = newCategory.value.trim();
  if (!name) return;

  const response = await wc('products/categories', { type: 'POST', data: { name } });

  if (!response?.data) return;

  categories.value = [...categories.value, response.data];
  form.categories = [...form.categories, response.data.id];
  newCategory.value = '';
};

const moreActions = computed(() => {
  const items = [];

  if (product.value?.permalink) {
    items.push({ label: form.status === 'publish' ? __('View in store', 'flexify-dashboard') : __('Preview', 'flexify-dashboard'), icon: 'open_in_new', href: product.value.permalink, target: '_blank' });
  }

  items.push({ label: __('Open in classic editor', 'flexify-dashboard'), icon: 'edit_note', href: classicUrl.value });

  if (!isNew.value && can('delete_products')) {
    items.push({ separator: true }, { label: __('Move to trash', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: trashProduct });
  }

  return items;
});

const trashProduct = async () => {
  const confirmed = await confirmDialog.value.show({
    title: __('Move to trash?', 'flexify-dashboard'),
    message: form.name,
    confirmLabel: __('Move to trash', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await wc(`products/${props.id}`, { type: 'DELETE' });

  if (response?.data) {
    savedSnapshot.value = snapshot();
    variationsDirty.value = false;
    notify({ title: __('Product moved to the trash', 'flexify-dashboard'), type: 'success' });
    router.push({ name: 'products' });
  }
};

const primaryLabel = computed(() => {
  if (form.status === 'publish' && product.value?.status === 'publish') return __('Update', 'flexify-dashboard');
  return __('Publish', 'flexify-dashboard');
});

const onBeforeUnload = (event) => {
  if (!isDirty.value) return;
  event.preventDefault();
  event.returnValue = '';
};

onBeforeRouteLeave(async (to) => {
  if (!isDirty.value || saving.value) return true;
  // Replacing /new with the saved product route is not a real navigation away.
  if (to.name === 'product-edit' && isNew.value) return true;

  return confirmDialog.value.show({
    title: __('Discard unsaved changes?', 'flexify-dashboard'),
    message: __('Your changes to this product have not been saved.', 'flexify-dashboard'),
    confirmLabel: __('Discard changes', 'flexify-dashboard'),
    variant: 'danger',
  });
});

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload);
  load();
});

onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload));
</script>

<template>
  <div>
    <template v-if="loading">
      <div class="mb-6 space-y-2">
        <FdSkeleton class="h-4 w-40" />
        <FdSkeleton class="h-7 w-72" />
      </div>
      <div class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <FdSkeleton class="h-72 w-full rounded-2xl" />
          <FdSkeleton class="h-56 w-full rounded-2xl" />
        </div>
        <div class="space-y-6">
          <FdSkeleton class="h-48 w-full rounded-2xl" />
          <FdSkeleton class="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </template>

    <FdCard v-else-if="notFound">
      <FdEmptyState icon="search_off" :title="__('Product not found', 'flexify-dashboard')" :description="__('The product may have been deleted or you do not have permission to edit it.', 'flexify-dashboard')">
        <FdButton icon="arrow_back" variant="outline" @click="router.push({ name: 'products' })">{{ __('Back to products', 'flexify-dashboard') }}</FdButton>
      </FdEmptyState>
    </FdCard>

    <form v-else novalidate @submit.prevent="save()">
      <FdPageHeader :title="isNew ? __('Add product', 'flexify-dashboard') : form.name || __('(no title)', 'flexify-dashboard')" :breadcrumbs="breadcrumbs">
        <template #title>
          <span class="flex flex-wrap items-center gap-3">
            {{ isNew ? __('Add product', 'flexify-dashboard') : form.name || __('(no title)', 'flexify-dashboard') }}
            <FdBadge v-if="isDirty" color="warning" size="md" dot>{{ __('Unsaved changes', 'flexify-dashboard') }}</FdBadge>
          </span>
        </template>
        <template #actions>
          <FdDropdown :items="moreActions" width="w-56">
            <template #trigger>
              <FdButton variant="outline" icon="more_horiz" icon-only :aria-label="__('More actions', 'flexify-dashboard')" />
            </template>
          </FdDropdown>
          <FdButton v-if="form.status !== 'publish' || product?.status !== 'publish'" variant="outline" :loading="saving && form.status !== 'publish'" @click="save(form.status === 'publish' ? 'draft' : form.status)">
            {{ __('Save draft', 'flexify-dashboard') }}
          </FdButton>
          <FdButton :loading="saving" icon="check" @click="save('publish')">{{ primaryLabel }}</FdButton>
        </template>
      </FdPageHeader>

      <FdAlert
        v-if="!isNew && product && product.type && !['simple', 'variable', 'grouped', 'external'].includes(product.type)"
        variant="warning"
        class="mb-6"
        :title="__('This product type is managed by an extension', 'flexify-dashboard')"
        :message="__('Some fields may only be available in the classic editor.', 'flexify-dashboard')"
      />

      <div class="grid gap-6 xl:grid-cols-3">
        <!-- Main column -->
        <div class="min-w-0 space-y-6 xl:col-span-2">
          <FdCard :title="__('General', 'flexify-dashboard')">
            <div class="space-y-5">
              <FdInput v-model="form.name" :label="__('Product name', 'flexify-dashboard')" :error="errors.name" required />
              <FdInput v-if="!isNew" v-model="form.slug" :label="__('Slug', 'flexify-dashboard')" :hint="product?.permalink" />

              <div>
                <FdTabs
                  v-model="descriptionTab"
                  class="mb-3"
                  :items="[
                    { value: 'description', label: __('Description', 'flexify-dashboard') },
                    { value: 'short', label: __('Short description', 'flexify-dashboard') },
                  ]"
                  :aria-label="__('Descriptions', 'flexify-dashboard')"
                />
                <div class="fd-product-richtext">
                  <RichText v-if="descriptionTab === 'description'" key="description" v-model="form.description" :placeholder="__('Describe the product in detail…', 'flexify-dashboard')" />
                  <RichText v-else key="short" v-model="form.short_description" :placeholder="__('A short summary shown next to the product image…', 'flexify-dashboard')" />
                </div>
              </div>
            </div>
          </FdCard>

          <FdCard :title="__('Pricing', 'flexify-dashboard')">
            <div class="space-y-5">
              <FdSelect v-model="form.type" :options="typeOptions" :label="__('Product type', 'flexify-dashboard')" class="sm:max-w-xs" />

              <template v-if="hasPrice">
                <div class="grid gap-4 sm:grid-cols-2">
                  <FdInput v-model="form.regular_price" :label="__('Regular price', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" />
                  <FdInput v-model="form.sale_price" :label="__('Sale price', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" :error="errors.sale_price" />
                </div>
                <FdSwitch v-model="form.schedule_sale" :label="__('Schedule sale', 'flexify-dashboard')" />
                <div v-if="form.schedule_sale" class="grid gap-4 sm:grid-cols-2">
                  <FdInput v-model="form.date_on_sale_from" type="date" :label="__('Sale starts', 'flexify-dashboard')" />
                  <FdInput v-model="form.date_on_sale_to" type="date" :label="__('Sale ends', 'flexify-dashboard')" :error="errors.date_on_sale_to" />
                </div>
              </template>
              <p v-else-if="isVariable" class="text-theme-sm text-gray-500 dark:text-gray-400">{{ __('Prices are set on each variation.', 'flexify-dashboard') }}</p>
              <p v-else class="text-theme-sm text-gray-500 dark:text-gray-400">{{ __('Grouped products take their prices from the child products.', 'flexify-dashboard') }}</p>

              <div v-if="isExternal" class="grid gap-4 sm:grid-cols-2">
                <FdInput v-model="form.external_url" type="url" :label="__('Product URL', 'flexify-dashboard')" placeholder="https://" :error="errors.external_url" />
                <FdInput v-model="form.button_text" :label="__('Button text', 'flexify-dashboard')" :placeholder="__('Buy product', 'flexify-dashboard')" />
              </div>

              <div v-if="store.taxes_enabled" class="grid gap-4 sm:grid-cols-2">
                <FdSelect v-model="form.tax_status" :options="taxStatusOptions" :label="__('Tax status', 'flexify-dashboard')" />
                <FdSelect v-model="form.tax_class" :options="store.tax_classes || []" :label="__('Tax class', 'flexify-dashboard')" />
              </div>
            </div>
          </FdCard>

          <FdCard v-if="hasInventory" :title="__('Inventory', 'flexify-dashboard')">
            <div class="space-y-5">
              <FdInput v-model="form.sku" :label="__('SKU', 'flexify-dashboard')" :hint="__('Stock keeping unit, unique per product.', 'flexify-dashboard')" class="sm:max-w-xs" />
              <FdSwitch v-model="form.manage_stock" :label="isVariable ? __('Track stock at product level', 'flexify-dashboard') : __('Track stock quantity', 'flexify-dashboard')" />
              <div v-if="form.manage_stock" class="grid gap-4 sm:grid-cols-3">
                <FdInput v-model="form.stock_quantity" type="number" step="1" :label="__('Quantity', 'flexify-dashboard')" />
                <FdSelect v-model="form.backorders" :options="backorderOptions" :label="__('Backorders', 'flexify-dashboard')" />
                <FdInput v-model="form.low_stock_amount" type="number" min="0" step="1" :label="__('Low stock threshold', 'flexify-dashboard')" :placeholder="String(store.low_stock_amount)" />
              </div>
              <FdSelect v-else-if="!isVariable" v-model="form.stock_status" :options="stockOptions" :label="__('Stock status', 'flexify-dashboard')" class="sm:max-w-xs" />
              <FdCheckbox v-model="form.sold_individually" :label="__('Limit purchases to 1 item per order', 'flexify-dashboard')" />
            </div>
          </FdCard>

          <FdCard v-if="!isExternal && !isGrouped" :title="__('Shipping', 'flexify-dashboard')">
            <div class="space-y-5">
              <div class="flex flex-wrap gap-6">
                <FdSwitch v-model="form.virtual" :label="__('Virtual product (no shipping)', 'flexify-dashboard')" />
                <FdSwitch v-model="form.downloadable" :label="__('Downloadable', 'flexify-dashboard')" />
              </div>
              <FdAlert v-if="form.downloadable && isVariable" variant="info" :message="__('Downloadable files of variable products are managed in the classic editor.', 'flexify-dashboard')" />
              <div v-if="hasDownloads" class="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ __('Downloadable files', 'flexify-dashboard') }}</p>
                <div v-for="(file, index) in form.downloads" :key="index" class="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
                  <FdInput v-model="file.name" :label="__('File name', 'flexify-dashboard')" />
                  <FdInput v-model="file.file" type="url" :label="__('File URL', 'flexify-dashboard')" placeholder="https://" />
                  <div class="flex gap-1">
                    <FdButton variant="outline" icon="attach_file" icon-only :aria-label="__('Choose file', 'flexify-dashboard')" @click="chooseDownloadFile(index)" />
                    <FdButton variant="ghost" icon="delete" icon-only :aria-label="__('Remove file', 'flexify-dashboard')" @click="removeDownload(index)" />
                  </div>
                </div>
                <FdButton size="sm" variant="outline" icon="add" @click="addDownload">{{ __('Add file', 'flexify-dashboard') }}</FdButton>
                <div class="grid gap-4 sm:grid-cols-2">
                  <FdInput v-model="form.download_limit" type="number" min="0" step="1" :label="__('Download limit', 'flexify-dashboard')" :placeholder="__('Unlimited', 'flexify-dashboard')" />
                  <FdInput v-model="form.download_expiry" type="number" min="0" step="1" :label="__('Download expiry (days)', 'flexify-dashboard')" :placeholder="__('Never', 'flexify-dashboard')" />
                </div>
              </div>
              <template v-if="hasShipping">
                <div class="grid gap-4 sm:grid-cols-4">
                  <FdInput v-model="form.weight" :label="__('Weight', 'flexify-dashboard')" :suffix="store.weight_unit" inputmode="decimal" />
                  <FdInput v-model="form.length" :label="__('Length', 'flexify-dashboard')" :suffix="store.dimension_unit" inputmode="decimal" />
                  <FdInput v-model="form.width" :label="__('Width', 'flexify-dashboard')" :suffix="store.dimension_unit" inputmode="decimal" />
                  <FdInput v-model="form.height" :label="__('Height', 'flexify-dashboard')" :suffix="store.dimension_unit" inputmode="decimal" />
                </div>
                <FdSelect v-model="form.shipping_class" :options="[{ value: '', label: __('No shipping class', 'flexify-dashboard') }, ...shippingClasses]" :label="__('Shipping class', 'flexify-dashboard')" class="sm:max-w-xs" />
              </template>
            </div>
          </FdCard>

          <FdCard v-if="!isGrouped" :title="__('Attributes', 'flexify-dashboard')">
            <FdAlert v-if="errors.attributes" variant="error" :title="errors.attributes" class="mb-4" />
            <ProductAttributes v-model="form.attributes" :is-variable="isVariable" />
          </FdCard>

          <FdCard v-if="isVariable" :title="__('Variations', 'flexify-dashboard')">
            <FdAlert v-if="isNew || product?.type !== 'variable'" variant="info" :message="__('Save the product to start adding variations.', 'flexify-dashboard')" />
            <FdAlert v-if="!isNew && product?.type === 'variable' && attributesDirty" variant="warning" class="mb-4" :message="__('Save the product to use the attribute changes in the variations.', 'flexify-dashboard')" />
            <ProductVariationsEditor v-if="!isNew && product?.type === 'variable'" ref="variationsRef" :product-id="product.id" :attributes="product.attributes" @dirty-change="(value) => (variationsDirty = value)" />
          </FdCard>

          <FdCard :title="__('Linked products', 'flexify-dashboard')">
            <div class="space-y-5">
              <div v-if="isGrouped">
                <p class="mb-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{{ __('Grouped products', 'flexify-dashboard') }}</p>
                <ProductPicker v-model="form.grouped_products" :exclude="id ? [id] : []" :types="['simple', 'variable', 'external']" />
              </div>
              <div>
                <p class="mb-1 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{{ __('Upsells', 'flexify-dashboard') }}</p>
                <p class="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">{{ __('Products recommended instead of this one, usually more profitable or better quality.', 'flexify-dashboard') }}</p>
                <ProductPicker v-model="form.upsell_ids" :exclude="id ? [id] : []" />
              </div>
              <div>
                <p class="mb-1 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{{ __('Cross-sells', 'flexify-dashboard') }}</p>
                <p class="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">{{ __('Products promoted in the cart based on this product.', 'flexify-dashboard') }}</p>
                <ProductPicker v-model="form.cross_sell_ids" :exclude="id ? [id] : []" />
              </div>
            </div>
          </FdCard>

          <FdCard :title="__('Advanced', 'flexify-dashboard')">
            <div class="space-y-5">
              <FdTextarea v-model="form.purchase_note" :rows="3" :label="__('Purchase note', 'flexify-dashboard')" :hint="__('Sent to the customer after purchase.', 'flexify-dashboard')" />
              <div class="grid gap-4 sm:grid-cols-2">
                <FdInput v-model="form.menu_order" type="number" step="1" :label="__('Menu order', 'flexify-dashboard')" />
              </div>
              <FdCheckbox v-model="form.reviews_allowed" :label="__('Enable reviews', 'flexify-dashboard')" />
            </div>
          </FdCard>
        </div>

        <!-- Sidebar -->
        <div class="min-w-0 space-y-6">
          <FdCard :title="__('Publish', 'flexify-dashboard')">
            <div class="space-y-4">
              <FdSelect v-model="form.status" :options="statusOptions" :label="__('Status', 'flexify-dashboard')" />
              <FdSelect v-model="form.catalog_visibility" :options="visibilityOptions" :label="__('Catalog visibility', 'flexify-dashboard')" />
              <FdSwitch v-model="form.featured" :label="__('Featured product', 'flexify-dashboard')" />
              <p v-if="product?.date_modified" class="text-theme-xs text-gray-500 dark:text-gray-400">
                {{ __('Last modified', 'flexify-dashboard') }}: {{ new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(product.date_modified)) }}
              </p>
            </div>
          </FdCard>

          <FdCard :title="__('Images', 'flexify-dashboard')">
            <button
              v-if="!featuredImage"
              type="button"
              class="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-theme-sm text-gray-500 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              @click="chooseFeatured"
            >
              <AppIcon icon="image" class="text-3xl" />
              {{ __('Set product image', 'flexify-dashboard') }}
            </button>
            <div v-else class="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <img :src="featuredImage.src" :alt="featuredImage.alt" class="aspect-square w-full object-cover" />
              <div class="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-gray-900/60 p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <FdButton size="xs" variant="outline" @click="chooseFeatured">{{ __('Replace', 'flexify-dashboard') }}</FdButton>
                <FdButton size="xs" variant="danger" icon="delete" icon-only :aria-label="__('Remove image', 'flexify-dashboard')" @click="removeImage(0)" />
              </div>
            </div>

            <div class="mt-4">
              <p class="mb-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{{ __('Gallery', 'flexify-dashboard') }}</p>
              <div class="grid grid-cols-4 gap-2">
                <div v-for="(image, index) in gallery" :key="image.id" class="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                  <img :src="image.src" :alt="image.alt" class="aspect-square w-full object-cover" />
                  <div class="absolute inset-0 flex items-center justify-center gap-1 bg-gray-900/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button type="button" class="rounded-full bg-white/90 p-1 text-gray-700 hover:text-brand-500" :aria-label="__('Use as product image', 'flexify-dashboard')" @click="makeFeatured(index + 1)">
                      <AppIcon icon="star_full" class="text-sm" />
                    </button>
                    <button type="button" class="rounded-full bg-white/90 p-1 text-gray-700 hover:text-error-500" :aria-label="__('Remove image', 'flexify-dashboard')" @click="removeImage(index + 1)">
                      <AppIcon icon="close" class="text-sm" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  class="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-gray-700"
                  :aria-label="__('Add gallery images', 'flexify-dashboard')"
                  @click="addGallery"
                >
                  <AppIcon icon="add" class="text-xl" />
                </button>
              </div>
            </div>
          </FdCard>

          <FdCard :title="__('Categories', 'flexify-dashboard')">
            <FdSearchInput v-if="categories.length > 8" v-model="categorySearch" size="sm" class="mb-3" :placeholder="__('Search categories', 'flexify-dashboard')" />
            <div class="flex max-h-64 flex-col items-start gap-2 overflow-y-auto pe-1 custom-scrollbar">
              <FdCheckbox
                v-for="category in categoryTree"
                :key="category.id"
                v-model="form.categories"
                :value="category.id"
                :label="category.label"
                size="sm"
                :style="{ paddingInlineStart: `${category.depth * 1.25}rem` }"
              />
              <p v-if="!categoryTree.length" class="text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No categories found.', 'flexify-dashboard') }}</p>
            </div>
            <div class="mt-3 flex gap-2">
              <FdInput v-model="newCategory" size="sm" class="flex-1" :placeholder="__('New category', 'flexify-dashboard')" :aria-label="__('New category', 'flexify-dashboard')" @keydown.enter.prevent="createCategory" />
              <FdButton size="sm" variant="outline" icon="add" icon-only :aria-label="__('Add category', 'flexify-dashboard')" @click="createCategory" />
            </div>
          </FdCard>

          <FdCard :title="__('Tags', 'flexify-dashboard')">
            <FdInput v-model="form.tags" :hint="__('Separate tags with commas.', 'flexify-dashboard')" :aria-label="__('Tags', 'flexify-dashboard')" />
          </FdCard>
        </div>
      </div>
    </form>

    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>

<style>
.fd-product-richtext .ProseMirror {
  min-height: 12rem;
}
</style>
