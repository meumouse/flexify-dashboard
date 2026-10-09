import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { Icon } from '@/react/ui/Icon';
import { Skeleton } from '@/react/ui/Spinner';
import { cardClass, figureClass } from '@/react/ui/recipes';

type Props = {
	label: string;
	value?: ReactNode;
	icon?: string;
	/** Percentage change, e.g. 11.01 or -9.05 */
	trend?: number | null;
	trendLabel?: string;
	loading?: boolean;
	tone?: 'gray' | 'brand' | 'success' | 'warning' | 'error';
	className?: string;
};

const tones = {
	gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90',
	brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
	success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
	warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
	error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
};

export const MetricCard = ({ label, value, icon, trend = null, trendLabel, loading = false, tone = 'gray', className }: Props) => {
	const trendUp = trend !== null && trend >= 0;

	return (
		<div className={cn(cardClass, 'p-5 md:p-6', className)}>
			{icon ? (
				<div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', tones[tone] ?? tones.gray)}>
					<Icon name={icon} className="text-title-xs" />
				</div>
			) : null}

			<div className={cn('flex items-end justify-between gap-3', icon && 'mt-5')}>
				<div className="min-w-0">
					<span className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</span>
					{loading ? (
						<Skeleton className="mt-2 h-8 w-28" />
					) : (
						<h4 className={cn('mt-2 truncate', figureClass.hero)}>{value}</h4>
					)}
				</div>

				{trend !== null && !loading ? (
					<span
						title={trendLabel}
						className={cn(
							'flex shrink-0 items-center gap-1 rounded-full py-0.5 ps-2 pe-2.5 text-theme-sm font-medium',
							trendUp
								? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
								: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
						)}
					>
						<Icon name={trendUp ? 'arrow_upward' : 'arrow_downward'} className="text-theme-sm" />
						{`${Math.abs(trend).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
					</span>
				) : null}
			</div>
		</div>
	);
};
