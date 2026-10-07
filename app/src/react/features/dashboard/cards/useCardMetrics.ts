import { useWooDashboard } from '@/react/features/dashboard/useWooDashboard';
import type { DateRange } from '@/react/features/dashboard/types';

/**
 * Every e-commerce card asks for the same metrics, so they share one query: TanStack hands the
 * later cards the answer the first one already fetched.
 */

export type CardProps = {
	/** The dashboard passes the period as the pair the Vue cards also receive */
	dateRange?: [Date, Date];
};

export const useCardMetrics = (dateRange?: [Date, Date]) => {
	const range: DateRange = dateRange?.length === 2 ? { from: dateRange[0], to: dateRange[1] } : { from: new Date(), to: new Date() };
	const query = useWooDashboard(range);

	return {
		metrics: query.data?.metrics ?? {},
		active: query.data?.woocommerce_active !== false,
		loading: query.isLoading,
		currency: query.data?.metrics?.currency ?? 'BRL',
	};
};

export const money = (value: number | undefined, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value ?? 0));
