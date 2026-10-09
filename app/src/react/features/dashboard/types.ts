/**
 * The metrics the plugin computes for the store dashboard.
 */

export type ChartDataset = {
	label: string;
	data: number[];
	borderColor?: string;
};

export type WooDashboardMetrics = {
	revenue?: {
		gross: number;
		net: number;
		chart_data?: {
			interval: 'day' | 'week' | 'month';
			labels: string[];
			datasets: ChartDataset[];
		};
	};
	sales_summary?: {
		completed_processing_orders: number;
		period?: { date_from: string; date_to: string };
	};
	top_products?: { product_id: number; name: string; quantity: number; revenue: number; image?: string; edit_url?: string }[];
	recent_orders?: { id: number; number: string; customer_name: string; total: number; status: { slug: string; label: string }; created_at: string | null; edit_url?: string }[];
	average_ticket?: number;
	orders_received?: number;
	customers?: {
		total: number;
		previous_total: number;
		change_percentage: number;
		trend: string;
	};
	/** Percentage change against the period of the same length just before */
	comparison?: { revenue: number; orders: number; average_ticket: number };
	/** Orders and revenue by the kind of source they came from, largest first */
	channels?: { key: string; label: string; orders: number; revenue: number }[];
	/** The calendar month to date, against the target set in the settings (0 when none) */
	month?: { target: number; revenue: number; today: number; previous: number };
	currency?: string;
};

export type DateRange = { from: Date; to: Date };
