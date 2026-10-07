import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { PageShell } from '@/react/app/PageShell';
import { WooProvider } from '@/react/woo/WooProvider';
import { ProductsList } from '@/react/features/products/ProductsList';
import { categoryOptions, stockBadge } from '@/react/features/products/productFormat';
import type { Category, Product, StoreData } from '@/react/woo/types';
import type { WpData } from '@/react/types/wordpress';

const store: Partial<StoreData> = {
	active: true,
	low_stock_amount: 5,
	product_types: [
		{ value: 'simple', label: 'Produto simples' },
		{ value: 'variable', label: 'Produto variável' },
	],
	stock_statuses: [
		{ value: 'instock', label: 'Em estoque' },
		{ value: 'outofstock', label: 'Fora de estoque' },
	],
	capabilities: { edit_products: true, delete_products: true },
	urls: { classic_products: 'https://site.test/wp-admin/edit.php?post_type=product' },
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

const product = (overrides: Partial<Product> & Pick<Product, 'id' | 'name'>): Product => ({
	slug: '',
	type: 'simple',
	status: 'publish',
	featured: false,
	catalog_visibility: 'visible',
	sku: '',
	price: '10',
	regular_price: '10',
	sale_price: '',
	stock_quantity: null,
	stock_status: 'instock',
	manage_stock: false,
	backorders: 'no',
	...overrides,
});

const PRODUCTS: Product[] = [
	product({ id: 1, name: 'Camiseta', sku: 'TSH-1', stock_status: 'instock' }),
	product({ id: 2, name: 'Tênis', sku: 'SNK-2', status: 'draft', stock_status: 'outofstock' }),
];

const SUMMARY = { total: 2, publish: 1, draft: 1, pending: 0, private: 0, trash: 0, outofstock: 1, lowstock: 0 };

const CATEGORIES: Category[] = [
	{ id: 10, name: 'Roupas', slug: 'roupas', parent: 0, count: 2 },
	{ id: 11, name: 'Camisetas', slug: 'camisetas', parent: 10, count: 1 },
];

/** Answer the four requests the screen makes on mount, recording the query of each one. */
const stubRest = () => {
	const calls: string[] = [];

	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const url = new URL(String(input));
		calls.push(`${url.pathname}${url.search}`);

		const body = url.pathname.includes('products/summary')
			? SUMMARY
			: url.pathname.includes('products/categories')
				? CATEGORIES
				: url.pathname.includes('products/tags')
					? []
					: PRODUCTS.filter((item) => {
							const status = url.searchParams.get('status');

							return !status || status === 'any' || item.status === status;
						});

		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(Array.isArray(body) ? body.length : 0) },
		});
	});

	vi.stubGlobal('fetch', fetchMock);

	return calls;
};

const renderList = () =>
	render(
		<AppProviders wpData={wpData}>
			<WooProvider>
				<HashRouter>
					<PageShell>
						<ProductsList />
					</PageShell>
				</HashRouter>
			</WooProvider>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.location.hash = '';
	window.localStorage.clear();
});

describe('productFormat', () => {
	it('indents the category tree', () => {
		expect(categoryOptions(CATEGORIES)).toEqual([
			{ value: '10', label: 'Roupas' },
			{ value: '11', label: '— Camisetas' },
		]);
	});

	it('warns about low stock before the product runs out', () => {
		expect(stockBadge(product({ id: 1, name: '', manage_stock: true, stock_quantity: 4 }), store as StoreData)).toEqual({ color: 'warning', label: 'Low stock' });
		expect(stockBadge(product({ id: 1, name: '', manage_stock: true, stock_quantity: 40 }), store as StoreData)).toEqual({ color: 'success', label: 'In stock' });
		expect(stockBadge(product({ id: 1, name: '', stock_status: 'outofstock' }), store as StoreData)).toEqual({ color: 'error', label: 'Out of stock' });
	});
});

describe('ProductsList', () => {
	it('shows the counters and the catalog rows', async () => {
		stubRest();
		renderList();

		expect(await screen.findByText('Camiseta')).toBeInTheDocument();
		expect(screen.getByText('Tênis')).toBeInTheDocument();

		const totals = screen.getByText('Total products').closest('div');
		expect(within(totals as HTMLElement).getByText('2')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /Drafts/ })).toBeInTheDocument();
	});

	it('sends the status filter to the API and keeps it in the address bar', async () => {
		const user = userEvent.setup();
		const calls = stubRest();
		renderList();

		await screen.findByText('Camiseta');
		await user.click(screen.getByRole('tab', { name: /Drafts/ }));

		await waitFor(() => expect(calls.some((call) => call.includes('status=draft'))).toBe(true));
		expect(window.location.hash).toContain('status=draft');
		await waitFor(() => expect(screen.queryByText('Camiseta')).not.toBeInTheDocument());
	});

	it('hides a column from the visible columns menu and remembers the choice', async () => {
		const user = userEvent.setup();
		stubRest();
		renderList();

		await screen.findByText('Camiseta');
		expect(screen.getByRole('columnheader', { name: 'Categories' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Visible columns' }));
		await user.click(await screen.findByRole('menuitem', { name: 'Categories' }));

		await waitFor(() => expect(screen.queryByRole('columnheader', { name: 'Categories' })).not.toBeInTheDocument());
		expect(window.localStorage.getItem('fd-products-hidden-columns')).toBe('["categories"]');
	});
});
