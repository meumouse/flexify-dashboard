<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { FdAlert, FdBadge, FdButton, FdConfirmDialog, FdEmptyState, FdInput, FdSelect, FdSkeleton, FdSwitch } from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';
import { openMediaFrame } from './useWpMedia.js';
import { missingCombos, sameAttribute } from './variationCombos.js';

const props = defineProps({
  productId: { type: Number, required: true },
  /** Parent attributes as saved on the product */
  attributes: { type: Array, default: () => [] },
});

const emit = defineEmits(['dirty-change']);

const { wc, store, currency, toDecimal, price } = useWooCommerce();

const MAX_GENERATED = 100;

const variations = ref([]);
const loading = ref(true);
const busy = ref(false);
const expanded = ref(null);
const dirtyIds = ref(new Set());
const bulkPrice = ref('');
const confirmDialog = ref(null);

const variationAttributes = computed(() => props.attributes.filter((attribute) => attribute.variation && attribute.options?.length));

const localPrice = (value) => (value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.value.decimal_separator || ','));

const stockOptions = computed(() =>
  store.value.stock_statuses.length
    ? store.value.stock_statuses
    : [
        { value: 'instock', label: __('In stock', 'flexify-dashboard') },
        { value: 'outofstock', label: __('Out of stock', 'flexify-dashboard') },
        { value: 'onbackorder', label: __('On backorder', 'flexify-dashboard') },
      ]
);

const toForm = (variation) => ({
  id: variation.id,
  attributes: variation.attributes || [],
  sku: variation.sku || '',
  regular_price: localPrice(variation.regular_price),
  sale_price: localPrice(variation.sale_price),
  manage_stock: variation.manage_stock === true,
  stock_quantity: variation.stock_quantity ?? '',
  stock_status: variation.stock_status || 'instock',
  enabled: variation.status !== 'private',
  weight: variation.weight || '',
  description: variation.description || '',
  image: variation.image || null,
});

const load = async () => {
  loading.value = true;
  const all = [];

  for (let page = 1; page <= 10; page++) {
    const response = await wc(`products/${props.productId}/variations`, { params: { per_page: 100, page } });
    const items = Array.isArray(response?.data) ? response.data : [];
    all.push(...items);
    if (items.length < 100) break;
  }

  variations.value = all.map(toForm);
  dirtyIds.value = new Set();
  loading.value = false;
};

watch(
  () => dirtyIds.value.size,
  (size) => emit('dirty-change', size > 0)
);

const markDirty = (variation) => {
  dirtyIds.value = new Set([...dirtyIds.value, variation.id]);
};

const attributeValue = (variation, attribute) => {
  const match = variation.attributes.find((item) => sameAttribute(item, attribute));
  return match?.option || '';
};

const setAttributeValue = (variation, attribute, option) => {
  const others = variation.attributes.filter((item) => !sameAttribute(item, attribute));
  variation.attributes = option ? [...others, { id: attribute.id, name: attribute.name, option }] : others;
  markDirty(variation);
};

const variationTitle = (variation) =>
  variationAttributes.value.map((attribute) => attributeValue(variation, attribute) || sprintf(__('Any %s', 'flexify-dashboard'), attribute.name)).join(' · ') ||
  sprintf(__('Variation #%s', 'flexify-dashboard'), variation.id);

const toPayload = (variation) => {
  const payload = {
    id: variation.id,
    attributes: variation.attributes,
    sku: variation.sku.trim(),
    regular_price: toDecimal(variation.regular_price),
    sale_price: toDecimal(variation.sale_price),
    manage_stock: variation.manage_stock,
    status: variation.enabled ? 'publish' : 'private',
    weight: String(variation.weight || ''),
    description: variation.description,
    image: variation.image?.id ? { id: variation.image.id } : null,
  };

  if (variation.manage_stock) {
    payload.stock_quantity = variation.stock_quantity === '' ? null : Number(variation.stock_quantity);
  } else {
    payload.stock_status = variation.stock_status;
  }

  if (!payload.image) delete payload.image;

  return payload;
};

const runBatch = async (data) => {
  const response = await wc(`products/${props.productId}/variations/batch`, { type: 'POST', data });

  const failures = ['create', 'update', 'delete'].flatMap((key) => (response?.data?.[key] || []).filter((item) => item.error));

  if (failures.length) {
    notify({ title: __('Some variations could not be saved', 'flexify-dashboard'), message: failures[0].error?.message || '', type: 'error' });
  }

  return response?.data || null;
};

/**
 * Save changed variations. Returns false when the request failed.
 */
const save = async () => {
  if (!dirtyIds.value.size) return true;

  const update = variations.value.filter((variation) => dirtyIds.value.has(variation.id)).map(toPayload);
  const result = await runBatch({ update });

  if (!result) return false;

  (result.update || []).filter((item) => !item.error).forEach((item) => {
    const index = variations.value.findIndex((variation) => variation.id === item.id);
    if (index > -1) variations.value[index] = toForm(item);
  });

  dirtyIds.value = new Set();
  return true;
};

const generate = async () => {
  if (!variationAttributes.value.length) return;

  const missing = missingCombos(variationAttributes.value, variations.value);

  if (!missing.length) {
    notify({ title: __('All variations already exist', 'flexify-dashboard'), type: 'info' });
    return;
  }

  if (missing.length > MAX_GENERATED) {
    notify({ title: sprintf(__('Only the first %d variations will be created.', 'flexify-dashboard'), MAX_GENERATED), type: 'warning' });
  }

  busy.value = true;
  const saved = await save();

  if (saved) {
    const result = await runBatch({ create: missing.slice(0, MAX_GENERATED).map((attributes) => ({ attributes })) });
    const created = (result?.create || []).filter((item) => !item.error);

    if (created.length) {
      variations.value = [...variations.value, ...created.map(toForm)];
      notify({ title: sprintf(__('%d variation(s) created', 'flexify-dashboard'), created.length), message: __('Set their prices to make them purchasable.', 'flexify-dashboard'), type: 'success' });
    }
  }

  busy.value = false;
};

const addVariation = async () => {
  busy.value = true;
  const result = await runBatch({ create: [{ attributes: [] }] });
  const created = (result?.create || []).filter((item) => !item.error);

  if (created.length) {
    variations.value = [...variations.value, ...created.map(toForm)];
    expanded.value = created[0].id;
  }

  busy.value = false;
};

const removeVariation = async (variation) => {
  const confirmed = await confirmDialog.value.show({
    title: __('Delete variation?', 'flexify-dashboard'),
    message: variationTitle(variation),
    confirmLabel: __('Delete', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const result = await runBatch({ delete: [variation.id] });

  if (result) {
    variations.value = variations.value.filter((item) => item.id !== variation.id);
    const next = new Set(dirtyIds.value);
    next.delete(variation.id);
    dirtyIds.value = next;
  }
};

const applyBulkPrice = () => {
  if (bulkPrice.value === '') return;

  variations.value.forEach((variation) => {
    variation.regular_price = bulkPrice.value;
    markDirty(variation);
  });

  bulkPrice.value = '';
};

const chooseImage = async (variation) => {
  const [image] = await openMediaFrame({ title: __('Variation image', 'flexify-dashboard') });

  if (image) {
    variation.image = image;
    markDirty(variation);
  }
};

const sprintf = (format, ...args) => (window.wp?.i18n?.sprintf ? window.wp.i18n.sprintf(format, ...args) : String(format).replace(/%[sd]/g, () => args.shift()));

defineExpose({ save, reload: load, isDirty: () => dirtyIds.value.size > 0 });

onMounted(load);
</script>

<template>
  <div>
    <FdAlert
      v-if="!variationAttributes.length"
      variant="info"
      :title="__('No attributes used for variations', 'flexify-dashboard')"
      :message="__('Add attributes, mark them as “Used for variations” and save the product.', 'flexify-dashboard')"
      class="mb-4"
    />

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <FdButton size="sm" variant="outline" icon="sparkles" :loading="busy" :disabled="!variationAttributes.length" @click="generate">
        {{ __('Generate variations', 'flexify-dashboard') }}
      </FdButton>
      <FdButton size="sm" variant="outline" icon="add" :disabled="busy" @click="addVariation">{{ __('Add manually', 'flexify-dashboard') }}</FdButton>
      <div v-if="variations.length" class="flex items-center gap-2 sm:ms-auto">
        <FdInput v-model="bulkPrice" size="sm" class="w-40" :prefix="currency.symbol" inputmode="decimal" :placeholder="__('Price for all', 'flexify-dashboard')" :aria-label="__('Regular price for all variations', 'flexify-dashboard')" />
        <FdButton size="sm" variant="outline" :disabled="bulkPrice === ''" @click="applyBulkPrice">{{ __('Apply', 'flexify-dashboard') }}</FdButton>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <FdSkeleton v-for="index in 3" :key="index" class="h-16 w-full rounded-xl" />
    </div>

    <FdEmptyState v-else-if="!variations.length" compact icon="stacks" :title="__('No variations yet', 'flexify-dashboard')" :description="__('Generate variations from the attributes or add them one by one.', 'flexify-dashboard')" />

    <ul v-else class="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      <li v-for="variation in variations" :key="variation.id">
        <div class="flex items-center gap-3 px-4 py-3">
          <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-400 hover:text-brand-500 dark:bg-gray-800" :aria-label="__('Choose variation image', 'flexify-dashboard')" @click="chooseImage(variation)">
            <img v-if="variation.image?.src" :src="variation.image.src" alt="" class="h-full w-full object-cover" />
            <AppIcon v-else icon="image" class="text-lg" />
          </button>

          <button type="button" class="min-w-0 flex-1 text-start" :aria-expanded="expanded === variation.id" @click="expanded = expanded === variation.id ? null : variation.id">
            <p class="flex items-center gap-2 truncate font-medium text-gray-800 dark:text-white/90">
              {{ variationTitle(variation) }}
              <span v-if="dirtyIds.has(variation.id)" class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" :title="__('Unsaved changes', 'flexify-dashboard')"></span>
            </p>
            <p class="truncate text-theme-xs text-gray-500 dark:text-gray-400">
              <template v-if="variation.regular_price">{{ price(toDecimal(variation.sale_price || variation.regular_price)) }}</template>
              <span v-else class="text-warning-600 dark:text-orange-400">{{ __('No price', 'flexify-dashboard') }}</span>
              <template v-if="variation.sku"> · {{ variation.sku }}</template>
              <template v-if="variation.manage_stock"> · {{ sprintf(__('%s in stock', 'flexify-dashboard'), variation.stock_quantity === '' ? 0 : variation.stock_quantity) }}</template>
            </p>
          </button>

          <FdBadge v-if="!variation.enabled" color="light">{{ __('Disabled', 'flexify-dashboard') }}</FdBadge>
          <FdButton variant="ghost" size="xs" :icon="expanded === variation.id ? 'expand_less' : 'expand_more'" icon-only :aria-label="__('Edit variation', 'flexify-dashboard')" @click="expanded = expanded === variation.id ? null : variation.id" />
          <FdButton variant="ghost" size="xs" icon="delete" icon-only :aria-label="__('Delete variation', 'flexify-dashboard')" @click="removeVariation(variation)" />
        </div>

        <div v-if="expanded === variation.id" class="grid gap-4 border-t border-gray-100 bg-gray-50/60 px-4 py-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-2 lg:grid-cols-3" @input="markDirty(variation)" @change="markDirty(variation)">
          <FdSelect
            v-for="attribute in variationAttributes"
            :key="attribute.id || attribute.name"
            :model-value="attributeValue(variation, attribute)"
            :label="attribute.name"
            :options="attribute.options.map((option) => ({ value: option, label: option }))"
            :placeholder="sprintf(__('Any %s', 'flexify-dashboard'), attribute.name)"
            @update:model-value="(value) => setAttributeValue(variation, attribute, value)"
          />
          <FdInput v-model="variation.sku" :label="__('SKU', 'flexify-dashboard')" />
          <FdInput v-model="variation.regular_price" :label="__('Regular price', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" />
          <FdInput v-model="variation.sale_price" :label="__('Sale price', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" />
          <FdInput v-model="variation.weight" :label="__('Weight', 'flexify-dashboard')" :suffix="store.weight_unit" inputmode="decimal" />
          <FdInput v-if="variation.manage_stock" v-model="variation.stock_quantity" type="number" step="1" :label="__('Stock quantity', 'flexify-dashboard')" />
          <FdSelect v-else v-model="variation.stock_status" :options="stockOptions" :label="__('Stock status', 'flexify-dashboard')" />
          <FdInput v-model="variation.description" class="sm:col-span-2 lg:col-span-3" :label="__('Description', 'flexify-dashboard')" />
          <div class="flex flex-wrap gap-6 sm:col-span-2 lg:col-span-3">
            <FdSwitch v-model="variation.enabled" :label="__('Enabled', 'flexify-dashboard')" @update:model-value="markDirty(variation)" />
            <FdSwitch v-model="variation.manage_stock" :label="__('Track stock', 'flexify-dashboard')" @update:model-value="markDirty(variation)" />
          </div>
        </div>
      </li>
    </ul>

    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>
