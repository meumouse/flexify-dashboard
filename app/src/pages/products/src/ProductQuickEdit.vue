<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { FdAlert, FdButton, FdCheckbox, FdField, FdInput, FdSelect, FdSheet, FdSwitch } from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  product: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
});

const emit = defineEmits(['saved']);
const { store, currency, wc, toDecimal } = useWooCommerce();

const saving = ref(false);
const errors = reactive({});
const shippingClasses = ref([]);
const categorySearch = ref('');

const form = reactive({
  name: '',
  slug: '',
  status: 'publish',
  catalog_visibility: 'visible',
  featured: false,
  sku: '',
  regular_price: '',
  sale_price: '',
  manage_stock: false,
  stock_quantity: '',
  stock_status: 'instock',
  backorders: 'no',
  weight: '',
  length: '',
  width: '',
  height: '',
  shipping_class: '',
  categories: [],
  tags: '',
});

const isVariable = computed(() => props.product?.type === 'variable');
const isGrouped = computed(() => ['grouped', 'external'].includes(props.product?.type));
const priceLocale = computed(() => (value) => (value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.value.decimal_separator || ',')));

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

const filteredCategories = computed(() => {
  const term = categorySearch.value.trim().toLowerCase();
  const decode = (value) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value ?? '';
    return textarea.value;
  };

  return props.categories
    .map((category) => ({ ...category, label: decode(category.name) }))
    .filter((category) => !term || category.label.toLowerCase().includes(term))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const fillForm = (product) => {
  Object.keys(errors).forEach((key) => delete errors[key]);

  Object.assign(form, {
    name: product.name ? new DOMParser().parseFromString(product.name, 'text/html').documentElement.textContent : '',
    slug: product.slug || '',
    status: product.status || 'publish',
    catalog_visibility: product.catalog_visibility || 'visible',
    featured: !!product.featured,
    sku: product.sku || '',
    regular_price: priceLocale.value(product.regular_price),
    sale_price: priceLocale.value(product.sale_price),
    manage_stock: product.manage_stock === true,
    stock_quantity: product.stock_quantity ?? '',
    stock_status: product.stock_status || 'instock',
    backorders: product.backorders || 'no',
    weight: product.weight || '',
    length: product.dimensions?.length || '',
    width: product.dimensions?.width || '',
    height: product.dimensions?.height || '',
    shipping_class: product.shipping_class || '',
    categories: (product.categories || []).map((category) => category.id),
    tags: (product.tags || []).map((tag) => tag.name).join(', '),
  });
};

const loadShippingClasses = async () => {
  if (shippingClasses.value.length) return;
  const response = await wc('products/shipping_classes', { params: { per_page: 100, _fields: 'id,name,slug' } });
  shippingClasses.value = (response?.data || []).map((item) => ({ value: item.slug, label: item.name }));
};

watch(
  () => [open.value, props.product?.id],
  ([isOpen]) => {
    if (isOpen && props.product) {
      fillForm(props.product);
      categorySearch.value = '';
      loadShippingClasses();
    }
  },
  { immediate: true }
);

const validate = () => {
  Object.keys(errors).forEach((key) => delete errors[key]);

  if (!form.name.trim()) {
    errors.name = __('The product name is required.', 'flexify-dashboard');
  }

  const regular = Number(toDecimal(form.regular_price));
  const sale = Number(toDecimal(form.sale_price));

  if (!isVariable.value && form.sale_price !== '' && form.regular_price !== '' && sale >= regular) {
    errors.sale_price = __('The sale price must be lower than the regular price.', 'flexify-dashboard');
  }

  if (form.manage_stock && form.stock_quantity !== '' && !Number.isFinite(Number(form.stock_quantity))) {
    errors.stock_quantity = __('Enter a valid quantity.', 'flexify-dashboard');
  }

  return !Object.keys(errors).length;
};

const buildPayload = () => {
  const payload = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    status: form.status,
    catalog_visibility: form.catalog_visibility,
    featured: form.featured,
    sku: form.sku.trim(),
    categories: form.categories.map((id) => ({ id })),
    tags: form.tags
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => {
        const existing = (props.product?.tags || []).find((tag) => tag.name.toLowerCase() === name.toLowerCase());
        return existing ? { id: existing.id } : { name };
      }),
    weight: String(form.weight || ''),
    dimensions: { length: String(form.length || ''), width: String(form.width || ''), height: String(form.height || '') },
    shipping_class: form.shipping_class,
  };

  if (!isVariable.value && !isGrouped.value) {
    payload.regular_price = toDecimal(form.regular_price);
    payload.sale_price = toDecimal(form.sale_price);
  }

  if (!isVariable.value || !form.manage_stock) {
    payload.manage_stock = form.manage_stock;
  }

  if (form.manage_stock) {
    payload.stock_quantity = form.stock_quantity === '' ? null : Number(form.stock_quantity);
    payload.backorders = form.backorders;
  } else if (!isVariable.value) {
    payload.stock_status = form.stock_status;
  }

  return payload;
};

const save = async () => {
  if (!props.product || !validate()) return;

  saving.value = true;
  const response = await wc(`products/${props.product.id}`, { type: 'PUT', data: buildPayload() });
  saving.value = false;

  if (!response?.data) return;

  notify({ title: __('Product updated', 'flexify-dashboard'), type: 'success' });
  emit('saved', response.data);
  open.value = false;
};

const editUrl = computed(() => (props.product ? `${window.location.pathname.replace(/edit\.php$/, '')}post.php?post=${props.product.id}&action=edit` : '#'));
</script>

<template>
  <FdSheet v-model:open="open" size="lg" :title="__('Quick edit', 'flexify-dashboard')" :description="form.name">
    <form v-if="product" id="fd-product-quick-edit" class="space-y-6" @submit.prevent="save">
      <div class="flex items-center gap-4 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <img v-if="product.images?.[0]?.src" :src="product.images[0].src" alt="" class="h-full w-full object-cover" />
          <AppIcon v-else icon="image" class="text-xl text-gray-400" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-800 dark:text-white/90">#{{ product.id }} · {{ store.product_types.find((type) => type.value === product.type)?.label || product.type }}</p>
          <a :href="editUrl" class="text-theme-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
            {{ __('Open full editor', 'flexify-dashboard') }}
          </a>
        </div>
      </div>

      <section class="space-y-4">
        <h4 class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ __('General', 'flexify-dashboard') }}</h4>
        <FdInput v-model="form.name" :label="__('Name', 'flexify-dashboard')" :error="errors.name" required />
        <div class="grid gap-4 sm:grid-cols-2">
          <FdInput v-model="form.slug" :label="__('Slug', 'flexify-dashboard')" />
          <FdInput v-model="form.sku" :label="__('SKU', 'flexify-dashboard')" />
          <FdSelect v-model="form.status" :label="__('Status', 'flexify-dashboard')" :options="statusOptions" />
          <FdSelect v-model="form.catalog_visibility" :label="__('Catalog visibility', 'flexify-dashboard')" :options="visibilityOptions" />
        </div>
        <FdSwitch v-model="form.featured" :label="__('Featured product', 'flexify-dashboard')" />
      </section>

      <section class="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
        <h4 class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Pricing', 'flexify-dashboard') }}</h4>
        <FdAlert
          v-if="isVariable"
          variant="info"
          :message="__('Prices of variable products are managed in each variation. Expand the product in the list to edit them.', 'flexify-dashboard')"
        />
        <div v-else-if="!isGrouped" class="grid gap-4 sm:grid-cols-2">
          <FdInput v-model="form.regular_price" :label="__('Regular price', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" />
          <FdInput v-model="form.sale_price" :label="__('Sale price', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" :error="errors.sale_price" />
        </div>
      </section>

      <section class="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
        <h4 class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Inventory', 'flexify-dashboard') }}</h4>
        <FdSwitch v-model="form.manage_stock" :label="__('Track stock quantity', 'flexify-dashboard')" />
        <div v-if="form.manage_stock" class="grid gap-4 sm:grid-cols-2">
          <FdInput v-model="form.stock_quantity" type="number" step="1" :label="__('Quantity', 'flexify-dashboard')" :error="errors.stock_quantity" />
          <FdSelect v-model="form.backorders" :label="__('Allow backorders?', 'flexify-dashboard')" :options="backorderOptions" />
        </div>
        <FdSelect
          v-else-if="!isVariable"
          v-model="form.stock_status"
          :label="__('Stock status', 'flexify-dashboard')"
          :options="store.stock_statuses"
        />
      </section>

      <section class="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
        <h4 class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Shipping', 'flexify-dashboard') }}</h4>
        <div class="grid gap-4 sm:grid-cols-4">
          <FdInput v-model="form.weight" :label="__('Weight', 'flexify-dashboard')" :suffix="store.weight_unit" inputmode="decimal" />
          <FdInput v-model="form.length" :label="__('Length', 'flexify-dashboard')" :suffix="store.dimension_unit" inputmode="decimal" />
          <FdInput v-model="form.width" :label="__('Width', 'flexify-dashboard')" :suffix="store.dimension_unit" inputmode="decimal" />
          <FdInput v-model="form.height" :label="__('Height', 'flexify-dashboard')" :suffix="store.dimension_unit" inputmode="decimal" />
        </div>
        <FdSelect
          v-model="form.shipping_class"
          :label="__('Shipping class', 'flexify-dashboard')"
          :placeholder="__('No shipping class', 'flexify-dashboard')"
          :options="shippingClasses"
        />
      </section>

      <section class="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
        <h4 class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Organization', 'flexify-dashboard') }}</h4>
        <FdField :label="__('Categories', 'flexify-dashboard')">
          <div class="rounded-lg border border-gray-300 dark:border-gray-700">
            <input
              v-model="categorySearch"
              type="search"
              class="w-full rounded-t-lg border-b border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden dark:border-gray-800 dark:text-white/90"
              :placeholder="__('Filter categories', 'flexify-dashboard')"
            />
            <div class="max-h-48 space-y-2 overflow-y-auto p-3 custom-scrollbar">
              <FdCheckbox v-for="category in filteredCategories" :key="category.id" v-model="form.categories" :value="category.id" :label="category.label" size="sm" />
              <p v-if="!filteredCategories.length" class="text-theme-xs text-gray-500">{{ __('No categories found', 'flexify-dashboard') }}</p>
            </div>
          </div>
        </FdField>
        <FdInput v-model="form.tags" :label="__('Tags', 'flexify-dashboard')" :hint="__('Separate tags with commas.', 'flexify-dashboard')" />
      </section>
    </form>

    <template #footer>
      <FdButton variant="outline" @click="open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
      <FdButton type="submit" form="fd-product-quick-edit" :loading="saving">{{ __('Save changes', 'flexify-dashboard') }}</FdButton>
    </template>
  </FdSheet>
</template>
