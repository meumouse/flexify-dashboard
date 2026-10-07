import { useEffect, useRef } from 'react';
import { useIsDark } from '@/react/app/ThemeProvider';
import { useWpData } from '@/react/app/WpDataProvider';
import { __ } from '@/react/lib/i18n';
import { Button, Icon } from '@/react/ui';
import { CardEmpty, CardError, CardLoading, useCardQuery, useRange, type CardProps } from '@/react/features/dashboard/cards/shared';

/**
 * The two cards that depend on something outside the plugin: a Mapbox key and the Rank Math
 * plugin.
 */

type GeoRow = { country_code?: string; latitude?: number; longitude?: number; total_views?: number; views?: number };

export const AnalyticsMapCard = ({ dateRange }: CardProps) => {
	const isDark = useIsDark();
	const { settings, adminUrl } = useWpData();
	const { fromIso, toIso } = useRange(dateRange);
	const container = useRef<HTMLDivElement>(null);
	const token = (settings as { mapbox_api_key?: string }).mapbox_api_key;

	const { data, isLoading, isError } = useCardQuery<GeoRow[] | { data?: GeoRow[] }>(['analytics', 'geo-map', fromIso, toIso], 'flexify-dashboard/v1/analytics/stats', {
		start_date: fromIso,
		end_date: toIso,
		stat_type: 'geo',
	});

	const rows = Array.isArray(data) ? data : (data?.data ?? []);

	useEffect(() => {
		if (!token || !container.current || !rows.length) {
			return;
		}

		let map: { remove: () => void } | null = null;
		let cancelled = false;

		// Mapbox is heavy and only this card needs it, so it loads when the card has a key.
		import('mapbox-gl').then((mapbox) => {
			if (cancelled || !container.current) {
				return;
			}

			mapbox.default.accessToken = token;

			const instance = new mapbox.default.Map({
				container: container.current,
				style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
				center: [0, 20],
				zoom: 1,
				attributionControl: false,
			});

			rows.forEach((row) => {
				if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') {
					return;
				}

				new mapbox.default.Marker({ color: '#008aff' })
					.setLngLat([row.longitude, row.latitude])
					.setPopup(new mapbox.default.Popup().setText(`${row.country_code ?? ''}: ${row.total_views ?? row.views ?? 0}`))
					.addTo(instance);
			});

			map = instance as unknown as { remove: () => void };
		});

		return () => {
			cancelled = true;
			map?.remove();
		};
	}, [isDark, rows, token]);

	if (!token) {
		return (
			<div className="py-8 text-center">
				<Icon name="public" className="mx-auto mb-3 text-3xl text-gray-300 dark:text-gray-600" />
				<p className="mb-4 text-theme-sm text-gray-500 dark:text-gray-400">{__('Add a Mapbox key to see where your visitors are.')}</p>
				<Button size="sm" variant="outline" href={`${adminUrl}admin.php?page=flexify-dashboard-settings`}>
					{__('Open settings')}
				</Button>
			</div>
		);
	}

	if (isLoading) {
		return <CardLoading rows={4} />;
	}

	if (isError) {
		return <CardError />;
	}

	if (!rows.length) {
		return <CardEmpty icon="public" message={__('No visits in this period.')} />;
	}

	return <div ref={container} className="h-72 w-full overflow-hidden rounded-xl" />;
};

type RankMathItem = { label: string; value: string | number };

type RankMathSection = {
	enabled?: boolean;
	title?: string;
	subtitle?: string;
	report_url?: string;
	view_report_label?: string;
	items?: RankMathItem[];
};

type RankMathWidget = {
	plugin?: { version?: string; pro_active?: boolean };
	widget?: { title?: string };
	sections?: Record<string, RankMathSection>;
};

export const RankMathCard = () => {
	const { data, isLoading, isError } = useCardQuery<RankMathWidget>(['rank-math'], 'flexify-dashboard/v1/rank-math/dashboard-widget');

	if (isLoading) {
		return <CardLoading rows={3} />;
	}

	if (isError || !data?.plugin?.version) {
		return <CardEmpty icon="search" message={__('Rank Math is not available on this site.')} />;
	}

	const sections = Object.entries(data.sections ?? {}).filter(([, section]) => section.enabled);

	if (!sections.length) {
		return <CardEmpty icon="search" message={__('No Rank Math sections are enabled.')} />;
	}

	return (
		<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			{sections.map(([key, section]) => (
				<section key={key}>
					<div className="mb-3 flex items-start justify-between gap-3">
						<div className="min-w-0">
							<h4 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{section.title ?? key}</h4>
							{section.subtitle ? <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{section.subtitle}</p> : null}
						</div>
						{section.report_url ? (
							<a href={section.report_url} className="shrink-0 text-theme-xs font-medium text-brand-500 hover:text-brand-600">
								{section.view_report_label ?? __('View report')}
							</a>
						) : null}
					</div>

					<dl className="space-y-2 text-theme-sm">
						{(section.items ?? []).map((item) => (
							<div key={item.label} className="flex justify-between gap-4">
								<dt className="truncate text-gray-500 dark:text-gray-400">{item.label}</dt>
								<dd className="shrink-0 font-medium text-gray-800 dark:text-white/90">{item.value}</dd>
							</div>
						))}
					</dl>
				</section>
			))}
		</div>
	);
};
