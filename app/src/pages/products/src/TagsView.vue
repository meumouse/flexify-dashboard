<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  FdButton,
  FdCard,
  FdConfirmDialog,
  FdDataTable,
  FdDropdown,
  FdInput,
  FdPageHeader,
  FdPagination,
  FdSearchInput,
  FdSheet,
  FdTextarea,
} from '@/components/kit';
import { notify } from '@/assets/js/functions/notify.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

const router = useRouter();
const { wc, store } = useWooCommerce();

const tags = ref([]);
const total = ref(0);
const loading = ref(true);
const search = ref('');
const page = ref(1);
const perPage = ref(20);
const selected = ref([]);
const sheetOpen = ref(false);
const saving = ref(false);
const confirmDialog = ref(null);
const errors = reactive({});
const form = reactive({ id: null, name: '', slug: '', description: '' });

const columns = computed(() => [
  { key: 'name', label: __('Name', 'flexify-dashboard') },
  { key: 'slug', label: __('Slug', 'flexify-dashboard') },
  { key: 'count', label: __('Products', 'flexify-dashboard'), align: 'end' },
  { key: 'actions', label: '', align: 'end', width: '56px' },
]);

const decode = (value) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value ?? '';
  return textarea.value;
};

let requestId = 0;

const load = async () => {
  const current = ++requestId;
  loading.value = true;

  const response = await wc('products/tags', {
    params: { page: page.value, per_page: perPage.value, search: search.value, orderby: 'name', hide_empty: 'false', _fields: 'id,name,slug,description,count' },
  });

  if (current !== requestId) return;

  tags.value = Array.isArray(response?.data) ? response.data : [];
  total.value = Number(response?.totalItems) || 0;
  selected.value = [];
  loading.value = false;
};

watch([search, perPage], () => {
  if (page.value !== 1) {
    page.value = 1;
    return;
  }
  load();
});

watch(page, load);

const openSheet = (tag = null) => {
  Object.keys(errors).forEach((key) => delete errors[key]);
  Object.assign(form, { id: tag?.id ?? null, name: tag ? decode(tag.name) : '', slug: tag?.slug ?? '', description: tag?.description ?? '' });
  sheetOpen.value = true;
};

const save = async () => {
  Object.keys(errors).forEach((key) => delete errors[key]);

  if (!form.name.trim()) {
    errors.name = __('The tag name is required.', 'flexify-dashboard');
    return;
  }

  saving.value = true;
  const data = { name: form.name.trim(), slug: form.slug.trim(), description: form.description };
  const response = form.id ? await wc(`products/tags/${form.id}`, { type: 'PUT', data }) : await wc('products/tags', { type: 'POST', data });
  saving.value = false;

  if (!response?.data) return;

  notify({ title: form.id ? __('Tag updated', 'flexify-dashboard') : __('Tag created', 'flexify-dashboard'), type: 'success' });
  sheetOpen.value = false;
  load();
};

const remove = async (ids) => {
  const confirmed = await confirmDialog.value.show({
    title: __('Delete tags?', 'flexify-dashboard'),
    message: sprintf(__('%d tag(s) will be deleted. Products will not be deleted.', 'flexify-dashboard'), ids.length),
    confirmLabel: __('Delete', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await wc('products/tags/batch', { type: 'POST', data: { delete: ids } });

  if (response?.data) {
    notify({ title: __('Tags deleted', 'flexify-dashboard'), type: 'success' });
    load();
  }
};

const sprintf = (format, ...args) => (window.wp?.i18n?.sprintf ? window.wp.i18n.sprintf(format, ...args) : String(format).replace(/%[sd]/g, () => args.shift()));

onMounted(load);
</script>

<template>
  <div>
    <FdPageHeader
      :title="__('Product tags', 'flexify-dashboard')"
      :breadcrumbs="[{ label: __('Products', 'flexify-dashboard'), to: { name: 'products' } }, { label: __('Tags', 'flexify-dashboard') }]"
    >
      <template #actions>
        <FdButton variant="outline" icon="open_in_new" :href="store.urls.product_tags">{{ __('Classic screen', 'flexify-dashboard') }}</FdButton>
        <FdButton icon="add" @click="openSheet()">{{ __('Add tag', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdPageHeader>

    <FdCard padding="none">
      <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
        <FdSearchInput v-model="search" class="w-full sm:w-80" :placeholder="__('Search tags', 'flexify-dashboard')" />
      </div>

      <FdDataTable
        v-model:selected="selected"
        :columns="columns"
        :rows="tags"
        :loading="loading"
        selectable
        empty-icon="label"
        :empty-title="search ? __('No tags match your search', 'flexify-dashboard') : __('No tags yet', 'flexify-dashboard')"
        :caption="__('Product tags', 'flexify-dashboard')"
      >
        <template #bulk-actions>
          <FdButton size="xs" variant="danger-outline" icon="delete" @click="remove(selected)">{{ __('Delete', 'flexify-dashboard') }}</FdButton>
        </template>
        <template #cell-name="{ row }">
          <button type="button" class="text-start font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400" @click="openSheet(row)">
            {{ decode(row.name) }}
          </button>
        </template>
        <template #cell-count="{ value }">
          <span class="font-medium text-gray-800 dark:text-white/90">{{ Number(value).toLocaleString() }}</span>
        </template>
        <template #cell-actions="{ row }">
          <FdDropdown
            :items="[
              { label: __('Edit', 'flexify-dashboard'), icon: 'edit', onSelect: () => openSheet(row) },
              { label: __('View products', 'flexify-dashboard'), icon: 'inventory', onSelect: () => router.push({ name: 'products', query: { tag: String(row.id) } }) },
              { separator: true },
              { label: __('Delete', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => remove([row.id]) },
            ]"
          >
            <template #trigger>
              <FdButton variant="ghost" size="xs" icon="more_vert" icon-only :aria-label="__('Actions', 'flexify-dashboard')" />
            </template>
          </FdDropdown>
        </template>
      </FdDataTable>

      <template #footer>
        <FdPagination v-model:page="page" v-model:per-page="perPage" :total="total" :disabled="loading" />
      </template>
    </FdCard>

    <FdSheet v-model:open="sheetOpen" :title="form.id ? __('Edit tag', 'flexify-dashboard') : __('Add tag', 'flexify-dashboard')">
      <form id="fd-tag-form" class="space-y-5" @submit.prevent="save">
        <FdInput v-model="form.name" :label="__('Name', 'flexify-dashboard')" :error="errors.name" required />
        <FdInput v-model="form.slug" :label="__('Slug', 'flexify-dashboard')" :hint="__('Leave empty to generate it from the name.', 'flexify-dashboard')" />
        <FdTextarea v-model="form.description" :label="__('Description', 'flexify-dashboard')" />
      </form>
      <template #footer>
        <FdButton variant="outline" @click="sheetOpen = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
        <FdButton type="submit" form="fd-tag-form" :loading="saving">{{ form.id ? __('Save changes', 'flexify-dashboard') : __('Add tag', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdSheet>

    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>
