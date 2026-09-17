<script setup>
import { onMounted, reactive, ref } from 'vue';
import { FdBadge, FdButton, FdSkeleton } from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

const props = defineProps({
  product: { type: Object, required: true },
});

const emit = defineEmits(['updated']);
const { currency, wc, toDecimal, price, store } = useWooCommerce();

const stockLabel = (status) => store.value.stock_statuses.find((option) => option.value === status)?.label || status;

const variations = ref([]);
const loading = ref(true);
const drafts = reactive({});
const saving = reactive({});

const localize = (value) => (value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.value.decimal_separator || ','));

const attributesLabel = (variation) =>
  (variation.attributes || [])
    .map((attribute) => `${attribute.name}: ${attribute.option || __('Any', 'flexify-dashboard')}`)
    .join(' · ') || `#${variation.id}`;

const load = async () => {
  loading.value = true;

  const response = await wc(`products/${props.product.id}/variations`, {
    params: {
      per_page: 100,
      _fields: 'id,sku,price,regular_price,sale_price,stock_status,stock_quantity,manage_stock,attributes,image,status',
    },
  });

  variations.value = Array.isArray(response?.data) ? response.data : [];

  variations.value.forEach((variation) => {
    drafts[variation.id] = {
      regular_price: localize(variation.regular_price),
      sale_price: localize(variation.sale_price),
      stock_quantity: variation.stock_quantity ?? '',
    };
  });

  loading.value = false;
};

const isDirty = (variation) => {
  const draft = drafts[variation.id];
  if (!draft) return false;

  return (
    toDecimal(draft.regular_price) !== (variation.regular_price || '') ||
    toDecimal(draft.sale_price) !== (variation.sale_price || '') ||
    (variation.manage_stock && String(draft.stock_quantity) !== String(variation.stock_quantity ?? ''))
  );
};

const save = async (variation) => {
  const draft = drafts[variation.id];
  const data = {
    regular_price: toDecimal(draft.regular_price),
    sale_price: toDecimal(draft.sale_price),
  };

  if (data.sale_price !== '' && data.regular_price !== '' && Number(data.sale_price) >= Number(data.regular_price)) {
    notify({ title: __('The sale price must be lower than the regular price.', 'flexify-dashboard'), type: 'error' });
    return;
  }

  if (variation.manage_stock) {
    data.stock_quantity = draft.stock_quantity === '' ? null : Number(draft.stock_quantity);
  }

  saving[variation.id] = true;
  const response = await wc(`products/${props.product.id}/variations/${variation.id}`, { type: 'PUT', data });
  saving[variation.id] = false;

  if (!response?.data) return;

  const index = variations.value.findIndex((item) => item.id === variation.id);
  variations.value[index] = { ...variations.value[index], ...response.data };
  drafts[variation.id] = {
    regular_price: localize(response.data.regular_price),
    sale_price: localize(response.data.sale_price),
    stock_quantity: response.data.stock_quantity ?? '',
  };

  notify({ title: __('Variation updated', 'flexify-dashboard'), type: 'success' });
  emit('updated');
};

const stockColor = (variation) => (variation.stock_status === 'outofstock' ? 'error' : variation.stock_status === 'onbackorder' ? 'warning' : 'success');

const inputClass =
  'h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90';

onMounted(load);
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ __('Variations', 'flexify-dashboard') }}</p>
      <FdButton variant="ghost" size="xs" icon="refresh" :disabled="loading" @click="load">{{ __('Reload', 'flexify-dashboard') }}</FdButton>
    </div>

    <div v-if="loading" class="space-y-3 p-4">
      <FdSkeleton v-for="index in 3" :key="index" class="h-10" />
    </div>

    <p v-else-if="!variations.length" class="p-4 text-sm text-gray-500 dark:text-gray-400">{{ __('This product has no variations.', 'flexify-dashboard') }}</p>

    <div v-else class="overflow-x-auto custom-scrollbar">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-4 py-2.5 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ __('Variation', 'flexify-dashboard') }}</th>
            <th class="px-4 py-2.5 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ __('Regular price', 'flexify-dashboard') }}</th>
            <th class="px-4 py-2.5 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ __('Sale price', 'flexify-dashboard') }}</th>
            <th class="px-4 py-2.5 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ __('Stock', 'flexify-dashboard') }}</th>
            <th class="px-4 py-2.5"><span class="sr-only">{{ __('Actions', 'flexify-dashboard') }}</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-for="variation in variations" :key="variation.id">
            <td class="px-4 py-3">
              <div class="flex min-w-52 items-center gap-3">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                  <img v-if="variation.image?.src" :src="variation.image.src" alt="" class="h-full w-full object-cover" loading="lazy" />
                  <AppIcon v-else icon="image" class="text-base text-gray-400" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ attributesLabel(variation) }}</p>
                  <p class="text-theme-xs text-gray-500 dark:text-gray-400">
                    <span v-if="variation.sku">{{ __('SKU', 'flexify-dashboard') }}: {{ variation.sku }} · </span>{{ price(variation.price) || '—' }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="relative w-32">
                <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-theme-xs text-gray-500">{{ currency.symbol }}</span>
                <input v-model="drafts[variation.id].regular_price" :class="inputClass" class="ps-9" inputmode="decimal" :aria-label="__('Regular price', 'flexify-dashboard')" />
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="relative w-32">
                <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-theme-xs text-gray-500">{{ currency.symbol }}</span>
                <input v-model="drafts[variation.id].sale_price" :class="inputClass" class="ps-9" inputmode="decimal" :aria-label="__('Sale price', 'flexify-dashboard')" />
              </div>
            </td>
            <td class="px-4 py-3">
              <input
                v-if="variation.manage_stock"
                v-model="drafts[variation.id].stock_quantity"
                type="number"
                step="1"
                :class="inputClass"
                class="w-24"
                :aria-label="__('Stock quantity', 'flexify-dashboard')"
              />
              <FdBadge v-else :color="stockColor(variation)">{{ stockLabel(variation.stock_status) }}</FdBadge>
            </td>
            <td class="px-4 py-3 text-end">
              <FdButton size="xs" :variant="isDirty(variation) ? 'primary' : 'outline'" :disabled="!isDirty(variation)" :loading="saving[variation.id]" @click="save(variation)">
                {{ __('Save', 'flexify-dashboard') }}
              </FdButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
