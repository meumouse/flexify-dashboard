/**
 * Pure price helpers shared by the WooCommerce pages (no Vue or store imports, so they can be unit tested).
 */

export const DEFAULT_CURRENCY = {
  code: 'BRL',
  symbol: 'R$',
  position: 'left_space',
  thousand_separator: '.',
  decimal_separator: ',',
  decimals: 2,
};

/**
 * Format a number with WooCommerce price settings.
 *
 * @param {number|string} value
 * @param {Object} currency
 * @returns {string}
 */
export const formatPrice = (value, currency = DEFAULT_CURRENCY) => {
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
export const parsePrice = (value, currency = DEFAULT_CURRENCY) => {
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
