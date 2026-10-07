/**
 * Shapes of the WooCommerce payloads used by the React screens.
 *
 * Only the fields the plugin actually reads are typed; the REST responses carry more.
 */

export type Option = {
	value: string;
	label: string;
};

export type OrderStatusOption = Option & {
	color?: string;
};

export type Currency = {
	code: string;
	symbol: string;
	position: 'left' | 'right' | 'left_space' | 'right_space';
	thousand_separator: string;
	decimal_separator: string;
	decimals: number;
};

export type StoreCapability = 'edit_products' | 'delete_products' | 'edit_shop_orders' | 'delete_shop_orders' | 'manage_woocommerce';

export type StoreUrls = Partial<
	Record<
		| 'products'
		| 'classic_products'
		| 'new_product'
		| 'product_import'
		| 'product_export'
		| 'product_categories'
		| 'product_tags'
		| 'orders'
		| 'classic_orders'
		| 'new_order'
		| 'settings'
		| 'users'
		| 'coupons'
		| 'product_attributes',
		string
	>
>;

export type StoreData = {
	active: boolean;
	version?: string;
	hpos: boolean;
	currency: Currency;
	weight_unit: string;
	dimension_unit: string;
	manage_stock: boolean;
	low_stock_amount: number;
	product_editor: boolean;
	product_editor_extensions: string[];
	tax_classes: Option[];
	taxes_enabled: boolean;
	coupons_enabled: boolean;
	product_types: Option[];
	stock_statuses: Option[];
	order_statuses: OrderStatusOption[];
	payment_gateways: Option[];
	shipping_methods: Option[];
	capabilities: Partial<Record<StoreCapability, boolean>>;
	urls: StoreUrls;
};

export type TermRef = {
	id: number;
	name: string;
	slug?: string;
};

export type ProductImage = {
	id?: number;
	src: string;
	alt?: string;
	name?: string;
};

export type ProductStatus = 'publish' | 'draft' | 'pending' | 'private' | 'future' | 'trash';

export type ProductDimensions = {
	length: string;
	width: string;
	height: string;
};

export type Product = {
	id: number;
	name: string;
	slug: string;
	permalink?: string;
	date_created?: string;
	date_modified?: string;
	type: string;
	status: ProductStatus;
	featured: boolean;
	catalog_visibility: string;
	sku: string;
	price: string;
	regular_price: string;
	sale_price: string;
	price_html?: string;
	on_sale?: boolean;
	stock_quantity: number | null;
	stock_status: string;
	manage_stock: boolean;
	backorders: string;
	categories?: TermRef[];
	tags?: TermRef[];
	images?: ProductImage[];
	variations?: number[];
	total_sales?: number;
	weight?: string;
	dimensions?: ProductDimensions;
	shipping_class?: string;
	date_on_sale_from?: string | null;
	date_on_sale_to?: string | null;
};

export type VariationAttribute = {
	id?: number;
	name: string;
	option: string;
};

export type Variation = {
	id: number;
	sku: string;
	price: string;
	regular_price: string;
	sale_price: string;
	stock_status: string;
	stock_quantity: number | null;
	manage_stock: boolean;
	attributes: VariationAttribute[];
	image?: ProductImage | null;
	status?: string;
};

export type ProductsSummary = {
	total: number;
	publish: number;
	draft: number;
	pending: number;
	private: number;
	trash: number;
	outofstock: number;
	lowstock: number;
};

export type Category = {
	id: number;
	name: string;
	slug: string;
	parent: number;
	description?: string;
	display?: string;
	count: number;
	image?: ProductImage | null;
};

export type Tag = {
	id: number;
	name: string;
	slug: string;
	description?: string;
	count: number;
};

export type AttributeTerm = {
	id: number;
	name: string;
	slug: string;
	description?: string;
	menu_order?: number;
	count?: number;
};

export type Attribute = {
	id: number;
	name: string;
	slug: string;
	type: string;
	order_by: string;
	has_archives: boolean;
};

export type CouponType = 'percent' | 'fixed_cart' | 'fixed_product';

export type Coupon = {
	id: number;
	code: string;
	amount: string;
	discount_type: CouponType;
	description?: string;
	date_expires?: string | null;
	usage_count?: number;
	individual_use?: boolean;
	usage_limit?: number | null;
	usage_limit_per_user?: number | null;
	limit_usage_to_x_items?: number | null;
	free_shipping?: boolean;
	exclude_sale_items?: boolean;
	minimum_amount?: string;
	maximum_amount?: string;
	product_ids?: number[];
	excluded_product_ids?: number[];
	product_categories?: number[];
	excluded_product_categories?: number[];
	email_restrictions?: string[];
	status?: string;
};

export type BulkResult = {
	updated: number[];
	failed: { id: number; message: string }[];
};

export type BulkPriceValue = {
	target: 'regular' | 'sale';
	operation: 'increase' | 'decrease' | 'set';
	mode: 'percent' | 'fixed';
	amount: string;
};
