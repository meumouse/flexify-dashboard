/**
 * Pure helpers to build product variation combinations (no Vue imports, so they can be unit tested).
 */

/**
 * Match a variation attribute with a parent attribute (global by id, custom by name).
 *
 * @param {{id?: number, name?: string}} item Variation attribute.
 * @param {{id?: number, name?: string}} attribute Parent attribute.
 * @returns {boolean}
 */
export const sameAttribute = (item, attribute) => {
  if (attribute.id && item.id) return item.id === attribute.id;
  return String(item.name).toLowerCase() === String(attribute.name).toLowerCase();
};

/**
 * Stable key of a combination, used to detect variations that already exist.
 *
 * @param {Array} attributes Variation attributes ({ id, name, option }).
 * @param {Array} parentAttributes Parent attributes used for variations.
 * @returns {string}
 */
export const comboKey = (attributes, parentAttributes) =>
  parentAttributes
    .map((attribute) => {
      const match = attributes.find((item) => sameAttribute(item, attribute));
      return `${attribute.id || String(attribute.name).toLowerCase()}:${match?.option || ''}`;
    })
    .join('|');

/**
 * Every combination of the parent attributes options.
 *
 * @param {Array} parentAttributes Attributes with { id, name, options }.
 * @returns {Array<Array<{id: number, name: string, option: string}>>}
 */
export const buildCombos = (parentAttributes) =>
  parentAttributes.reduce(
    (list, attribute) => list.flatMap((combo) => attribute.options.map((option) => [...combo, { id: attribute.id, name: attribute.name, option }])),
    [[]]
  );

/**
 * Combinations that do not exist yet among the current variations.
 *
 * @param {Array} parentAttributes Attributes used for variations.
 * @param {Array} variations Existing variations ({ attributes }).
 * @returns {Array}
 */
export const missingCombos = (parentAttributes, variations) => {
  if (!parentAttributes.length) return [];

  const existing = new Set(variations.map((variation) => comboKey(variation.attributes || [], parentAttributes)));
  return buildCombos(parentAttributes).filter((combo) => !existing.has(comboKey(combo, parentAttributes)));
};
