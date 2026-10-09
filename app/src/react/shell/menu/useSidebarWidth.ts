import { useCallback, useState } from 'react';

/**
 * The width of the sidebar when the site lets it be dragged (`sidebar_resizable`).
 *
 * Kept per browser: it follows the screen it was set on, and a person with a laptop and a wide
 * monitor wants two different widths.
 */

export const DEFAULT_WIDTH = 290;
export const MIN_WIDTH = 220;
export const MAX_WIDTH = 400;

const KEY = 'fd-sidebar-width';

export const clampSidebarWidth = (value: number): number => (Number.isFinite(value) ? Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value))) : DEFAULT_WIDTH);

const read = (): number => {
	try {
		const stored = Number(window.localStorage.getItem(KEY));

		return stored ? clampSidebarWidth(stored) : DEFAULT_WIDTH;
	} catch {
		return DEFAULT_WIDTH;
	}
};

export const useSidebarWidth = (enabled: boolean) => {
	const [width, setWidth] = useState(() => (enabled ? read() : DEFAULT_WIDTH));

	/** Moves the edge while dragging; nothing is stored until `commit`. */
	const resize = useCallback((next: number) => setWidth(clampSidebarWidth(next)), []);

	const commit = useCallback((next: number) => {
		const value = clampSidebarWidth(next);

		setWidth(value);

		try {
			window.localStorage.setItem(KEY, String(value));
		} catch {
			// The width then lasts for this visit only.
		}
	}, []);

	return { width: enabled ? width : DEFAULT_WIDTH, resize, commit };
};
