import { __ } from '@/react/lib/i18n';
import type { RestListResult } from '@/react/types/wordpress';

/**
 * Minimal REST client for the WordPress and WooCommerce endpoints.
 *
 * Mirrors the behaviour of the Vue `lmnFetch` helper: same nonce header, same way of
 * dropping empty query parameters and the same pagination headers. Errors are thrown so
 * TanStack Query can handle retries and surface them through the global error handler.
 */

export type RestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RestRequest = {
	endpoint: string;
	method?: RestMethod;
	params?: Record<string, unknown>;
	data?: unknown;
	signal?: AbortSignal;
};

export class RestError extends Error {
	readonly status: number;
	readonly code: string;
	readonly data: unknown;

	constructor(message: string, status: number, code = 'rest_error', data: unknown = null) {
		super(message);
		this.name = 'RestError';
		this.status = status;
		this.code = code;
		this.data = data;
	}
}

export type RestConfig = {
	restBase: string;
	restNonce: string;
};

/**
 * Build the final URL, skipping parameters that carry no value.
 *
 * `false` and `0` are kept on purpose; only empty strings, null and undefined are dropped.
 */
export const buildUrl = (restBase: string, endpoint: string, params: Record<string, unknown> = {}): string => {
	const base = restBase.endsWith('/') ? restBase : `${restBase}/`;
	const url = new URL(`${base}${endpoint.replace(/^\//, '')}`, typeof window === 'undefined' ? 'https://localhost' : window.location.href);

	Object.entries(params).forEach(([key, value]) => {
		if (value === '' || value === null || value === undefined) {
			return;
		}

		if (Array.isArray(value)) {
			value.forEach((item) => url.searchParams.append(`${key}[]`, String(item)));
			return;
		}

		url.searchParams.set(key, String(value));
	});

	return url.toString();
};

export const createRestClient = ({ restBase, restNonce }: RestConfig) => {
	const request = async <T>({ endpoint, method = 'GET', params = {}, data, signal }: RestRequest): Promise<RestListResult<T>> => {
		const headers: Record<string, string> = { Accept: 'application/json' };

		if (restNonce) {
			headers['X-WP-Nonce'] = restNonce;
		}

		const init: RequestInit = { method, headers, signal };

		if (method !== 'GET' && data !== undefined) {
			if (data instanceof FormData) {
				init.body = data;
			} else {
				headers['Content-Type'] = 'application/json';
				init.body = JSON.stringify(data);
			}
		}

		let response: Response;

		try {
			response = await fetch(buildUrl(restBase, endpoint, params), init);
		} catch (error) {
			if ((error as Error)?.name === 'AbortError') {
				throw error;
			}

			throw new RestError(__('Could not reach the site. Check your connection and try again.'), 0, 'network_error');
		}

		const payload = response.status === 204 ? null : await response.json().catch(() => null);

		if (!response.ok) {
			const body = payload as { message?: string; code?: string } | null;

			throw new RestError(body?.message || __('The request failed. Please try again.'), response.status, body?.code || 'rest_error', payload);
		}

		return {
			data: payload as T[],
			totalItems: Number.parseInt(response.headers.get('X-WP-Total') ?? '', 10) || (Array.isArray(payload) ? payload.length : 0),
			totalPages: Number.parseInt(response.headers.get('X-WP-TotalPages') ?? '', 10) || 1,
		};
	};

	return {
		request,
		/** Single resource: returns the payload directly. */
		get: async <T>(endpoint: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<T> =>
			(await request<T>({ endpoint, params, signal })).data as unknown as T,
		/** Collection: returns the items plus the pagination headers. */
		list: <T>(endpoint: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<RestListResult<T>> =>
			request<T>({ endpoint, params, signal }),
		post: async <T>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> =>
			(await request<T>({ endpoint, method: 'POST', data, params })).data as unknown as T,
		put: async <T>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> =>
			(await request<T>({ endpoint, method: 'PUT', data, params })).data as unknown as T,
		remove: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> =>
			(await request<T>({ endpoint, method: 'DELETE', params })).data as unknown as T,
	};
};

export type RestClient = ReturnType<typeof createRestClient>;
