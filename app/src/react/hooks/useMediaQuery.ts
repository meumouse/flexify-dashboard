import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query matches, as state.
 *
 * Layout belongs in CSS, and nearly all of it is there. This is for the cases where the two
 * layouts are different markup rather than the same markup rearranged — a table and a list of
 * cards — and rendering both to hide one would put every row in the page twice.
 *
 * The value is read while rendering, so the first paint is already right; there is no flash
 * of the wide layout on a phone. Where `matchMedia` does not exist, such as jsdom, the answer
 * is always `false` and the wide layout is what gets rendered and tested.
 */
export const useMediaQuery = (query: string): boolean =>
	useSyncExternalStore(
		(onChange) => {
			const media = window.matchMedia?.(query);

			media?.addEventListener('change', onChange);

			return () => media?.removeEventListener('change', onChange);
		},
		() => window.matchMedia?.(query).matches ?? false,
		() => false
	);
