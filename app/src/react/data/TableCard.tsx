import type { ReactNode } from 'react';
import { FilterPopover } from '@/react/data/FilterPopover';
import { __ } from '@/react/lib/i18n';
import { Card } from '@/react/ui/Card';
import { Icon } from '@/react/ui/Icon';

/**
 * The frame every list sits in: status tabs, a toolbar, the filters in effect, the rows and the
 * pages, in that order.
 *
 * Seven screens each drew this by hand and no two agreed — filters as a row of selects on one,
 * behind a toggle on another, a spinner on the left here and the right there. The frame is one
 * piece now; what goes in it is still the screen's.
 */

export type ActiveFilter = {
	key: string;
	/** What the chip says, such as "Category: Shirts" */
	label: string;
	onRemove: () => void;
};

type Props = {
	/** Status tabs, drawn above the toolbar */
	tabs?: ReactNode;
	/** The search field, first in the toolbar */
	search?: ReactNode;
	/** Fields of the filter panel; the "Filters" button only shows when there are some */
	filters?: ReactNode;
	/** The filters in effect, as removable chips under the toolbar */
	activeFilters?: ActiveFilter[];
	onClearFilters?: () => void;
	/** Small buttons at the end of the toolbar: columns, view, refresh */
	tools?: ReactNode;
	/** Shows that a fetch is running behind rows already on screen */
	busy?: boolean;
	/** A message between the toolbar and the rows, such as "3 new orders" */
	notice?: ReactNode;
	/** Usually the pagination */
	footer?: ReactNode;
	children: ReactNode;
};

export const TableCard = ({ tabs, search, filters, activeFilters = [], onClearFilters, tools, busy = false, notice, footer, children }: Props) => (
	<Card padding="none" footer={footer}>
		{tabs ? <div className="px-5 pt-2 sm:px-6">{tabs}</div> : null}

		{search || filters || tools ? (
			<div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:gap-3 sm:px-6">
				{/* The search shrinks before anything else does: at 375px it shares the line with the buttons. */}
				{search ? <div className="min-w-0 flex-1 sm:max-w-80">{search}</div> : null}

				<div className="ms-auto flex shrink-0 items-center gap-2">
					{busy ? <Icon name="progress_activity" className="animate-spin text-theme-md text-gray-400" title={__('Loading')} /> : null}
					{filters ? (
						<FilterPopover count={activeFilters.length} onClear={onClearFilters}>
							{filters}
						</FilterPopover>
					) : null}
					{tools}
				</div>
			</div>
		) : null}

		{activeFilters.length ? (
			<div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800 sm:px-6">
				{activeFilters.map((filter) => (
					<span key={filter.key} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-brand-50 py-1 ps-2.5 pe-1 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
						<span className="truncate">{filter.label}</span>
						<button
							type="button"
							className="rounded-sm p-0.5 transition-colors hover:bg-brand-100 dark:hover:bg-brand-500/25"
							aria-label={`${__('Remove filter')}: ${filter.label}`}
							onClick={filter.onRemove}
						>
							<Icon name="close" className="text-theme-sm" />
						</button>
					</span>
				))}
				{onClearFilters && activeFilters.length > 1 ? (
					<button type="button" className="text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" onClick={onClearFilters}>
						{__('Clear all')}
					</button>
				) : null}
			</div>
		) : null}

		{notice}

		{children}
	</Card>
);
