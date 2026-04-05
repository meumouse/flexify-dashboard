export const NULL_OPTION_VALUE = '__fd_select_null__';

export const encodeSelectValue = (value) => {
  if (value === null) return NULL_OPTION_VALUE;
  return value;
};

export const decodeSelectValue = (value) => {
  if (value === NULL_OPTION_VALUE) return null;
  return value;
};

export const stripHtml = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const normalizeOptions = (options) => {
  if (!options) return [];

  const list = Array.isArray(options) ? options : Object.values(options);

  return list
    .filter(Boolean)
    .map((item) => ({
      disabled: Boolean(item.disabled),
      html: item.html ?? item.label ?? '',
      label: item.label ?? item.html ?? '',
      value: Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : item.id,
    }));
};

export const normalizeCategories = (categories) => {
  if (!Array.isArray(categories)) return [];

  return categories
    .filter(Boolean)
    .map((category) => ({
      label: category.label ?? '',
      items: normalizeOptions(category.items),
    }))
    .filter((category) => category.items.length > 0);
};
