import { useQuery } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { figureClass } from '@/react/ui/recipes';
import { __ } from '@/react/lib/i18n';
import { Icon, Skeleton } from '@/react/ui';
import { isoDate } from '@/react/features/dashboard/useWooDashboard';

/**
 * What every dashboard card needs: the period it was given, a way to ask the REST API for it,
 * and the three states it can be in.
 */

export type CardProps = {
	/** The dashboard passes the period as the pair the Vue cards also received */
	dateRange?: [Date, Date];
};

export const useRange = (dateRange?: [Date, Date]) => {
	const [from, to] = dateRange?.length === 2 ? dateRange : [new Date(), new Date()];

	return { from, to, fromIso: isoDate(from), toIso: isoDate(to) };
};

/**
 * Cards on the same screen ask for the same things; one query key per request means the second
 * card gets the answer the first already has.
 */
export const useCardQuery = <T,>(key: unknown[], endpoint: string, params: Record<string, unknown> = {}) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['dashboard', ...key],
		staleTime: 30_000,
		queryFn: ({ signal }) => rest.get<T>(endpoint, params, signal),
	});
};

export const useCardList = <T,>(key: unknown[], endpoint: string, params: Record<string, unknown> = {}) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['dashboard', ...key],
		staleTime: 30_000,
		queryFn: async ({ signal }) => (await rest.list<T>(endpoint, params, signal)).data ?? [],
	});
};

export const CardLoading = ({ rows = 3 }: { rows?: number }) => (
	<div className="space-y-3">
		{Array.from({ length: rows }, (_, index) => (
			<Skeleton key={index} className="h-10 w-full" />
		))}
	</div>
);

export const CardError = ({ message }: { message?: string }) => (
	<div className="py-8 text-center">
		<Icon name="error" className="mx-auto mb-3 text-title-sm text-gray-400" />
		<p className="text-theme-sm text-gray-500 dark:text-gray-400">{message || __('Could not load this card.')}</p>
	</div>
);

export const CardEmpty = ({ icon = 'inbox', message }: { icon?: string; message: string }) => (
	<div className="py-8 text-center">
		<Icon name={icon} className="mx-auto mb-3 text-title-sm text-gray-300 dark:text-gray-600" />
		<p className="text-theme-sm text-gray-500 dark:text-gray-400">{message}</p>
	</div>
);

export type Stat = {
	label: string;
	value: string;
	/** Icon name; drawn in a rounded square above the label, as the design system does */
	icon?: string;
	/** Percentage change, e.g. 11.01 or -9.05 */
	trend?: number | null;
};

/**
 * The numbers a card opens with.
 *
 * Each one reads top to bottom — icon, then what it is, then how much — which is the shape
 * the design system uses everywhere a figure is shown, and the reason a number is legible
 * at a glance. The column count is written out rather than built from the length, because
 * Tailwind reads the source to decide which classes to generate and never sees a built one.
 */
export const StatRow = ({ stats, className }: { stats: Stat[]; className?: string }) => (
	<div className={cn('mb-5 grid gap-4', stats.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2', className)}>
		{stats.map((stat) => {
			const up = stat.trend !== null && stat.trend !== undefined && stat.trend >= 0;

			return (
				<div key={stat.label} className="min-w-0">
					{stat.icon ? (
						<span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
							<Icon name={stat.icon} className="text-theme-lg" />
						</span>
					) : null}

					<p className="truncate text-theme-sm text-gray-500 dark:text-gray-400">{stat.label}</p>

					<p className="mt-1 flex flex-wrap items-center gap-2">
						<span className={cn('truncate', figureClass.card)}>{stat.value}</span>

						{stat.trend !== null && stat.trend !== undefined ? (
							<span
								className={cn(
									'flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-theme-xs font-medium',
									up ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500' : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
								)}
							>
								<Icon name={up ? 'arrow_upward' : 'arrow_downward'} className="text-theme-xs" />
								{`${Math.abs(stat.trend).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
							</span>
						) : null}
					</p>
				</div>
			);
		})}
	</div>
);

export const compactNumber = (value: number): string => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

export const shortDate = (value: string): string => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
