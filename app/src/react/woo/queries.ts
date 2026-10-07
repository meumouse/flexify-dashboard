import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useWoo } from '@/react/woo/WooProvider';
import type {
	Attribute,
	AttributeTerm,
	BulkResult,
	Category,
	Country,
	Coupon,
	Option,
	Order,
	OrderContext,
	OrderNote,
	OrdersSummary,
	Product,
	ProductsSummary,
	Tag,
	Variation,
} from '@/react/woo/types';

/**
 * Query hooks for the WooCommerce screens.
 *
 * Keys follow `['woo', <resource>, …]` so a mutation can invalidate a whole resource with
 * `['woo', 'products']` without knowing the filters in use.
 */

export const wooKeys = {
	all: ['woo'] as const,
	products: (params?: unknown) => ['woo', 'products', params] as const,
	productsRoot: ['woo', 'products'] as const,
	product: (id: number) => ['woo', 'product', id] as const,
	summary: ['woo', 'products-summary'] as const,
	variations: (productId: number) => ['woo', 'variations', productId] as const,
	categories: ['woo', 'categories'] as const,
	tags: (params?: unknown) => ['woo', 'tags', params] as const,
	tagsRoot: ['woo', 'tags'] as const,
	attributes: ['woo', 'attributes'] as const,
	attributeTerms: (attributeId: number, params?: unknown) => ['woo', 'attribute-terms', attributeId, params] as const,
	attributeTermsRoot: (attributeId: number) => ['woo', 'attribute-terms', attributeId] as const,
	coupons: (params?: unknown) => ['woo', 'coupons', params] as const,
	couponsRoot: ['woo', 'coupons'] as const,
	shippingClasses: ['woo', 'shipping-classes'] as const,
};

export const PRODUCT_FIELDS = [
	'id',
	'name',
	'slug',
	'permalink',
	'date_created',
	'date_modified',
	'type',
	'status',
	'featured',
	'catalog_visibility',
	'sku',
	'price',
	'regular_price',
	'sale_price',
	'price_html',
	'on_sale',
	'stock_quantity',
	'stock_status',
	'manage_stock',
	'backorders',
	'categories',
	'tags',
	'images',
	'variations',
	'total_sales',
	'weight',
	'dimensions',
	'shipping_class',
	'date_on_sale_from',
	'date_on_sale_to',
].join(',');

export type ProductListParams = {
	page: number;
	per_page: number;
	status: string;
	orderby: string;
	order: string;
	search?: string;
	category?: string;
	type?: string;
	stock_status?: string;
	featured?: string;
	low_stock?: string;
	tag?: string;
	min_price?: string;
	max_price?: string;
};

/**
 * Products list. Low stock has no `wc/v3` filter, so it falls back to the Analytics endpoint.
 */
export const useProducts = (filters: ProductListParams) => {
	const { wc } = useWoo();
	const rest = useRest();

	return useQuery({
		queryKey: wooKeys.products(filters),
		queryFn: async ({ signal }) => {
			const params: Record<string, unknown> = {
				page: filters.page,
				per_page: filters.per_page,
				status: filters.status,
				orderby: filters.orderby,
				order: filters.order,
				_fields: PRODUCT_FIELDS,
				search: filters.search,
				category: filters.category,
				type: filters.type,
				stock_status: filters.stock_status,
				tag: filters.tag,
				min_price: filters.min_price,
				max_price: filters.max_price,
			};

			if (filters.featured === '1') {
				params.featured = 'true';
			}

			if (filters.low_stock === '1') {
				return rest.request<Product>({ endpoint: 'wc-analytics/products', params: { ...params, low_in_stock: 'true' }, signal });
			}

			return wc<Product>('products', { params, signal });
		},
		placeholderData: (previous) => previous,
	});
};

export const useProductsSummary = () => {
	const { fd } = useWoo();

	return useQuery({
		queryKey: wooKeys.summary,
		queryFn: async ({ signal }) => (await fd<ProductsSummary>('products/summary', { signal })).data as unknown as ProductsSummary,
	});
};

/** Every category, walked page by page so the filter and the quick edit show the full tree. */
export const useCategories = () => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: wooKeys.categories,
		queryFn: async ({ signal }) => {
			const all: Category[] = [];

			for (let page = 1; page <= 10; page += 1) {
				const response = await wc<Category>('products/categories', {
					params: { per_page: 100, page, _fields: 'id,name,parent,count,slug,description,image' },
					signal,
				});
				const items = response.data ?? [];
				all.push(...items);

				if (items.length < 100) {
					break;
				}
			}

			return all;
		},
		staleTime: 60_000,
	});
};

export const useTags = (params: Record<string, unknown> = { per_page: 100, orderby: 'count', order: 'desc', _fields: 'id,name' }) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: wooKeys.tags(params),
		queryFn: async ({ signal }) => wc<Tag>('products/tags', { params, signal }),
		placeholderData: (previous) => previous,
	});
};

export const useVariations = (productId: number, enabled = true) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: wooKeys.variations(productId),
		enabled,
		queryFn: async ({ signal }) =>
			(
				await wc<Variation>(`products/${productId}/variations`, {
					params: { per_page: 100, _fields: 'id,sku,price,regular_price,sale_price,stock_status,stock_quantity,manage_stock,attributes,image,status' },
					signal,
				})
			).data ?? [],
	});
};

export const useShippingClasses = () => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: wooKeys.shippingClasses,
		queryFn: async ({ signal }) => {
			const response = await wc<{ id: number; name: string; slug: string }>('products/shipping_classes', { params: { per_page: 100, _fields: 'id,name,slug' }, signal });

			return (response.data ?? []).map<Option>((item) => ({ value: item.slug, label: item.name }));
		},
		staleTime: 300_000,
	});
};

export const useAttributes = () => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: wooKeys.attributes,
		queryFn: async ({ signal }) => (await wc<Attribute>('products/attributes', { params: { per_page: 100 }, signal })).data ?? [],
	});
};

export const useAttributeTerms = (attributeId: number, params: Record<string, unknown>, enabled = true) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: wooKeys.attributeTerms(attributeId, params),
		enabled: enabled && attributeId > 0,
		queryFn: async ({ signal }) => wc<AttributeTerm>(`products/attributes/${attributeId}/terms`, { params, signal }),
		placeholderData: (previous) => previous,
	});
};

export const useCoupons = (params: Record<string, unknown>) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: wooKeys.coupons(params),
		queryFn: async ({ signal }) => wc<Coupon>('coupons', { params, signal }),
		placeholderData: (previous) => previous,
	});
};

/**
 * Mutation helper that invalidates the given keys once the call succeeds.
 */
export const useWooMutation = <TData, TVariables>(
	mutationFn: (variables: TVariables) => Promise<TData>,
	invalidate: readonly (readonly unknown[])[] = [],
	options: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> = {}
) => {
	const queryClient = useQueryClient();

	return useMutation<TData, Error, TVariables>({
		mutationFn,
		...options,
		onSuccess: (...args) => {
			invalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
			options.onSuccess?.(...args);
		},
	});
};

export type BulkPayload = {
	ids: number[];
	action: string;
	value?: unknown;
};

export const useProductsBulk = () => {
	const { fd } = useWoo();

	return useWooMutation<BulkResult, BulkPayload>(
		async (payload) => (await fd<BulkResult>('products/bulk', { method: 'POST', data: payload })).data as unknown as BulkResult,
		[wooKeys.productsRoot, wooKeys.summary]
	);
};

export const useDuplicateProduct = () => {
	const { fd } = useWoo();

	return useWooMutation<Product, number>(
		async (id) => (await fd<Product>(`products/${id}/duplicate`, { method: 'POST' })).data as unknown as Product,
		[wooKeys.productsRoot, wooKeys.summary]
	);
};

export const useUpdateProduct = () => {
	const { wc } = useWoo();

	return useWooMutation<Product, { id: number; data: Partial<Product> | Record<string, unknown> }>(
		async ({ id, data }) => (await wc<Product>(`products/${id}`, { method: 'PUT', data })).data as unknown as Product,
		[wooKeys.summary]
	);
};

export const useUpdateVariation = (productId: number) => {
	const { wc } = useWoo();

	return useWooMutation<Variation, { id: number; data: Record<string, unknown> }>(
		async ({ id, data }) => (await wc<Variation>(`products/${productId}/variations/${id}`, { method: 'PUT', data })).data as unknown as Variation,
		[wooKeys.summary]
	);
};

/* ------------------------------------------------------------------ Orders */

export const orderKeys = {
	orders: (params?: unknown) => ['woo', 'orders', params] as const,
	ordersRoot: ['woo', 'orders'] as const,
	order: (id: number) => ['woo', 'order', id] as const,
	context: (id: number) => ['woo', 'order-context', id] as const,
	notes: (id: number) => ['woo', 'order-notes', id] as const,
	siblings: (id: number) => ['woo', 'order-siblings', id] as const,
	summary: (params?: unknown) => ['woo', 'orders-summary', params] as const,
	summaryRoot: ['woo', 'orders-summary'] as const,
	countries: ['woo', 'countries'] as const,
};

export const ORDER_FIELDS = [
	'id',
	'number',
	'status',
	'currency',
	'currency_symbol',
	'date_created',
	'date_paid',
	'total',
	'total_tax',
	'shipping_total',
	'discount_total',
	'customer_id',
	'customer_note',
	'billing',
	'shipping',
	'payment_method',
	'payment_method_title',
	'line_items',
	'shipping_lines',
	'fee_lines',
	'coupon_lines',
	'refunds',
	'created_via',
].join(',');

export const useOrders = (params: Record<string, unknown>) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: orderKeys.orders(params),
		queryFn: ({ signal }) => wc<Order>('orders', { params: { ...params, _fields: ORDER_FIELDS }, signal }),
		placeholderData: (previous) => previous,
	});
};

export const useOrdersSummary = (params: Record<string, unknown> = {}, options: { refetchInterval?: number } = {}) => {
	const { fd } = useWoo();

	return useQuery({
		queryKey: orderKeys.summary(params),
		queryFn: async ({ signal }) => (await fd<OrdersSummary>('orders/summary', { params, signal })).data as unknown as OrdersSummary,
		...options,
	});
};

export const useOrder = (id: number) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: orderKeys.order(id),
		enabled: id > 0,
		retry: false,
		queryFn: async ({ signal }) => (await wc<Order>(`orders/${id}`, { signal })).data as unknown as Order,
	});
};

export const useOrderContext = (id: number) => {
	const { fd } = useWoo();

	return useQuery({
		queryKey: orderKeys.context(id),
		enabled: id > 0,
		retry: false,
		queryFn: async ({ signal }) => (await fd<OrderContext>(`orders/${id}/context`, { signal })).data as unknown as OrderContext,
	});
};

export const useOrderNotes = (id: number) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: orderKeys.notes(id),
		enabled: id > 0,
		queryFn: async ({ signal }) => (await wc<OrderNote>(`orders/${id}/notes`, { params: { type: 'any' }, signal })).data ?? [],
	});
};

/**
 * The newer and older orders around the current one, used by the arrows in the header.
 */
export const useOrderSiblings = (id: number, dateCreatedGmt?: string) => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: [...orderKeys.siblings(id), dateCreatedGmt],
		enabled: id > 0 && Boolean(dateCreatedGmt),
		queryFn: async ({ signal }) => {
			const base = { per_page: 1, orderby: 'date', status: 'any', exclude: String(id), dates_are_gmt: 'true', _fields: 'id,number' };

			const [newer, older] = await Promise.all([
				wc<Order>('orders', { params: { ...base, after: dateCreatedGmt, order: 'asc' }, signal }),
				wc<Order>('orders', { params: { ...base, before: dateCreatedGmt, order: 'desc' }, signal }),
			]);

			return { previous: newer.data?.[0] ?? null, next: older.data?.[0] ?? null };
		},
	});
};

/** Countries and their states; they never change during a visit. */
export const useCountries = () => {
	const { wc } = useWoo();

	return useQuery({
		queryKey: orderKeys.countries,
		staleTime: Infinity,
		queryFn: async ({ signal }) => {
			const response = await wc<Country>('data/countries', { params: { _fields: 'code,name,states' }, signal });

			return [...(response.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
		},
	});
};

export const useOrdersBulk = () => {
	const { fd } = useWoo();

	return useWooMutation<BulkResult, BulkPayload>(
		async (payload) => (await fd<BulkResult>('orders/bulk', { method: 'POST', data: payload })).data as unknown as BulkResult,
		[orderKeys.ordersRoot, orderKeys.summaryRoot]
	);
};

export const useUpdateOrder = () => {
	const { wc } = useWoo();

	return useWooMutation<Order, { id: number; data: Record<string, unknown> }>(
		async ({ id, data }) => (await wc<Order>(`orders/${id}`, { method: 'PUT', data })).data as unknown as Order,
		[orderKeys.ordersRoot, orderKeys.summaryRoot]
	);
};

export const useOrderAction = (id: number) => {
	const { fd } = useWoo();

	return useWooMutation<{ success: boolean }, string>(
		async (action) => (await fd<{ success: boolean }>(`orders/${id}/action`, { method: 'POST', data: { action } })).data as unknown as { success: boolean },
		[orderKeys.order(id), orderKeys.context(id), orderKeys.notes(id)]
	);
};
