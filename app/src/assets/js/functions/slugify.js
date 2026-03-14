/**
 * slugify
 *
 * Converts a string into a URL-friendly slug.
 *
 * @param {string} text Input string
 * @param {Object} args Options
 * @param {string} args.separator Separator (default '-')
 * @param {boolean} args.lower Lowercase result (default true)
 * @return {string} slug
 */
export function slugify(text, args = {}) {
  const separator = args.separator || '-';
  const lower = typeof args.lower === 'boolean' ? args.lower : true;

  if (text === null || typeof text === 'undefined') {
    return '';
  }

  let value = String(text).trim();

  if (!value) {
    return '';
  }

  // Normalize accents/diacritics
  value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Replace non-alphanumeric with separator
  value = value
    .replace(/[^a-zA-Z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, 'g'), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');

  return lower ? value.toLowerCase() : value;
}

export default slugify;
