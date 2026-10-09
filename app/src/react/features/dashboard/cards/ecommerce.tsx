import { lazy, Suspense, useMemo } from 'react';
import { useIsDark } from '@/react/app/ThemeProvider';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, EmptyState, Icon, Skeleton } from '@/react/ui';
import { RevenueChart } from '@/react/features/dashboard/RevenueChart';
import { Sparkline } from '@/react/features/dashboard/Sparkline';
import { SERIES_COLORS, accentColor, targetProgress } from '@/react/features/dashboard/charts';
import { money, useCardMetrics, type CardProps } from '@/react/features/dashboard/cards/useCardMetrics';
import type { BadgeColor } from '@/react/ui/recipes';

/**
 * The store cards of the dashboard: what the period earned against the one before, what sold,
 * where it came from, how the month is going and what came in last.
 */

const ReactApexChart = lazy(() => import('react-apexcharts'));

const NotActive = () => <EmptyState compact icon="shopping_bag" title={__('WooCommerce is not active')} description={__('Activate WooCommerce to see the store metrics here.')} />;

/** The route sends the status slug; the colours are the ones the orders screen uses for it. */
const STATUS_COLORS: Record<string, BadgeColor> = {
	completed: 'success',
	processing: 'primary',
	'on-hold': 'warning',
	pending: 'warning',
	cancelled: 'error',
	failed: 'error',
	refunded: 'light',
};

const compactMoney = (value: number, currency: string) =>
	new Intl.NumberFormat(undefined, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value);

const Change = ({ value }: { value: number | undefined }) => {
	if (value === undefined) {
		return null;
	}

	const up = value >= 0;

	return (
		<span
			className={cn(
				'inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-theme-xs font-medium',
				up ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500' : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
			)}
		>
			<Icon name={up ? 'arrow_upward' : 'arrow_downward'} className="text-theme-xs" />
			{`${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
		</span>
	);
};

const Metric = ({ label, value, change, trend, loading }: { label: string; value: string; change?: number; trend?: number[]; loading: boolean }) => (
	<div className="flex min-w-0 items-end justify-between gap-3 py-4 xl:px-6 xl:first:ps-0 xl:last:pe-0">
		<div className="min-w-0">
			<p className="truncate text-theme-sm text-gray-500 dark:text-gray-400">{label}</p>
			{loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="mt-1 truncate text-title-xs font-semibold text-gray-800 dark:text-white/90">{value}</p>}
			{!loading && change !== undefined ? (
				<p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
					<Change value={change} />
					{__('vs previous period')}
				</p>
			) : null}
		</div>
		{/* Four figures in a row leave no room for it until 2xl; two in a row (sm to xl) do. */}
		{!loading && trend ? <Sparkline values={trend} className={cn('hidden sm:block xl:hidden 2xl:block', (change ?? 0) >= 0 ? 'text-success-500' : 'text-error-500')} /> : null}
	</div>
);

export const StoreMetricsCard = ({ dateRange }: CardProps) => {
	const { metrics, active, loading, currency } = useCardMetrics(dateRange);

	if (!active) {
		return <NotActive />;
	}

	const net = metrics.revenue?.chart_data?.datasets?.find((dataset) => dataset.data.length)?.data;

	// One strip with dividers, not four cards: the figures are read together, against each other.
	return (
		<div className="-my-4 grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 xl:grid-cols-4 xl:gap-x-0 xl:divide-x">
			<Metric label={__('Net revenue')} value={money(metrics.revenue?.net, currency)} change={metrics.comparison?.revenue} trend={net} loading={loading} />
			<Metric label={__('Orders')} value={(metrics.orders_received ?? 0).toLocaleString()} change={metrics.comparison?.orders} loading={loading} />
			<Metric label={__('Customers')} value={(metrics.customers?.total ?? 0).toLocaleString()} change={metrics.customers?.change_percentage} loading={loading} />
			<Metric label={__('Average ticket')} value={money(metrics.average_ticket, currency)} change={metrics.comparison?.average_ticket} loading={loading} />
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

/** Half a ring, filled as far as the month has got towards its target. */
const Gauge = ({ percent }: { percent: number }) => (
	<svg viewBox="0 0 200 110" className="mx-auto w-full max-w-60" aria-hidden="true">
		<path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" strokeWidth={14} strokeLinecap="round" className="stroke-gray-100 dark:stroke-gray-800" />
		<path
			d="M 10 100 A 90 90 0 0 1 190 100"
			fill="none"
			strokeWidth={14}
			strokeLinecap="round"
			pathLength={100}
			strokeDasharray={`${Math.min(100, percent)} 100`}
			className="stroke-brand-500 transition-[stroke-dasharray] duration-500"
		/>
	</svg>
);

export const StoreTargetCard = ({ dateRange }: CardProps) => {
	const { adminUrl } = useWpData();
	const { metrics, active, loading, currency } = useCardMetrics(dateRange);

	if (!active) {
		return <NotActive />;
	}

	if (loading) {
		return <Skeleton className="h-56 w-full" />;
	}

	const month = metrics.month;

	if (!month?.target) {
		return (
			<EmptyState compact icon="speed" title={__('No monthly target yet')} description={__('Set what the store aims to earn each month and this card measures the month against it.')}>
				<Button size="sm" variant="outline" href={`${adminUrl}admin.php?page=flexify-dashboard-settings#/?category=woocommerce`}>
					{__('Set a target')}
				</Button>
			</EmptyState>
		);
	}

	const percent = targetProgress(month.revenue, month.target);
	const ahead = month.revenue >= month.previous;

	return (
		<div>
			<div className="relative">
				<Gauge percent={percent} />
				<div className="absolute inset-x-0 bottom-0 text-center">
					<p className="text-title-sm font-semibold text-gray-800 dark:text-white/90">{`${percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}</p>
				</div>
			</div>

			<p className="mx-auto mt-3 max-w-xs text-center text-theme-sm text-gray-500 dark:text-gray-400">
				{ahead
					? sprintf(__('The month is at %1$s, ahead of the %2$s last month had by this day.'), money(month.revenue, currency), money(month.previous, currency))
					: sprintf(__('The month is at %1$s, behind the %2$s last month had by this day.'), money(month.revenue, currency), money(month.previous, currency))}
			</p>

			<dl className="mt-5 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50 py-3 text-center dark:divide-gray-800 dark:bg-white/[0.03]">
				{/* A third of a four-column card fits "R$ 60 mil", not "R$ 60.000,00"; the exact figure is the title. */}
				{[
					{ label: __('Target'), value: month.target },
					{ label: __('This month'), value: month.revenue },
					{ label: __('Today'), value: month.today },
				].map((item) => (
					<div key={item.label} className="min-w-0 px-2">
						<dt className="text-theme-xs text-gray-500 dark:text-gray-400">{item.label}</dt>
						<dd className="mt-0.5 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90" title={money(item.value, currency)}>
							{compactMoney(item.value, currency)}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
};

export const StoreChannelsCard = ({ dateRange }: CardProps) => {
	const isDark = useIsDark();
	const { metrics, active, loading, currency } = useCardMetrics(dateRange);
	const channels = metrics.channels ?? [];

	const options = useMemo(
		() => ({
			chart: { type: 'donut' as const, fontFamily: 'inherit', animations: { enabled: false } },
			labels: channels.map((channel) => channel.label),
			colors: [accentColor(), ...SERIES_COLORS],
			legend: { show: false },
			dataLabels: { enabled: false },
			stroke: { width: 2, colors: [isDark ? '#1a2231' : '#ffffff'] },
			plotOptions: {
				pie: {
					donut: {
						size: '72%',
						labels: {
							show: true,
							name: { color: isDark ? '#98A2B3' : '#667085' },
							value: { color: isDark ? '#ffffffe6' : '#1d2939', fontSize: '20px', fontWeight: 600, formatter: (value: string) => money(Number(value), currency) },
							total: { show: true, label: __('Total'), color: isDark ? '#98A2B3' : '#667085', formatter: () => money(metrics.revenue?.net, currency) },
						},
					},
				},
			},
			tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (value: number) => money(value, currency) } },
		}),
		[channels, currency, isDark, metrics.revenue?.net]
	);

	if (!active) {
		return <NotActive />;
	}

	if (loading) {
		return <Skeleton className="h-64 w-full" />;
	}

	if (!channels.length) {
		return <p className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No sales in this period.')}</p>;
	}

	const colors = options.colors;

	return (
		<div className="flex flex-col items-center gap-4 sm:flex-row">
			<div className="w-full max-w-56 shrink-0">
				<Suspense fallback={<Skeleton className="h-56 w-full rounded-full" />}>
					<ReactApexChart key={isDark ? 'dark' : 'light'} options={options} series={channels.map((channel) => channel.revenue)} type="donut" height={224} />
				</Suspense>
			</div>
			<ul className="w-full min-w-0 space-y-3">
				{channels.map((channel, index) => (
					<li key={channel.key} className="flex items-center gap-3 text-theme-sm">
						<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
						<span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">{channel.label}</span>
						<span className="shrink-0 text-gray-500 dark:text-gray-400">{sprintf(__('%s orders'), channel.orders.toLocaleString())}</span>
						<span className="shrink-0 font-medium text-gray-800 dark:text-white/90">{money(channel.revenue, currency)}</span>
					</li>
				))}
			</ul>
		</div>
	);
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
				<li key={product.product_id} className="flex items-center gap-3">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
						{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="inventory" className="text-gray-400" />}
					</span>
					<span className="min-w-0 flex-1">
						{product.edit_url ? (
							<a href={product.edit_url} className="block truncate text-theme-sm font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400">
								{decodeHtml(product.name)}
							</a>
						) : (
							<span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{decodeHtml(product.name)}</span>
						)}
						<span className="block text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%s sold'), Number(product.quantity).toLocaleString())}</span>
					</span>
					<span className="whitespace-nowrap text-theme-sm font-medium text-gray-800 dark:text-white/90">{money(product.revenue, currency)}</span>
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
								<a
									href={order.edit_url || `${adminUrl}admin.php?page=wc-orders&action=edit&id=${order.id}`}
									className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
								>
									#{order.number || order.id}
								</a>
							</td>
							<td className="truncate px-3 py-2.5 text-gray-700 dark:text-gray-300">{order.customer_name}</td>
							<td className="px-3 py-2.5">
								<Badge color={STATUS_COLORS[order.status.slug] ?? 'light'}>{order.status.label}</Badge>
							</td>
							<td className="whitespace-nowrap py-2.5 text-end font-medium text-gray-800 dark:text-white/90">{money(order.total, currency)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
