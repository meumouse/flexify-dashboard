import { useQuery } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
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
		<Icon name="error" className="mx-auto mb-3 text-3xl text-gray-400" />
		<p className="text-theme-sm text-gray-500 dark:text-gray-400">{message || __('Could not load this card.')}</p>
	</div>
);

export const CardEmpty = ({ icon = 'inbox', message }: { icon?: string; message: string }) => (
	<div className="py-8 text-center">
		<Icon name={icon} className="mx-auto mb-3 text-3xl text-gray-300 dark:text-gray-600" />
		<p className="text-theme-sm text-gray-500 dark:text-gray-400">{message}</p>
	</div>
);

/** Three numbers side by side, the shape most of these cards open with. */
export const StatRow = ({ stats, className }: { stats: { label: string; value: string }[]; className?: string }) => (
	<div className={cn('mb-5 grid gap-4', `grid-cols-${stats.length}`, className)}>
		{stats.map((stat) => (
			<div key={stat.label} className="text-center">
				<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
				<p className="text-theme-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
			</div>
		))}
	</div>
);

export const compactNumber = (value: number): string => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

export const shortDate = (value: string): string => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
