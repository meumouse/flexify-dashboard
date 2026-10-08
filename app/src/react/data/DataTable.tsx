import { Fragment, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Checkbox } from '@/react/form/Checkbox';
import { EmptyState } from '@/react/ui/EmptyState';
import { Icon } from '@/react/ui/Icon';
import { Skeleton } from '@/react/ui/Spinner';

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
													{column.cell ? column.cell(row, index) : ((row as Record<string, ReactNode>)[column.key] ?? null)}
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
		</div>
	);
};
