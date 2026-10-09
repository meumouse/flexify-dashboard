import { lazy, Suspense } from 'react';
import { useIsDark } from '@/react/app/ThemeProvider';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Icon, ProgressBar, Skeleton } from '@/react/ui';
import { formatBytes } from '@/react/features/media/queries';
import { CardError, CardLoading, StatRow, compactNumber, useCardQuery, useRange, type CardProps } from '@/react/features/dashboard/cards/shared';

/**
 * Cards about the site itself: its media library, the health of the server and how the user
 * base is growing.
 */

const ReactApexChart = lazy(() => import('react-apexcharts'));

type MediaAnalytics = {
	total_files?: number;
	/** Raw bytes; `total_size_formatted` is the one meant to be read */
	total_size?: number;
	total_size_formatted?: string;
	recent_uploads?: number;
	unused_media?: number;
	large_files?: number;
	file_types?: { type: string; count: number }[];
};

export const MediaAnalyticsCard = () => {
	const { data, isLoading, isError } = useCardQuery<MediaAnalytics>(['media-analytics'], 'flexify-dashboard/v1/media-analytics');

	if (isLoading) {
		return <CardLoading />;
	}

	if (isError || !data) {
		return <CardError />;
	}

	return (
		<div>
			<StatRow
				stats={[
					{ label: __('Files'), value: compactNumber(data.total_files ?? 0), icon: 'photo_library' },
					{ label: __('Size'), value: data.total_size_formatted ?? formatBytes(data.total_size ?? 0), icon: 'storage' },
					{ label: __('Recent'), value: compactNumber(data.recent_uploads ?? 0), icon: 'schedule' },
				]}
			/>

			<dl className="space-y-2 text-theme-sm">
				<div className="flex justify-between gap-4">
					<dt className="text-gray-500 dark:text-gray-400">{__('Unused media')}</dt>
					<dd className="font-medium text-gray-800 dark:text-white/90">{compactNumber(data.unused_media ?? 0)}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt className="text-gray-500 dark:text-gray-400">{__('Large files')}</dt>
					<dd className="font-medium text-gray-800 dark:text-white/90">{compactNumber(data.large_files ?? 0)}</dd>
				</div>
			</dl>

			{data.file_types?.length ? (
				<div className="mt-4 flex flex-wrap gap-2">
					{data.file_types.map((type) => (
						<span key={type.type} className="rounded-full bg-gray-100 px-2.5 py-1 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
							{type.type} · {compactNumber(type.count)}
						</span>
					))}
				</div>
			) : null}
		</div>
	);
};

type ServerHealth = {
	wordpress?: { version?: string; core_updates?: number; ssl_status?: string; timezone?: string };
	php?: { version?: string; memory_usage?: number; memory_limit?: number };
	server?: { disk_space?: { used: number; total: number } };
	plugins?: { updates_available?: number };
	themes?: { updates_available?: number };
};

/** A usage bar that turns amber past three quarters and red past nine tenths. */
const UsageBar = ({ used, total, label }: { used: number; total: number; label: string }) => {
	const percent = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
	const tone = percent >= 90 ? 'error' : percent >= 75 ? 'warning' : 'success';

	return (
		<div>
			<div className="mb-1 flex items-center justify-between text-theme-xs">
				<span className="text-gray-500 dark:text-gray-400">{label}</span>
				<span className="font-medium text-gray-800 dark:text-white/90">{percent}%</span>
			</div>
			<ProgressBar value={percent} tone={tone} size="sm" label={label} />
		</div>
	);
};

export const ServerHealthCard = () => {
	const { data, isLoading, isError } = useCardQuery<ServerHealth>(['server-health'], 'flexify-dashboard/v1/server-health');

	if (isLoading) {
		return <CardLoading rows={4} />;
	}

	if (isError || !data) {
		return <CardError />;
	}

	const updates = (data.plugins?.updates_available ?? 0) + (data.themes?.updates_available ?? 0) + (data.wordpress?.core_updates ?? 0);
	const disk = data.server?.disk_space;

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-2 gap-4 text-theme-sm">
				<div>
					<p className="text-gray-500 dark:text-gray-400">{__('WordPress')}</p>
					<p className="font-medium text-gray-800 dark:text-white/90">{data.wordpress?.version ?? '—'}</p>
				</div>
				<div>
					<p className="text-gray-500 dark:text-gray-400">{__('PHP')}</p>
					<p className="font-medium text-gray-800 dark:text-white/90">{data.php?.version ?? '—'}</p>
				</div>
			</div>

			{data.php?.memory_limit ? <UsageBar used={data.php.memory_usage ?? 0} total={data.php.memory_limit} label={sprintf(__('Memory: %sMB of %sMB'), String(data.php.memory_usage ?? 0), String(data.php.memory_limit))} /> : null}
			{disk ? <UsageBar used={disk.used} total={disk.total} label={sprintf(__('Disk: %sGB of %sGB'), String(disk.used), String(disk.total))} /> : null}

			<div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-theme-sm dark:bg-white/[0.03]">
				<Icon name={updates ? 'update' : 'check_circle'} className={cn('text-theme-md', updates ? 'text-warning-500' : 'text-success-500')} />
				<span className="text-gray-700 dark:text-gray-300">{updates ? sprintf(__('%d update(s) available'), updates) : __('Everything is up to date')}</span>
			</div>

			<dl className="space-y-2 text-theme-sm">
				<div className="flex justify-between gap-4">
					<dt className="text-gray-500 dark:text-gray-400">{__('SSL')}</dt>
					<dd className="font-medium text-gray-800 dark:text-white/90">{data.wordpress?.ssl_status ?? '—'}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt className="text-gray-500 dark:text-gray-400">{__('Timezone')}</dt>
					<dd className="font-medium text-gray-800 dark:text-white/90">{data.wordpress?.timezone ?? '—'}</dd>
				</div>
			</dl>
		</div>
	);
};

type UserAnalytics = {
	total_users?: number;
	users_in_range?: number;
	recent_users?: number;
	chart_data?: { labels: string[]; datasets: { label: string; data: number[] }[] };
};

export const UsersChartCard = ({ dateRange }: CardProps) => {
	const isDark = useIsDark();
	const { fromIso, toIso } = useRange(dateRange);

	const { data, isLoading, isError } = useCardQuery<UserAnalytics>(['user-analytics', fromIso, toIso], 'flexify-dashboard/v1/user-analytics', {
		start_date: fromIso,
		end_date: toIso,
	});

	if (isLoading) {
		return <CardLoading rows={4} />;
	}

	if (isError || !data) {
		return <CardError />;
	}

	const chart = data.chart_data;
	const series = (chart?.datasets ?? []).map((dataset) => ({ name: dataset.label, data: dataset.data }));

	const options = {
		chart: { type: 'bar' as const, toolbar: { show: false }, fontFamily: 'inherit', foreColor: isDark ? '#98A2B3' : '#667085', animations: { enabled: false } },
		colors: ['#008aff'],
		plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
		dataLabels: { enabled: false },
		grid: { borderColor: isDark ? '#1D2939' : '#F2F4F7', strokeDashArray: 4, xaxis: { lines: { show: false } } },
		xaxis: { categories: chart?.labels ?? [], axisBorder: { show: false }, axisTicks: { show: false } },
		tooltip: { theme: isDark ? 'dark' : 'light' },
		legend: { show: false },
	};

	return (
		<div>
			<StatRow
				stats={[
					{ label: __('Total'), value: compactNumber(data.total_users ?? 0), icon: 'group' },
					{ label: __('In period'), value: compactNumber(data.users_in_range ?? 0), icon: 'person' },
					{ label: __('Recent'), value: compactNumber(data.recent_users ?? 0), icon: 'schedule' },
				]}
			/>

			{series.length ? (
				<Suspense fallback={<Skeleton className="h-48 w-full" />}>
					{/* Remounting on theme change is what makes Apex pick up the new colours. */}
					<ReactApexChart key={isDark ? 'dark' : 'light'} options={options} series={series} type="bar" height={200} />
				</Suspense>
			) : null}
		</div>
	);
};
