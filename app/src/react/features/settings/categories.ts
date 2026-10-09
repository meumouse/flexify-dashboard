import { __ } from '@/react/lib/i18n';

/**
 * The sections of the settings screen, in the order they are shown, under the heading of the
 * group each belongs to.
 *
 * The settings themselves live in the shared schema; this only says how the sections are
 * named, what they are about and where they sit. Seventeen sections in one column was a list
 * to read top to bottom; five groups are something to scan.
 */

export type SettingsCategory = { value: string; label: string; icon: string; description: string; group: string };

export const CATEGORIES = (): SettingsCategory[] => {
	const general = __('General');
	const appearance = __('Appearance');
	const content = __('Content');
	const store = __('Store');
	const system = __('Data and security');

	return [
		{ value: 'general', label: __('General'), icon: 'settings', description: __('Core plugin settings and the licence'), group: general },
		{ value: 'integrations', label: __('Integrations'), icon: 'api', description: __('Outside services and their keys'), group: general },
		{ value: 'theme', label: __('Theme'), icon: 'palette', description: __('Colours, styling and the look of the admin'), group: appearance },
		{ value: 'whitelabel', label: __('White label'), icon: 'diamond_shine', description: __('Rebrand the interface: names, text and icons'), group: appearance },
		{ value: 'menu', label: __('Menu'), icon: 'menu', description: __('How the admin menu behaves'), group: appearance },
		{ value: 'dashboard', label: __('Dashboard'), icon: 'dashboard', description: __('The custom dashboard and the admin interface'), group: appearance },
		{ value: 'login', label: __('Login'), icon: 'login', description: __('How the login page looks and what guards it'), group: appearance },
		{ value: 'posts', label: __('Posts'), icon: 'article', description: __('Managing and showing posts'), group: content },
		{ value: 'media', label: __('Media'), icon: 'image', description: __('The media library and uploads'), group: content },
		{ value: 'comments', label: __('Comments'), icon: 'comment', description: __('Moderating comments'), group: content },
		{ value: 'users', label: __('Users'), icon: 'people', description: __('Managing the people with an account'), group: content },
		{ value: 'plugins', label: __('Plugins'), icon: 'extension', description: __('The plugins screen'), group: content },
		{ value: 'woocommerce', label: __('WooCommerce'), icon: 'storefront', description: __('The products and orders screens'), group: store },
		{ value: 'analytics', label: __('Analytics'), icon: 'analytics', description: __('What is measured and how'), group: system },
		{ value: 'security', label: __('Security'), icon: 'security', description: __('What is guarded and how'), group: system },
		{ value: 'database', label: __('Database'), icon: 'database', description: __('The database explorer'), group: system },
		{ value: 'advanced', label: __('Advanced'), icon: 'warning', description: __('Resetting the plugin and other things that are hard to undo'), group: system },
	];
};

/** The sections bunched under their group, in order. */
export const groupCategories = (categories: SettingsCategory[]): { group: string; items: SettingsCategory[] }[] =>
	categories.reduce<{ group: string; items: SettingsCategory[] }[]>((groups, category) => {
		const last = groups[groups.length - 1];

		if (last && last.group === category.group) {
			last.items.push(category);
		} else {
			groups.push({ group: category.group, items: [category] });
		}

		return groups;
	}, []);
