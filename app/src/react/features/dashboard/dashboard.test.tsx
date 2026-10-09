import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProviders } from '@/react/app/AppProviders';
import { StoreChannelsCard, StoreMetricsCard, StoreRecentOrdersCard, StoreTargetCard, StoreTopProductsCard } from '@/react/features/dashboard/cards/ecommerce';
import { sparklinePoints, targetProgress } from '@/react/features/dashboard/charts';
import { applyStoredLayout, clampWidth, type DashboardCard } from '@/react/features/dashboard/useDashboardLayout';
import { isoDate, parseDay, rangeForDays } from '@/react/features/dashboard/useWooDashboard';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: 'https://site.test/plugin/',
	restBase: 'https://site.test/wp-json/',
	restNonce: '',
	adminUrl: 'https://site.test/wp-admin/',
	loginUrl: '',
	siteUrl: 'https://site.test/',
	userId: 1,
	userName: 'Maria',
	userEmail: '',
	userRoles: ['administrator'],
	canManageOptions: true,
	currentUser: null,
	settings: {},
	page: {},
};

const METRICS = {
	success: true,
	woocommerce_active: true,
	metrics: {
		revenue: { gross: 4821, net: 4512, chart_data: { interval: 'day', labels: ['01/10'], datasets: [{ label: 'Receita', data: [4512] }] } },
		top_products: [{ product_id: 201, name: 'Camiseta', quantity: 48, revenue: 2875 }],
		recent_orders: [{ id: 1200, number: '1200', customer_name: 'Ana Souza', total: 85.8, status: { slug: 'processing', label: 'Processando' }, created_at: '2026-10-07T10:00:00Z' }],
		average_ticket: 297.6,
		orders_received: 162,
		customers: { total: 118, previous_total: 103, change_percentage: 14.56, trend: 'up' },
		comparison: { revenue: 12.4, orders: 8.1, average_ticket: -3.6 },
		channels: [{ key: 'direct', label: 'Direto', orders: 74, revenue: 3000 }],
		month: { target: 10000, revenue: 4500, today: 300, previous: 4000 },
		currency: 'BRL',
	},
};

const stubRest = (body: unknown = METRICS) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
	);

const renderCard = (card: React.ReactNode) =>
	render(
		<AppProviders wpData={wpData}>
			<div>{card}</div>
		</AppProviders>
	);

const range: [Date, Date] = [new Date(2026, 9, 1), new Date(2026, 9, 7)];

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('dashboard period helpers', () => {
	it('formats a date the way the endpoint expects', () => {
		expect(isoDate(new Date(2026, 9, 7))).toBe('2026-10-07');
		expect(isoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
	});

	it('builds a range that includes today', () => {
		const built = rangeForDays(7);

		expect(Math.round((built.to.getTime() - built.from.getTime()) / 86_400_000)).toBe(6);
	});

	it('reads a day back as the same day, whatever the timezone', () => {
		// Read as UTC midnight this lands on the day before anywhere west of Greenwich.
		expect(isoDate(parseDay('2026-10-07') as Date)).toBe('2026-10-07');
		expect(isoDate(parseDay('2026-01-01') as Date)).toBe('2026-01-01');
		expect(parseDay('')).toBeNull();
		expect(parseDay('not a date')).toBeNull();
	});
});

describe('useDashboardLayout helpers', () => {
	it('keeps a card width inside the grid', () => {
		expect(clampWidth(20, 4)).toBe(12);
		expect(clampWidth(1, 4)).toBe(3);
		expect(clampWidth('oito', 6)).toBe(6);
	});

	const card = (id: string, width = 4): DashboardCard => ({ component: () => null, metadata: { id, width, mobileWidth: 12 } });

	it('applies the saved order and widths, and puts new cards last', () => {
		const result = applyStoredLayout(
			{ site: [card('a'), card('b'), card('new')] },
			{ categories: { site: { order: ['b', 'a'], widths: { b: 8 } } } }
		);

		expect(result.site.map((entry) => entry.metadata.id)).toEqual(['b', 'a', 'new']);
		expect(result.site[0].metadata.width).toBe(8);
	});

	it('ignores an order that mentions cards the site no longer has', () => {
		const result = applyStoredLayout({ site: [card('a')] }, { categories: { site: { order: ['gone', 'a'] } } });

		expect(result.site.map((entry) => entry.metadata.id)).toEqual(['a']);
	});
});

describe('store cards', () => {
	it('shows the metrics of the period', async () => {
		stubRest();
		renderCard(<StoreMetricsCard dateRange={range} />);

		// The amount is formatted for whatever locale the runner uses, so only the digits matter.
		expect(await screen.findByText(/4[.,]512/)).toBeInTheDocument();
		expect(screen.getByText('162')).toBeInTheDocument();
		expect(screen.getByText('118')).toBeInTheDocument();
	});

	it('lists what sold and the orders that came in', async () => {
		stubRest();
		renderCard(
			<>
				<StoreTopProductsCard dateRange={range} />
				<StoreRecentOrdersCard dateRange={range} />
			</>
		);

		expect(await screen.findByText('Camiseta')).toBeInTheDocument();
		expect(await screen.findByText('#1200')).toBeInTheDocument();
		expect(screen.getByText('Ana Souza')).toBeInTheDocument();
	});

	it('says so when WooCommerce is off instead of drawing empty metrics', async () => {
		stubRest({ success: true, woocommerce_active: false, metrics: {} });
		renderCard(<StoreMetricsCard dateRange={range} />);

		expect(await screen.findByText('WooCommerce is not active')).toBeInTheDocument();
		expect(screen.queryByText('162')).not.toBeInTheDocument();
	});
});

describe('small charts', () => {
	it('fits a series into the box, oldest on the left and highest at the top', () => {
		const points = sparklinePoints([0, 10, 5], 100, 20, 0).split(' ');

		expect(points).toEqual(['0,20', '50,0', '100,10']);
	});

	it('draws a flat series across the middle, and nothing for a single value', () => {
		expect(sparklinePoints([4, 4], 100, 20, 0)).toBe('0,10 100,10');
		expect(sparklinePoints([4], 100, 20)).toBe('');
	});

	it('measures a target, past 100 when it is beaten, and 0 without one', () => {
		expect(targetProgress(4500, 10000)).toBe(45);
		expect(targetProgress(12000, 10000)).toBe(120);
		expect(targetProgress(500, 0)).toBe(0);
	});
});

describe('store comparison and target', () => {
	it('puts the change against the previous period under each figure', async () => {
		stubRest();
		renderCard(<StoreMetricsCard dateRange={range} />);

		expect(await screen.findByText('12.4%')).toBeInTheDocument();
		expect(screen.getByText('3.6%')).toBeInTheDocument();
		expect(screen.getAllByText('vs previous period')).toHaveLength(4);
	});

	it('measures the month against the target', async () => {
		stubRest();
		renderCard(<StoreTargetCard dateRange={range} />);

		expect(await screen.findByText('45%')).toBeInTheDocument();
		expect(screen.getByText(/ahead of the/)).toBeInTheDocument();
	});

	it('asks for a target when there is none instead of drawing an empty gauge', async () => {
		stubRest({ ...METRICS, metrics: { ...METRICS.metrics, month: { target: 0, revenue: 4500, today: 300, previous: 4000 } } });
		renderCard(<StoreTargetCard dateRange={range} />);

		expect(await screen.findByText('No monthly target yet')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Set a target' })).toHaveAttribute('href', expect.stringContaining('category=woocommerce'));
	});

	it('lists the channels with their orders', async () => {
		stubRest();
		renderCard(<StoreChannelsCard dateRange={range} />);

		expect(await screen.findByText('Direto')).toBeInTheDocument();
		expect(screen.getByText('74 orders')).toBeInTheDocument();
	});
});
