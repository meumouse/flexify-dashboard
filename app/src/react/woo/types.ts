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
	product_editor_extensions: { id: string; label: string; type: string }[];
	tax_classes: Option[];
	taxes_enabled: boolean;
	coupons_enabled: boolean;
	product_types: Option[];
	stock_statuses: Option[];
	order_statuses: OrderStatusOption[];
	payment_gateways: Option[];
	shipping_methods: Option[];
	capabilities: Partial<Record<StoreCapability, boolean>>;
	/** The shop itself, for what goes out with its name on it: a printed order */
	store?: { name: string; address: string[]; email: string };
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

	/* Fields only the editor reads */
	description?: string;
	short_description?: string;
	tax_status?: string;
	tax_class?: string;
	low_stock_amount?: number | null;
	sold_individually?: boolean;
	virtual?: boolean;
	downloadable?: boolean;
	external_url?: string;
	button_text?: string;
	attributes?: ProductAttributeValue[];
	purchase_note?: string;
	menu_order?: number;
	reviews_allowed?: boolean;
	upsell_ids?: number[];
	cross_sell_ids?: number[];
	grouped_products?: number[];
	downloads?: DownloadableFile[];
	download_limit?: number;
	download_expiry?: number;
};

export type DownloadableFile = {
	id: string;
	name: string;
	file: string;
};

export type ProductAttributeValue = {
	id: number;
	name: string;
	position: number;
	visible: boolean;
	variation: boolean;
	options: string[];
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

export type Address = {
	first_name: string;
	last_name: string;
	company: string;
	address_1: string;
	address_2: string;
	city: string;
	state: string;
	postcode: string;
	country: string;
	email?: string;
	phone: string;
};

export type OrderTax = {
	id: number;
	total: string;
	subtotal?: string;
};

export type OrderLineItem = {
	id: number;
	name: string;
	product_id: number;
	variation_id?: number;
	quantity: number;
	sku: string;
	price: number | string;
	subtotal: string;
	subtotal_tax?: string;
	total: string;
	total_tax?: string;
	taxes?: OrderTax[];
	image?: ProductImage | null;
	meta_data?: { id: number; key: string; value: unknown; display_key?: string; display_value?: string }[];
};

export type OrderShippingLine = {
	id: number;
	method_title: string;
	method_id?: string;
	instance_id?: string;
	total: string;
	total_tax?: string;
};

export type OrderFeeLine = {
	id: number;
	name: string;
	total: string;
	total_tax?: string;
	tax_class?: string;
	tax_status?: string;
};

export type OrderCouponLine = {
	id: number;
	code: string;
	discount?: string;
	discount_tax?: string;
};

export type OrderRefundRef = {
	id: number;
	reason: string;
	total: string;
};

export type Order = {
	id: number;
	number: string;
	status: string;
	currency: string;
	currency_symbol?: string;
	date_created: string;
	date_created_gmt?: string;
	date_modified?: string;
	date_paid?: string | null;
	total: string;
	total_tax?: string;
	shipping_total?: string;
	discount_total?: string;
	customer_id: number;
	customer_note?: string;
	billing: Address;
	shipping: Address;
	payment_method?: string;
	payment_method_title?: string;
	transaction_id?: string;
	line_items: OrderLineItem[];
	shipping_lines?: OrderShippingLine[];
	fee_lines?: OrderFeeLine[];
	coupon_lines?: OrderCouponLine[];
	refunds?: OrderRefundRef[];
	created_via?: string;
};

export type OrderNote = {
	id: number;
	author: string;
	date_created: string;
	note: string;
	customer_note: boolean;
	added_by_user?: boolean;
};

export type OrdersSummary = {
	total: number;
	counts: Record<string, number>;
	period?: {
		net_revenue?: number;
		orders_count?: number;
	};
};

export type OrderContextItem = {
	image: string;
	sku: string;
	edit_url: string;
	meta: { key: string; value: string }[];
	refunded_qty: number;
	refunded_total: number;
};

export type OrderAction = {
	value: string;
	label: string;
};

export type OrderContext = {
	id: number;
	native_edit_url: string;
	customer: {
		id: number;
		orders_count: number;
		total_spent: number | null;
		avatar: string;
		profile_url: string;
		ip_address: string;
		user_agent: string;
	};
	payment: {
		title: string;
		transaction_id: string;
		transaction_url: string;
		supports_refunds: boolean;
		date_paid: string | null;
	};
	attribution?: { label: string; source?: string; device?: string } | null;
	created_via?: string;
	actions: OrderAction[];
	items: Record<number, OrderContextItem>;
	custom_fields?: { key: string; value: string }[];
};

export type Country = {
	code: string;
	name: string;
	states?: { code: string; name: string }[];
};

/** Sidebar card registered by an extension through the JavaScript hooks. */
export type ExtensionCard = {
	title?: string;
	component: unknown;
	metadata?: {
		id?: string;
		className?: string;
		framework?: 'vue' | 'react' | 'html';
		language?: 'vue' | 'react' | 'html';
		requires_capabilities?: string[];
		requiresCapabilities?: string[];
		requires_plugins?: string[];
		requiresPlugins?: string[];
	};
};
