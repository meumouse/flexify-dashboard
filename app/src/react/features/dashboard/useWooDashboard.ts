import { useQuery } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import type { DateRange, WooDashboardMetrics } from '@/react/features/dashboard/types';

/**
 * Store metrics for a period. The endpoint also answers when WooCommerce is off, so the
 * dashboard can say so instead of failing.
 */

export const isoDate = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

type Response = {
	woocommerce_active: boolean;
	metrics: WooDashboardMetrics;
};

export const useWooDashboard = (range: DateRange) => {
	const rest = useRest();
	const params = { date_from: isoDate(range.from), date_to: isoDate(range.to) };

	return useQuery({
		queryKey: ['woo', 'dashboard', params],
		queryFn: async ({ signal }) => (await rest.get<Response>('flexify-dashboard/v1/woocommerce-dashboard', params, signal)) as Response,
		placeholderData: (previous) => previous,
	});
};

/** Presets offered by the period picker, newest ranges first. */
export const dateRangePresets = (): { id: string; label: string; days: number }[] => [
	{ id: '7', label: '7', days: 7 },
	{ id: '30', label: '30', days: 30 },
	{ id: '90', label: '90', days: 90 },
];

export const rangeForDays = (days: number): DateRange => {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - (days - 1));

	return { from, to };
};
