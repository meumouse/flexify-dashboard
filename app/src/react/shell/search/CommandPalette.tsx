import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { COMMAND_PATTERNS, STATUS_BADGE_CLASSES, exampleSearches, statusLabel } from '@/react/shell/search/commands';
import { useGlobalSearch, type SearchResult } from '@/react/shell/search/useGlobalSearch';
import { useQuickActions, type QuickAction } from '@/react/shell/search/useQuickActions';
import { useSearchHistory } from '@/react/shell/search/useSearchHistory';
import { Icon, Modal, Spinner } from '@/react/ui';
import type { MenuItem } from '@/react/shell/menu/types';

/**
 * Search anything in the admin: content, menu entries and the actions the palette can run.
 *
 * One flat list backs the keyboard: whatever is highlighted is what Enter opens, no matter
 * which group it is shown under.
 */

type Entry =
	| { kind: 'result'; result: SearchResult }
	| { kind: 'action'; action: QuickAction };

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	menu: MenuItem[];
};

const groupLabels = (): Record<string, string> => ({
	menu: __('Admin menu'),
	recent: __('Recently opened'),
	frequent: __('Frequently used'),
	quickActions: __('Actions'),
});

export const CommandPalette = ({ open, onOpenChange, menu }: Props) => {
	const { query, setQuery, parsed, grouped, loading, categoryName } = useGlobalSearch(menu);
	const { filterActions } = useQuickActions();
	const { history, recent, frequent, addToHistory, clearHistory, trackAccess } = useSearchHistory();

	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const actions = filterActions(parsed.cleanQuery, parsed.filter);
	const showHistoryBuckets = !parsed.cleanQuery && !parsed.filter;

	/** Everything the arrows walk through, in the order it appears. */
	const entries = useMemo<Entry[]>(() => {
		const list: Entry[] = actions.map((action) => ({ kind: 'action', action }));

		Object.values(grouped).forEach((results) => results.forEach((result) => list.push({ kind: 'result', result })));

		if (showHistoryBuckets) {
			recent.forEach((item) => list.push({ kind: 'result', result: { ...item, category: 'recent' } }));
			frequent.forEach((item) => list.push({ kind: 'result', result: { ...item, category: 'frequent' } }));
		}

		return list;
	}, [actions, frequent, grouped, recent, showHistoryBuckets]);

	useEffect(() => setActiveIndex(0), [query]);

	useEffect(() => {
		if (open) {
			setQuery('');
			setActiveIndex(0);
			window.setTimeout(() => inputRef.current?.focus(), 50);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	// Keep the highlighted row in sight while the arrows move down a long list.
	useEffect(() => {
		listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex]);

	const open_ = (entry: Entry) => {
		if (entry.kind === 'action') {
			onOpenChange(false);
			entry.action.run();

			return;
		}

		const { result } = entry;
		trackAccess({ id: result.id, category: result.category, name: result.name, url: result.url });
		addToHistory(parsed.cleanQuery);
		onOpenChange(false);
		window.location.href = result.url;
	};

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();

			if (!entries.length) {
				return;
			}

			setActiveIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length);

			return;
		}

		if (event.key === 'Enter' && entries[activeIndex]) {
			event.preventDefault();
			open_(entries[activeIndex]);
		}
	};

	const indexOf = (entry: Entry) =>
		entries.findIndex((candidate) =>
			entry.kind === 'action'
				? candidate.kind === 'action' && candidate.action.id === entry.action.id
				: candidate.kind === 'result' && candidate.result.id === entry.result.id && candidate.result.category === entry.result.category
		);

	const row = (entry: Entry, key: string) => {
		const index = indexOf(entry);
		const active = index === activeIndex;
		const isAction = entry.kind === 'action';

		return (
			<button
				key={key}
				type="button"
				data-active={active}
				className={cn(
					'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors',
					active ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
				)}
				onMouseEnter={() => setActiveIndex(index)}
				onClick={() => open_(entry)}
			>
				<Icon name={isAction ? entry.action.icon : 'arrow_right'} className="shrink-0 text-theme-md text-gray-400" />
				{/* Menu results carry markup that shows the parent before the child. */}
				<span className="min-w-0 flex-1 truncate text-theme-sm" dangerouslySetInnerHTML={{ __html: isAction ? entry.action.name : entry.result.name }} />
				{!isAction && entry.result.status && STATUS_BADGE_CLASSES[entry.result.status] ? (
					<span className={cn('shrink-0 rounded-full px-2 py-0.5 text-theme-xs', STATUS_BADGE_CLASSES[entry.result.status])}>{statusLabel(entry.result.status)}</span>
				) : null}
			</button>
		);
	};

	const section = (title: string, children: React.ReactNode) => (
		<div className="mb-2">
			<p className="px-3 pb-1 text-theme-xs uppercase tracking-wide text-gray-400">{title}</p>
			{children}
		</div>
	);

	const labels = groupLabels();
	const hasAnything = entries.length > 0;

	return (
		<Modal open={open} onOpenChange={onOpenChange} size="lg" hideClose bodyClassName="p-0">
			<div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800">
				<Icon name="search" className="shrink-0 text-theme-xl text-gray-400" />
				<input
					ref={inputRef}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={onKeyDown}
					type="text"
					className="h-14 w-full bg-transparent text-theme-md text-gray-800 outline-hidden placeholder:text-gray-400 dark:text-white/90"
					placeholder={__('Search content, menus and actions…')}
					aria-label={__('Search')}
				/>
				{loading ? <Spinner className="h-4 w-4 text-gray-400" /> : null}
				<kbd className="hidden shrink-0 rounded-sm border border-gray-200 px-1.5 py-0.5 text-theme-xs text-gray-400 dark:border-gray-700 sm:block">esc</kbd>
			</div>

			<div ref={listRef} className="custom-scrollbar max-h-[60vh] overflow-y-auto p-2">
				{parsed.filter === 'help' ? (
					section(
						__('Commands'),
						<ul className="space-y-1 px-3 py-1">
							{Object.entries(COMMAND_PATTERNS).map(([prefix, filter]) => (
								<li key={prefix} className="flex items-center gap-3 text-theme-sm text-gray-600 dark:text-gray-400">
									<code className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-theme-xs dark:bg-gray-800">{prefix}</code>
									{filter === 'quickActions' ? __('Quick actions') : filter === 'help' ? __('View commands') : sprintf(__('Only %s'), filter)}
								</li>
							))}
						</ul>
					)
				) : null}

				{actions.length ? section(labels.quickActions, actions.map((action) => row({ kind: 'action', action }, `action-${action.id}`))) : null}

				{Object.entries(grouped).map(([category, results]) =>
					results.length ? section(labels[category] ?? categoryName(category), results.map((result) => row({ kind: 'result', result }, `${category}-${result.id}`))) : null
				)}

				{showHistoryBuckets && recent.length ? section(labels.recent, recent.map((item) => row({ kind: 'result', result: { ...item, category: 'recent' } }, `recent-${item.id}`))) : null}

				{showHistoryBuckets && frequent.length ? section(labels.frequent, frequent.map((item) => row({ kind: 'result', result: { ...item, category: 'frequent' } }, `frequent-${item.id}`))) : null}

				{showHistoryBuckets && history.length ? (
					<div className="mb-2">
						<div className="flex items-center justify-between px-3 pb-1">
							<p className="text-theme-xs uppercase tracking-wide text-gray-400">{__('Recent searches')}</p>
							<button type="button" className="text-theme-xs text-gray-400 hover:text-error-500" onClick={clearHistory}>
								{__('Clear')}
							</button>
						</div>
						<div className="flex flex-wrap gap-2 px-3">
							{history.map((entry) => (
								<button
									key={entry.query}
									type="button"
									className="rounded-full bg-gray-100 px-3 py-1 text-theme-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
									onClick={() => setQuery(entry.query)}
								>
									{entry.query}
								</button>
							))}
						</div>
					</div>
				) : null}

				{!hasAnything && !loading ? (
					<div className="px-3 py-10 text-center">
						{parsed.cleanQuery ? (
							<>
								<Icon name="search_off" className="mx-auto mb-2 text-title-xs text-gray-300" />
								<p className="text-theme-sm text-gray-500 dark:text-gray-400">{sprintf(__('Nothing found for “%s”.'), parsed.cleanQuery)}</p>
							</>
						) : (
							<>
								<p className="mb-3 text-theme-sm text-gray-500 dark:text-gray-400">{__('Type to search, or start with a command:')}</p>
								<div className="flex flex-wrap justify-center gap-2">
									{exampleSearches().map((example) => (
										<button
											key={example.query}
											type="button"
											className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-theme-xs text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
											onClick={() => setQuery(`${example.query} `)}
										>
											<Icon name={example.icon} className="text-theme-sm" />
											{example.label}
										</button>
									))}
								</div>
							</>
						)}
					</div>
				) : null}
			</div>
		</Modal>
	);
};
