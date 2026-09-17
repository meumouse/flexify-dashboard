/**
 * Translation helpers for kit components.
 *
 * Uses the global `__` shim registered by the app bootstrap (with text
 * replacements) and falls back to wp.i18n.
 */
const translate = (text) => {
  const fn = window.__ || window.wp?.i18n?.__;

  return typeof fn === 'function' ? fn(text, 'flexify-dashboard') : text;
};

export const __ = translate;

export const sprintf = (format, ...args) => {
  if (typeof window.wp?.i18n?.sprintf === 'function') {
    return window.wp.i18n.sprintf(format, ...args);
  }

  let index = 0;

  return String(format).replace(/%(\d+\$)?[sd]/g, (match, position) => {
    const value = position ? args[parseInt(position, 10) - 1] : args[index++];

    return value ?? '';
  });
};
