import { computed } from 'vue';
import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { DEFAULT_CURRENCY, formatPrice, parsePrice } from './wooPrice.js';

export { formatPrice, parsePrice };

/**
 * Default store data used when the page is rendered without WooCommerce data.
 */
const DEFAULTS = {
  active: false,
  hpos: false,
  currency: DEFAULT_CURRENCY,
  weight_unit: 'kg',
  dimension_unit: 'cm',
  manage_stock: true,
  low_stock_amount: 2,
  product_types: [],
  stock_statuses: [],
  order_statuses: [],
  payment_gateways: [],
  shipping_methods: [],
  capabilities: {},
  urls: {},
};

/**
 * WooCommerce store helpers for the products and orders pages.
 */
export function useWooCommerce() {
  const appStore = useAppStore();

  const store = computed(() => ({ ...DEFAULTS, ...(appStore.state.woocommerce || {}) }));
  const currency = computed(() => ({ ...DEFAULTS.currency, ...(store.value.currency || {}) }));

  const orderStatusMap = computed(() =>
    Object.fromEntries((store.value.order_statuses || []).map((status) => [status.value, status]))
  );

  const price = (value) => formatPrice(value, currency.value);
  const toDecimal = (value) => parsePrice(value, currency.value);

  const orderStatus = (slug) => orderStatusMap.value[slug] || { value: slug, label: slug, color: 'light' };

  const can = (capability) => store.value.capabilities?.[capability] !== false;

  /**
   * Call WooCommerce REST API (wc/v3).
   */
  const wc = (endpoint, { type = 'GET', data = {}, params = {} } = {}) =>
    lmnFetch({ endpoint: `wc/v3/${endpoint}`, type, data, params });

  /**
   * Call Flexify Dashboard WooCommerce endpoints.
   */
  const fd = (endpoint, { type = 'GET', data = {}, params = {} } = {}) =>
    lmnFetch({ endpoint: `flexify-dashboard/v1/woocommerce/${endpoint}`, type, data, params });

  return {
    store,
    currency,
    price,
    toDecimal,
    orderStatus,
    orderStatusMap,
    can,
    wc,
    fd,
  };
}
