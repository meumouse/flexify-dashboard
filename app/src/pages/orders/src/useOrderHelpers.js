import { useWooCommerce } from '@/composables/useWooCommerce.js';
import { ref } from 'vue';
import { useAppStore } from '@/store/app/app.js';

export const ADDRESS_FIELDS = ['first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'email', 'phone'];

export const emptyAddress = () => Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, '']));

// Countries list shared by every address form on the page.
const countries = ref([]);
let countriesRequest = null;

/**
 * Load WooCommerce countries and states once per page.
 */
export function useCountries() {
  const { wc } = useWooCommerce();

  const loadCountries = () => {
    if (countries.value.length) return Promise.resolve(countries.value);

    countriesRequest ||= wc('data/countries', { params: { _fields: 'code,name,states' } }).then((response) => {
      if (Array.isArray(response?.data)) {
        countries.value = response.data.sort((a, b) => a.name.localeCompare(b.name));
      }
      countriesRequest = null;
      return countries.value;
    });

    return countriesRequest;
  };

  const countryName = (code) => countries.value.find((country) => country.code === code)?.name || code;

  return { countries, loadCountries, countryName };
}

/**
 * Helpers shared by the orders list, preview and details views.
 */
export function useOrderHelpers() {
  const woo = useWooCommerce();
  const appStore = useAppStore();

  const decode = (value) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value ?? '';
    return textarea.value;
  };

  /**
   * Keep only simple formatting tags and safe links from HTML stored in orders (e.g. notes).
   */
  const safeHtml = (html) => {
    const allowed = ['A', 'B', 'BR', 'CODE', 'EM', 'I', 'LI', 'OL', 'P', 'SPAN', 'STRONG', 'UL'];
    const doc = new DOMParser().parseFromString(`<div>${html ?? ''}</div>`, 'text/html');
    const root = doc.body.firstElementChild;

    const clean = (node) => {
      [...node.children].forEach((child) => {
        clean(child);

        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(child.tagName)) {
          child.remove();
          return;
        }

        if (!allowed.includes(child.tagName)) {
          child.replaceWith(...child.childNodes);
          return;
        }

        [...child.attributes].forEach((attribute) => {
          const keepHref = child.tagName === 'A' && attribute.name === 'href' && /^(https?:|mailto:|\/)/i.test(attribute.value.trim());
          if (!keepHref) child.removeAttribute(attribute.name);
        });

        if (child.tagName === 'A') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }
      });
    };

    clean(root);

    return root.innerHTML;
  };

  const customerName = (order) => {
    const billing = order?.billing || {};
    const name = [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim();

    if (name) return name;
    if (billing.company) return billing.company;
    if (billing.email) return billing.email;

    return __('Guest', 'flexify-dashboard');
  };

  const orderTitle = (order) => sprintf(__('Order #%s', 'flexify-dashboard'), order?.number || order?.id);

  const formatDate = (value, withTime = false) => {
    if (!value) return '';

    const options = withTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' };

    return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
  };

  const relativeDate = (value) => {
    if (!value) return '';

    const date = new Date(value);
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

    if (abs < 60) return rtf.format(seconds, 'second');
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
    if (abs < 86400 * 7) return rtf.format(Math.round(seconds / 86400), 'day');

    return formatDate(value);
  };

  const orderPrice = (value, order) => {
    if (value === '' || value === null || value === undefined) return '';

    const currency = order?.currency_symbol ? { ...woo.currency.value, symbol: decode(order.currency_symbol) } : woo.currency.value;

    return formatWith(value, currency);
  };

  const formatWith = (value, currency) => {
    const base = woo.currency.value;
    const merged = { ...base, ...currency };
    const decimals = Number.isInteger(merged.decimals) ? merged.decimals : 2;
    const number = Number(value) || 0;
    const [integer, fraction] = Math.abs(number).toFixed(decimals).split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, merged.thousand_separator ?? '.');
    const amount = fraction ? `${grouped}${merged.decimal_separator ?? ','}${fraction}` : grouped;
    const sign = number < 0 ? '-' : '';

    switch (merged.position) {
      case 'right':
        return `${sign}${amount}${merged.symbol}`;
      case 'right_space':
        return `${sign}${amount} ${merged.symbol}`;
      case 'left':
        return `${sign}${merged.symbol}${amount}`;
      default:
        return `${sign}${merged.symbol} ${amount}`;
    }
  };

  const itemsCount = (order) => (order?.line_items || []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const totalRefunded = (order) => (order?.refunds || []).reduce((total, refund) => total + Math.abs(Number(refund.total) || 0), 0);

  const shippingSummary = (order) => {
    const shipping = order?.shipping || {};
    const location = [shipping.city, shipping.state].filter(Boolean).join(' / ');
    const method = (order?.shipping_lines || []).map((line) => line.method_title).filter(Boolean).join(', ');

    return { location, method };
  };

  const statusActions = (onSelect, current) =>
    woo.store.value.order_statuses
      .filter((status) => !['checkout-draft', 'trash'].includes(status.value) && status.value !== current)
      .map((status) => ({ label: status.label, onSelect: () => onSelect(status.value) }));

  const classicOrderUrl = (id) => {
    const admin = appStore.state.adminUrl || '';

    return woo.store.value.hpos
      ? `${admin}admin.php?page=wc-orders&action=edit&id=${id}&fd_classic=1`
      : `${admin}post.php?post=${id}&action=edit&fd_classic=1`;
  };

  const formatAddress = (address = {}) =>
    [
      [address.first_name, address.last_name].filter(Boolean).join(' '),
      address.company,
      address.address_1,
      address.address_2,
      [address.city, address.state, address.postcode].filter(Boolean).join(', '),
      address.country,
    ].filter((line) => line && String(line).trim());

  const sprintf = (format, ...args) => {
    if (window.wp?.i18n?.sprintf) return window.wp.i18n.sprintf(format, ...args);
    let index = 0;
    return String(format).replace(/%(\d+\$)?[sd]/g, (match, position) => (position ? args[parseInt(position, 10) - 1] : args[index++]));
  };

  return {
    ...woo,
    decode,
    safeHtml,
    customerName,
    orderTitle,
    formatDate,
    relativeDate,
    orderPrice,
    itemsCount,
    totalRefunded,
    shippingSummary,
    statusActions,
    classicOrderUrl,
    formatAddress,
    sprintf,
  };
}
