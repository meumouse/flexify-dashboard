import { applyDirectMatches } from '@/react/shell/menu/active';
import type { MenuItem, MenuPayloadItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * Read the WordPress admin menu, as data.
 *
 * The plugin prints it into the page as JSON (`AdminMenu::print_menu`), built from the
 * `$menu` and `$submenu` globals. It used to be walked out of `#adminmenu`: the links, the
 * names, the notification bubbles and the glyph of every icon, read from a `:before`
 * pseudo-element. None of that survived a plugin changing its markup.
 *
 * Printing it into the page rather than fetching it keeps what the DOM gave for free — the
 * menu is there on the first paint, with no request to wait for. The same data is on
 * `GET flexify-dashboard/v1/admin-menu` for anything that is not on an admin page.
 */

export const MENU_SCRIPT_ID = 'fd-admin-menu';

const toSubItem = (item: MenuPayloadItem): SubMenuItem => ({
	id: item.id,
	name: item.name ?? '',
	url: item.url ?? '',
	notifications: item.notifications ?? null,
});

const toItem = (item: MenuPayloadItem): MenuItem =>
	item.type === 'separator'
		? { id: item.id, type: 'separator' }
		: {
				id: item.id,
				name: item.name ?? '',
				url: item.url ?? '',
				notifications: item.notifications ?? null,
				icon: item.icon ?? { kind: 'none', value: '' },
				classes: item.classes ?? [],
				submenu: (item.submenu ?? []).map(toSubItem),
			};

/** The payload as printed, or an empty menu when the page did not print one. */
export const readMenuPayload = (root: Document | HTMLElement = document): MenuPayloadItem[] => {
	const script = 'getElementById' in root ? root.getElementById(MENU_SCRIPT_ID) : root.querySelector(`#${MENU_SCRIPT_ID}`);

	if (!script?.textContent) {
		return [];
	}

	try {
		return JSON.parse(script.textContent) as MenuPayloadItem[];
	} catch {
		return [];
	}
};

export const readAdminMenu = (root: Document | HTMLElement = document): MenuItem[] => applyDirectMatches(readMenuPayload(root).map(toItem));
