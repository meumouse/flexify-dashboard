import { computed } from 'vue';
import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

/**
 * Default store data used when the page is rendered without WooCommerce data.
 */
const DEFAULTS = {
  active: false,
  hpos: false,
  currency: {
    code: 'BRL',
    symbol: 'R$',
    position: 'left_space',
    thousand_separator: '.',
    decimal_separator: ',',
    decimals: 2,
  },
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
 * Format a number with WooCommerce price settings.
 *
 * @param {number|string} value
 * @param {Object} currency
 * @returns {string}
 */
export const formatPrice = (value, currency = DEFAULTS.currency) => {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  const decimals = Number.isInteger(currency.decimals) ? currency.decimals : 2;
  const fixed = Math.abs(number).toFixed(decimals);
  const [integer, fraction] = fixed.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousand_separator ?? '.');
  const amount = fraction ? `${grouped}${currency.decimal_separator ?? ','}${fraction}` : grouped;
  const symbol = currency.symbol ?? '';
  const sign = number < 0 ? '-' : '';

  switch (currency.position) {
    case 'right':
      return `${sign}${amount}${symbol}`;
    case 'right_space':
      return `${sign}${amount} ${symbol}`;
    case 'left':
      return `${sign}${symbol}${amount}`;
    case 'left_space':
    default:
      return `${sign}${symbol} ${amount}`;
  }
};

/**
 * Parse a localized price string into a decimal string accepted by wc/v3.
 *
 * @param {string|number} value
 * @param {Object} currency
 * @returns {string}
 */
export const parsePrice = (value, currency = DEFAULTS.currency) => {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  const decimal = currency.decimal_separator || ',';
  const raw = String(value).trim().replace(/[^\d.,-]/g, '');

  if (!raw) {
    return '';
  }

  const lastDecimal = raw.lastIndexOf(decimal);
  let integerPart = raw;
  let fractionPart = '';

  if (lastDecimal > -1) {
    integerPart = raw.slice(0, lastDecimal);
    fractionPart = raw.slice(lastDecimal + 1);
  } else {
    // Accept a dot as decimal separator when typed as "59.90"
    const dotMatch = raw.match(/^(-?[\d.,]*?)\.(\d{1,2})$/);

    if (dotMatch && decimal !== '.') {
      integerPart = dotMatch[1];
      fractionPart = dotMatch[2];
    }
  }

  const sign = integerPart.startsWith('-') ? '-' : '';
  const digits = integerPart.replace(/[^\d]/g, '') || '0';
  const fraction = fractionPart.replace(/[^\d]/g, '');

  return fraction ? `${sign}${digits}.${fraction}` : `${sign}${digits}`;
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
