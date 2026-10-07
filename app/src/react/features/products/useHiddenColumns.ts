import { useCallback, useState } from 'react';

/**
 * Column visibility is a per-browser preference, so it lives in local storage and never
 * reaches the server. Storage can be unavailable (private mode), in which case the choice
 * simply lasts for this visit.
 */
export const useHiddenColumns = (storageKey: string, toggleable: string[]) => {
	const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
		try {
			const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) || '[]');

			return Array.isArray(stored) ? stored.filter((key): key is string => typeof key === 'string' && toggleable.includes(key)) : [];
		} catch {
			return [];
		}
	});

	const toggleColumn = useCallback(
		(key: string) => {
			setHiddenColumns((current) => {
				const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];

				try {
					window.localStorage.setItem(storageKey, JSON.stringify(next));
				} catch {
					// Keep the choice in memory when storage is blocked.
				}

				return next;
			});
		},
		[storageKey]
	);

	return { hiddenColumns, toggleColumn };
};
