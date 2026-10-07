import { useCallback, useState } from 'react';

/**
 * What the palette remembers between visits: the queries that were typed, the items that were
 * opened and the ones that are opened often. Shares the storage keys with the Vue search.
 */

const HISTORY_KEY = 'fd-search-history';
const ACCESSED_KEY = 'fd-recently-accessed';
const FREQUENT_KEY = 'fd-frequently-used';

const MAX_HISTORY = 10;
const MAX_RECENT = 5;
const MAX_FREQUENT = 5;

export type HistoryEntry = { query: string; timestamp: number };

export type AccessedItem = {
	id: string | number;
	category: string;
	name: string;
	url: string;
	timestamp: number;
	accessCount: number;
};

const read = <T,>(key: string): T[] => {
	try {
		const stored: unknown = JSON.parse(window.localStorage.getItem(key) || '[]');

		return Array.isArray(stored) ? (stored as T[]) : [];
	} catch {
		return [];
	}
};

const write = (key: string, value: unknown) => {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// The list then lasts for this visit only.
	}
};

export const useSearchHistory = () => {
	const [history, setHistory] = useState<HistoryEntry[]>(() => read<HistoryEntry>(HISTORY_KEY));
	const [recent, setRecent] = useState<AccessedItem[]>(() => read<AccessedItem>(ACCESSED_KEY));
	const [frequent, setFrequent] = useState<AccessedItem[]>(() => read<AccessedItem>(FREQUENT_KEY));

	const addToHistory = useCallback((query: string) => {
		const trimmed = query.trim();

		if (!trimmed) {
			return;
		}

		setHistory((current) => {
			const next = [{ query: trimmed, timestamp: Date.now() }, ...current.filter((entry) => entry.query !== trimmed)].slice(0, MAX_HISTORY);
			write(HISTORY_KEY, next);

			return next;
		});
	}, []);

	const clearHistory = useCallback(() => {
		setHistory([]);
		write(HISTORY_KEY, []);
	}, []);

	const trackAccess = useCallback((item: Omit<AccessedItem, 'timestamp' | 'accessCount'>) => {
		if (!item?.id || !item.category) {
			return;
		}

		setRecent((current) => {
			const next = [{ ...item, timestamp: Date.now(), accessCount: 1 }, ...current.filter((entry) => !(entry.id === item.id && entry.category === item.category))].slice(0, MAX_RECENT);
			write(ACCESSED_KEY, next);

			return next;
		});

		setFrequent((current) => {
			const existing = current.find((entry) => entry.id === item.id && entry.category === item.category);
			const updated = existing
				? current.map((entry) => (entry === existing ? { ...entry, accessCount: entry.accessCount + 1, timestamp: Date.now() } : entry))
				: [...current, { ...item, timestamp: Date.now(), accessCount: 1 }];

			const next = [...updated].sort((a, b) => b.accessCount - a.accessCount).slice(0, MAX_FREQUENT);
			write(FREQUENT_KEY, next);

			return next;
		});
	}, []);

	return { history, recent, frequent, addToHistory, clearHistory, trackAccess };
};
