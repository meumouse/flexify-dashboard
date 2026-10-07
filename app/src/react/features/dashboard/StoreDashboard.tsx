import { useMemo, useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, EmptyState, Icon, MetricCard, PageHeader, Skeleton, Tabs } from '@/react/ui';
import { RevenueChart } from '@/react/features/dashboard/RevenueChart';
import { dateRangePresets, rangeForDays, useWooDashboard } from '@/react/features/dashboard/useWooDashboard';
import type { BadgeColor } from '@/react/ui/recipes';

/**
 * Store overview: what the period earned, how many orders and customers it brought, what sold
 * and what came in last.
 */

export const StoreDashboard = () => {
	const { adminUrl } = useWpData();
	const [days, setDays] = useState('30');
	const range = useMemo(() => rangeForDays(Number(days)), [days]);

	const { data, isLoading, isFetching, refetch } = useWooDashboard(range);
	const metrics = data?.metrics ?? {};
	const currency = metrics.currency ?? 'BRL';

	const money = (value: number | undefined) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value ?? 0));
	const periodLabel = sprintf(__('Last %s days'), days);

	if (data && !data.woocommerce_active) {
		return (
			<div>
				<PageHeader title={__('Store overview')} />
				<Card>
					<EmptyState icon="shopping_bag" title={__('WooCommerce is not active')} description={__('Activate WooCommerce to see the store metrics here.')} />
				</Card>
			</div>
		);
	}

	const chart = metrics.revenue?.chart_data;
	const customers = metrics.customers;
	const trendUp = (customers?.change_percentage ?? 0) >= 0;

	const ordersUrl = `${adminUrl}admin.php?page=wc-orders`;

	return (
		<div>
			<PageHeader
				title={__('Store overview')}
				description={periodLabel}
				actions={
					<>
						<Tabs
							value={days}
							onChange={setDays}
							variant="segmented"
							ariaLabel={__('Period')}
							items={dateRangePresets().map((preset) => ({ value: preset.id, label: sprintf(__('%s days'), preset.label) }))}
						/>
						<Button variant="outline" icon="refresh" iconOnly aria-label={__('Refresh')} loading={isFetching} onClick={() => refetch()} />
					</>
				}
			/>

			<div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard label={__('Net revenue')} value={isLoading ? undefined : money(metrics.revenue?.net)} icon="payments" tone="success" loading={isLoading} />
				<MetricCard label={__('Orders')} value={isLoading ? undefined : (metrics.orders_received ?? 0).toLocaleString()} icon="shopping_bag" tone="brand" loading={isLoading} />
				<MetricCard
					label={__('Customers')}
					value={isLoading ? undefined : (customers?.total ?? 0).toLocaleString()}
					icon="group"
					trend={customers ? customers.change_percentage : null}
					trendLabel={sprintf(__('vs previous %s days'), days)}
					loading={isLoading}
				/>
				<MetricCard label={__('Average ticket')} value={isLoading ? undefined : money(metrics.average_ticket)} icon="equalizer" loading={isLoading} />
			</div>

			<div className="grid gap-6 xl:grid-cols-3">
				<div className="min-w-0 xl:col-span-2">
					<RevenueChart labels={chart?.labels ?? []} datasets={chart?.datasets ?? []} currency={currency} subtitle={periodLabel} loading={isLoading} />
				</div>

				<Card title={__('Top products')} description={periodLabel}>
					{isLoading ? (
						<div className="space-y-3">
							{[0, 1, 2].map((index) => (
								<Skeleton key={index} className="h-12 w-full" />
							))}
						</div>
					) : !metrics.top_products?.length ? (
						<p className="py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing sold in this period.')}</p>
					) : (
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
									<span className="whitespace-nowrap text-theme-sm font-medium text-gray-800 dark:text-white/90">{money(product.total)}</span>
								</li>
							))}
						</ul>
					)}
				</Card>
			</div>

			<Card
				className="mt-6"
				title={__('Recent orders')}
				actions={
					<Button size="xs" variant="outline" iconRight="arrow_forward" href={ordersUrl}>
						{__('See all')}
					</Button>
				}
				padding="none"
			>
				{isLoading ? (
					<div className="space-y-3 p-5">
						{[0, 1, 2, 3].map((index) => (
							<Skeleton key={index} className="h-10 w-full" />
						))}
					</div>
				) : !metrics.recent_orders?.length ? (
					<p className="py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No orders in this period.')}</p>
				) : (
					<div className="overflow-x-auto custom-scrollbar">
						<table className="w-full min-w-[480px] text-theme-sm">
							<thead>
								<tr className="border-y border-gray-100 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
									<th className="px-5 py-3 text-start font-medium sm:px-6">{__('Order')}</th>
									<th className="px-4 py-3 text-start font-medium">{__('Customer')}</th>
									<th className="px-4 py-3 text-start font-medium">{__('Status')}</th>
									<th className="px-5 py-3 text-end font-medium sm:px-6">{__('Total')}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
								{metrics.recent_orders.map((order) => (
									<tr key={order.id}>
										<td className="px-5 py-3 sm:px-6">
											<a
												href={`${adminUrl}admin.php?page=wc-orders&action=edit&id=${order.id}`}
												className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
											>
												#{order.number}
											</a>
											{order.product ? <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{decodeHtml(order.product)}</p> : null}
										</td>
										<td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.customer}</td>
										<td className="px-4 py-3">
											<Badge color={(order.status.color as BadgeColor) ?? 'light'}>{order.status.label}</Badge>
										</td>
										<td className={cn('whitespace-nowrap px-5 py-3 text-end font-medium text-gray-800 dark:text-white/90 sm:px-6')}>{money(order.total)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			{!isLoading && customers ? (
				<p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
					{trendUp ? __('Customers grew compared with the previous period.') : __('Customers fell compared with the previous period.')}
				</p>
			) : null}
		</div>
	);
};
