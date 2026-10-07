import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { PageShell } from '@/react/app/PageShell';
import { WooProvider } from '@/react/woo/WooProvider';
import { ProductEditor } from '@/react/features/products/editor/ProductEditor';
import { OrderEditor } from '@/react/features/orders/OrderEditor';
import { buildCombos, comboKey, missingCombos } from '@/react/features/products/editor/variationCombos';
import type { Address, Order, Product, StoreData } from '@/react/woo/types';
import type { WpData } from '@/react/types/wordpress';

const store: Partial<StoreData> = {
	active: true,
	currency: { code: 'BRL', symbol: 'R$', position: 'left_space', thousand_separator: '.', decimal_separator: ',', decimals: 2 },
	product_types: [
		{ value: 'simple', label: 'Produto simples' },
		{ value: 'variable', label: 'Produto variável' },
	],
	stock_statuses: [{ value: 'instock', label: 'Em estoque' }],
	order_statuses: [
		{ value: 'pending', label: 'Pagamento pendente' },
		{ value: 'processing', label: 'Processando' },
	],
	payment_gateways: [{ value: 'pix', label: 'Pix' }],
	shipping_methods: [{ value: 'flat_rate', label: 'Taxa fixa' }],
	capabilities: { edit_products: true, delete_products: true, edit_shop_orders: true },
	urls: {},
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

const PRODUCT: Product = {
	id: 201,
	name: 'Camiseta',
	slug: 'camiseta',
	type: 'simple',
	status: 'publish',
	featured: false,
	catalog_visibility: 'visible',
	sku: 'TSH-1',
	price: '59.90',
	regular_price: '59.90',
	sale_price: '',
	stock_quantity: null,
	stock_status: 'instock',
	manage_stock: false,
	backorders: 'no',
	description: '<p>Algodão</p>',
	short_description: '',
	categories: [{ id: 10, name: 'Roupas' }],
	tags: [],
	images: [],
	attributes: [],
	dimensions: { length: '', width: '', height: '' },
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

const ORDER: Order = {
	id: 1200,
	number: '1200',
	status: 'pending',
	currency: 'BRL',
	date_created: '2026-10-07T12:00:00',
	total: '119.80',
	customer_id: 0,
	billing: address(),
	shipping: address(),
	line_items: [{ id: 7, name: 'Camiseta', product_id: 201, quantity: 2, sku: 'TSH-1', price: 59.9, subtotal: '119.80', total: '119.80' }],
	coupon_lines: [],
};

type Call = { method: string; url: string; body: Record<string, unknown> | null };

/** Record every request so the payload the editor sends can be asserted. */
const stubRest = (routes: { match: RegExp; body: unknown }[]) => {
	const calls: Call[] = [];

	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ method, url: `${url.pathname}${url.search}`, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null });

			const route = routes.find((item) => item.match.test(url.pathname));

			return new Response(JSON.stringify(route ? route.body : []), { status: 200, headers: { 'Content-Type': 'application/json' } });
		})
	);

	return calls;
};

const renderAt = (path: string, route: string, element: React.ReactNode) => {
	window.location.hash = `#${path}`;

	return render(
		<AppProviders wpData={wpData}>
			<WooProvider>
				<HashRouter>
					<PageShell>
						<Routes>
							<Route path={route} element={element} />
						</Routes>
					</PageShell>
				</HashRouter>
			</WooProvider>
		</AppProviders>
	);
};

afterEach(() => {
	vi.unstubAllGlobals();
	window.location.hash = '';
});

describe('variationCombos', () => {
	const attributes = [
		{ id: 1, name: 'Tamanho', options: ['P', 'M'] },
		{ id: 2, name: 'Cor', options: ['Azul'] },
	];

	it('builds every combination of the attribute options', () => {
		expect(buildCombos(attributes)).toEqual([
			[
				{ id: 1, name: 'Tamanho', option: 'P' },
				{ id: 2, name: 'Cor', option: 'Azul' },
			],
			[
				{ id: 1, name: 'Tamanho', option: 'M' },
				{ id: 2, name: 'Cor', option: 'Azul' },
			],
		]);
	});

	it('keys a combination by attribute and option, whatever the order', () => {
		const first = comboKey([{ id: 2, name: 'Cor', option: 'Azul' }, { id: 1, name: 'Tamanho', option: 'P' }], attributes);
		const second = comboKey([{ id: 1, name: 'Tamanho', option: 'P' }, { id: 2, name: 'Cor', option: 'Azul' }], attributes);

		expect(first).toBe(second);
	});

	it('only reports the combinations that are missing', () => {
		const existing = [{ attributes: [{ id: 1, name: 'Tamanho', option: 'P' }, { id: 2, name: 'Cor', option: 'Azul' }] }];

		expect(missingCombos(attributes, existing)).toEqual([
			[
				{ id: 1, name: 'Tamanho', option: 'M' },
				{ id: 2, name: 'Cor', option: 'Azul' },
			],
		]);
	});

	it('matches custom attributes by name, ignoring case', () => {
		const custom = [{ name: 'Material', options: ['Couro'] }];
		const existing = [{ attributes: [{ name: 'material', option: 'Couro' }] }];

		expect(missingCombos(custom, existing)).toEqual([]);
	});
});

describe('ProductEditor', () => {
	it('sends the edited fields as the wc/v3 payload', async () => {
		const user = userEvent.setup();
		const calls = stubRest([
			{ match: /products\/201$/, body: PRODUCT },
			{ match: /products\/categories/, body: [] },
			{ match: /products\/shipping_classes/, body: [] },
			{ match: /products\/attributes/, body: [] },
		]);

		renderAt('/product/201', '/product/:id', <ProductEditor />);

		const name = await screen.findByLabelText(/Product name/);
		expect(name).toHaveValue('Camiseta');

		await user.clear(name);
		await user.type(name, 'Camiseta nova');
		await user.click(screen.getByRole('button', { name: 'Update' }));

		await waitFor(() => expect(calls.some((call) => call.method === 'PUT')).toBe(true));

		const sent = calls.find((call) => call.method === 'PUT')?.body as Record<string, unknown>;
		expect(sent.name).toBe('Camiseta nova');
		expect(sent.type).toBe('simple');
		expect(sent.status).toBe('publish');
		expect(sent.regular_price).toBe('59.90');
		// Categories travel as objects, the way the REST API expects them.
		expect(sent.categories).toEqual([{ id: 10 }]);
		expect(sent.dimensions).toEqual({ length: '', width: '', height: '' });
	});

	it('refuses to save a product without a name', async () => {
		const user = userEvent.setup();
		const calls = stubRest([
			{ match: /products\/201$/, body: PRODUCT },
			{ match: /products\/categories/, body: [] },
			{ match: /products\/shipping_classes/, body: [] },
			{ match: /products\/attributes/, body: [] },
		]);

		renderAt('/product/201', '/product/:id', <ProductEditor />);

		await user.clear(await screen.findByLabelText(/Product name/));
		await user.click(screen.getByRole('button', { name: 'Update' }));

		expect(await screen.findByText('The product name is required.')).toBeInTheDocument();
		expect(calls.some((call) => call.method === 'PUT')).toBe(false);
	});
});

describe('OrderEditor', () => {
	it('sends the new quantity with the line totals', async () => {
		const user = userEvent.setup();
		const calls = stubRest([
			{ match: /orders\/1200$/, body: ORDER },
			{ match: /products/, body: [] },
		]);

		renderAt('/order/1200/edit', '/order/:id/edit', <OrderEditor />);

		// Typing into a number input appends; set the value in one go instead.
		fireEvent.change(await screen.findByLabelText('Quantity'), { target: { value: '3' } });
		await user.click(screen.getByRole('button', { name: 'Save items' }));

		await waitFor(() => expect(calls.some((call) => call.method === 'PUT')).toBe(true));

		const sent = calls.find((call) => call.method === 'PUT')?.body as { line_items: Record<string, unknown>[] };
		// WooCommerce keeps the old totals when only the quantity is sent.
		expect(sent.line_items).toEqual([{ id: 7, quantity: 3, subtotal: '179.70', total: '179.70' }]);
	});

	it('does not create an order without items', async () => {
		const user = userEvent.setup();
		const calls = stubRest([{ match: /products/, body: [] }]);

		renderAt('/new', '/new', <OrderEditor />);

		await user.click(await screen.findByRole('button', { name: 'Create order' }));

		expect(await screen.findByText('Add at least one product to the order.')).toBeInTheDocument();
		expect(calls.some((call) => call.method === 'POST')).toBe(false);
	});
});
