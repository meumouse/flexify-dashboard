import type { MenuItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * Rearranging a menu, apart from how it is drawn.
 *
 * A menu is two levels deep and every change is a move between positions, so the arithmetic
 * is here where it can be checked instead of inside the component.
 */

export type Where = { parent: number; child: number | null };

/** The id of whatever sits at a position, so a selection survives a move. */
export const idAt = (items: MenuItem[], where: Where): string | undefined =>
	where.child === null ? items[where.parent]?.id : items[where.parent]?.submenu?.[where.child]?.id;

export const findItem = (items: MenuItem[], id: string): Where | null => {
	for (const [parent, item] of items.entries()) {
		if (item.id === id) {
			return { parent, child: null };
		}

		const child = item.submenu?.findIndex((entry) => entry.id === id) ?? -1;

		if (child >= 0) {
			return { parent, child };
		}
	}

	return null;
};

const moveWithin = <T,>(list: T[], from: number, to: number): T[] => {
	const next = [...list];
	const [moved] = next.splice(from, 1);

	next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);

	return next;
};

/** Move a top-level item, or an item within the one it belongs to. */
export const moveItem = (items: MenuItem[], where: Where, direction: -1 | 1): MenuItem[] => {
	if (where.child === null) {
		return moveWithin(items, where.parent, where.parent + direction);
	}

	return items.map((item, index) =>
		index === where.parent && item.submenu ? { ...item, submenu: moveWithin(item.submenu, where.child as number, (where.child as number) + direction) } : item
	);
};

export const removeItem = (items: MenuItem[], where: Where): MenuItem[] => {
	if (where.child === null) {
		return items.filter((_item, index) => index !== where.parent);
	}

	return items.map((item, index) =>
		index === where.parent && item.submenu ? { ...item, submenu: item.submenu.filter((_entry, child) => child !== where.child) } : item
	);
};

export const updateItem = (items: MenuItem[], where: Where, patch: Partial<MenuItem & SubMenuItem>): MenuItem[] =>
	items.map((item, index) => {
		if (index !== where.parent) {
			return item;
		}

		if (where.child === null) {
			return { ...item, ...patch };
		}

		return { ...item, submenu: (item.submenu ?? []).map((entry, child) => (child === where.child ? { ...entry, ...patch } : entry)) };
	});

/** A custom item needs an id of its own, since it stands for nothing the site already has. */
export const customId = (): string => `fd-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const newCustomItem = (): MenuItem => ({ id: customId(), name: '', url: '', custom: true, submenu: [] });

export const newCustomChild = (): SubMenuItem => ({ id: customId(), name: '', url: '', custom: true });

/**
 * Put back what the site itself offers that this menu is missing, in the place it sits in the
 * real menu — so a plugin installed after the menu was made is not simply lost.
 */
export const restoreMissing = (custom: MenuItem[], native: MenuItem[]): MenuItem[] => {
	const present = new Set(custom.map((item) => item.id));
	const result = [...custom];

	native.forEach((item, index) => {
		if (!present.has(item.id)) {
			result.splice(Math.min(index, result.length), 0, { ...item });
		}
	});

	return result.map((item) => {
		const source = native.find((entry) => entry.id === item.id);

		if (!source?.submenu?.length) {
			return item;
		}

		const have = new Set((item.submenu ?? []).map((entry) => entry.id));
		const missing = source.submenu.filter((entry) => !have.has(entry.id));

		return missing.length ? { ...item, submenu: [...(item.submenu ?? []), ...missing] } : item;
	});
};
