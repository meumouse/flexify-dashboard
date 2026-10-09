import { useCallback, useEffect, useState } from 'react';

/**
 * Table, sidebar or calendar, remembered between visits.
 *
 * The key is the one the Vue screen uses, so whichever screen the site is on the choice is the
 * same. The sidebar needs room for a list and a page side by side, so a narrow window falls
 * back to the table on its own.
 */

const KEY = 'flexify-dashboard-posts-view-mode';
const MIN_WIDTH = 1024;

export type ViewMode = 'table' | 'sidebar' | 'calendar';

const stored = (): ViewMode => {
	try {
		const value = window.localStorage.getItem(KEY);

		return value === 'sidebar' || value === 'calendar' ? value : 'table';
	} catch {
		return 'table';
	}
};

export const useViewMode = (): [ViewMode, (mode: ViewMode) => void] => {
	const [mode, setMode] = useState<ViewMode>(() => {
		const initial = stored();

		return initial === 'sidebar' && window.innerWidth < MIN_WIDTH ? 'table' : initial;
	});

	const change = useCallback((next: ViewMode) => {
		setMode(next);

		try {
			window.localStorage.setItem(KEY, next);
		} catch {
			// Private windows refuse to store anything; the choice lasts for this visit only.
		}
	}, []);

	useEffect(() => {
		const onResize = () => {
			if (window.innerWidth < MIN_WIDTH) {
				setMode((current) => (current === 'sidebar' ? 'table' : current));
			}
		};

		window.addEventListener('resize', onResize);

		return () => window.removeEventListener('resize', onResize);
	}, []);

	return [mode, change];
};
