import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildUrl, createRestClient, RestError } from '@/react/lib/rest';

const client = () => createRestClient({ restBase: 'https://site.test/wp-json/', restNonce: 'abc123' });

const response = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
	new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
	});

afterEach(() => vi.unstubAllGlobals());

describe('buildUrl', () => {
	it('joins the base and the endpoint', () => {
		expect(buildUrl('https://site.test/wp-json/', 'wc/v3/orders')).toBe('https://site.test/wp-json/wc/v3/orders');
		expect(buildUrl('https://site.test/wp-json', '/wc/v3/orders')).toBe('https://site.test/wp-json/wc/v3/orders');
	});

	it('drops empty parameters but keeps false and zero', () => {
		const url = new URL(buildUrl('https://site.test/wp-json/', 'wc/v3/orders', { search: '', page: 0, featured: false, status: 'any' }));

		expect(url.searchParams.get('search')).toBeNull();
		expect(url.searchParams.get('page')).toBe('0');
		expect(url.searchParams.get('featured')).toBe('false');
		expect(url.searchParams.get('status')).toBe('any');
	});

	it('repeats array parameters', () => {
		const url = new URL(buildUrl('https://site.test/wp-json/', 'wc/v3/orders', { include: [1, 2] }));

		expect(url.searchParams.getAll('include[]')).toEqual(['1', '2']);
	});
});

describe('rest client', () => {
	it('sends the nonce and returns pagination headers', async () => {
		const fetchMock = vi.fn().mockResolvedValue(response([{ id: 1 }], { headers: { 'X-WP-Total': '42', 'X-WP-TotalPages': '3' } }));
		vi.stubGlobal('fetch', fetchMock);

		const result = await client().list<{ id: number }>('wc/v3/orders', { per_page: 20 });

		expect(result).toEqual({ data: [{ id: 1 }], totalItems: 42, totalPages: 3 });

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain('per_page=20');
		expect((init.headers as Record<string, string>)['X-WP-Nonce']).toBe('abc123');
	});

	it('sends JSON bodies on writes', async () => {
		const fetchMock = vi.fn().mockResolvedValue(response({ id: 7 }));
		vi.stubGlobal('fetch', fetchMock);

		await client().post('wc/v3/orders', { status: 'pending' });

		const [, init] = fetchMock.mock.calls[0];
		expect(init.method).toBe('POST');
		expect(init.body).toBe('{"status":"pending"}');
		expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
	});

	it('throws a RestError carrying the WordPress message', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ message: 'Pedido inválido.', code: 'invalid_order' }, { status: 404 })));

		await expect(client().get('wc/v3/orders/9')).rejects.toMatchObject({
			name: 'RestError',
			status: 404,
			code: 'invalid_order',
			message: 'Pedido inválido.',
		});
	});

	it('reports network failures', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

		await expect(client().get('wc/v3/orders')).rejects.toBeInstanceOf(RestError);
	});
});
