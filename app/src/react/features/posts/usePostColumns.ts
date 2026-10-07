import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PostColumn } from '@/react/features/posts/types';

/**
 * Which columns show, and in what order.
 *
 * The site decides which columns exist — a plugin can add one at any time — so the stored
 * preference is a list of keys, applied over whatever the server sent. Keys that are gone
 * are dropped and new ones arrive visible, at the end. The storage keys are the ones the
 * Vue screen uses, so both agree while they coexist.
 */

type Stored = { key: string; active: boolean }[];

const storageKey = (postType: string, suffix: string) => `flexify_dashboard_${postType}_${suffix}`;

const read = <T,>(key: string, fallback: T): T => {
	try {
		const value = window.localStorage.getItem(key);

		return value ? (JSON.parse(value) as T) : fallback;
	} catch {
		return fallback;
	}
};

const write = (key: string, value: unknown) => {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Private windows refuse to store anything; the preference is simply not remembered.
	}
};

export const applyStoredColumns = (columns: PostColumn[], stored: Stored): PostColumn[] => {
	const position = new Map(stored.map((item, index) => [item.key, index]));
	const active = new Map(stored.map((item) => [item.key, item.active]));

	return [...columns]
		.map((column) => ({ ...column, active: active.get(column.key) ?? column.active }))
		.sort((left, right) => (position.get(left.key) ?? Number.MAX_SAFE_INTEGER) - (position.get(right.key) ?? Number.MAX_SAFE_INTEGER));
};

export const usePostColumns = (postType: string, fromServer: PostColumn[]) => {
	const [stored, setStored] = useState<Stored>(() => read<Stored>(storageKey(postType, 'columns'), []));
	const [expandAll, setExpandAll] = useState<boolean>(() => read<boolean>(storageKey(postType, 'expand_all'), false));

	useEffect(() => {
		setStored(read<Stored>(storageKey(postType, 'columns'), []));
		setExpandAll(read<boolean>(storageKey(postType, 'expand_all'), false));
	}, [postType]);

	const columns = useMemo(() => applyStoredColumns(fromServer, stored), [fromServer, stored]);

	const persist = useCallback(
		(next: PostColumn[]) => {
			const value = next.map((column) => ({ key: column.key, active: column.active }));

			setStored(value);
			write(storageKey(postType, 'columns'), value);
		},
		[postType]
	);

	const toggleColumn = useCallback((key: string) => persist(columns.map((column) => (column.key === key ? { ...column, active: !column.active } : column))), [columns, persist]);

	const moveColumn = useCallback(
		(key: string, direction: -1 | 1) => {
			const index = columns.findIndex((column) => column.key === key);
			const target = index + direction;

			if (index < 0 || target < 0 || target >= columns.length) {
				return;
			}

			const next = [...columns];
			[next[index], next[target]] = [next[target], next[index]];

			persist(next);
		},
		[columns, persist]
	);

	const changeExpandAll = useCallback(
		(value: boolean) => {
			setExpandAll(value);
			write(storageKey(postType, 'expand_all'), value);
		},
		[postType]
	);

	return { columns, toggleColumn, moveColumn, expandAll, setExpandAll: changeExpandAll };
};
