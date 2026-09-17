<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  FdBadge,
  FdButton,
  FdCard,
  FdCheckbox,
  FdConfirmDialog,
  FdDataTable,
  FdDropdown,
  FdInput,
  FdPageHeader,
  FdPagination,
  FdSearchInput,
  FdSelect,
  FdSheet,
  FdTextarea,
  FdTooltip,
} from '@/components/kit';
import { notify } from '@/assets/js/functions/notify.js';
import { useWooCommerce } from '@/composables/useWooCommerce.js';

const { wc, price, currency, toDecimal, store } = useWooCommerce();

const coupons = ref([]);
const total = ref(0);
const loading = ref(true);
const search = ref('');
const page = ref(1);
const perPage = ref(20);
const confirmDialog = ref(null);

const emptyForm = () => ({
  id: null,
  code: '',
  discount_type: 'percent',
  amount: '',
  description: '',
  date_expires: '',
  free_shipping: false,
  individual_use: false,
  exclude_sale_items: false,
  minimum_amount: '',
  maximum_amount: '',
  usage_limit: '',
  usage_limit_per_user: '',
  email_restrictions: '',
});

const editor = reactive({ open: false, saving: false, errors: {}, form: emptyForm() });

const typeOptions = computed(() => [
  { value: 'percent', label: __('Percentage discount', 'flexify-dashboard') },
  { value: 'fixed_cart', label: __('Fixed cart discount', 'flexify-dashboard') },
  { value: 'fixed_product', label: __('Fixed product discount', 'flexify-dashboard') },
]);

const columns = computed(() => [
  { key: 'code', label: __('Code', 'flexify-dashboard') },
  { key: 'amount', label: __('Discount', 'flexify-dashboard') },
  { key: 'usage', label: __('Usage', 'flexify-dashboard') },
  { key: 'expires', label: __('Expires', 'flexify-dashboard') },
  { key: 'status', label: __('Status', 'flexify-dashboard') },
  { key: 'actions', label: '', align: 'end', width: '56px' },
]);

const localPrice = (value) => (value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.value.decimal_separator || ','));

const isExpired = (coupon) => coupon.date_expires && new Date(coupon.date_expires) < new Date();

const couponState = (coupon) => {
  if (coupon.status !== 'publish') return { color: 'light', label: __('Draft', 'flexify-dashboard') };
  if (isExpired(coupon)) return { color: 'error', label: __('Expired', 'flexify-dashboard') };
  if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return { color: 'warning', label: __('Used up', 'flexify-dashboard') };
  return { color: 'success', label: __('Active', 'flexify-dashboard') };
};

const discountLabel = (coupon) => (coupon.discount_type === 'percent' ? `${Number(coupon.amount).toLocaleString()}%` : price(coupon.amount));

const formatDate = (value) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—');

let requestId = 0;

const load = async () => {
  const current = ++requestId;
  loading.value = true;

  const response = await wc('coupons', { params: { page: page.value, per_page: perPage.value, search: search.value, orderby: 'date', order: 'desc' } });

  if (current !== requestId) return;

  coupons.value = Array.isArray(response?.data) ? response.data : [];
  total.value = Number(response?.totalItems) || 0;
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

const openEditor = (coupon = null) => {
  editor.errors = {};
  editor.form = coupon
    ? {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        amount: localPrice(coupon.amount),
        description: coupon.description || '',
        date_expires: coupon.date_expires ? String(coupon.date_expires).slice(0, 10) : '',
        free_shipping: !!coupon.free_shipping,
        individual_use: !!coupon.individual_use,
        exclude_sale_items: !!coupon.exclude_sale_items,
        minimum_amount: localPrice(Number(coupon.minimum_amount) ? coupon.minimum_amount : ''),
        maximum_amount: localPrice(Number(coupon.maximum_amount) ? coupon.maximum_amount : ''),
        usage_limit: coupon.usage_limit ?? '',
        usage_limit_per_user: coupon.usage_limit_per_user ?? '',
        email_restrictions: (coupon.email_restrictions || []).join(', '),
      }
    : emptyForm();
  editor.open = true;
};

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint32Array(8));
  editor.form.code = Array.from(values, (value) => chars[value % chars.length]).join('');
};

const saveCoupon = async () => {
  editor.errors = {};
  const form = editor.form;

  if (!form.code.trim()) editor.errors.code = __('The coupon code is required.', 'flexify-dashboard');
  if (form.discount_type === 'percent' && Number(toDecimal(form.amount)) > 100) editor.errors.amount = __('A percentage discount cannot be higher than 100.', 'flexify-dashboard');
  if (Object.keys(editor.errors).length) return;

  const data = {
    code: form.code.trim(),
    discount_type: form.discount_type,
    amount: toDecimal(form.amount) || '0',
    description: form.description,
    date_expires: form.date_expires ? `${form.date_expires}T23:59:59` : null,
    free_shipping: form.free_shipping,
    individual_use: form.individual_use,
    exclude_sale_items: form.exclude_sale_items,
    minimum_amount: toDecimal(form.minimum_amount),
    maximum_amount: toDecimal(form.maximum_amount),
    usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
    usage_limit_per_user: form.usage_limit_per_user === '' ? null : Number(form.usage_limit_per_user),
    email_restrictions: form.email_restrictions
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean),
  };

  editor.saving = true;
  const response = form.id ? await wc(`coupons/${form.id}`, { type: 'PUT', data }) : await wc('coupons', { type: 'POST', data });
  editor.saving = false;

  if (!response?.data) return;

  notify({ title: form.id ? __('Coupon updated', 'flexify-dashboard') : __('Coupon created', 'flexify-dashboard'), type: 'success' });
  editor.open = false;
  load();
};

const copyCode = async (coupon) => {
  try {
    await navigator.clipboard.writeText(coupon.code);
    notify({ title: __('Coupon code copied', 'flexify-dashboard'), type: 'success' });
  } catch (error) {
    notify({ title: __('Could not copy the code', 'flexify-dashboard'), type: 'error' });
  }
};

const removeCoupon = async (coupon) => {
  const confirmed = await confirmDialog.value.show({
    title: __('Move coupon to trash?', 'flexify-dashboard'),
    message: coupon.code,
    confirmLabel: __('Move to trash', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await wc(`coupons/${coupon.id}`, { type: 'DELETE' });

  if (response?.data) {
    notify({ title: __('Coupon moved to the trash', 'flexify-dashboard'), type: 'success' });
    load();
  }
};

const rowActions = (coupon) => [
  { label: __('Edit', 'flexify-dashboard'), icon: 'edit', onSelect: () => openEditor(coupon) },
  { label: __('Copy code', 'flexify-dashboard'), icon: 'content_copy', onSelect: () => copyCode(coupon) },
  { separator: true },
  { label: __('Move to trash', 'flexify-dashboard'), icon: 'delete', danger: true, onSelect: () => removeCoupon(coupon) },
];

const sprintf = (format, ...args) => (window.wp?.i18n?.sprintf ? window.wp.i18n.sprintf(format, ...args) : String(format).replace(/%[sd]/g, () => args.shift()));

onMounted(load);
</script>

<template>
  <div>
    <FdPageHeader
      :title="__('Coupons', 'flexify-dashboard')"
      :description="__('Create discount codes for your customers.', 'flexify-dashboard')"
      :breadcrumbs="[{ label: __('Products', 'flexify-dashboard'), to: { name: 'products' } }, { label: __('Coupons', 'flexify-dashboard') }]"
    >
      <template #actions>
        <FdButton variant="outline" icon="open_in_new" :href="store.urls.coupons">{{ __('Classic screen', 'flexify-dashboard') }}</FdButton>
        <FdButton icon="add" @click="openEditor()">{{ __('Add coupon', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdPageHeader>

    <FdCard padding="none">
      <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
        <FdSearchInput v-model="search" class="w-full sm:w-80" :placeholder="__('Search coupons', 'flexify-dashboard')" />
      </div>

      <FdDataTable
        :columns="columns"
        :rows="coupons"
        :loading="loading"
        :skeleton-rows="5"
        clickable-rows
        empty-icon="sell"
        :empty-title="search ? __('No coupons match your search', 'flexify-dashboard') : __('No coupons yet', 'flexify-dashboard')"
        :empty-description="__('Coupons give customers a discount at checkout.', 'flexify-dashboard')"
        :caption="__('Coupons', 'flexify-dashboard')"
        @row-click="openEditor"
      >
        <template #cell-code="{ row }">
          <div class="min-w-40">
            <span class="rounded-md border border-dashed border-gray-300 px-2 py-0.5 font-mono text-theme-sm font-medium uppercase text-gray-800 dark:border-gray-700 dark:text-white/90">{{ row.code }}</span>
            <p v-if="row.description" class="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">{{ row.description }}</p>
          </div>
        </template>
        <template #cell-amount="{ row }">
          <div class="whitespace-nowrap">
            <p class="font-medium text-gray-800 dark:text-white/90">{{ discountLabel(row) }}</p>
            <p class="text-theme-xs text-gray-500 dark:text-gray-400">
              {{ typeOptions.find((option) => option.value === row.discount_type)?.label || row.discount_type }}<template v-if="row.free_shipping"> · {{ __('Free shipping', 'flexify-dashboard') }}</template>
            </p>
          </div>
        </template>
        <template #cell-usage="{ row }">
          <span class="whitespace-nowrap">{{ row.usage_limit ? `${row.usage_count} / ${row.usage_limit}` : sprintf(__('%d used', 'flexify-dashboard'), row.usage_count || 0) }}</span>
        </template>
        <template #cell-expires="{ row }">
          <span class="whitespace-nowrap" :class="isExpired(row) && 'text-error-500'">{{ formatDate(row.date_expires) }}</span>
        </template>
        <template #cell-status="{ row }">
          <FdBadge :color="couponState(row).color">{{ couponState(row).label }}</FdBadge>
        </template>
        <template #cell-actions="{ row }">
          <FdDropdown :items="rowActions(row)">
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

    <FdSheet v-model:open="editor.open" size="lg" :title="editor.form.id ? __('Edit coupon', 'flexify-dashboard') : __('Add coupon', 'flexify-dashboard')">
      <form id="fd-coupon-form" class="space-y-6" @submit.prevent="saveCoupon">
        <section class="space-y-4">
          <div class="flex items-end gap-2">
            <FdInput v-model="editor.form.code" class="flex-1" :label="__('Coupon code', 'flexify-dashboard')" :error="editor.errors.code" required />
            <FdTooltip :text="__('Generate code', 'flexify-dashboard')">
              <FdButton variant="outline" icon="sparkles" icon-only :aria-label="__('Generate code', 'flexify-dashboard')" @click="generateCode" />
            </FdTooltip>
          </div>
          <FdTextarea v-model="editor.form.description" :rows="2" :label="__('Description (optional)', 'flexify-dashboard')" />
        </section>

        <section class="space-y-4">
          <h3 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Discount', 'flexify-dashboard') }}</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <FdSelect v-model="editor.form.discount_type" :options="typeOptions" :label="__('Discount type', 'flexify-dashboard')" />
            <FdInput
              v-model="editor.form.amount"
              :label="__('Amount', 'flexify-dashboard')"
              :prefix="editor.form.discount_type === 'percent' ? '' : currency.symbol"
              :suffix="editor.form.discount_type === 'percent' ? '%' : ''"
              inputmode="decimal"
              :error="editor.errors.amount"
            />
            <FdInput v-model="editor.form.date_expires" type="date" :label="__('Expiry date', 'flexify-dashboard')" />
          </div>
          <FdCheckbox v-model="editor.form.free_shipping" :label="__('Allow free shipping', 'flexify-dashboard')" :description="__('Requires a free shipping method that accepts coupons.', 'flexify-dashboard')" />
        </section>

        <section class="space-y-4">
          <h3 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Usage restrictions', 'flexify-dashboard') }}</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <FdInput v-model="editor.form.minimum_amount" :label="__('Minimum spend', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" />
            <FdInput v-model="editor.form.maximum_amount" :label="__('Maximum spend', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" />
          </div>
          <FdInput v-model="editor.form.email_restrictions" :label="__('Allowed emails', 'flexify-dashboard')" :hint="__('Separate emails with commas. Use * as a wildcard, e.g. *@example.com.', 'flexify-dashboard')" />
          <FdCheckbox v-model="editor.form.individual_use" :label="__('Individual use only', 'flexify-dashboard')" :description="__('The coupon cannot be combined with other coupons.', 'flexify-dashboard')" />
          <FdCheckbox v-model="editor.form.exclude_sale_items" :label="__('Exclude sale items', 'flexify-dashboard')" />
        </section>

        <section class="space-y-4">
          <h3 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{{ __('Usage limits', 'flexify-dashboard') }}</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <FdInput v-model="editor.form.usage_limit" type="number" min="0" step="1" :label="__('Usage limit per coupon', 'flexify-dashboard')" :placeholder="__('Unlimited', 'flexify-dashboard')" />
            <FdInput v-model="editor.form.usage_limit_per_user" type="number" min="0" step="1" :label="__('Usage limit per user', 'flexify-dashboard')" :placeholder="__('Unlimited', 'flexify-dashboard')" />
          </div>
        </section>
      </form>

      <template #footer>
        <FdButton variant="outline" @click="editor.open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
        <FdButton type="submit" form="fd-coupon-form" :loading="editor.saving">{{ __('Save coupon', 'flexify-dashboard') }}</FdButton>
      </template>
    </FdSheet>

    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>
