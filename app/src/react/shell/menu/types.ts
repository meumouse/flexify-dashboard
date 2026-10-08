/**
 * Shape of the admin menu, read from the JSON the plugin prints and possibly replaced by a
 * custom menu the site published.
 */

/** What `AdminMenu::get_menu()` sends, before the shell adds its own state to it. */
export type MenuPayloadItem = {
	id: string;
	type?: 'separator';
	name?: string;
	url?: string;
	notifications?: number | null;
	icon?: MenuIconSource;
	classes?: string[];
	submenu?: MenuPayloadItem[];
};

/**
 * WordPress accepts a dashicon class, an image URL or nothing in a menu's icon slot. Nothing
 * means the plugin paints it from its own stylesheet, which still works: the item carries the
 * id and classes WordPress would have given it.
 */
export type MenuIconSource = {
	kind: 'dashicon' | 'image' | 'none';
	value: string;
};

export type MenuItemSettings = {
	name?: string;
	icon?: string;
	hidden?: boolean;
	open_new?: boolean;
	id?: string;
};

export type SubMenuItem = {
	id: string;
	name: string;
	url: string;
	target?: string | null;
	active?: boolean;
	directMatch?: boolean;
	notifications?: number | null;
	sub_id?: string | null;
	settings?: MenuItemSettings;
	custom?: boolean;
};

export type MenuItem = {
	id: string;
	/** Separators carry no link */
	type?: 'separator';
	name?: string;
	url?: string;
	target?: string | null;
	notifications?: number | null;
	icon?: MenuIconSource;
	classes?: string[];
	submenu?: SubMenuItem[];
	active?: boolean;
	directMatch?: boolean;
	open?: boolean;
	settings?: MenuItemSettings;
	custom?: boolean;
};
