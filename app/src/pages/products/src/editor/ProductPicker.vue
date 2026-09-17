<script setup>
import { onMounted, ref, watch } from 'vue';
import { FdSearchInput, FdSpinner } from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

/**
 * Selected product ids.
 */
const ids = defineModel({ type: Array, default: () => [] });

const props = defineProps({
  placeholder: { type: String, default: '' },
  /** Product ids that cannot be selected (e.g. the product being edited) */
  exclude: { type: Array, default: () => [] },
  /** Restrict results to these product types */
  types: { type: Array, default: () => [] },
});

const { wc } = useWooCommerce();

const FIELDS = 'id,name,sku,type,images';

// Cache of product details by id, so chips keep their names between searches.
const known = ref({});
const search = ref('');
const results = ref([]);
const loading = ref(false);

const decode = (value) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value ?? '';
  return textarea.value;
};

const remember = (products) => {
  known.value = { ...known.value, ...Object.fromEntries(products.map((product) => [product.id, product])) };
};

const loadSelected = async () => {
  const missing = ids.value.filter((id) => !known.value[id]);
  if (!missing.length) return;

  const response = await wc('products', { params: { include: missing.join(','), per_page: missing.length, _fields: FIELDS } });
  if (Array.isArray(response?.data)) remember(response.data);
};

watch(search, async (term) => {
  if (term.trim().length < 2) {
    results.value = [];
    return;
  }

  loading.value = true;
  const response = await wc('products', { params: { search: term.trim(), per_page: 8, status: 'any', _fields: FIELDS } });
  const items = Array.isArray(response?.data) ? response.data : [];
  results.value = items.filter((product) => !props.exclude.includes(product.id) && (!props.types.length || props.types.includes(product.type)));
  remember(items);
  loading.value = false;
});

watch(ids, loadSelected);

const add = (product) => {
  if (!ids.value.includes(product.id)) ids.value = [...ids.value, product.id];
  search.value = '';
  results.value = [];
};

const remove = (id) => {
  ids.value = ids.value.filter((item) => item !== id);
};

onMounted(loadSelected);
</script>

<template>
  <div>
    <div class="relative">
      <FdSearchInput v-model="search" :placeholder="placeholder || __('Search products', 'flexify-dashboard')" />
      <div v-if="search.trim().length >= 2" class="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg custom-scrollbar dark:border-gray-800 dark:bg-gray-900">
        <div v-if="loading" class="flex justify-center py-4"><FdSpinner /></div>
        <p v-else-if="!results.length" class="px-3 py-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No products found.', 'flexify-dashboard') }}</p>
        <button
          v-for="product in results"
          v-else
          :key="product.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/[0.03]"
          :disabled="ids.includes(product.id)"
          @click="add(product)"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
            <img v-if="product.images?.[0]?.src" :src="product.images[0].src" alt="" class="h-full w-full object-cover" />
            <AppIcon v-else icon="inventory" class="text-gray-400" />
          </span>
          <span class="min-w-0 flex-1 truncate text-theme-sm text-gray-800 dark:text-white/90">{{ decode(product.name) }}</span>
          <span v-if="product.sku" class="text-theme-xs text-gray-500 dark:text-gray-400">{{ product.sku }}</span>
        </button>
      </div>
    </div>

    <ul v-if="ids.length" class="mt-3 flex flex-wrap gap-2">
      <li v-for="id in ids" :key="id" class="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 py-1 ps-3 pe-1.5 text-theme-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <span class="truncate">{{ known[id] ? decode(known[id].name) : `#${id}` }}</span>
        <button type="button" class="rounded-full p-0.5 text-gray-400 hover:text-error-500" :aria-label="__('Remove product', 'flexify-dashboard')" @click="remove(id)">
          <AppIcon icon="close" class="text-sm" />
        </button>
      </li>
    </ul>
  </div>
</template>
