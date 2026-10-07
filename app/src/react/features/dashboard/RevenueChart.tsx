import { lazy, Suspense, useMemo } from 'react';
import { useIsDark } from '@/react/app/ThemeProvider';
import { __ } from '@/react/lib/i18n';
import { Card, Skeleton } from '@/react/ui';
import type { ChartDataset } from '@/react/features/dashboard/types';

/**
 * Revenue over the selected period.
 *
 * ApexCharts is loaded on demand: it is the heaviest dependency on the screen and only this
 * card needs it.
 */

const ReactApexChart = lazy(() => import('react-apexcharts'));

type Props = {
	labels: string[];
	datasets: ChartDataset[];
	currency: string;
	subtitle?: string;
	loading?: boolean;
	/** Render only the chart, for when the dashboard already drew the card around it */
	bare?: boolean;
};

export const RevenueChart = ({ labels, datasets, currency, subtitle, loading = false, bare = false }: Props) => {
	const isDark = useIsDark();

	const options = useMemo(
		() => ({
			chart: {
				type: 'area' as const,
				toolbar: { show: false },
				fontFamily: 'inherit',
				foreColor: isDark ? '#98A2B3' : '#667085',
				animations: { enabled: false },
			},
			colors: datasets.map((dataset) => dataset.borderColor ?? '#008aff'),
			dataLabels: { enabled: false },
			stroke: { curve: 'smooth' as const, width: 2 },
			fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 90, 100] } },
			grid: { borderColor: isDark ? '#1D2939' : '#F2F4F7', strokeDashArray: 4, xaxis: { lines: { show: false } } },
			xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } },
			yaxis: {
				labels: {
					formatter: (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value),
				},
			},
			tooltip: {
				theme: isDark ? 'dark' : 'light',
				y: { formatter: (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value) },
			},
			legend: { position: 'top' as const, horizontalAlign: 'right' as const, markers: { radius: 12 } },
		}),
		[currency, datasets, isDark, labels]
	);

	const series = datasets.map((dataset) => ({ name: dataset.label, data: dataset.data }));

	const chart = loading ? (
		<Skeleton className="h-72 w-full" />
	) : !series.length ? (
		<p className="py-16 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No revenue in this period.')}</p>
	) : (
		<Suspense fallback={<Skeleton className="h-72 w-full" />}>
			{/* Remounting on theme change is what makes Apex pick up the new colours. */}
			<ReactApexChart key={isDark ? 'dark' : 'light'} options={options} series={series} type="area" height={288} />
		</Suspense>
	);

	return bare ? (
		chart
	) : (
		<Card title={__('Revenue')} description={subtitle}>
			{chart}
		</Card>
	);
};
