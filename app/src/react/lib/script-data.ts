import type { CurrentUser, PluginSettings, WpData } from '@/react/types/wordpress';

/**
 * Read the data attributes the plugin prints on the admin script tags.
 *
 * The main tag (`#fd-script`) carries the site and user data; each page may print a
 * second tag with its own payload (for example `#fd-woocommerce-script`).
 */

const json = <T>(tag: Element | null, attribute: string, fallback: T): T => {
	const value = tag?.getAttribute(attribute);

	if (!value) {
		return fallback;
	}

	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
};

const bool = (tag: Element | null, attribute: string, fallback = false): boolean => {
	const value = tag?.getAttribute(attribute);

	if (value === null || value === undefined) {
		return fallback;
	}

	return value === 'true' || value === '1';
};

const text = (tag: Element | null, attribute: string, fallback = ''): string => tag?.getAttribute(attribute) ?? fallback;

/**
 * Attributes of the page script tag that hold JSON payloads, keyed by the name used in `page`.
 */
const PAGE_PAYLOADS: Record<string, string> = {
	woocommerce: 'woocommerce-data',
	dashboard: 'dashboard-data',
	postStatuses: 'post_statuses',
	postTypes: 'post_types',
	mimeTypes: 'mime_types',
	plugins: 'plugins',
};

export const readWpData = (mainSelector = '#fd-script', pageSelector?: string): WpData => {
	const main = typeof document === 'undefined' ? null : document.querySelector(mainSelector);
	const page = pageSelector && typeof document !== 'undefined' ? document.querySelector(pageSelector) : null;

	const currentUser = json<CurrentUser | null>(main, 'current-user', null);
	const allcaps = json<Record<string, boolean> | null>(main, 'user-allcaps', null);

	if (allcaps) {
		// The capability map is only needed once; drop it from the DOM after reading.
		main?.removeAttribute('user-allcaps');
	}

	const pageData: Record<string, unknown> = {};

	// The main tag carries post types and statuses for every screen; a page tag may narrow
	// them to what that screen is about, so it is read last and wins.
	[main, page].forEach((tag) => {
		if (!tag) {
			return;
		}

		Object.entries(PAGE_PAYLOADS).forEach(([key, attribute]) => {
			const value = json<unknown>(tag, attribute, null);

			if (value !== null) {
				pageData[key] = value;
			}
		});

		if (tag.hasAttribute('supports_categories')) {
			pageData.supportsCategories = bool(tag, 'supports_categories');
		}

		if (tag.hasAttribute('supports_tags')) {
			pageData.supportsTags = bool(tag, 'supports_tags');
		}
	});

	return {
		pluginBase: text(main, 'plugin-base'),
		restBase: text(main, 'rest-base'),
		restNonce: text(main, 'rest-nonce'),
		adminUrl: text(main, 'admin-url'),
		loginUrl: text(main, 'login-url'),
		siteUrl: text(main, 'site-url'),
		userId: Number.parseInt(text(main, 'user-id', '0'), 10) || 0,
		userName: text(main, 'user-name'),
		userEmail: text(main, 'user-email'),
		userRoles: json<string[]>(main, 'user-roles', []),
		canManageOptions: bool(main, 'can-manage-options'),
		currentUser: currentUser && allcaps ? { ...currentUser, allcaps } : currentUser,
		settings: json<PluginSettings>(main, 'flexify-dashboard-settings', {}),
		page: pageData,
	};
};
