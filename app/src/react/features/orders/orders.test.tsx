import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { PageShell } from '@/react/app/PageShell';
import { WooProvider } from '@/react/woo/WooProvider';
import { OrdersList } from '@/react/features/orders/OrdersList';
import { customerName, formatAddress, itemsCount, safeHtml, totalRefunded } from '@/react/features/orders/orderFormat';
import type { Address, Order, StoreData } from '@/react/woo/types';
import type { WpData } from '@/react/types/wordpress';

const store: Partial<StoreData> = {
	active: true,
	currency: { code: 'BRL', symbol: 'R$', position: 'left_space', thousand_separator: '.', decimal_separator: ',', decimals: 2 },
	order_statuses: [
		{ value: 'pending', label: 'Pagamento pendente', color: 'warning' },
		{ value: 'processing', label: 'Processando', color: 'primary' },
		{ value: 'on-hold', label: 'Aguardando', color: 'light' },
		{ value: 'completed', label: 'Concluído', color: 'success' },
	],
	payment_gateways: [{ value: 'pix', label: 'Pix' }],
	capabilities: { edit_shop_orders: true, delete_shop_orders: true },
	urls: { new_order: 'https://site.test/wp-admin/post-new.php', users: 'https://site.test/wp-admin/users.php' },
};

const wpData: WpData = {
	pluginBase: 'https://site.test/plugin/',
	restBase: 'https://site.test/wp-json/',
	restNonce: 'nonce123',
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
	page: { woocommerce: store },
};

const address = (overrides: Partial<Address> = {}): Address => ({
	first_name: '',
	last_name: '',
	company: '',
	address_1: '',
	address_2: '',
	city: '',
	state: '',
	postcode: '',
	country: '',
	email: '',
	phone: '',
	...overrides,
});

const order = (overrides: Partial<Order> & Pick<Order, 'id' | 'number'>): Order => ({
	status: 'processing',
	currency: 'BRL',
	date_created: '2026-10-07T12:00:00',
	total: '100.00',
	customer_id: 0,
	billing: address(),
	shipping: address(),
	line_items: [],
	...overrides,
});

const ORDERS: Order[] = [
	order({
		id: 1200,
		number: '1200',
		billing: address({ first_name: 'Ana', last_name: 'Souza', email: 'ana@example.com' }),
		line_items: [{ id: 1, name: 'Camiseta', product_id: 9, quantity: 2, sku: 'TSH', price: 30, subtotal: '60.00', total: '60.00' }],
		refunds: [{ id: 5, reason: '', total: '-10.00' }],
	}),
	order({ id: 1199, number: '1199', status: 'pending', billing: address({ company: 'Loja XPTO' }) }),
];

const SUMMARY = { total: 2, counts: { pending: 1, processing: 1, 'on-hold': 0 }, period: { net_revenue: 190, orders_count: 2 } };

/** Answer the requests the screen makes, recording each query so filters can be asserted. */
const stubRest = () => {
	const calls: string[] = [];

	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			calls.push(`${url.pathname}${url.search}`);

			const isSummary = url.pathname.includes('orders/summary');
			const status = url.searchParams.get('status');
			const body = isSummary ? SUMMARY : ORDERS.filter((item) => !status || status === 'any' || item.status === status);

			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(Array.isArray(body) ? body.length : 0) },
			});
		})
	);

	return calls;
};

const renderList = () =>
	render(
		<AppProviders wpData={wpData}>
			<WooProvider>
				<HashRouter>
					<PageShell>
						<OrdersList />
					</PageShell>
				</HashRouter>
			</WooProvider>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.location.hash = '';
});

describe('orderFormat', () => {
	it('falls back from the customer name to the company and the email', () => {
		expect(customerName(ORDERS[0])).toBe('Ana Souza');
		expect(customerName(ORDERS[1])).toBe('Loja XPTO');
		expect(customerName(order({ id: 1, number: '1', billing: address({ email: 'guest@example.com' }) }))).toBe('guest@example.com');
		expect(customerName(order({ id: 1, number: '1' }))).toBe('Guest');
	});

	it('counts items and refunds as positive amounts', () => {
		expect(itemsCount(ORDERS[0])).toBe(2);
		expect(totalRefunded(ORDERS[0])).toBe(10);
		expect(totalRefunded(ORDERS[1])).toBe(0);
	});

	it('drops empty address lines', () => {
		expect(formatAddress(address({ first_name: 'Ana', address_1: 'Rua 1', city: 'São Paulo', state: 'SP', postcode: '01000' }))).toEqual([
			'Ana',
			'Rua 1',
			'São Paulo, SP, 01000',
		]);
	});

	it('strips scripts and unsafe links from note HTML', () => {
		const clean = safeHtml('<p>Oi <b>Ana</b><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="https://site.test">ok</a></p>');

		expect(clean).not.toContain('script');
		expect(clean).not.toContain('javascript:');
		expect(clean).toContain('<b>Ana</b>');
		expect(clean).toContain('href="https://site.test"');
		expect(clean).toContain('rel="noopener noreferrer"');
	});
});

describe('OrdersList', () => {
	it('shows the counters, the revenue of the period and the rows', async () => {
		stubRest();
		renderList();

		expect(await screen.findByText('#1200')).toBeInTheDocument();
		expect(screen.getByText('Ana Souza')).toBeInTheDocument();

		const revenue = screen.getByText(/Net revenue/).closest('div');
		expect(within(revenue as HTMLElement).getByText('R$ 190,00')).toBeInTheDocument();
		expect(screen.getByText('R$ 10,00 refunded')).toBeInTheDocument();
	});

	it('sends the status filter to the API and keeps it in the address bar', async () => {
		const user = userEvent.setup();
		const calls = stubRest();
		renderList();

		await screen.findByText('#1200');
		await user.click(screen.getByRole('tab', { name: /Pagamento pendente/ }));

		await waitFor(() => expect(calls.some((call) => call.includes('status=pending'))).toBe(true));
		expect(window.location.hash).toContain('status=pending');
		await waitFor(() => expect(screen.queryByText('#1200')).not.toBeInTheDocument());
	});

	it('opens the quick preview with the order totals', async () => {
		const user = userEvent.setup();
		stubRest();
		const { container } = renderList();

		await screen.findByText('#1200');
		await user.click(screen.getAllByRole('button', { name: 'Quick preview' })[0]);

		const dialog = await screen.findByRole('dialog', { name: 'Order #1200' });
		expect(container.querySelector('#fd-kit-portal')?.contains(dialog)).toBe(true);
		expect(within(dialog).getByText('Camiseta')).toBeInTheDocument();

		await user.click(within(dialog).getByRole('button', { name: 'Close' }));

		// A closed overlay left behind would cover the page and swallow every click.
		await waitFor(() => expect(container.querySelector('#fd-kit-portal')?.children.length).toBe(0));
	});
});
