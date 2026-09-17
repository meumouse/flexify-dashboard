<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  FdAlert,
  FdAvatar,
  FdButton,
  FdCard,
  FdCheckbox,
  FdConfirmDialog,
  FdEmptyState,
  FdInput,
  FdPageHeader,
  FdSearchInput,
  FdSelect,
  FdSkeleton,
  FdSpinner,
  FdSwitch,
  FdTextarea,
} from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { emptyAddress, useOrderHelpers } from './useOrderHelpers.js';
import AddressFields from './AddressFields.vue';

const props = defineProps({
  /** Existing order to edit; empty when creating an order */
  id: { type: Number, default: 0 },
});

const router = useRouter();
const { store, wc, currency, toDecimal, orderPrice, price, decode, orderTitle, customerName, sprintf } = useOrderHelpers();

const EDITABLE_STATUSES = ['pending', 'on-hold', 'checkout-draft', 'draft', 'auto-draft'];

const isNew = computed(() => !props.id);
const loading = ref(!isNew.value);
const saving = ref(false);
const order = ref(null);
const confirmDialog = ref(null);
const dirty = ref(false);

// Line items: { key, id?, product_id, variation_id, name, sku, image, price, quantity, removed }
const lines = ref([]);
const shippingLines = ref([]);
const feeLines = ref([]);
const coupons = ref([]);
const couponInput = ref('');

const form = reactive({
  status: 'pending',
  customer_id: 0,
  customer: null,
  payment_method: '',
  set_paid: false,
  customer_note: '',
  billing: emptyAddress(),
  shipping: emptyAddress(),
  ship_to_billing: true,
});

// Product search
const productSearch = ref('');
const productResults = ref([]);
const productLoading = ref(false);
const variationPicker = reactive({ product: null, variations: [], loading: false });

// Customer search
const customerSearch = ref('');
const customerResults = ref([]);
const customerLoading = ref(false);

let lineKey = 0;
const nextKey = () => `line-${++lineKey}`;

const isEditable = computed(() => isNew.value || EDITABLE_STATUSES.includes(order.value?.status));

const statusOptions = computed(() => store.value.order_statuses.filter((status) => !['checkout-draft', 'refunded'].includes(status.value)));

const paymentOptions = computed(() => [{ value: '', label: __('No payment method', 'flexify-dashboard') }, ...store.value.payment_gateways]);

const shippingMethodOptions = computed(() => [{ value: 'other', label: __('Other', 'flexify-dashboard') }, ...store.value.shipping_methods]);

const visibleLines = computed(() => lines.value.filter((line) => !line.removed));

const itemsSubtotal = computed(() => visibleLines.value.reduce((total, line) => total + (Number(line.price) || 0) * (Number(line.quantity) || 0), 0));
const shippingTotal = computed(() => shippingLines.value.filter((line) => !line.removed).reduce((total, line) => total + (Number(toDecimal(line.total)) || 0), 0));
const feesTotal = computed(() => feeLines.value.filter((line) => !line.removed).reduce((total, line) => total + (Number(toDecimal(line.total)) || 0), 0));
const estimatedTotal = computed(() => itemsSubtotal.value + shippingTotal.value + feesTotal.value);

const money = (value) => (order.value ? orderPrice(value, order.value) : price(value));

const localPrice = (value) => (value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.value.decimal_separator || ','));

watch([lines, shippingLines, feeLines, coupons, form], () => (dirty.value = true), { deep: true });

/* ---------------------------------------------------------------- Loading */

const loadOrder = async () => {
  loading.value = true;
  const response = await wc(`orders/${props.id}`);

  if (!response?.data) {
    loading.value = false;
    return;
  }

  const data = response.data;
  order.value = data;

  lines.value = (data.line_items || []).map((item) => ({
    key: nextKey(),
    id: item.id,
    product_id: item.product_id,
    variation_id: item.variation_id,
    name: decode(item.name),
    sku: item.sku,
    image: item.image?.src || '',
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    removed: false,
  }));

  shippingLines.value = (data.shipping_lines || []).map((line) => ({ key: nextKey(), id: line.id, method_id: line.method_id || 'other', method_title: decode(line.method_title), total: localPrice(line.total), removed: false }));
  feeLines.value = (data.fee_lines || []).map((line) => ({ key: nextKey(), id: line.id, name: decode(line.name), total: localPrice(line.total), removed: false }));
  coupons.value = (data.coupon_lines || []).map((line) => ({ key: nextKey(), id: line.id, code: line.code, removed: false }));

  Object.assign(form, { status: data.status, customer_id: data.customer_id, payment_method: data.payment_method || '', customer_note: data.customer_note || '' });

  loading.value = false;
  queueMicrotask(() => (dirty.value = false));
};

/* ---------------------------------------------------------------- Products */

let productTimer = null;

watch(productSearch, (term) => {
  clearTimeout(productTimer);
  variationPicker.product = null;

  if (term.trim().length < 2) {
    productResults.value = [];
    return;
  }

  productTimer = setTimeout(async () => {
    productLoading.value = true;
    const response = await wc('products', {
      params: { search: term.trim(), per_page: 8, status: 'publish', _fields: 'id,name,type,price,sku,images,stock_status,stock_quantity,manage_stock' },
    });
    productResults.value = (Array.isArray(response?.data) ? response.data : []).filter((product) => ['simple', 'variable'].includes(product.type) || product.price);
    productLoading.value = false;
  }, 300);
});

const addLine = (product, variation = null) => {
  const productId = product.id;
  const variationId = variation?.id || 0;
  const existing = lines.value.find((line) => !line.removed && !line.id && line.product_id === productId && line.variation_id === variationId);

  if (existing) {
    existing.quantity += 1;
  } else {
    const attributes = (variation?.attributes || []).map((attribute) => attribute.option).join(', ');

    lines.value.push({
      key: nextKey(),
      product_id: productId,
      variation_id: variationId,
      name: attributes ? `${decode(product.name)} - ${attributes}` : decode(product.name),
      sku: variation?.sku || product.sku || '',
      image: variation?.image?.src || product.images?.[0]?.src || '',
      price: Number(variation?.price ?? product.price) || 0,
      quantity: 1,
      removed: false,
    });
  }

  productSearch.value = '';
  productResults.value = [];
  variationPicker.product = null;
};

const pickProduct = async (product) => {
  if (product.type !== 'variable') {
    addLine(product);
    return;
  }

  Object.assign(variationPicker, { product, variations: [], loading: true });
  const response = await wc(`products/${product.id}/variations`, { params: { per_page: 100, _fields: 'id,attributes,price,sku,stock_status,image,status' } });
  variationPicker.variations = (Array.isArray(response?.data) ? response.data : []).filter((variation) => variation.status !== 'private');
  variationPicker.loading = false;
};

const removeLine = (line) => {
  if (line.id) {
    line.removed = true;
  } else {
    lines.value = lines.value.filter((item) => item.key !== line.key);
  }
};

/* ---------------------------------------------------------------- Customers */

let customerTimer = null;

watch(customerSearch, (term) => {
  clearTimeout(customerTimer);

  if (term.trim().length < 2) {
    customerResults.value = [];
    return;
  }

  customerTimer = setTimeout(async () => {
    customerLoading.value = true;
    const response = await wc('customers', { params: { search: term.trim(), per_page: 6, role: 'all', _fields: 'id,first_name,last_name,email,avatar_url,billing,shipping' } });
    customerResults.value = Array.isArray(response?.data) ? response.data : [];
    customerLoading.value = false;
  }, 300);
});

const selectCustomer = (customer) => {
  form.customer_id = customer.id;
  form.customer = customer;
  form.billing = { ...emptyAddress(), ...customer.billing, email: customer.billing?.email || customer.email };
  form.shipping = { ...emptyAddress(), ...customer.shipping };
  form.ship_to_billing = !customer.shipping?.address_1;
  customerSearch.value = '';
  customerResults.value = [];
};

const clearCustomer = () => {
  form.customer_id = 0;
  form.customer = null;
};

/* ---------------------------------------------------------------- Shipping, fees and coupons */

const addShipping = () => {
  const method = store.value.shipping_methods[0];
  shippingLines.value.push({ key: nextKey(), method_id: method?.value || 'other', method_title: method?.label || __('Shipping', 'flexify-dashboard'), total: '', removed: false });
};

const onShippingMethod = (line, value) => {
  line.method_id = value;
  const method = store.value.shipping_methods.find((item) => item.value === value);
  if (method) line.method_title = method.label;
};

const addFee = () => feeLines.value.push({ key: nextKey(), name: '', total: '', removed: false });

const removeExtra = (list, line) => {
  if (line.id) {
    line.removed = true;
  } else {
    list.value = list.value.filter((item) => item.key !== line.key);
  }
};

const addCoupon = () => {
  const code = couponInput.value.trim().toLowerCase();
  if (!code || coupons.value.some((coupon) => !coupon.removed && coupon.code.toLowerCase() === code)) return;

  coupons.value.push({ key: nextKey(), code, removed: false });
  couponInput.value = '';
};

/* ---------------------------------------------------------------- Save */

const validate = () => {
  if (!visibleLines.value.length) {
    notify({ title: __('Add at least one product to the order.', 'flexify-dashboard'), type: 'error' });
    return false;
  }

  if (feeLines.value.some((line) => !line.removed && !line.name.trim())) {
    notify({ title: __('Give every fee a name.', 'flexify-dashboard'), type: 'error' });
    return false;
  }

  return true;
};

const buildLines = () => ({
  line_items: lines.value
    .map((line) => {
      if (line.id) return { id: line.id, quantity: line.removed ? 0 : Number(line.quantity) || 1 };
      return { product_id: line.product_id, ...(line.variation_id ? { variation_id: line.variation_id } : {}), quantity: Number(line.quantity) || 1 };
    })
    .filter((line) => !(line.id && order.value?.line_items?.find((item) => item.id === line.id && Number(item.quantity) === line.quantity))),
  shipping_lines: shippingLines.value.map((line) =>
    line.id && line.removed ? { id: line.id, method_id: null } : { ...(line.id ? { id: line.id } : {}), method_id: line.method_id, method_title: line.method_title, total: toDecimal(line.total) || '0' }
  ),
  fee_lines: feeLines.value.map((line) =>
    line.id && line.removed ? { id: line.id, name: null } : { ...(line.id ? { id: line.id } : {}), name: line.name.trim(), total: toDecimal(line.total) || '0', tax_status: 'none' }
  ),
  coupon_lines: coupons.value.filter((coupon) => !coupon.id || coupon.removed).map((coupon) => (coupon.id ? { id: coupon.id, code: null } : { code: coupon.code })),
});

const save = async () => {
  if (!validate()) return;

  const data = buildLines();

  if (isNew.value) {
    const gateway = store.value.payment_gateways.find((item) => item.value === form.payment_method);

    Object.assign(data, {
      status: form.status,
      customer_id: form.customer_id || 0,
      billing: form.billing,
      shipping: form.ship_to_billing ? Object.fromEntries(Object.entries(form.billing).filter(([key]) => key !== 'email')) : form.shipping,
      payment_method: form.payment_method,
      payment_method_title: gateway?.label || '',
      set_paid: form.set_paid,
      customer_note: form.customer_note,
    });
  }

  saving.value = true;
  const response = isNew.value ? await wc('orders', { type: 'POST', data }) : await wc(`orders/${props.id}`, { type: 'PUT', data });
  saving.value = false;

  if (!response?.data) return;

  dirty.value = false;
  notify({ title: isNew.value ? sprintf(__('Order #%s created', 'flexify-dashboard'), response.data.number) : __('Order items updated', 'flexify-dashboard'), type: 'success' });
  router.replace({ name: 'order-details', params: { id: response.data.id } });
};

onBeforeRouteLeave(async () => {
  if (!dirty.value || saving.value) return true;
  if (!visibleLines.value.length && isNew.value && !form.customer_id) return true;

  return confirmDialog.value.show({
    title: __('Discard this order?', 'flexify-dashboard'),
    message: __('Your changes have not been saved.', 'flexify-dashboard'),
    confirmLabel: __('Discard changes', 'flexify-dashboard'),
    variant: 'danger',
  });
});

const breadcrumbs = computed(() => [
  { label: __('Orders', 'flexify-dashboard'), to: { name: 'orders' } },
  ...(isNew.value ? [] : [{ label: `#${order.value?.number || props.id}`, to: { name: 'order-details', params: { id: props.id } } }]),
  { label: isNew.value ? __('Add order', 'flexify-dashboard') : __('Edit items', 'flexify-dashboard') },
]);

onMounted(() => {
  if (isNew.value) {
    queueMicrotask(() => (dirty.value = false));
  } else {
    loadOrder();
  }
});
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-6">
      <FdSkeleton class="h-10 w-72" />
      <FdSkeleton class="h-96 w-full rounded-2xl" />
    </div>

    <template v-else>
      <FdPageHeader
        :title="isNew ? __('Add order', 'flexify-dashboard') : sprintf(__('Edit items of %s', 'flexify-dashboard'), orderTitle(order))"
        :description="isNew ? __('Create an order manually, e.g. for phone or in-store sales.', 'flexify-dashboard') : customerName(order)"
        :breadcrumbs="breadcrumbs"
      >
        <template #actions>
          <FdButton variant="outline" @click="router.back()">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
          <FdButton icon="check" :loading="saving" :disabled="!isEditable" @click="save">{{ isNew ? __('Create order', 'flexify-dashboard') : __('Save items', 'flexify-dashboard') }}</FdButton>
        </template>
      </FdPageHeader>

      <FdAlert
        v-if="!isEditable"
        variant="warning"
        class="mb-6"
        :title="__('This order can no longer be edited', 'flexify-dashboard')"
        :message="__('Only pending or on-hold orders can have their items changed. Change the status first.', 'flexify-dashboard')"
      />

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="min-w-0 space-y-6 xl:col-span-2">
          <!-- Items -->
          <FdCard :title="__('Items', 'flexify-dashboard')">
            <div class="relative">
              <FdSearchInput v-model="productSearch" :debounce="0" :placeholder="__('Search products by name or SKU to add', 'flexify-dashboard')" :disabled="!isEditable" />

              <div
                v-if="productSearch.trim().length >= 2"
                class="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg custom-scrollbar dark:border-gray-800 dark:bg-gray-900"
              >
                <div v-if="productLoading || variationPicker.loading" class="flex justify-center py-6"><FdSpinner /></div>

                <template v-else-if="variationPicker.product">
                  <button type="button" class="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-theme-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.03]" @click="variationPicker.product = null">
                    <AppIcon icon="arrow_back" class="text-base" />{{ decode(variationPicker.product.name) }}
                  </button>
                  <p v-if="!variationPicker.variations.length" class="px-3 py-4 text-center text-theme-sm text-gray-500">{{ __('This product has no variations.', 'flexify-dashboard') }}</p>
                  <button
                    v-for="variation in variationPicker.variations"
                    :key="variation.id"
                    type="button"
                    class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/[0.03]"
                    :disabled="variation.stock_status === 'outofstock'"
                    @click="addLine(variationPicker.product, variation)"
                  >
                    <span class="text-theme-sm text-gray-800 dark:text-white/90">{{ variation.attributes.map((attribute) => attribute.option).join(', ') || sprintf(__('Variation #%s', 'flexify-dashboard'), variation.id) }}</span>
                    <span class="whitespace-nowrap text-theme-sm text-gray-500 dark:text-gray-400">{{ variation.stock_status === 'outofstock' ? __('Out of stock', 'flexify-dashboard') : price(variation.price) }}</span>
                  </button>
                </template>

                <template v-else>
                  <p v-if="!productResults.length" class="px-3 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No products found.', 'flexify-dashboard') }}</p>
                  <button
                    v-for="product in productResults"
                    :key="product.id"
                    type="button"
                    class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    @click="pickProduct(product)"
                  >
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                      <img v-if="product.images?.[0]?.src" :src="product.images[0].src" alt="" class="h-full w-full object-cover" />
                      <AppIcon v-else icon="inventory" class="text-gray-400" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ decode(product.name) }}</span>
                      <span class="block truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {{ product.sku || '—' }}<template v-if="product.stock_status === 'outofstock'"> · {{ __('Out of stock', 'flexify-dashboard') }}</template>
                      </span>
                    </span>
                    <span class="whitespace-nowrap text-theme-sm text-gray-500 dark:text-gray-400">
                      <template v-if="product.type === 'variable'">{{ __('Choose variation', 'flexify-dashboard') }} ›</template>
                      <template v-else>{{ price(product.price) }}</template>
                    </span>
                  </button>
                </template>
              </div>
            </div>

            <FdEmptyState v-if="!visibleLines.length" class="mt-4" compact icon="shopping_bag" :title="__('No items yet', 'flexify-dashboard')" :description="__('Search for products above to add them to the order.', 'flexify-dashboard')" />

            <ul v-else class="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              <li v-for="line in visibleLines" :key="line.key" class="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <span class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  <img v-if="line.image" :src="line.image" alt="" class="h-full w-full object-cover" />
                  <AppIcon v-else icon="inventory" class="text-gray-400" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ line.name }}</span>
                  <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ money(line.price) }}<template v-if="line.sku"> · {{ line.sku }}</template></span>
                </span>
                <FdInput v-model.number="line.quantity" type="number" min="1" step="1" size="sm" class="w-20" :disabled="!isEditable" :aria-label="__('Quantity', 'flexify-dashboard')" />
                <span class="w-24 whitespace-nowrap text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ money((Number(line.price) || 0) * (Number(line.quantity) || 0)) }}</span>
                <FdButton variant="ghost" size="xs" icon="delete" icon-only :disabled="!isEditable" :aria-label="__('Remove item', 'flexify-dashboard')" @click="removeLine(line)" />
              </li>
            </ul>
          </FdCard>

          <!-- Shipping and fees -->
          <FdCard :title="__('Shipping and fees', 'flexify-dashboard')">
            <div class="space-y-3">
              <div v-for="line in shippingLines.filter((item) => !item.removed)" :key="line.key" class="grid items-end gap-3 sm:grid-cols-[1fr_1fr_9rem_auto]">
                <FdSelect :model-value="line.method_id" :options="shippingMethodOptions" :label="__('Shipping method', 'flexify-dashboard')" :disabled="!isEditable" @update:model-value="(value) => onShippingMethod(line, value)" />
                <FdInput v-model="line.method_title" :label="__('Name shown to customer', 'flexify-dashboard')" :disabled="!isEditable" />
                <FdInput v-model="line.total" :label="__('Cost', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" :disabled="!isEditable" />
                <FdButton variant="ghost" icon="delete" icon-only :disabled="!isEditable" :aria-label="__('Remove shipping', 'flexify-dashboard')" @click="removeExtra(shippingLines, line)" />
              </div>

              <div v-for="line in feeLines.filter((item) => !item.removed)" :key="line.key" class="grid items-end gap-3 sm:grid-cols-[2fr_9rem_auto]">
                <FdInput v-model="line.name" :label="__('Fee name', 'flexify-dashboard')" :disabled="!isEditable" />
                <FdInput v-model="line.total" :label="__('Amount', 'flexify-dashboard')" :prefix="currency.symbol" inputmode="decimal" :hint="__('Use a negative value for a discount.', 'flexify-dashboard')" :disabled="!isEditable" />
                <FdButton variant="ghost" icon="delete" icon-only :disabled="!isEditable" :aria-label="__('Remove fee', 'flexify-dashboard')" @click="removeExtra(feeLines, line)" />
              </div>

              <div class="flex flex-wrap gap-2">
                <FdButton size="sm" variant="outline" icon="local_shipping" :disabled="!isEditable" @click="addShipping">{{ __('Add shipping', 'flexify-dashboard') }}</FdButton>
                <FdButton size="sm" variant="outline" icon="add" :disabled="!isEditable" @click="addFee">{{ __('Add fee', 'flexify-dashboard') }}</FdButton>
              </div>
            </div>
          </FdCard>

          <!-- Customer and addresses (new orders) -->
          <template v-if="isNew">
            <FdCard :title="__('Billing address', 'flexify-dashboard')">
              <AddressFields v-model="form.billing" type="billing" />
            </FdCard>

            <FdCard :title="__('Shipping address', 'flexify-dashboard')">
              <FdSwitch v-model="form.ship_to_billing" :label="__('Same as billing address', 'flexify-dashboard')" />
              <AddressFields v-if="!form.ship_to_billing" v-model="form.shipping" class="mt-5" type="shipping" />
            </FdCard>
          </template>
        </div>

        <!-- Sidebar -->
        <div class="min-w-0 space-y-6">
          <FdCard v-if="isNew" :title="__('Customer', 'flexify-dashboard')">
            <div v-if="form.customer" class="flex items-center gap-3">
              <FdAvatar :src="form.customer.avatar_url || ''" :name="[form.customer.first_name, form.customer.last_name].join(' ') || form.customer.email" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-gray-800 dark:text-white/90">{{ [form.customer.first_name, form.customer.last_name].filter(Boolean).join(' ') || form.customer.email }}</p>
                <p class="truncate text-theme-xs text-gray-500 dark:text-gray-400">{{ form.customer.email }}</p>
              </div>
              <FdButton variant="ghost" size="xs" icon="close" icon-only :aria-label="__('Remove customer', 'flexify-dashboard')" @click="clearCustomer" />
            </div>
            <div v-else class="relative">
              <FdSearchInput v-model="customerSearch" :debounce="0" :placeholder="__('Search customers by name or email', 'flexify-dashboard')" />
              <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">{{ __('Leave empty to create a guest order.', 'flexify-dashboard') }}</p>
              <div
                v-if="customerSearch.trim().length >= 2"
                class="absolute inset-x-0 top-12 z-20 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg custom-scrollbar dark:border-gray-800 dark:bg-gray-900"
              >
                <div v-if="customerLoading" class="flex justify-center py-4"><FdSpinner /></div>
                <p v-else-if="!customerResults.length" class="px-3 py-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No customers found.', 'flexify-dashboard') }}</p>
                <button
                  v-for="customer in customerResults"
                  v-else
                  :key="customer.id"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  @click="selectCustomer(customer)"
                >
                  <FdAvatar :src="customer.avatar_url || ''" :name="[customer.first_name, customer.last_name].join(' ') || customer.email" size="sm" />
                  <span class="min-w-0">
                    <span class="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email }}</span>
                    <span class="block truncate text-theme-xs text-gray-500 dark:text-gray-400">{{ customer.email }}</span>
                  </span>
                </button>
              </div>
            </div>
          </FdCard>

          <FdCard v-if="isNew" :title="__('Order', 'flexify-dashboard')">
            <div class="space-y-4">
              <FdSelect v-model="form.status" :options="statusOptions" :label="__('Status', 'flexify-dashboard')" />
              <FdSelect v-model="form.payment_method" :options="paymentOptions" :label="__('Payment method', 'flexify-dashboard')" />
              <FdCheckbox v-model="form.set_paid" :label="__('Mark as paid', 'flexify-dashboard')" :description="__('Sets the payment date and moves the order to processing or completed.', 'flexify-dashboard')" />
              <FdTextarea v-model="form.customer_note" :rows="3" :label="__('Customer note', 'flexify-dashboard')" />
            </div>
          </FdCard>

          <FdCard :title="__('Coupons', 'flexify-dashboard')">
            <form class="flex gap-2" @submit.prevent="addCoupon">
              <FdInput v-model="couponInput" size="sm" class="flex-1" :placeholder="__('Coupon code', 'flexify-dashboard')" :disabled="!isEditable" :aria-label="__('Coupon code', 'flexify-dashboard')" />
              <FdButton type="submit" size="sm" variant="outline" :disabled="!isEditable">{{ __('Apply', 'flexify-dashboard') }}</FdButton>
            </form>
            <div v-if="coupons.some((coupon) => !coupon.removed)" class="mt-3 flex flex-wrap gap-2">
              <span v-for="coupon in coupons.filter((item) => !item.removed)" :key="coupon.key" class="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 ps-3 pe-1.5 font-mono text-theme-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {{ coupon.code }}
                <button type="button" class="rounded-full p-0.5 text-gray-400 hover:text-error-500" :aria-label="__('Remove coupon', 'flexify-dashboard')" :disabled="!isEditable" @click="removeExtra(coupons, coupon)">
                  <AppIcon icon="close" class="text-sm" />
                </button>
              </span>
            </div>
          </FdCard>

          <FdCard :title="__('Summary', 'flexify-dashboard')">
            <dl class="space-y-2.5 text-theme-sm">
              <div class="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                <dt>{{ __('Items subtotal', 'flexify-dashboard') }}</dt>
                <dd class="text-gray-800 dark:text-white/90">{{ money(itemsSubtotal) }}</dd>
              </div>
              <div class="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                <dt>{{ __('Shipping', 'flexify-dashboard') }}</dt>
                <dd class="text-gray-800 dark:text-white/90">{{ money(shippingTotal) }}</dd>
              </div>
              <div v-if="feesTotal" class="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                <dt>{{ __('Fees', 'flexify-dashboard') }}</dt>
                <dd class="text-gray-800 dark:text-white/90">{{ money(feesTotal) }}</dd>
              </div>
              <div class="flex justify-between gap-4 border-t border-gray-100 pt-2.5 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
                <dt>{{ __('Estimated total', 'flexify-dashboard') }}</dt>
                <dd>{{ money(estimatedTotal) }}</dd>
              </div>
            </dl>
            <p class="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">{{ __('Coupons and taxes are applied by WooCommerce when the order is saved.', 'flexify-dashboard') }}</p>
          </FdCard>
        </div>
      </div>
    </template>

    <FdConfirmDialog ref="confirmDialog" />
  </div>
</template>
