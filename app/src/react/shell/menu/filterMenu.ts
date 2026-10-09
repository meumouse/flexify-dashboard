import type { MenuItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * Narrowing the sidebar to what matches a few typed letters.
 *
 * WooCommerce and a handful of plugins put forty entries in the menu; the command palette finds
 * any of them, but it covers the page. This keeps the menu where it is and only takes away what
 * does not match.
 */

/** Lower case, without accents or the markup WordPress leaves in names (bubbles, screen-reader text). */
export const normaliseLabel = (value: string): string =>
	value
		.replace(/<[^>]*>/g, ' ')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

const labelOf = (item: MenuItem | SubMenuItem): string => normaliseLabel(item.settings?.name || item.name || '');

/**
 * The items that match, each with only the sub-items that match.
 *
 * A parent whose own name matches keeps all its sub-items — searching "WooCommerce" should show
 * what is under it — and every parent that stays is opened, since what matched may be inside.
 * Separators and headings go: with half the menu gone they would divide nothing.
 */
export const filterMenu = (menu: MenuItem[], query: string): MenuItem[] => {
	const text = normaliseLabel(query);

	if (!text) {
		return menu;
	}

	return menu.flatMap((item) => {
		if (item.type === 'separator' || item.settings?.hidden) {
			return [];
		}

		const visible = (item.submenu ?? []).filter((entry) => !entry.settings?.hidden);
		const own = labelOf(item).includes(text);
		const children = own ? visible : visible.filter((entry) => labelOf(entry).includes(text));

		if (!own && !children.length) {
			return [];
		}

		return [{ ...item, submenu: children, open: children.length > 0 }];
	});
};
