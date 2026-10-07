import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keep a set of filters in the address bar so the screen can be reloaded, bookmarked and shared.
 *
 * Values equal to the default are left out of the query, which keeps the URL short and makes
 * "no filters" look the same however the user got there.
 */

export type FilterValues = Record<string, string | number>;

export const useQueryFilters = <T extends FilterValues>(defaults: T) => {
	const [searchParams, setSearchParams] = useSearchParams();

	const filters = useMemo(() => {
		const result = { ...defaults };

		(Object.keys(defaults) as (keyof T)[]).forEach((key) => {
			const value = searchParams.get(String(key));

			if (value === null) {
				return;
			}

			result[key] = (typeof defaults[key] === 'number' ? Number(value) || defaults[key] : value) as T[keyof T];
		});

		return result;
	}, [defaults, searchParams]);

	const setFilters = useCallback(
		(patch: Partial<T>) => {
			const next = { ...filters, ...patch };

			setSearchParams(
				() => {
					const params = new URLSearchParams();

					(Object.keys(next) as (keyof T)[]).forEach((key) => {
						const value = next[key];

						if (value === '' || value === null || value === undefined) {
							return;
						}

						if (String(value) === String(defaults[key])) {
							return;
						}

						params.set(String(key), String(value));
					});

					return params;
				},
				{ replace: true }
			);
		},
		[defaults, filters, setSearchParams]
	);

	const resetFilters = useCallback((keep: Partial<T> = {}) => setFilters({ ...defaults, ...keep }), [defaults, setFilters]);

	return { filters, setFilters, resetFilters };
};
