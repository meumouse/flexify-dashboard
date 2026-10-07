import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCan, useWpData } from '@/react/app/WpDataProvider';
import { CATEGORY_ALIASES, dashboardRegistry } from '@/shared/dashboard/registry.js';
import type { RenderableCard } from '@/react/ui';

/**
 * The cards the dashboard shows, in the order and at the widths this user arranged them.
 *
 * The registry is shared with the Vue dashboard and with any plugin that registers a card, so
 * it is used as it is; only the layout on top of it lives here.
 */

const LAYOUT_KEY = 'flexify-dashboard:dashboard-layout:v1';
const VISIBILITY_KEY = 'flexify-dashboard:dashboard-visibility:v2';

export const GRID_COLUMNS = 12;
export const MIN_CARD_WIDTH = 3;
export const MAX_CARD_WIDTH = 12;

export type DashboardCard = RenderableCard & {
	metadata: {
		id: string;
		title?: string;
		width: number;
		mobileWidth: number;
		[key: string]: unknown;
	};
};

export type DashboardCategory = {
	id: string;
	label: string;
};

type RegistrySnapshot = {
	categories: DashboardCategory[];
	runtimeCardsByCategory: Record<string, DashboardCard[]>;
};

type StoredLayout = {
	categories?: Record<string, { order?: string[]; widths?: Record<string, number> }>;
};

const read = <T,>(key: string, fallback: T): T => {
	try {
		const stored = window.localStorage.getItem(key);

		return stored ? (JSON.parse(stored) as T) : fallback;
	} catch {
		return fallback;
	}
};

const write = (key: string, value: unknown) => {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// The arrangement then lasts for this visit only.
	}
};

export const clampWidth = (width: unknown, fallback = 4, min = MIN_CARD_WIDTH): number => {
	const parsed = Number.parseInt(String(width), 10);

	return Number.isNaN(parsed) ? fallback : Math.min(MAX_CARD_WIDTH, Math.max(min, parsed));
};

/** Apply the saved order and widths over what the registry offers. */
export const applyStoredLayout = (cardsByCategory: Record<string, DashboardCard[]>, stored: StoredLayout): Record<string, DashboardCard[]> => {
	const result: Record<string, DashboardCard[]> = {};

	Object.entries(cardsByCategory).forEach(([category, cards]) => {
		const layout = stored.categories?.[category] ?? {};
		const byId = new Map(
			cards.map((card) => [
				card.metadata.id,
				{ ...card, metadata: { ...card.metadata, width: clampWidth(card.metadata.width, 4), mobileWidth: clampWidth(card.metadata.mobileWidth ?? 12, 12, 1) } },
			])
		);

		const ordered: DashboardCard[] = [];

		(layout.order ?? []).forEach((id) => {
			const card = byId.get(id);

			if (card) {
				ordered.push(card);
				byId.delete(id);
			}
		});

		// Cards the site gained since the layout was saved go to the end.
		byId.forEach((card) => ordered.push(card));

		result[category] = ordered.map((card) => {
			const savedWidth = layout.widths?.[card.metadata.id];

			return savedWidth == null ? card : { ...card, metadata: { ...card.metadata, width: clampWidth(savedWidth, card.metadata.width) } };
		});
	});

	return result;
};

export const useDashboardLayout = () => {
	const can = useCan();
	const { page } = useWpData();

	const [snapshot, setSnapshot] = useState<RegistrySnapshot>({ categories: [], runtimeCardsByCategory: {} });
	const [layout, setLayout] = useState<Record<string, DashboardCard[]>>({});
	const [hidden, setHidden] = useState<Record<string, string[]>>(() => read(VISIBILITY_KEY, {}));
	const [category, setCategory] = useState<string | null>(null);

	useEffect(() => {
		const sync = (next: RegistrySnapshot) => {
			setSnapshot(next);
			setLayout(applyStoredLayout(next.runtimeCardsByCategory ?? {}, read<StoredLayout>(LAYOUT_KEY, {})));
		};

		sync(dashboardRegistry.getRegistry() as RegistrySnapshot);

		return dashboardRegistry.subscribe(sync as (snapshot: unknown) => void);
	}, []);

	// The category can be picked in the address bar, which is how a link to a tab works.
	useEffect(() => {
		if (category || !snapshot.categories.length) {
			return;
		}

		const asked = new URLSearchParams(window.location.search).get('dashboard_category');
		const normalized = (CATEGORY_ALIASES as Record<string, string>)[asked ?? ''] ?? asked;

		setCategory(snapshot.categories.some((entry) => entry.id === normalized) ? (normalized as string) : snapshot.categories[0].id);
	}, [category, snapshot.categories]);

	const activePlugins = (page.plugins as { path?: string; slug?: string }[] | undefined) ?? null;

	/** A card only renders when the user may see it and the plugins it needs are active. */
	const canRender = useCallback(
		(card: DashboardCard) => {
			if (!card.component) {
				return false;
			}

			const capabilities = card.metadata.requiresCapabilities ?? card.metadata.requires_capabilities;

			if (Array.isArray(capabilities) && capabilities.length && !capabilities.some((capability) => can(String(capability)))) {
				return false;
			}

			const plugins = card.metadata.requiresPlugins ?? card.metadata.requires_plugins;

			if (Array.isArray(plugins) && plugins.length && Array.isArray(activePlugins)) {
				const active = new Set(activePlugins.flatMap((plugin) => [plugin.path, plugin.slug].filter(Boolean) as string[]));

				return (plugins as string[]).every((plugin) => active.has(plugin));
			}

			return true;
		},
		[activePlugins, can]
	);

	const cards = useMemo(() => (category ? (layout[category] ?? []).filter(canRender) : []), [canRender, category, layout]);
	const hiddenIds = useMemo(() => new Set(category ? (hidden[category] ?? []) : []), [category, hidden]);
	const visibleCards = useMemo(() => cards.filter((card) => !hiddenIds.has(card.metadata.id)), [cards, hiddenIds]);

	const persistLayout = useCallback((next: Record<string, DashboardCard[]>) => {
		write(LAYOUT_KEY, {
			categories: Object.fromEntries(
				Object.entries(next).map(([id, entries]) => [
					id,
					{ order: entries.map((card) => card.metadata.id), widths: Object.fromEntries(entries.map((card) => [card.metadata.id, clampWidth(card.metadata.width, 4)])) },
				])
			),
		});
	}, []);

	const updateCategoryCards = useCallback(
		(updater: (cards: DashboardCard[]) => DashboardCard[]) => {
			if (!category) {
				return;
			}

			setLayout((current) => {
				const next = { ...current, [category]: updater(current[category] ?? []) };
				persistLayout(next);

				return next;
			});
		},
		[category, persistLayout]
	);

	const move = useCallback(
		(fromId: string, toId: string) =>
			updateCategoryCards((entries) => {
				const from = entries.findIndex((card) => card.metadata.id === fromId);
				const to = entries.findIndex((card) => card.metadata.id === toId);

				if (from < 0 || to < 0 || from === to) {
					return entries;
				}

				const next = [...entries];
				next.splice(to, 0, next.splice(from, 1)[0]);

				return next;
			}),
		[updateCategoryCards]
	);

	const resize = useCallback(
		(id: string, width: number) => updateCategoryCards((entries) => entries.map((card) => (card.metadata.id === id ? { ...card, metadata: { ...card.metadata, width: clampWidth(width, card.metadata.width) } } : card))),
		[updateCategoryCards]
	);

	const setVisible = useCallback(
		(id: string, visible: boolean) => {
			if (!category) {
				return;
			}

			setHidden((current) => {
				const ids = new Set(current[category] ?? []);
				visible ? ids.delete(id) : ids.add(id);

				const next = { ...current, [category]: [...ids] };
				write(VISIBILITY_KEY, next);

				return next;
			});
		},
		[category]
	);

	return {
		categories: snapshot.categories,
		category,
		setCategory,
		cards,
		visibleCards,
		hiddenIds,
		move,
		resize,
		setVisible,
	};
};
