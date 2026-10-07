import { useCallback, useEffect, useState } from 'react';
import type { MenuItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * Menu favourites, pinned above the menu. They are a per-browser preference, so they live in
 * local storage and are shared with the Vue sidebar through the same key.
 */

const STORAGE_KEY = 'fd-menu-favorites';

export type Favorite = (MenuItem | SubMenuItem) & { settings?: { name?: string; icon?: string } };

const read = (): Favorite[] => {
	try {
		const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');

		return Array.isArray(stored) ? (stored as Favorite[]) : [];
	} catch {
		return [];
	}
};

export const useFavorites = () => {
	const [favorites, setFavorites] = useState<Favorite[]>(read);

	// Another tab (or the Vue sidebar) may change the list.
	useEffect(() => {
		const onStorage = (event: StorageEvent) => {
			if (event.key === STORAGE_KEY) {
				setFavorites(read());
			}
		};

		window.addEventListener('storage', onStorage);

		return () => window.removeEventListener('storage', onStorage);
	}, []);

	const persist = useCallback((next: Favorite[]) => {
		setFavorites(next);

		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			// Keep the choice in memory when storage is blocked.
		}
	}, []);

	const add = useCallback(
		(item: Favorite) => {
			if (!item?.url || favorites.some((favorite) => favorite.url === item.url)) {
				return;
			}

			persist([...favorites, { ...item, settings: { icon: 'link', ...item.settings, name: item.settings?.name || item.name || '' } }]);
		},
		[favorites, persist]
	);

	const remove = useCallback((url: string) => persist(favorites.filter((favorite) => favorite.url !== url)), [favorites, persist]);

	const isFavorite = useCallback((url?: string) => Boolean(url) && favorites.some((favorite) => favorite.url === url), [favorites]);

	return { favorites, add, remove, isFavorite };
};
