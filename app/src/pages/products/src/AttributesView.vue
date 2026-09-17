<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FdButton,
  FdCard,
  FdCheckbox,
  FdConfirmDialog,
  FdDataTable,
  FdDropdown,
  FdInput,
  FdPageHeader,
  FdSelect,
  FdSheet,
  FdSkeleton,
} from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

const router = useRouter();
const { wc } = useWooCommerce();

const attributes = ref([]);
const loading = ref(true);
const confirmDialog = ref(null);

const editor = reactive({ open: false, saving: false, errors: {}, form: { id: null, name: '', slug: '', order_by: 'menu_order', has_archives: false } });
const termsSheet = reactive({ open: false, attribute: null, terms: [], loading: false, name: '', editing: null, editName: '' });

const columns = computed(() => [
  { key: 'name', label: __('Name', 'flexify-dashboard') },
  { key: 'slug', label: __('Slug', 'flexify-dashboard') },
  { key: 'order_by', label: __('Default sort order', 'flexify-dashboard') },
  { key: 'has_archives', label: __('Archives', 'flexify-dashboard') },
  { key: 'actions', label: '', align: 'end', width: '56px' },
]);

const orderOptions = computed(() => [
  { value: 'menu_order', label: __('Custom ordering', 'flexify-dashboard') },
  { value: 'name', label: __('Name', 'flexify-dashboard') },
  { value: 'name_num', label: __('Name (numeric)', 'flexify-dashboard') },
  { value: 'id', label: __('Term ID', 'flexify-dashboard') },
]);

const orderLabel = (value) => orderOptions.value.find((option) => option.value === value)?.label || value;

const load = async () => {
  loading.value = true;
  const response = await wc('products/attributes');
  attributes.value = Array.isArray(response?.data) ? response.data : [];
  loading.value = false;
};

const openEditor = (attribute = null) => {
  editor.errors = {};
  editor.form = attribute
    ? { id: attribute.id, name: attribute.name, slug: attribute.slug.replace(/^pa_/, ''), order_by: attribute.order_by, has_archives: attribute.has_archives }
    : { id: null, name: '', slug: '', order_by: 'menu_order', has_archives: false };
  editor.open = true;
};

const saveAttribute = async () => {
  editor.errors = {};

  if (!editor.form.name.trim()) {
    editor.errors.name = __('The attribute name is required.', 'flexify-dashboard');
    return;
  }

  const data = { name: editor.form.name.trim(), order_by: editor.form.order_by, has_archives: editor.form.has_archives };
  if (editor.form.slug.trim()) data.slug = editor.form.slug.trim();

  editor.saving = true;
  const response = editor.form.id
    ? await wc(`products/attributes/${editor.form.id}`, { type: 'PUT', data })
    : await wc('products/attributes', { type: 'POST', data });
  editor.saving = false;

  if (!response?.data) return;

  notify({ title: editor.form.id ? __('Attribute updated', 'flexify-dashboard') : __('Attribute created', 'flexify-dashboard'), type: 'success' });
  editor.open = false;
  load();
};

const removeAttribute = async (attribute) => {
  const confirmed = await confirmDialog.value.show({
    title: __('Delete attribute?', 'flexify-dashboard'),
    message: sprintf(__('“%s” and all of its values will be removed from every product.', 'flexify-dashboard'), attribute.name),
    confirmLabel: __('Delete', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await wc(`products/attributes/${attribute.id}`, { type: 'DELETE', params: { force: 'true' } });

  if (response?.data) {
    notify({ title: __('Attribute deleted', 'flexify-dashboard'), type: 'success' });
    attributes.value = attributes.value.filter((item) => item.id !== attribute.id);
  }
};

const openTerms = async (attribute) => {
  Object.assign(termsSheet, { open: true, attribute, terms: [], loading: true, name: '', editing: null, editName: '' });

  const all = [];
  for (let page = 1; page <= 20; page++) {
    const response = await wc(`products/attributes/${attribute.id}/terms`, { params: { per_page: 100, page, _fields: 'id,name,slug,count' } });
    const items = Array.isArray(response?.data) ? response.data : [];
    all.push(...items);
    if (items.length < 100) break;
  }

  termsSheet.terms = all;
  termsSheet.loading = false;
};

const addTerm = async () => {
  const name = termsSheet.name.trim();
  if (!name) return;

  const response = await wc(`products/attributes/${termsSheet.attribute.id}/terms`, { type: 'POST', data: { name } });

  if (response?.data) {
    termsSheet.terms = [...termsSheet.terms, response.data];
    termsSheet.name = '';
  }
};

const startEditTerm = (term) => {
  termsSheet.editing = term.id;
  termsSheet.editName = term.name;
};

const saveTerm = async (term) => {
  const name = termsSheet.editName.trim();

  if (!name || name === term.name) {
    termsSheet.editing = null;
    return;
  }

  const response = await wc(`products/attributes/${termsSheet.attribute.id}/terms/${term.id}`, { type: 'PUT', data: { name } });

  if (response?.data) {
    termsSheet.terms = termsSheet.terms.map((item) => (item.id === term.id ? { ...item, ...response.data } : item));
    termsSheet.editing = null;
  }
};

const removeTerm = async (term) => {
  const confirmed = await confirmDialog.value.show({
    title: __('Delete value?', 'flexify-dashboard'),
    message: sprintf(__('“%s” will be removed from every product that uses it.', 'flexify-dashboard'), term.name),
    confirmLabel: __('Delete', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await wc(`products/attributes/${termsSheet.attribute.id}/terms/${term.id}`, { type: 'DELETE', params: { force: 'true' } });

  if (response?.data) {
    termsSheet.terms = termsSheet.terms.filter((item) => item.id !== term.id);
  }
};

const rowActions = (attribute) => [
  { label: __('Manage values', 'flexify-dashboard'), icon: 'list', onSelect: () => openTerms(attribute) },
  { label: __('Edit', 'flexify-dashboard'), icon: 'edit', onSelect: () => openEditor(attribute) },
  { separator: true },
  { label: __('Delete', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => removeAttribute(attribute) },
];

const sprintf = (format, ...args) => (window.wp?.i18n?.sprintf ? window.wp.i18n.sprintf(format, ...args) : String(format).replace(/%[sd]/g, () => args.shift()));

onMounted(load);
</script>

<template>
  <div>
    <FdPageHeader
      :title="__('Attributes', 'flexify-dashboard')"
      :description="__('Global attributes such as size or color can be reused across products and variations.', 'flexify-dashboard')"
      :breadcrumbs="[{ label: __('Products', 'flexify-dashboard'), to: { name: 'products' } }, { label: __('Attributes', 'flexify-dashboard') }]"
    >
      <template #actions>
        <FdButton icon="add" @click="openEditor()">{{ __('Add attribute', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdPageHeader>

    <FdCard padding="none">
      <FdDataTable
        :columns="columns"
        :rows="attributes"
        :loading="loading"
        :skeleton-rows="4"
        clickable-rows
        empty-icon="layers"
        :empty-title="__('No attributes yet', 'flexify-dashboard')"
        :empty-description="__('Create attributes to describe and vary your products.', 'flexify-dashboard')"
        :caption="__('Attributes', 'flexify-dashboard')"
        @row-click="openTerms"
      >
        <template #cell-name="{ row }">
          <span class="font-medium text-gray-800 dark:text-white/90">{{ row.name }}</span>
        </template>
        <template #cell-slug="{ row }">
          <code class="rounded bg-gray-100 px-1.5 py-0.5 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{{ row.slug }}</code>
        </template>
        <template #cell-order_by="{ row }">{{ orderLabel(row.order_by) }}</template>
        <template #cell-has_archives="{ row }">
          <AppIcon :icon="row.has_archives ? 'check' : 'remove'" :class="row.has_archives ? 'text-success-500' : 'text-gray-400'" class="text-lg" />
        </template>
        <template #cell-actions="{ row }">
          <FdDropdown :items="rowActions(row)">
            <template #trigger>
              <FdButton variant="ghost" size="xs" icon="more_vert" icon-only :aria-label="__('Actions', 'flexify-dashboard')" />
            </template>
          </FdDropdown>
        </template>
      </FdDataTable>
    </FdCard>

    <FdSheet v-model:open="editor.open" :title="editor.form.id ? __('Edit attribute', 'flexify-dashboard') : __('Add attribute', 'flexify-dashboard')">
      <form id="fd-attribute-form" class="space-y-5" @submit.prevent="saveAttribute">
        <FdInput v-model="editor.form.name" :label="__('Name', 'flexify-dashboard')" :error="editor.errors.name" required />
        <FdInput v-model="editor.form.slug" :label="__('Slug', 'flexify-dashboard')" :hint="__('Unique identifier with up to 28 characters.', 'flexify-dashboard')" maxlength="28" />
        <FdSelect v-model="editor.form.order_by" :options="orderOptions" :label="__('Default sort order', 'flexify-dashboard')" />
        <FdCheckbox v-model="editor.form.has_archives" :label="__('Enable archives', 'flexify-dashboard')" :description="__('Create a page listing the products with each value.', 'flexify-dashboard')" />
      </form>
      <template #footer>
        <FdButton variant="outline" @click="editor.open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
        <FdButton type="submit" form="fd-attribute-form" :loading="editor.saving">{{ __('Save attribute', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdSheet>

    <FdSheet v-model:open="termsSheet.open" :title="termsSheet.attribute?.name || ''" :description="__('Values available for this attribute.', 'flexify-dashboard')">
      <form class="mb-5 flex gap-2" @submit.prevent="addTerm">
        <FdInput v-model="termsSheet.name" class="flex-1" :placeholder="__('New value', 'flexify-dashboard')" :aria-label="__('New value', 'flexify-dashboard')" />
        <FdButton type="submit" icon="add">{{ __('Add', 'flexify-dashboard') }}</FdButton>
      </form>

      <div v-if="termsSheet.loading" class="space-y-2">
        <FdSkeleton v-for="index in 5" :key="index" class="h-11 w-full rounded-lg" />
      </div>
      <p v-else-if="!termsSheet.terms.length" class="text-center text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No values yet.', 'flexify-dashboard') }}</p>
      <ul v-else class="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        <li v-for="term in termsSheet.terms" :key="term.id" class="flex items-center gap-2 px-4 py-2.5">
          <form v-if="termsSheet.editing === term.id" class="flex flex-1 gap-2" @submit.prevent="saveTerm(term)">
            <FdInput v-model="termsSheet.editName" size="sm" class="flex-1" :aria-label="__('Value name', 'flexify-dashboard')" />
            <FdButton type="submit" size="xs" icon="check" icon-only :aria-label="__('Save', 'flexify-dashboard')" />
            <FdButton size="xs" variant="ghost" icon="close" icon-only :aria-label="__('Cancel', 'flexify-dashboard')" @click="termsSheet.editing = null" />
          </form>
          <template v-else>
            <span class="min-w-0 flex-1 truncate text-theme-sm text-gray-800 dark:text-white/90">{{ term.name }}</span>
            <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ sprintf(__('%d products', 'flexify-dashboard'), term.count || 0) }}</span>
            <FdButton size="xs" variant="ghost" icon="edit" icon-only :aria-label="__('Rename value', 'flexify-dashboard')" @click="startEditTerm(term)" />
            <FdButton size="xs" variant="ghost" icon="delete" icon-only :aria-label="__('Delete value', 'flexify-dashboard')" @click="removeTerm(term)" />
          </template>
        </li>
      </ul>
    </FdSheet>

    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>
