import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRest, useWpData } from '@/react/app/WpDataProvider';
import { applyDirectMatches, processMenu } from '@/react/shell/menu/parse';
import type { DashIcon, MenuItem } from '@/react/shell/menu/types';

/**
 * Loads the admin menu: the native one parsed from the DOM, then the custom menu the site may
 * have published for this user. The result is cached per user so later screens render at once.
 */

const CACHE_MAX_AGE = 60 * 60 * 1000;
const NO_MENUS = 'no_menus';

type RemoteMenu = {
	meta?: {
		menu_items?: MenuItem[];
		menu_settings?: {
			applies_to_everyone?: boolean;
			includes?: { type: string; id?: number; value?: string }[];
			excludes?: { type: string; id?: number; value?: string }[];
		};
	};
};

const readCache = (key: string): MenuItem[] | typeof NO_MENUS | null => {
	try {
		const raw = window.localStorage.getItem(key);

		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw) as { value: MenuItem[] | typeof NO_MENUS; timestamp: number };

		if (Date.now() - parsed.timestamp > CACHE_MAX_AGE) {
			window.localStorage.removeItem(key);

			return null;
		}

		return parsed.value;
	} catch {
		window.localStorage.removeItem(key);

		return null;
	}
};

const writeCache = (key: string, value: MenuItem[] | typeof NO_MENUS) => {
	try {
		window.localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
	} catch {
		// Storage can be unavailable; the menu simply gets parsed again next time.
	}
};

/**
 * Pick the published menu that targets this user, by role or by user id.
 */
const matchMenuForUser = (menus: RemoteMenu[], userId: number, roles: string[]): MenuItem[] | null => {
	for (const remote of menus) {
		const items = remote.meta?.menu_items;
		const settings = remote.meta?.menu_settings;

		if (!Array.isArray(items) || !items.length) {
			continue;
		}

		if (settings?.applies_to_everyone) {
			return items;
		}

		const includes = settings?.includes ?? [];
		const excludes = settings?.excludes ?? [];

		const matchedUser = includes.some((entry) => entry.type === 'user' && entry.id === userId);
		const matchedRole = includes.some((entry) => entry.type === 'role' && roles.includes(String(entry.value)));
		const excludedUser = excludes.some((entry) => entry.type === 'user' && entry.id === userId);
		const excludedRole = excludes.some((entry) => entry.type === 'role' && roles.includes(String(entry.value)));

		if ((matchedUser || matchedRole) && !excludedUser && !excludedRole) {
			return items;
		}
	}

	return null;
};

/**
 * Drop items the site no longer has and append the ones it gained, so a cached custom menu
 * never hides a plugin that was installed since.
 */
export const reconcileMenu = (custom: MenuItem[], native: MenuItem[]): MenuItem[] => {
	const nativeById = new Map(native.map((item) => [item.id, item]));
	const kept = custom.filter((item) => item.custom || nativeById.has(item.id));

	const merged = kept.map((item) => {
		const source = nativeById.get(item.id);

		if (!source) {
			return item;
		}

		const customSub = item.submenu ?? [];
		const nativeSub = source.submenu ?? [];
		const customSubIds = new Set(customSub.map((entry) => entry.id));

		return {
			...source,
			...item,
			notifications: source.notifications,
			submenu: [...customSub.filter((entry) => entry.custom || nativeSub.some((native) => native.id === entry.id)), ...nativeSub.filter((entry) => !customSubIds.has(entry.id))],
		};
	});

	const keptIds = new Set(merged.map((item) => item.id));

	return applyDirectMatches([...merged, ...native.filter((item) => !keptIds.has(item.id) && item.type !== 'separator')]);
};

export const useAdminMenu = () => {
	const { userId, userRoles, settings } = useWpData();
	const rest = useRest();

	const [nativeMenu, setNativeMenu] = useState<MenuItem[]>([]);
	const [menu, setMenu] = useState<MenuItem[]>([]);
	const [dashIcons, setDashIcons] = useState<DashIcon[]>([]);
	const [loading, setLoading] = useState(true);

	const cacheKey = `flexify_dashboard_menu_${userId}_${(settings as { menu_cache_key?: string }).menu_cache_key ?? ''}`;

	useEffect(() => {
		const parsed = processMenu(document.getElementById('adminmenumain') ?? document.body);

		setNativeMenu(parsed.menu);
		setDashIcons(parsed.dashIcons);

		const cached = readCache(cacheKey);

		if (cached === NO_MENUS || (Array.isArray(cached) && !cached.length)) {
			setMenu(parsed.menu);
			setLoading(false);

			return;
		}

		if (Array.isArray(cached)) {
			setMenu(reconcileMenu(cached, parsed.menu));
			setLoading(false);

			return;
		}

		let active = true;

		rest
			.list<RemoteMenu>('wp/v2/flexify-dashboard-menus', { per_page: 100, status: 'publish' })
			.then((response) => {
				if (!active) {
					return;
				}

				const custom = matchMenuForUser(response.data ?? [], userId, userRoles);

				if (custom) {
					writeCache(cacheKey, custom);
					setMenu(reconcileMenu(custom, parsed.menu));
				} else {
					writeCache(cacheKey, NO_MENUS);
					setMenu(parsed.menu);
				}
			})
			.catch(() => {
				if (active) {
					setMenu(parsed.menu);
				}
			})
			.finally(() => {
				if (active) {
					setLoading(false);
				}
			});

		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cacheKey]);

	/** Open or close the submenu of an item. */
	const toggleOpen = useCallback((id: string) => setMenu((current) => current.map((item) => (item.id === id ? { ...item, open: !item.open } : item))), []);

	const visibleMenu = useMemo(
		() =>
			menu
				.filter((item) => !item.settings?.hidden)
				.map((item) => ({ ...item, open: item.open ?? false, submenu: item.submenu?.filter((entry) => !entry.settings?.hidden) })),
		[menu]
	);

	return { menu: visibleMenu, nativeMenu, dashIcons, loading, toggleOpen };
};
