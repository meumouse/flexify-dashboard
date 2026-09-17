<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FdButton,
  FdCard,
  FdConfirmDialog,
  FdDataTable,
  FdDropdown,
  FdInput,
  FdPageHeader,
  FdSearchInput,
  FdSelect,
  FdSheet,
  FdTextarea,
} from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

const router = useRouter();
const { wc, store } = useWooCommerce();

const categories = ref([]);
const loading = ref(true);
const search = ref('');
const sheetOpen = ref(false);
const saving = ref(false);
const confirmDialog = ref(null);
const errors = reactive({});
const form = reactive({ id: null, name: '', slug: '', parent: '0', description: '' });

const decode = (value) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value ?? '';
  return textarea.value;
};

const load = async () => {
  loading.value = true;
  const all = [];

  for (let page = 1; page <= 20; page++) {
    const response = await wc('products/categories', { params: { per_page: 100, page, _fields: 'id,name,slug,parent,description,count,image' } });
    const items = Array.isArray(response?.data) ? response.data : [];
    all.push(...items);
    if (items.length < 100) break;
  }

  categories.value = all;
  loading.value = false;
};

/**
 * Flatten categories in hierarchical order with depth.
 */
const tree = computed(() => {
  const byParent = {};
  categories.value.forEach((category) => (byParent[category.parent] ||= []).push(category));

  const list = [];
  const walk = (parent, depth) => {
    (byParent[parent] || [])
      .sort((a, b) => decode(a.name).localeCompare(decode(b.name)))
      .forEach((category) => {
        list.push({ ...category, depth, label: decode(category.name) });
        walk(category.id, depth + 1);
      });
  };
  walk(0, 0);

  return list;
});

const rows = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return tree.value;
  return tree.value.filter((category) => category.label.toLowerCase().includes(term) || category.slug.includes(term));
});

const parentOptions = computed(() =>
  tree.value
    .filter((category) => category.id !== form.id)
    .map((category) => ({ value: String(category.id), label: `${'— '.repeat(category.depth)}${category.label}` }))
);

const columns = computed(() => [
  { key: 'name', label: __('Name', 'flexify-dashboard') },
  { key: 'slug', label: __('Slug', 'flexify-dashboard') },
  { key: 'count', label: __('Products', 'flexify-dashboard'), align: 'end' },
  { key: 'actions', label: '', align: 'end', width: '56px' },
]);

const openSheet = (category = null) => {
  Object.keys(errors).forEach((key) => delete errors[key]);
  Object.assign(form, {
    id: category?.id ?? null,
    name: category ? decode(category.name) : '',
    slug: category?.slug ?? '',
    parent: String(category?.parent ?? 0),
    description: category?.description ?? '',
  });
  sheetOpen.value = true;
};

const save = async () => {
  Object.keys(errors).forEach((key) => delete errors[key]);

  if (!form.name.trim()) {
    errors.name = __('The category name is required.', 'flexify-dashboard');
    return;
  }

  saving.value = true;
  const data = { name: form.name.trim(), slug: form.slug.trim(), parent: Number(form.parent) || 0, description: form.description };
  const response = form.id
    ? await wc(`products/categories/${form.id}`, { type: 'PUT', data })
    : await wc('products/categories', { type: 'POST', data });
  saving.value = false;

  if (!response?.data) return;

  notify({ title: form.id ? __('Category updated', 'flexify-dashboard') : __('Category created', 'flexify-dashboard'), type: 'success' });
  sheetOpen.value = false;
  load();
};

const remove = async (category) => {
  const confirmed = await confirmDialog.value.show({
    title: __('Delete category?', 'flexify-dashboard'),
    message: __('Products in this category will not be deleted.', 'flexify-dashboard'),
    confirmLabel: __('Delete', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await wc(`products/categories/${category.id}`, { type: 'DELETE', params: { force: 'true' } });

  if (response?.data) {
    notify({ title: __('Category deleted', 'flexify-dashboard'), type: 'success' });
    load();
  }
};

onMounted(load);
</script>

<template>
  <div>
    <FdPageHeader
      :title="__('Product categories', 'flexify-dashboard')"
      :breadcrumbs="[{ label: __('Products', 'flexify-dashboard'), onClick: () => router.push({ name: 'products' }) }, { label: __('Categories', 'flexify-dashboard') }]"
    >
      <template #actions>
        <FdButton variant="outline" icon="open_in_new" :href="store.urls.product_categories">{{ __('Classic screen', 'flexify-dashboard') }}</FdButton>
        <FdButton icon="add" @click="openSheet()">{{ __('Add category', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdPageHeader>

    <FdCard padding="none">
      <div class="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:px-6">
        <FdSearchInput v-model="search" :debounce="150" class="w-full sm:w-80" :placeholder="__('Search categories', 'flexify-dashboard')" />
        <p class="text-sm text-gray-500 dark:text-gray-400 sm:ms-auto">{{ sprintf(__('%d categories', 'flexify-dashboard'), categories.length) }}</p>
      </div>

      <FdDataTable :columns="columns" :rows="rows" :loading="loading" empty-icon="category" :empty-title="__('No categories found', 'flexify-dashboard')">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-3" :style="{ paddingInlineStart: `${row.depth * 1.5}rem` }">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img v-if="row.image?.src" :src="row.image.src" alt="" class="h-full w-full object-cover" loading="lazy" />
              <AppIcon v-else icon="category" class="text-lg text-gray-400" />
            </div>
            <button type="button" class="text-start font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400" @click="openSheet(row)">
              {{ row.label }}
            </button>
          </div>
        </template>
        <template #cell-count="{ value }">
          <span class="font-medium text-gray-800 dark:text-white/90">{{ Number(value).toLocaleString() }}</span>
        </template>
        <template #cell-actions="{ row }">
          <FdDropdown
            :items="[
              { label: __('Edit', 'flexify-dashboard'), icon: 'edit', onSelect: () => openSheet(row) },
              { label: __('View products', 'flexify-dashboard'), icon: 'inventory', onSelect: () => router.push({ name: 'products', query: { category: String(row.id) } }) },
              { separator: true },
              { label: __('Delete', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => remove(row) },
            ]"
          >
            <template #trigger>
              <FdButton variant="ghost" size="xs" icon="more_vert" icon-only :aria-label="__('Actions', 'flexify-dashboard')" />
            </template>
          </FdDropdown>
        </template>
      </FdDataTable>
    </FdCard>

    <FdSheet v-model:open="sheetOpen" :title="form.id ? __('Edit category', 'flexify-dashboard') : __('Add category', 'flexify-dashboard')">
      <form id="fd-category-form" class="space-y-5" @submit.prevent="save">
        <FdInput v-model="form.name" :label="__('Name', 'flexify-dashboard')" :error="errors.name" required />
        <FdInput v-model="form.slug" :label="__('Slug', 'flexify-dashboard')" :hint="__('Leave empty to generate it from the name.', 'flexify-dashboard')" />
        <FdSelect v-model="form.parent" :label="__('Parent category', 'flexify-dashboard')" :options="[{ value: '0', label: __('None', 'flexify-dashboard') }, ...parentOptions]" />
        <FdTextarea v-model="form.description" :label="__('Description', 'flexify-dashboard')" />
      </form>
      <template #footer>
        <FdButton variant="outline" @click="sheetOpen = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
        <FdButton type="submit" form="fd-category-form" :loading="saving">{{ form.id ? __('Save changes', 'flexify-dashboard') : __('Add category', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdSheet>

    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>
