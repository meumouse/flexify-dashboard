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
	top_products?: { id: number; name: string; quantity: number; total: number; image?: string }[];
	recent_orders?: { id: number; number: string; customer: string; total: number; status: { label: string; color?: string }; date: string; product?: string }[];
	average_ticket?: number;
	orders_received?: number;
	customers?: {
		total: number;
		previous_total: number;
		change_percentage: number;
		trend: string;
	};
	currency?: string;
};

export type DateRange = { from: Date; to: Date };
