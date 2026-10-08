import { Fragment, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Checkbox } from '@/react/form/Checkbox';
import { EmptyState } from '@/react/ui/EmptyState';
import { Icon } from '@/react/ui/Icon';
import { Skeleton } from '@/react/ui/Spinner';
import { useMediaQuery } from '@/react/hooks/useMediaQuery';

export type SortState = { key: string; direction: 'asc' | 'desc' };

export type Column<T> = {
	key: string;
	label: string;
	sortable?: boolean;
	align?: 'start' | 'center' | 'end';
	width?: string;
	className?: string;
	headerClassName?: string;
	hidden?: boolean;
	/**
	 * Where this column goes once the table becomes a list of cards, under 640px.
	 *
	 * `title` is the headline — the first labelled column when none says so. `actions` is
	 * pinned to the top right, which is also what a column with no label gets, since there is
	 * nothing to print beside it. `hidden` is dropped. Everything else becomes a label/value
	 * pair in the body.
	 */
	card?: 'title' | 'meta' | 'actions' | 'hidden';
	/** Cell content; defaults to `row[key]` */
	cell?: (row: T, index: number) => ReactNode;
	/** Replaces the header content */
	header?: () => ReactNode;
};

export type RowKey = string | number;

type Props<T> = {
	columns: Column<T>[];
	rows: T[];
	/** Property used as the row key, or a function returning it */
	rowKey?: keyof T | ((row: T, index: number) => RowKey);
	loading?: boolean;
	skeletonRows?: number;
	stickyHeader?: boolean;
	caption?: string;

	selectable?: boolean;
	selected?: RowKey[];
	onSelectedChange?: (selected: RowKey[]) => void;
	/** Buttons shown when rows are selected */
	bulkActions?: (context: { selected: RowKey[]; clear: () => void }) => ReactNode;

	expandable?: boolean | ((row: T) => boolean);
	expanded?: RowKey[];
	onExpandedChange?: (expanded: RowKey[]) => void;
	renderExpanded?: (row: T, index: number) => ReactNode;

	sort?: SortState;
	onSortChange?: (sort: SortState) => void;

	clickableRows?: boolean;
	onRowClick?: (row: T, index: number) => void;
	rowClassName?: string | ((row: T, index: number) => string | undefined);

	emptyIcon?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	empty?: ReactNode;
};

const alignClass = (align?: Column<unknown>['align']) =>
	align === 'end' ? 'text-end justify-end' : align === 'center' ? 'text-center justify-center' : 'text-start justify-start';

export const DataTable = <T,>({
	columns,
	rows,
	rowKey = 'id' as keyof T,
	loading = false,
	skeletonRows = 8,
	stickyHeader = false,
	caption,
	selectable = false,
	selected = [],
	onSelectedChange,
	bulkActions,
	expandable = false,
	expanded = [],
	onExpandedChange,
	renderExpanded,
	sort,
	onSortChange,
	clickableRows = false,
	onRowClick,
	rowClassName,
	emptyIcon = 'inventory',
	emptyTitle,
	emptyDescription,
	empty,
}: Props<T>) => {
	const visibleColumns = columns.filter((column) => !column.hidden);
	const columnCount = visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0);

	// Eight columns in 375px is a horizontal scrollbar and nothing readable, so under `sm`
	// each row is drawn as a card. One tree or the other, never both: rendering both and
	// hiding one would put every row in the page twice, which the cheapest phone pays for.
	const asCards = useMediaQuery('(max-width: 639px)');
	const slotOf = (column: Column<T>): NonNullable<Column<T>['card']> => column.card ?? (column.label ? 'meta' : 'actions');
	const labelled = visibleColumns.filter((column) => slotOf(column) !== 'actions');
	const titleColumn = visibleColumns.find((column) => column.card === 'title') ?? labelled[0];
	const actionColumns = visibleColumns.filter((column) => slotOf(column) === 'actions');
	const metaColumns = labelled.filter((column) => column !== titleColumn && slotOf(column) !== 'hidden');

	const keyOf = (row: T, index: number): RowKey =>
		typeof rowKey === 'function' ? rowKey(row, index) : ((row?.[rowKey] as RowKey | undefined) ?? index);

	const pageKeys = rows.map((row, index) => keyOf(row, index));
	const allSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.includes(key));
	const someSelected = !allSelected && pageKeys.some((key) => selected.includes(key));

	const toggleAll = () =>
		onSelectedChange?.(allSelected ? selected.filter((key) => !pageKeys.includes(key)) : [...new Set([...selected, ...pageKeys])]);

	const toggleRow = (key: RowKey, checked: boolean) =>
		onSelectedChange?.(checked ? [...new Set([...selected, key])] : selected.filter((item) => item !== key));

	const canExpand = (row: T) => (typeof expandable === 'function' ? expandable(row) : expandable);
	const isExpanded = (key: RowKey) => expanded.includes(key);
	const toggleExpanded = (key: RowKey) => onExpandedChange?.(isExpanded(key) ? expanded.filter((item) => item !== key) : [...expanded, key]);

	const toggleSort = (column: Column<T>) => {
		if (!column.sortable) {
			return;
		}

		onSortChange?.({ key: column.key, direction: sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc' });
	};

	const onClickRow = (row: T, index: number, event: MouseEvent<HTMLTableRowElement>) => {
		if (!clickableRows) {
			return;
		}

		if ((event.target as HTMLElement).closest('a, button, input, label, [role="menuitem"], [data-no-row-click]')) {
			return;
		}

		onRowClick?.(row, index);
	};

	return (
		<div className="relative">
			{selectable && selected.length > 0 && bulkActions ? (
				<div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-brand-25 px-5 py-3 dark:border-gray-800 dark:bg-brand-500/[0.08] sm:px-6">
					<span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">{sprintf(__('%s selected'), selected.length)}</span>
					<div className="flex flex-wrap items-center gap-2">{bulkActions({ selected, clear: () => onSelectedChange?.([]) })}</div>
					<button
						type="button"
						className="ms-auto text-theme-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						onClick={() => onSelectedChange?.([])}
					>
						{__('Clear selection')}
					</button>
				</div>
			) : null}

			{asCards ? (
				<CardList
					rows={rows}
					loading={loading}
					skeletonRows={skeletonRows}
					keyOf={keyOf}
					titleColumn={titleColumn}
					metaColumns={metaColumns}
					actionColumns={actionColumns}
					selectable={selectable}
					selected={selected}
					toggleRow={toggleRow}
					canExpand={canExpand}
					isExpanded={isExpanded}
					toggleExpanded={toggleExpanded}
					renderExpanded={renderExpanded}
					clickableRows={clickableRows}
					onRowClick={onRowClick}
					rowClassName={rowClassName}
					empty={empty ?? <EmptyState icon={emptyIcon} title={emptyTitle || __('No items found')} description={emptyDescription} />}
				/>
			) : (
				<div className="max-w-full overflow-x-auto custom-scrollbar">
					<table className="min-w-full">
						{caption ? <caption className="sr-only">{caption}</caption> : null}
						<thead className={cn(stickyHeader && 'sticky top-0 z-10 bg-white dark:bg-gray-900')}>
							<tr className="border-y border-gray-100 dark:border-gray-800">
								{selectable ? (
									<th scope="col" className="w-12 py-3 pe-2 ps-5 sm:ps-6">
										<Checkbox
											size="sm"
											checked={allSelected}
											indeterminate={someSelected}
											disabled={loading || !rows.length}
											aria-label={__('Select all')}
											onCheckedChange={toggleAll}
										/>
									</th>
								) : null}
								{expandable ? (
									<th scope="col" className="w-10 py-3">
										<span className="sr-only">{__('Expand')}</span>
									</th>
								) : null}
								{visibleColumns.map((column, columnIndex) => (
									<th
										key={column.key}
										scope="col"
										aria-sort={column.sortable && sort?.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
										style={column.width ? { width: column.width } : undefined}
										className={cn(
											'whitespace-nowrap px-4 py-3 first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6',
											!selectable && !expandable && columnIndex === 0 && 'ps-5 sm:ps-6',
											column.headerClassName
										)}
									>
										{column.header ? (
											column.header()
										) : column.sortable ? (
											<button
												type="button"
												onClick={() => toggleSort(column)}
												className={cn(
													'group inline-flex w-full items-center gap-1 text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
													alignClass(column.align)
												)}
											>
												{column.label}
												<Icon
													name={sort?.key === column.key ? (sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold'}
													className={cn('text-theme-sm', sort?.key === column.key ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 opacity-60 group-hover:opacity-100')}
												/>
											</button>
										) : (
											<p className={cn('flex text-theme-xs font-medium text-gray-500 dark:text-gray-400', alignClass(column.align))}>{column.label}</p>
										)}
									</th>
								))}
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{loading ? (
								Array.from({ length: skeletonRows }, (_, index) => (
									<tr key={`skeleton-${index}`}>
										{selectable ? (
											<td className="py-4 pe-2 ps-5 sm:ps-6">
												<Skeleton className="h-4 w-4 rounded-sm" />
											</td>
										) : null}
										{expandable ? <td className="py-4" /> : null}
										{visibleColumns.map((column, columnIndex) => (
											<td key={column.key} className="px-4 py-4 first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6">
												<Skeleton className={cn('h-4', columnIndex === 0 ? 'w-48' : 'w-20')} />
											</td>
										))}
									</tr>
								))
							) : rows.length === 0 ? (
								<tr>
									<td colSpan={columnCount}>{empty ?? <EmptyState icon={emptyIcon} title={emptyTitle || __('No items found')} description={emptyDescription} />}</td>
								</tr>
							) : (
								rows.map((row, index) => {
									const key = keyOf(row, index);
									const extraClass = typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName;

									return (
										<Fragment key={key}>
											<tr
												onClick={(event) => onClickRow(row, index, event)}
												className={cn(
													'transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]',
													selectable && selected.includes(key) && 'bg-brand-25 hover:bg-brand-25 dark:bg-brand-500/[0.06] dark:hover:bg-brand-500/[0.06]',
													clickableRows && 'cursor-pointer',
													extraClass
												)}
											>
												{selectable ? (
													<td className="py-3.5 pe-2 ps-5 sm:ps-6">
														<Checkbox
															size="sm"
															checked={selected.includes(key)}
															aria-label={__('Select row')}
															onCheckedChange={(checked) => toggleRow(key, checked)}
														/>
													</td>
												) : null}
												{expandable ? (
													<td className="py-3.5">
														{canExpand(row) ? (
															<button
																type="button"
																aria-expanded={isExpanded(key)}
																aria-label={__('Toggle details')}
																onClick={() => toggleExpanded(key)}
																className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
															>
																<Icon name="chevron_right" className={cn('text-theme-lg transition-transform', isExpanded(key) && 'rotate-90')} />
															</button>
														) : null}
													</td>
												) : null}
												{visibleColumns.map((column) => (
													<td
														key={column.key}
														className={cn(
															'px-4 py-3.5 text-theme-sm text-gray-500 first:ps-5 last:pe-5 dark:text-gray-400 sm:first:ps-6 sm:last:pe-6',
															column.align === 'end' && 'text-end',
															column.align === 'center' && 'text-center',
															column.className
														)}
													>
														{cellOf(column, row, index)}
													</td>
												))}
											</tr>

											{expandable && isExpanded(key) ? (
												<tr className="bg-gray-50/60 dark:bg-white/[0.015]">
													<td colSpan={columnCount} className="px-5 py-4 sm:px-6">
														{renderExpanded?.(row, index)}
													</td>
												</tr>
											) : null}
										</Fragment>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

type CardListProps<T> = {
	rows: T[];
	loading: boolean;
	skeletonRows: number;
	keyOf: (row: T, index: number) => RowKey;
	titleColumn?: Column<T>;
	metaColumns: Column<T>[];
	actionColumns: Column<T>[];
	selectable: boolean;
	selected: RowKey[];
	toggleRow: (key: RowKey, checked: boolean) => void;
	canExpand: (row: T) => boolean;
	isExpanded: (key: RowKey) => boolean;
	toggleExpanded: (key: RowKey) => void;
	renderExpanded?: (row: T, index: number) => ReactNode;
	clickableRows: boolean;
	onRowClick?: (row: T, index: number) => void;
	rowClassName?: string | ((row: T, index: number) => string | undefined);
	empty: ReactNode;
};

const cellOf = <T,>(column: Column<T>, row: T, index: number): ReactNode =>
	column.cell ? column.cell(row, index) : ((row as Record<string, ReactNode>)[column.key] ?? null);

/** The same rows as the table, one card each, for anything narrower than `sm`. */
const CardList = <T,>({
	rows,
	loading,
	skeletonRows,
	keyOf,
	titleColumn,
	metaColumns,
	actionColumns,
	selectable,
	selected,
	toggleRow,
	canExpand,
	isExpanded,
	toggleExpanded,
	renderExpanded,
	clickableRows,
	onRowClick,
	rowClassName,
	empty,
}: CardListProps<T>) => {
	if (loading) {
		return (
			<ul className="divide-y divide-gray-100 dark:divide-gray-800">
				{Array.from({ length: skeletonRows }, (_, index) => (
					<li key={`skeleton-${index}`} className="px-4 py-4">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="mt-2 h-3 w-24" />
					</li>
				))}
			</ul>
		);
	}

	if (rows.length === 0) {
		return <div className="px-4 py-6">{empty}</div>;
	}

	return (
		<ul className="divide-y divide-gray-100 dark:divide-gray-800">
			{rows.map((row, index) => {
				const key = keyOf(row, index);
				const extraClass = typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName;

				return (
					<li key={key} className={cn('px-4 py-4 transition-colors', selectable && selected.includes(key) && 'bg-brand-25 dark:bg-brand-500/[0.06]', extraClass)}>
						<div className="flex items-start gap-3">
							{selectable ? (
								<Checkbox
									size="sm"
									className="mt-0.5"
									checked={selected.includes(key)}
									aria-label={__('Select row')}
									onCheckedChange={(checked) => toggleRow(key, checked)}
								/>
							) : null}

							<div
								className={cn('min-w-0 flex-1 text-theme-sm text-gray-500 dark:text-gray-400', clickableRows && 'cursor-pointer')}
								onClick={clickableRows ? () => onRowClick?.(row, index) : undefined}
							>
								{titleColumn ? <div className="font-medium text-gray-800 dark:text-white/90">{cellOf(titleColumn, row, index)}</div> : null}

								{metaColumns.length > 0 ? (
									<dl className="mt-2 grid gap-x-3 gap-y-2 xsm:grid-cols-2">
										{metaColumns.map((column) => (
											<div key={column.key} className="min-w-0">
												<dt className="text-theme-xs text-gray-400 dark:text-gray-500">{column.label}</dt>
												<dd className="mt-0.5 truncate">{cellOf(column, row, index)}</dd>
											</div>
										))}
									</dl>
								) : null}
							</div>

							<div className="flex shrink-0 items-center gap-1">
								{actionColumns.map((column) => (
									<Fragment key={column.key}>{cellOf(column, row, index)}</Fragment>
								))}
								{canExpand(row) ? (
									<button
										type="button"
										aria-expanded={isExpanded(key)}
										aria-label={__('Toggle details')}
										onClick={() => toggleExpanded(key)}
										className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
									>
										<Icon name="chevron_right" className={cn('text-theme-lg transition-transform', isExpanded(key) && 'rotate-90')} />
									</button>
								) : null}
							</div>
						</div>

						{isExpanded(key) ? <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">{renderExpanded?.(row, index)}</div> : null}
					</li>
				);
			})}
		</ul>
	);
};
