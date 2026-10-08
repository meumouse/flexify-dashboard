import { isCurrentLocationMatch } from '@/react/shell/menu/location';
import type { MenuItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * Which menu item the current address is on.
 *
 * Separate from reading the menu because it is the one part that depends on where the browser
 * happens to be, and it is the same answer whether the menu came from the page or the route.
 */

/**
 * WordPress marks a whole branch as current; an exact URL match is a better answer, so when one
 * exists it wins and every other item is turned off.
 */
export const applyDirectMatches = (items: MenuItem[]): MenuItem[] => {
	const result = items.map((item) => ({ ...item, submenu: item.submenu ? item.submenu.map((entry) => ({ ...entry })) : undefined }));

	let matchedIndex = -1;

	for (let index = 0; index < result.length && matchedIndex === -1; index += 1) {
		const item = result[index];

		if (item.type === 'separator' || !Array.isArray(item.submenu)) {
			continue;
		}

		const match = item.submenu.findIndex((entry) => isCurrentLocationMatch(entry.url));

		if (match > -1) {
			item.submenu.forEach((entry, entryIndex) => {
				entry.active = entryIndex === match;
				entry.directMatch = entryIndex === match;
			});
			item.active = true;
			item.directMatch = true;
			matchedIndex = index;
		}
	}

	if (matchedIndex === -1) {
		matchedIndex = result.findIndex((item) => item.type !== 'separator' && item.url && isCurrentLocationMatch(item.url));

		if (matchedIndex > -1) {
			result[matchedIndex].active = true;
			result[matchedIndex].directMatch = true;
		}
	}

	if (matchedIndex > -1) {
		result.forEach((item, index) => {
			if (index === matchedIndex || item.type === 'separator' || item.directMatch) {
				return;
			}

			item.active = false;
			item.submenu?.forEach((entry) => {
				if (!entry.directMatch) {
					entry.active = false;
				}
			});
		});
	}

	return result;
};

/** Whether a menu item points at the page being shown. */
export const isItemActive = (item: MenuItem | SubMenuItem): boolean => {
	if (item.url && isCurrentLocationMatch(item.url)) {
		return true;
	}

	if (item.active) {
		return true;
	}

	const submenu = (item as MenuItem).submenu;

	return Boolean(submenu?.some((entry) => (entry.url && isCurrentLocationMatch(entry.url)) || entry.active));
};
