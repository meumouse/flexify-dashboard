import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Icon } from '@/react/ui/Icon';

type Props = {
	page: number;
	perPage: number;
	total: number;
	onPageChange: (page: number) => void;
	onPerPageChange?: (perPage: number) => void;
	perPageOptions?: number[];
	showPerPage?: boolean;
	disabled?: boolean;
	className?: string;
};

const navButton =
	'flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:h-10 sm:w-10';

/**
 * Compact page list: 1 … 4 5 6 … 20
 */
export const pageList = (current: number, totalPages: number): Array<number | 'start-gap' | 'end-gap'> => {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}

	const list: Array<number | 'start-gap' | 'end-gap'> = [1];
	const start = Math.max(2, current - 1);
	const end = Math.min(totalPages - 1, current + 1);

	if (start > 2) {
		list.push('start-gap');
	}

	for (let index = start; index <= end; index++) {
		list.push(index);
	}

	if (end < totalPages - 1) {
		list.push('end-gap');
	}

	list.push(totalPages);

	return list;
};

export const Pagination = ({
	page,
	perPage,
	total,
	onPageChange,
	onPerPageChange,
	perPageOptions = [10, 20, 50, 100],
	showPerPage = true,
	disabled = false,
	className,
}: Props) => {
	const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
	const from = total === 0 ? 0 : (page - 1) * perPage + 1;
	const to = Math.min(total, page * perPage);

	const goTo = (target: number) => {
		const next = Math.min(Math.max(1, target), totalPages);

		if (next !== page && !disabled) {
			onPageChange(next);
		}
	};

	return (
		<div className={cn('flex flex-col items-center justify-between gap-4 sm:flex-row', className)}>
			<div className="flex items-center gap-3 text-theme-sm text-gray-500 dark:text-gray-400">
				<span>{sprintf(__('Showing %1$s to %2$s of %3$s'), from.toLocaleString(), to.toLocaleString(), total.toLocaleString())}</span>
				{showPerPage && onPerPageChange ? (
					<label className="hidden items-center gap-2 sm:flex">
						<span className="sr-only">{__('Items per page')}</span>
						<select
							value={perPage}
							disabled={disabled}
							onChange={(event) => onPerPageChange(Number(event.target.value))}
							className="h-9 rounded-lg border border-gray-300 bg-transparent px-2 text-theme-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
						>
							{perPageOptions.map((option) => (
								<option key={option} value={option}>
									{sprintf(__('%s / page'), option)}
								</option>
							))}
						</select>
					</label>
				) : null}
			</div>

			<nav className="flex items-center gap-1.5" aria-label={__('Pagination')}>
				<button type="button" className={navButton} disabled={disabled || page <= 1} aria-label={__('Previous page')} onClick={() => goTo(page - 1)}>
					<Icon name="chevron_left" className="text-theme-lg rtl:rotate-180" />
				</button>

				{pageList(page, totalPages).map((item) =>
					typeof item === 'string' ? (
						<span key={item} className="flex h-9 w-6 items-center justify-center text-theme-sm text-gray-400">
							…
						</span>
					) : (
						<button
							key={item}
							type="button"
							aria-current={item === page ? 'page' : undefined}
							disabled={disabled}
							onClick={() => goTo(item)}
							className={cn(
								'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-theme-sm font-medium transition-colors sm:h-10 sm:min-w-10',
								item === page ? 'bg-brand-500 text-white' : 'text-gray-700 hover:bg-brand-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400'
							)}
						>
							{item}
						</button>
					)
				)}

				<button type="button" className={navButton} disabled={disabled || page >= totalPages} aria-label={__('Next page')} onClick={() => goTo(page + 1)}>
					<Icon name="chevron_right" className="text-theme-lg rtl:rotate-180" />
				</button>
			</nav>
		</div>
	);
};
