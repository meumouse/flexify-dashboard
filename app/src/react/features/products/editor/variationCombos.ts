import type { VariationAttribute } from '@/react/woo/types';

/**
 * Pure helpers to build product variation combinations.
 */

export type ParentAttribute = {
	id?: number;
	name: string;
	options: string[];
	/** Whether the attribute is used to build variations */
	variation?: boolean;
};

/**
 * Match a variation attribute with a parent attribute (global by id, custom by name).
 */
export const sameAttribute = (item: { id?: number; name?: string }, attribute: { id?: number; name?: string }): boolean => {
	if (attribute.id && item.id) {
		return item.id === attribute.id;
	}

	return String(item.name).toLowerCase() === String(attribute.name).toLowerCase();
};

/**
 * Stable key of a combination, used to detect variations that already exist.
 */
export const comboKey = (attributes: { id?: number; name?: string; option?: string }[], parentAttributes: ParentAttribute[]): string =>
	parentAttributes
		.map((attribute) => {
			const match = attributes.find((item) => sameAttribute(item, attribute));

			return `${attribute.id || String(attribute.name).toLowerCase()}:${match?.option || ''}`;
		})
		.join('|');

/**
 * Every combination of the parent attribute options.
 */
export const buildCombos = (parentAttributes: ParentAttribute[]): VariationAttribute[][] =>
	parentAttributes.reduce<VariationAttribute[][]>(
		(list, attribute) => list.flatMap((combo) => attribute.options.map((option) => [...combo, { id: attribute.id ?? 0, name: attribute.name, option }])),
		[[]]
	);

/**
 * Combinations that do not exist yet among the current variations.
 */
export const missingCombos = (parentAttributes: ParentAttribute[], variations: { attributes?: VariationAttribute[] }[]): VariationAttribute[][] => {
	if (!parentAttributes.length) {
		return [];
	}

	const existing = new Set(variations.map((variation) => comboKey(variation.attributes ?? [], parentAttributes)));

	return buildCombos(parentAttributes).filter((combo) => !existing.has(comboKey(combo, parentAttributes)));
};
