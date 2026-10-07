import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePageData, useRest } from '@/react/app/WpDataProvider';
import type { RestClient } from '@/react/lib/rest';
import type { RestListResult } from '@/react/types/wordpress';
import { DEFAULT_CURRENCY, formatPrice, parsePrice } from '@/react/woo/price';
import type { Currency, OrderStatusOption, StoreCapability, StoreData } from '@/react/woo/types';

/**
 * Store data, money helpers and the two REST clients the WooCommerce screens use.
 *
 * Mirrors the `useWooCommerce` composable of the Vue pages so both frontends read the same
 * payload printed on `#fd-woocommerce-script`.
 */

const DEFAULTS: StoreData = {
	active: false,
	hpos: false,
	currency: DEFAULT_CURRENCY,
	weight_unit: 'kg',
	dimension_unit: 'cm',
	manage_stock: true,
	low_stock_amount: 2,
	product_editor: false,
	product_editor_extensions: [],
	tax_classes: [],
	taxes_enabled: false,
	coupons_enabled: true,
	product_types: [],
	stock_statuses: [],
	order_statuses: [],
	payment_gateways: [],
	shipping_methods: [],
	capabilities: {},
	urls: {},
};

export type WooRequest = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	params?: Record<string, unknown>;
	data?: unknown;
	signal?: AbortSignal;
};

type WooContextValue = {
	store: StoreData;
	currency: Currency;
	/** Format a number with the store money settings. */
	price: (value: string | number | null | undefined) => string;
	/** Turn a localized amount into the decimal string `wc/v3` accepts. */
	toDecimal: (value: string | number | null | undefined) => string;
	orderStatus: (slug: string) => OrderStatusOption;
	can: (capability: StoreCapability) => boolean;
	/** Call the WooCommerce REST API (`wc/v3`). */
	wc: <T>(endpoint: string, request?: WooRequest) => Promise<RestListResult<T>>;
	/** Call the plugin WooCommerce endpoints. */
	fd: <T>(endpoint: string, request?: WooRequest) => Promise<RestListResult<T>>;
};

const WooContext = createContext<WooContextValue | null>(null);

type Props = {
	children: ReactNode;
	/** Pre-built store data, used by tests and the visual harness */
	value?: Partial<StoreData>;
};

const buildClient = (rest: RestClient, prefix: string) => {
	return <T,>(endpoint: string, { method = 'GET', params, data, signal }: WooRequest = {}) =>
		rest.request<T>({ endpoint: `${prefix}${endpoint}`, method, params, data, signal });
};

export const WooProvider = ({ children, value }: Props) => {
	const pageStore = usePageData<Partial<StoreData>>('woocommerce', {});
	const rest = useRest();

	const contextValue = useMemo<WooContextValue>(() => {
		const store: StoreData = { ...DEFAULTS, ...pageStore, ...value };
		const currency: Currency = { ...DEFAULT_CURRENCY, ...store.currency };
		const statuses = new Map(store.order_statuses.map((status) => [status.value, status]));

		return {
			store,
			currency,
			price: (amount) => formatPrice(amount, currency),
			toDecimal: (amount) => parsePrice(amount, currency),
			orderStatus: (slug) => statuses.get(slug) ?? { value: slug, label: slug, color: 'light' },
			// An absent capability means the payload was not printed, so fall back to allowing it.
			can: (capability) => store.capabilities[capability] !== false,
			wc: buildClient(rest, 'wc/v3/'),
			fd: buildClient(rest, 'flexify-dashboard/v1/woocommerce/'),
		};
	}, [pageStore, rest, value]);

	return <WooContext.Provider value={contextValue}>{children}</WooContext.Provider>;
};

export const useWoo = (): WooContextValue => {
	const context = useContext(WooContext);

	if (!context) {
		throw new Error('useWoo must be used inside <WooProvider>.');
	}

	return context;
};
