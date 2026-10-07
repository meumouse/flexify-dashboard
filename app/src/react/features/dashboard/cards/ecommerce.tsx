import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, EmptyState, Icon, Skeleton } from '@/react/ui';
import { useWpData } from '@/react/app/WpDataProvider';
import { RevenueChart } from '@/react/features/dashboard/RevenueChart';
import { money, useCardMetrics, type CardProps } from '@/react/features/dashboard/cards/useCardMetrics';
import type { BadgeColor } from '@/react/ui/recipes';

/**
 * The store cards of the dashboard: what the period earned, what sold and what came in last.
 */

const NotActive = () => <EmptyState compact icon="shopping_bag" title={__('WooCommerce is not active')} description={__('Activate WooCommerce to see the store metrics here.')} />;

const Metric = ({ label, value, hint, loading }: { label: string; value: string; hint?: string; loading: boolean }) => (
	<div>
		<p className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</p>
		{loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>}
		{hint && !loading ? <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
	</div>
);

export const StoreMetricsCard = ({ dateRange }: CardProps) => {
	const { metrics, active, loading, currency } = useCardMetrics(dateRange);

	if (!active) {
		return <NotActive />;
	}

	const change = metrics.customers?.change_percentage ?? 0;

	return (
		<div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
			<Metric label={__('Net revenue')} value={money(metrics.revenue?.net, currency)} loading={loading} />
			<Metric label={__('Orders')} value={(metrics.orders_received ?? 0).toLocaleString()} loading={loading} />
			<Metric
				label={__('Customers')}
				value={(metrics.customers?.total ?? 0).toLocaleString()}
				hint={metrics.customers ? sprintf(change >= 0 ? __('+%s%% vs previous period') : __('%s%% vs previous period'), String(change)) : undefined}
				loading={loading}
			/>
			<Metric label={__('Average ticket')} value={money(metrics.average_ticket, currency)} loading={loading} />
		</div>
	);
};

export const StoreRevenueCard = ({ dateRange }: CardProps) => {
	const { metrics, active, loading, currency } = useCardMetrics(dateRange);

	if (!active) {
		return <NotActive />;
	}

	const chart = metrics.revenue?.chart_data;

	return <RevenueChart labels={chart?.labels ?? []} datasets={chart?.datasets ?? []} currency={currency} loading={loading} bare />;
};

export const StoreTopProductsCard = ({ dateRange }: CardProps) => {
	const { metrics, active, loading, currency } = useCardMetrics(dateRange);

	if (!active) {
		return <NotActive />;
	}

	if (loading) {
		return (
			<div className="space-y-3">
				{[0, 1, 2].map((index) => (
					<Skeleton key={index} className="h-12 w-full" />
				))}
			</div>
		);
	}

	if (!metrics.top_products?.length) {
		return <p className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing sold in this period.')}</p>;
	}

	return (
		<ul className="space-y-3">
			{metrics.top_products.map((product) => (
				<li key={product.id} className="flex items-center gap-3">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
						{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="inventory" className="text-gray-400" />}
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{decodeHtml(product.name)}</span>
						<span className="block text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%s sold'), Number(product.quantity).toLocaleString())}</span>
					</span>
					<span className="whitespace-nowrap text-theme-sm font-medium text-gray-800 dark:text-white/90">{money(product.total, currency)}</span>
				</li>
			))}
		</ul>
	);
};

export const StoreRecentOrdersCard = ({ dateRange }: CardProps) => {
	const { adminUrl } = useWpData();
	const { metrics, active, loading, currency } = useCardMetrics(dateRange);

	if (!active) {
		return <NotActive />;
	}

	if (loading) {
		return (
			<div className="space-y-3">
				{[0, 1, 2, 3].map((index) => (
					<Skeleton key={index} className="h-10 w-full" />
				))}
			</div>
		);
	}

	if (!metrics.recent_orders?.length) {
		return <p className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No orders in this period.')}</p>;
	}

	return (
		<div className="overflow-x-auto custom-scrollbar">
			<table className="w-full min-w-[420px] text-theme-sm">
				<thead>
					<tr className="border-b border-gray-100 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
						<th className="py-2 text-start font-medium">{__('Order')}</th>
						<th className="px-3 py-2 text-start font-medium">{__('Customer')}</th>
						<th className="px-3 py-2 text-start font-medium">{__('Status')}</th>
						<th className="py-2 text-end font-medium">{__('Total')}</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
					{metrics.recent_orders.map((order) => (
						<tr key={order.id}>
							<td className="py-2.5">
								<a href={`${adminUrl}admin.php?page=wc-orders&action=edit&id=${order.id}`} className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400">
									#{order.number}
								</a>
							</td>
							<td className="truncate px-3 py-2.5 text-gray-700 dark:text-gray-300">{order.customer}</td>
							<td className="px-3 py-2.5">
								<Badge color={(order.status.color as BadgeColor) ?? 'light'}>{order.status.label}</Badge>
							</td>
							<td className="whitespace-nowrap py-2.5 text-end font-medium text-gray-800 dark:text-white/90">{money(order.total, currency)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
