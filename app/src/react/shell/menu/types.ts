/**
 * Shape of the admin menu, parsed from the WordPress DOM and possibly replaced by a custom menu.
 */

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
	imageClasses?: string[];
	iconStyles?: string;
	submenu?: SubMenuItem[];
	active?: boolean;
	directMatch?: boolean;
	open?: boolean;
	settings?: MenuItemSettings;
	custom?: boolean;
};

export type DashIcon = {
	class: string;
	before: string;
	font: string;
	backGroundImage: string | false;
};
