import { cn } from '@/react/lib/cn';
import { Skeleton } from '@/react/ui/Spinner';

export type StatItem = {
	key: string;
	label: string;
	value: string;
	hint?: string;
	tone?: 'default' | 'brand' | 'success' | 'warning' | 'error';
	clickable?: boolean;
	active?: boolean;
};

type Props = {
	items: StatItem[];
	loading?: boolean;
	onSelect?: (item: StatItem) => void;
	className?: string;
};

const tones = {
	default: 'text-gray-800 dark:text-white/90',
	brand: 'text-brand-500 dark:text-brand-400',
	success: 'text-success-600 dark:text-success-500',
	warning: 'text-warning-600 dark:text-orange-400',
	error: 'text-error-600 dark:text-error-500',
};

/**
 * Borders for the two-column layout used below the lg breakpoint.
 * A lone item in the last row spans both columns.
 */
const cellBorders = (index: number, count: number) => {
	const lastRowStart = count % 2 ? count - 1 : count - 2;
	const isLoneLast = count % 2 === 1 && index === count - 1;

	return cn(index < lastRowStart && 'border-b', index % 2 === 0 && !isLoneLast && 'border-e', isLoneLast && 'col-span-2');
};

export const StatStrip = ({ items, loading = false, onSelect, className }: Props) => (
	<div
		className={cn(
			'grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]',
			items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : '',
			className
		)}
	>
		{items.map((item, index) => {
			const Tag = item.clickable ? 'button' : 'div';

			return (
				<Tag
					key={item.key}
					type={item.clickable ? 'button' : undefined}
					aria-pressed={item.clickable ? !!item.active : undefined}
					onClick={item.clickable ? () => onSelect?.(item) : undefined}
					className={cn(
						'min-w-0 border-gray-200 p-4 text-start dark:border-gray-800 sm:p-5',
						cellBorders(index, items.length),
						'lg:col-span-1 lg:border-b-0 lg:border-e lg:last:border-e-0',
						item.clickable && 'transition-colors hover:bg-gray-50 focus-visible:relative focus-visible:shadow-focus-ring focus-visible:outline-hidden dark:hover:bg-white/[0.03]',
						item.active && 'bg-gray-50 dark:bg-white/[0.03]'
					)}
				>
					<span className="text-theme-sm text-gray-500 dark:text-gray-400">{item.label}</span>
					{loading ? (
						<Skeleton className="mt-2 h-7 w-20" />
					) : (
						<div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
							<span className={cn('text-theme-xl font-semibold sm:text-title-xs', tones[item.tone ?? 'default'])}>{item.value}</span>
							{item.hint ? <span className="text-theme-xs text-gray-500 dark:text-gray-400">{item.hint}</span> : null}
						</div>
					)}
				</Tag>
			);
		})}
	</div>
);
