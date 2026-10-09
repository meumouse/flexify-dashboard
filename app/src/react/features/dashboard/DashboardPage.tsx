import { useEffect, useMemo, useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, Checkbox, DateRangePicker, EmptyState, Modal, PageHeader, Tabs, recentPresets } from '@/react/ui';
import { DashboardGrid } from '@/react/features/dashboard/DashboardGrid';
import { useDashboardLayout } from '@/react/features/dashboard/useDashboardLayout';
import { isoDate, parseDay as parseDate } from '@/react/features/dashboard/useWooDashboard';

/**
 * The dashboard: the cards registered for a category, over the period the user picked.
 *
 * Both the period and the category travel in the address bar, so a particular view can be
 * linked to and survives a reload.
 */

const initialRange = (): [Date, Date] => {
	const params = new URLSearchParams(window.location.search);
	const from = parseDate(params.get('date_from'));
	const to = parseDate(params.get('date_to'));

	if (from && to) {
		return [from, to];
	}

	const start = new Date();
	start.setDate(start.getDate() - 6);

	return [start, new Date()];
};

export const DashboardPage = () => {
	const wp = useWpData();
	const { categories, category, setCategory, cards, visibleCards, hiddenIds, move, resize, setVisible } = useDashboardLayout();

	const [range, setRange] = useState<[Date, Date]>(initialRange);
	const [visibilityOpen, setVisibilityOpen] = useState(false);

	// The period is part of the address so the view can be shared and reloaded.
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		params.set('date_from', isoDate(range[0]));
		params.set('date_to', isoDate(range[1]));

		window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
	}, [range]);

	useEffect(() => {
		if (!category) {
			return;
		}

		const params = new URLSearchParams(window.location.search);
		params.set('dashboard_category', category);

		window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
	}, [category]);

	const days = useMemo(() => Math.round((range[1].getTime() - range[0].getTime()) / 86_400_000) + 1, [range]);

	// Cards keep the props the Vue dashboard passed them: the period as a pair, and a store-shaped
	// object, because a card reads `appData.state.adminUrl` to build its links.
	const cardProps = useMemo(() => ({ dateRange: range, appData: { state: { adminUrl: wp.adminUrl, siteUrl: wp.siteUrl, pluginBase: wp.pluginBase, userID: wp.userId } } }), [range, wp]);

	return (
		<div>
			<PageHeader
				title={__('Dashboard')}
				description={sprintf(__('Last %s days'), String(days))}
				actions={
					<>
						<DateRangePicker
							value={{ from: isoDate(range[0]), to: isoDate(range[1]) }}
							onChange={(next) => setRange([parseDate(next.from) ?? range[0], parseDate(next.to) ?? range[1]])}
							presets={recentPresets()}
							max={isoDate(new Date())}
							required
							align="end"
							className="w-full sm:w-auto"
							aria-label={__('Period')}
						/>
						<Button variant="outline" icon="view_column" onClick={() => setVisibilityOpen(true)}>
							{__('Cards')}
						</Button>
					</>
				}
			/>

			{categories.length > 1 ? (
				<Tabs
					className="mb-6"
					value={category ?? categories[0]?.id ?? ''}
					onChange={setCategory}
					ariaLabel={__('Dashboard sections')}
					items={categories.map((entry) => ({ value: entry.id, label: entry.label }))}
				/>
			) : null}

			{visibleCards.length ? (
				<DashboardGrid cards={visibleCards} cardProps={cardProps} onMove={move} onResize={resize} />
			) : (
				<Card>
					<EmptyState
						icon="dashboard"
						title={cards.length ? __('Every card is hidden') : __('No cards here yet')}
						description={cards.length ? __('Bring one back to see it on the dashboard again.') : __('Cards registered by the plugin and its extensions appear here.')}
					>
						{cards.length ? <Button onClick={() => setVisibilityOpen(true)}>{__('Choose cards')}</Button> : null}
					</EmptyState>
				</Card>
			)}

			<Modal open={visibilityOpen} onOpenChange={setVisibilityOpen} title={__('Cards on the dashboard')} description={__('Pick what this section shows.')}>
				<div className="space-y-3">
					{cards.map((card) => (
						<Checkbox
							key={card.metadata.id}
							checked={!hiddenIds.has(card.metadata.id)}
							onCheckedChange={(checked) => setVisible(card.metadata.id, checked)}
							label={String(card.metadata.title ?? card.metadata.id)}
						/>
					))}
					{!cards.length ? <p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No cards registered for this section.')}</p> : null}
				</div>
			</Modal>
		</div>
	);
};
