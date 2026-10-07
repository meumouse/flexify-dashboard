import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/react/app/AppProviders';
import { StoreDashboard } from '@/react/features/dashboard/StoreDashboard';
import { isoDate, rangeForDays } from '@/react/features/dashboard/useWooDashboard';
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
		revenue: {
			gross: 4821,
			net: 4512,
			chart_data: { interval: 'day', labels: ['01/10', '02/10'], datasets: [{ label: 'Receita', data: [1200, 3312], borderColor: '#008aff' }] },
		},
		top_products: [{ id: 201, name: 'Camiseta', quantity: 48, total: 2875 }],
		recent_orders: [{ id: 1200, number: '1200', customer: 'Ana Souza', total: 85.8, status: { label: 'Processando', color: 'primary' }, date: '2026-10-07' }],
		average_ticket: 297.6,
		orders_received: 162,
		customers: { total: 118, previous_total: 103, change_percentage: 14.56, trend: 'up' },
		currency: 'BRL',
	},
};

const stubRest = (body: unknown = METRICS) => {
	const calls: string[] = [];

	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			calls.push(`${url.pathname}${url.search}`);

			return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
		})
	);

	return calls;
};

const renderDashboard = () =>
	render(
		<AppProviders wpData={wpData}>
			<StoreDashboard />
		</AppProviders>
	);

afterEach(() => vi.unstubAllGlobals());

describe('useWooDashboard helpers', () => {
	it('formats a date the way the endpoint expects', () => {
		expect(isoDate(new Date(2026, 9, 7))).toBe('2026-10-07');
		expect(isoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
	});

	it('builds a range that includes today', () => {
		const range = rangeForDays(7);
		const span = Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000);

		expect(span).toBe(6);
	});
});

describe('StoreDashboard', () => {
	it('shows the period metrics and what sold', async () => {
		stubRest();
		renderDashboard();

		// The amount is formatted for whatever locale the runner uses, so only the digits matter.
		expect(await screen.findByText(/4[.,]512/)).toBeInTheDocument();
		expect(screen.getByText('162')).toBeInTheDocument();
		expect(screen.getByText('118')).toBeInTheDocument();
		expect(screen.getByText('Camiseta')).toBeInTheDocument();
		expect(screen.getByText('#1200')).toBeInTheDocument();
	});

	it('asks the endpoint for the chosen period', async () => {
		const user = userEvent.setup();
		const calls = stubRest();
		renderDashboard();

		await screen.findByText('162');
		await user.click(screen.getByRole('tab', { name: '7 days' }));

		await waitFor(() => expect(calls.length).toBeGreaterThan(1));

		const last = new URLSearchParams(calls[calls.length - 1].split('?')[1]);
		const span = Math.round((new Date(String(last.get('date_to'))).getTime() - new Date(String(last.get('date_from'))).getTime()) / 86_400_000);
		expect(span).toBe(6);
	});

	it('says so when WooCommerce is not active instead of showing empty metrics', async () => {
		stubRest({ success: true, woocommerce_active: false, metrics: {} });
		renderDashboard();

		expect(await screen.findByText('WooCommerce is not active')).toBeInTheDocument();
		expect(screen.queryByText('Recent orders')).not.toBeInTheDocument();
	});
});
