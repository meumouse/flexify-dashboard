import { lazy, Suspense } from 'react';
import { useIsDark } from '@/react/app/ThemeProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Icon, Skeleton } from '@/react/ui';
import { CardEmpty, CardError, CardLoading, compactNumber, useCardQuery, useRange, type CardProps } from '@/react/features/dashboard/cards/shared';

/**
 * Cards fed by the site analytics: what was read, by whom, from where and on what.
 *
 * Every one of them asks the same endpoint for a different `stat_type`, so they share a query
 * key shape and the answers are fetched once per period.
 */

const ReactApexChart = lazy(() => import('react-apexcharts'));

const STATS_ENDPOINT = 'flexify-dashboard/v1/analytics/stats';

/** The analytics provider answers with an `_error` instead of failing the request. */
type WithProviderError = { _error?: string; _provider?: string };

type StatsRow = {
	page_url?: string;
	page_title?: string;
	country_code?: string;
	referrer?: string;
	referrer_domain?: string;
	device_type?: string;
	total_views?: number | string;
	views?: number | string;
	total_unique_visitors?: number | string;
	unique_visitors?: number | string;
};

const useStats = <T,>(statType: string, dateRange?: [Date, Date], extra: Record<string, unknown> = {}) => {
	const { fromIso, toIso } = useRange(dateRange);

	return useCardQuery<T & WithProviderError>(['analytics', statType, fromIso, toIso, extra], STATS_ENDPOINT, {
		start_date: fromIso,
		end_date: toIso,
		stat_type: statType,
		...extra,
	});
};

/** The endpoint answers with an array, or with it wrapped in `data` or `rows`. */
const toRows = (payload: unknown): StatsRow[] => {
	if (Array.isArray(payload)) {
		return payload as StatsRow[];
	}

	const wrapped = payload as { data?: unknown; rows?: unknown } | null;

	if (Array.isArray(wrapped?.data)) {
		return wrapped.data as StatsRow[];
	}

	return Array.isArray(wrapped?.rows) ? (wrapped.rows as StatsRow[]) : [];
};

const views = (row: StatsRow) => Number(row.total_views ?? row.views ?? 0) || 0;
const visitors = (row: StatsRow) => Number(row.total_unique_visitors ?? row.unique_visitors ?? 0) || 0;

/** Add up the rows that share a key, biggest first. */
const groupRows = (rows: StatsRow[], keyOf: (row: StatsRow) => string, limit = 10) => {
	const totals = new Map<string, { key: string; label: string; views: number; visitors: number }>();

	rows.forEach((row) => {
		const key = keyOf(row) || __('Unknown');
		const current = totals.get(key) ?? { key, label: row.page_title || key, views: 0, visitors: 0 };

		current.views += views(row);
		current.visitors += visitors(row);
		totals.set(key, current);
	});

	return [...totals.values()].sort((left, right) => right.views - left.views).slice(0, limit);
};

/** A labelled bar, the shape the "top X" cards all share. */
const RankedBars = ({ rows, emptyMessage, icon }: { rows: { key: string; label: string; views: number; visitors: number }[]; emptyMessage: string; icon: string }) => {
	if (!rows.length) {
		return <CardEmpty icon={icon} message={emptyMessage} />;
	}

	const max = Math.max(...rows.map((row) => row.views), 1);

	return (
		<ul className="space-y-3">
			{rows.map((row) => (
				<li key={row.key}>
					<div className="mb-1 flex items-center justify-between gap-3 text-theme-sm">
						<span className="min-w-0 truncate text-gray-700 dark:text-gray-300" title={row.key}>
							{row.label}
						</span>
						<span className="shrink-0 font-medium text-gray-800 dark:text-white/90">{compactNumber(row.views)}</span>
					</div>
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
						<div className="h-full rounded-full bg-brand-500" style={{ width: `${(row.views / max) * 100}%` }} />
					</div>
				</li>
			))}
		</ul>
	);
};

const ProviderError = ({ message }: { message: string }) => (
	<div className="rounded-xl bg-warning-50 p-4 text-theme-sm text-gray-700 dark:bg-warning-500/10 dark:text-gray-300">
		<Icon name="warning" className="mb-2 text-theme-xl text-warning-500" />
		<p>{message}</p>
	</div>
);

/** Difference against the previous period, as a signed percentage. */
const change = (current: number, previous: number): number | null => {
	if (!previous) {
		return null;
	}

	return Math.round(((current - previous) / previous) * 1000) / 10;
};

const Trend = ({ value, inverted = false }: { value: number | null; inverted?: boolean }) => {
	if (value === null) {
		return null;
	}

	// For bounce rate a fall is the good news, so the colours are swapped.
	const good = inverted ? value <= 0 : value >= 0;

	return (
		<span className={cn('text-theme-xs font-medium', good ? 'text-success-600 dark:text-success-500' : 'text-error-600 dark:text-error-500')}>
			{value >= 0 ? '+' : ''}
			{value}%
		</span>
	);
};

type Overview = {
	total_views?: number;
	total_unique_visitors?: number;
	avg_bounce_rate?: number;
	avg_time_on_page?: number;
	total_sessions?: number;
	avg_pages_per_session?: number;
	comparison?: { total_views?: number; total_unique_visitors?: number; avg_bounce_rate?: number; avg_time_on_page?: number };
};

export const PageAnalyticsCard = ({ dateRange }: CardProps) => {
	const { data, isLoading, isError } = useStats<Overview>('overview', dateRange);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if (data?._error) {
		return <ProviderError message={data._error} />;
	}

	const viewsNow = data?.total_views ?? 0;
	const visitorsNow = data?.total_unique_visitors ?? 0;

	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Views')}</p>
				<p className="mt-1 flex items-baseline gap-2">
					<span className="text-title-xs font-bold text-gray-900 dark:text-gray-100">{compactNumber(viewsNow)}</span>
					<Trend value={change(viewsNow, data?.comparison?.total_views ?? 0)} />
				</p>
			</div>
			<div>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Unique visitors')}</p>
				<p className="mt-1 flex items-baseline gap-2">
					<span className="text-title-xs font-bold text-gray-900 dark:text-gray-100">{compactNumber(visitorsNow)}</span>
					<Trend value={change(visitorsNow, data?.comparison?.total_unique_visitors ?? 0)} />
				</p>
			</div>
		</div>
	);
};

export const BounceRateCard = ({ dateRange }: CardProps) => {
	const { data, isLoading, isError } = useStats<Overview>('overview', dateRange);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if (data?._error) {
		return <ProviderError message={data._error} />;
	}

	const seconds = Math.round(data?.avg_time_on_page ?? 0);
	const time = `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;

	return (
		<div>
			<div className="mb-4 grid grid-cols-2 gap-4">
				<div>
					<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Bounce rate')}</p>
					<p className="mt-1 flex items-baseline gap-2">
						<span className="text-title-xs font-bold text-gray-900 dark:text-gray-100">{Math.round(data?.avg_bounce_rate ?? 0)}%</span>
						<Trend value={change(data?.avg_bounce_rate ?? 0, data?.comparison?.avg_bounce_rate ?? 0)} inverted />
					</p>
				</div>
				<div>
					<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Time on page')}</p>
					<p className="mt-1 flex items-baseline gap-2">
						<span className="text-title-xs font-bold text-gray-900 dark:text-gray-100">{time}</span>
						<Trend value={change(data?.avg_time_on_page ?? 0, data?.comparison?.avg_time_on_page ?? 0)} />
					</p>
				</div>
			</div>

			<dl className="space-y-2 text-theme-sm">
				<div className="flex justify-between gap-4">
					<dt className="text-gray-500 dark:text-gray-400">{__('Sessions')}</dt>
					<dd className="font-medium text-gray-800 dark:text-white/90">{compactNumber(data?.total_sessions ?? 0)}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt className="text-gray-500 dark:text-gray-400">{__('Pages per session')}</dt>
					<dd className="font-medium text-gray-800 dark:text-white/90">{(data?.avg_pages_per_session ?? 0).toFixed(1)}</dd>
				</div>
			</dl>
		</div>
	);
};

export const TopPagesCard = ({ dateRange }: CardProps) => {
	const { data, isLoading, isError } = useStats<unknown>('pages', dateRange);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if ((data as WithProviderError)?._error) {
		return <ProviderError message={(data as WithProviderError)._error as string} />;
	}

	return <RankedBars rows={groupRows(toRows(data), (row) => row.page_url ?? '')} icon="description" emptyMessage={__('No page views in this period.')} />;
};

export const TopCountriesCard = ({ dateRange }: CardProps) => {
	const { data, isLoading, isError } = useStats<unknown>('geo', dateRange);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if ((data as WithProviderError)?._error) {
		return <ProviderError message={(data as WithProviderError)._error as string} />;
	}

	return <RankedBars rows={groupRows(toRows(data), (row) => row.country_code ?? '')} icon="public" emptyMessage={__('No visits in this period.')} />;
};

export const TopReferrersCard = ({ dateRange }: CardProps) => {
	const { data, isLoading, isError } = useStats<unknown>('referrers', dateRange);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if ((data as WithProviderError)?._error) {
		return <ProviderError message={(data as WithProviderError)._error as string} />;
	}

	return <RankedBars rows={groupRows(toRows(data), (row) => row.referrer_domain || row.referrer || '')} icon="link" emptyMessage={__('No referrers in this period.')} />;
};

const DEVICE_ICONS: Record<string, string> = { desktop: 'desktop', mobile: 'mobile', tablet: 'tablet' };

export const DeviceUsageCard = ({ dateRange }: CardProps) => {
	const { data, isLoading, isError } = useStats<unknown>('devices', dateRange);

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError) {
		return <CardError />;
	}

	if ((data as WithProviderError)?._error) {
		return <ProviderError message={(data as WithProviderError)._error as string} />;
	}

	const rows = groupRows(toRows(data), (row) => row.device_type ?? 'unknown', 5);

	if (!rows.length) {
		return <CardEmpty icon="desktop" message={__('No visits in this period.')} />;
	}

	const total = rows.reduce((sum, row) => sum + row.views, 0) || 1;

	return (
		<ul className="space-y-3">
			{rows.map((row) => (
				<li key={row.key} className="flex items-center gap-3">
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
						<Icon name={DEVICE_ICONS[row.key] ?? 'desktop'} className="text-theme-md" />
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-3 text-theme-sm">
							<span className="capitalize text-gray-700 dark:text-gray-300">{row.key}</span>
							<span className="font-medium text-gray-800 dark:text-white/90">{Math.round((row.views / total) * 100)}%</span>
						</div>
						<div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
							<div className="h-full rounded-full bg-brand-500" style={{ width: `${(row.views / total) * 100}%` }} />
						</div>
					</div>
				</li>
			))}
		</ul>
	);
};

type ActiveUsers = { active_users?: number; by_page?: { page_url: string; active_users: number }[] };

export const ActiveUsersCard = () => {
	// The server needs the reader's clock to decide who still counts as active.
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const { data, isLoading, isError } = useCardQuery<ActiveUsers & WithProviderError>(['analytics', 'active-users', timezone], 'flexify-dashboard/v1/analytics/active-users', {
		timezone,
		browser_time: new Date().toISOString(),
	});

	if (isLoading) {
		return <CardLoading rows={2} />;
	}

	if (isError) {
		return <CardError />;
	}

	if (data?._error) {
		return <ProviderError message={data._error} />;
	}

	return (
		<div>
			<div className="flex items-center gap-3">
				<span className="relative flex h-3 w-3">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-60" />
					<span className="relative inline-flex h-3 w-3 rounded-full bg-success-500" />
				</span>
				<p className="text-title-sm font-bold text-gray-900 dark:text-gray-100">{compactNumber(data?.active_users ?? 0)}</p>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('right now')}</p>
			</div>

			{data?.by_page?.length ? (
				<ul className="mt-4 space-y-2">
					{data.by_page.slice(0, 5).map((page) => (
						<li key={page.page_url} className="flex items-center justify-between gap-3 text-theme-sm">
							<span className="min-w-0 truncate text-gray-700 dark:text-gray-300">{page.page_url}</span>
							<span className="shrink-0 font-medium text-gray-800 dark:text-white/90">{page.active_users}</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
};

type ChartPayload = { labels?: string[]; datasets?: { label: string; data: number[] }[] };

export const PageViewsChartCard = ({ dateRange }: CardProps) => {
	const isDark = useIsDark();
	const { fromIso, toIso } = useRange(dateRange);

	const { data, isLoading, isError } = useCardQuery<ChartPayload & WithProviderError>(['analytics', 'chart', fromIso, toIso], 'flexify-dashboard/v1/analytics/chart', {
		start_date: fromIso,
		end_date: toIso,
		chart_type: 'both',
	});

	if (isLoading) {
		return <Skeleton className="h-64 w-full" />;
	}

	if (isError) {
		return <CardError />;
	}

	if (data?._error) {
		return <ProviderError message={data._error} />;
	}

	const series = (data?.datasets ?? []).map((dataset) => ({ name: dataset.label, data: dataset.data }));

	if (!series.length) {
		return <CardEmpty icon="equalizer" message={__('No page views in this period.')} />;
	}

	const options = {
		chart: { type: 'area' as const, toolbar: { show: false }, fontFamily: 'inherit', foreColor: isDark ? '#98A2B3' : '#667085', animations: { enabled: false } },
		colors: ['#008aff', '#12b76a'],
		dataLabels: { enabled: false },
		stroke: { curve: 'smooth' as const, width: 2 },
		fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 90, 100] } },
		grid: { borderColor: isDark ? '#1D2939' : '#F2F4F7', strokeDashArray: 4, xaxis: { lines: { show: false } } },
		xaxis: { categories: data?.labels ?? [], axisBorder: { show: false }, axisTicks: { show: false } },
		tooltip: { theme: isDark ? 'dark' : 'light' },
		legend: { position: 'top' as const, horizontalAlign: 'right' as const },
	};

	return (
		<Suspense fallback={<Skeleton className="h-64 w-full" />}>
			{/* Remounting on theme change is what makes Apex pick up the new colours. */}
			<ReactApexChart key={isDark ? 'dark' : 'light'} options={options} series={series} type="area" height={256} />
		</Suspense>
	);
};


