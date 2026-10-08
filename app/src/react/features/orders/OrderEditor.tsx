import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useNotify } from '@/react/app/ToastProvider';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Avatar, Button, Card, Checkbox, EmptyState, Icon, Input, PageHeader, SearchInput, Select, Skeleton, Spinner, Switch, Textarea } from '@/react/ui';
import { orderKeys } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import { AddressFields } from '@/react/features/orders/AddressFields';
import { customerName, emptyAddress, orderTitle } from '@/react/features/orders/orderFormat';
import { useOrderHelpers } from '@/react/features/orders/useOrderHelpers';
import type { Address, Order, Product, Variation } from '@/react/woo/types';

/**
 * Create an order by hand, or change the items of an order that has not been paid yet.
 */

const EDITABLE_STATUSES = ['pending', 'on-hold', 'checkout-draft', 'draft', 'auto-draft'];

type Line = {
	key: string;
	id?: number;
	product_id: number;
	variation_id: number;
	name: string;
	sku: string;
	image: string;
	price: number;
	/** Unit subtotal before discounts, used to send line totals when the quantity changes */
	unitSubtotal?: number;
	quantity: number;
	removed: boolean;
};

type ShippingLine = { key: string; id?: number; method_id: string; method_title: string; total: string; removed: boolean };
type FeeLine = { key: string; id?: number; name: string; total: string; removed: boolean };
type CouponLine = { key: string; id?: number; code: string; removed: boolean };

type Customer = {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	avatar_url?: string;
	billing?: Partial<Address>;
	shipping?: Partial<Address>;
};

let lineCounter = 0;
const nextKey = () => `line-${(lineCounter += 1)}`;

const customerLabel = (customer: Customer) => [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email;

export const OrderEditor = () => {
	const navigate = useNavigate();
	const { notify } = useNotify();
	const { store, wc, currency, toDecimal, price } = useWoo();
	const { price: orderMoney } = useOrderHelpers();
	const queryClient = useQueryClient();

	const id = Number(useParams().id) || 0;
	const isNew = !id;

	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [order, setOrder] = useState<Order | null>(null);
	const [dirty, setDirty] = useState(false);

	const [lines, setLines] = useState<Line[]>([]);
	const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
	const [feeLines, setFeeLines] = useState<FeeLine[]>([]);
	const [coupons, setCoupons] = useState<CouponLine[]>([]);
	const [couponInput, setCouponInput] = useState('');

	const [form, setForm] = useState({
		status: 'pending',
		customer_id: 0,
		payment_method: '',
		set_paid: false,
		customer_note: '',
		billing: emptyAddress(),
		shipping: emptyAddress(),
		ship_to_billing: true,
	});
	const [customer, setCustomer] = useState<Customer | null>(null);

	const [productSearch, setProductSearch] = useState('');
	const [productResults, setProductResults] = useState<Product[]>([]);
	const [productLoading, setProductLoading] = useState(false);
	const [variationPicker, setVariationPicker] = useState<{ product: Product | null; variations: Variation[]; loading: boolean }>({ product: null, variations: [], loading: false });

	const [customerSearch, setCustomerSearch] = useState('');
	const [customerResults, setCustomerResults] = useState<Customer[]>([]);
	const [customerLoading, setCustomerLoading] = useState(false);

	// The first render fills the state from the loaded order, which must not count as a change.
	const settled = useRef(false);

	useUnsavedChanges(dirty && !saving);

	const localPrice = (value: string | number | null | undefined) =>
		value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.decimal_separator || ',');

	useEffect(() => {
		if (isNew) {
			settled.current = true;
			return;
		}

		let active = true;
		setLoading(true);

		wc<Order>(`orders/${id}`).then((response) => {
			const data = response.data as unknown as Order;

			if (!active || !data) {
				setLoading(false);
				return;
			}

			setOrder(data);
			setLines(
				(data.line_items ?? []).map((item) => ({
					key: nextKey(),
					id: item.id,
					product_id: item.product_id,
					variation_id: item.variation_id ?? 0,
					name: decodeHtml(item.name),
					sku: item.sku,
					image: item.image?.src || '',
					price: Number(item.price) || 0,
					unitSubtotal: (Number(item.subtotal) || 0) / (Number(item.quantity) || 1),
					quantity: Number(item.quantity) || 1,
					removed: false,
				}))
			);
			setShippingLines(
				(data.shipping_lines ?? []).map((line) => ({
					key: nextKey(),
					id: line.id,
					method_id: line.method_id || 'other',
					method_title: decodeHtml(line.method_title),
					total: localPrice(line.total),
					removed: false,
				}))
			);
			setFeeLines((data.fee_lines ?? []).map((line) => ({ key: nextKey(), id: line.id, name: decodeHtml(line.name), total: localPrice(line.total), removed: false })));
			setCoupons((data.coupon_lines ?? []).map((line) => ({ key: nextKey(), id: line.id, code: line.code, removed: false })));
			setForm((current) => ({
				...current,
				status: data.status,
				customer_id: data.customer_id,
				payment_method: data.payment_method || '',
				customer_note: data.customer_note || '',
			}));
			setLoading(false);
			queueMicrotask(() => {
				settled.current = true;
			});
		});

		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const touch = () => {
		if (settled.current) {
			setDirty(true);
		}
	};

	/* Products ------------------------------------------------------------- */

	useEffect(() => {
		const term = productSearch.trim();
		setVariationPicker({ product: null, variations: [], loading: false });

		if (term.length < 2) {
			setProductResults([]);
			return;
		}

		let active = true;
		const timer = window.setTimeout(() => {
			setProductLoading(true);

			wc<Product>('products', {
				params: { search: term, per_page: 8, status: 'publish', _fields: 'id,name,type,price,sku,images,stock_status,stock_quantity,manage_stock' },
			}).then((response) => {
				if (!active) {
					return;
				}

				setProductResults((response.data ?? []).filter((product) => ['simple', 'variable'].includes(product.type) || product.price));
				setProductLoading(false);
			});
		}, 300);

		return () => {
			active = false;
			window.clearTimeout(timer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [productSearch]);

	const addLine = (product: Product, variation: Variation | null = null) => {
		const variationId = variation?.id ?? 0;

		setLines((current) => {
			const existing = current.find((line) => !line.removed && !line.id && line.product_id === product.id && line.variation_id === variationId);

			if (existing) {
				return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
			}

			const attributes = (variation?.attributes ?? []).map((attribute) => attribute.option).join(', ');

			return [
				...current,
				{
					key: nextKey(),
					product_id: product.id,
					variation_id: variationId,
					name: attributes ? `${decodeHtml(product.name)} - ${attributes}` : decodeHtml(product.name),
					sku: variation?.sku || product.sku || '',
					image: variation?.image?.src || product.images?.[0]?.src || '',
					price: Number(variation?.price ?? product.price) || 0,
					quantity: 1,
					removed: false,
				},
			];
		});

		touch();
		setProductSearch('');
		setProductResults([]);
		setVariationPicker({ product: null, variations: [], loading: false });
	};

	const pickProduct = async (product: Product) => {
		if (product.type !== 'variable') {
			addLine(product);
			return;
		}

		setVariationPicker({ product, variations: [], loading: true });

		const response = await wc<Variation>(`products/${product.id}/variations`, { params: { per_page: 100, _fields: 'id,attributes,price,sku,stock_status,image,status' } });

		setVariationPicker({ product, variations: (response.data ?? []).filter((variation) => variation.status !== 'private'), loading: false });
	};

	/* Customers ------------------------------------------------------------ */

	useEffect(() => {
		const term = customerSearch.trim();

		if (term.length < 2) {
			setCustomerResults([]);
			return;
		}

		let active = true;
		const timer = window.setTimeout(() => {
			setCustomerLoading(true);

			wc<Customer>('customers', { params: { search: term, per_page: 6, role: 'all', _fields: 'id,first_name,last_name,email,avatar_url,billing,shipping' } }).then((response) => {
				if (!active) {
					return;
				}

				setCustomerResults(response.data ?? []);
				setCustomerLoading(false);
			});
		}, 300);

		return () => {
			active = false;
			window.clearTimeout(timer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [customerSearch]);

	const selectCustomer = (picked: Customer) => {
		setCustomer(picked);
		setForm((current) => ({
			...current,
			customer_id: picked.id,
			billing: { ...emptyAddress(), ...picked.billing, email: picked.billing?.email || picked.email },
			shipping: { ...emptyAddress(), ...picked.shipping },
			ship_to_billing: !picked.shipping?.address_1,
		}));
		touch();
		setCustomerSearch('');
		setCustomerResults([]);
	};

	/* Lines ---------------------------------------------------------------- */

	const visibleLines = lines.filter((line) => !line.removed);
	const visibleShipping = shippingLines.filter((line) => !line.removed);
	const visibleFees = feeLines.filter((line) => !line.removed);
	const visibleCoupons = coupons.filter((coupon) => !coupon.removed);

	const itemsSubtotal = visibleLines.reduce((total, line) => total + (Number(line.price) || 0) * (Number(line.quantity) || 0), 0);
	const shippingTotal = visibleShipping.reduce((total, line) => total + (Number(toDecimal(line.total)) || 0), 0);
	const feesTotal = visibleFees.reduce((total, line) => total + (Number(toDecimal(line.total)) || 0), 0);
	const estimatedTotal = itemsSubtotal + shippingTotal + feesTotal;

	const money = (value: number | string) => (order ? orderMoney(value, order) : price(value));

	const isEditable = isNew || EDITABLE_STATUSES.includes(order?.status ?? '');

	const removeLine = (line: Line) => {
		setLines((current) => (line.id ? current.map((item) => (item.key === line.key ? { ...item, removed: true } : item)) : current.filter((item) => item.key !== line.key)));
		touch();
	};

	const removeShipping = (line: ShippingLine) => {
		setShippingLines((current) => (line.id ? current.map((item) => (item.key === line.key ? { ...item, removed: true } : item)) : current.filter((item) => item.key !== line.key)));
		touch();
	};

	const removeFee = (line: FeeLine) => {
		setFeeLines((current) => (line.id ? current.map((item) => (item.key === line.key ? { ...item, removed: true } : item)) : current.filter((item) => item.key !== line.key)));
		touch();
	};

	const removeCoupon = (coupon: CouponLine) => {
		setCoupons((current) => (coupon.id ? current.map((item) => (item.key === coupon.key ? { ...item, removed: true } : item)) : current.filter((item) => item.key !== coupon.key)));
		touch();
	};

	const addCoupon = () => {
		const code = couponInput.trim().toLowerCase();

		if (!code || visibleCoupons.some((coupon) => coupon.code.toLowerCase() === code)) {
			return;
		}

		setCoupons((current) => [...current, { key: nextKey(), code, removed: false }]);
		setCouponInput('');
		touch();
	};

	/* Save ------------------------------------------------------------------ */

	const couponCodes = (list: { code: string; removed?: boolean }[]) =>
		list
			.filter((coupon) => !coupon.removed)
			.map((coupon) => coupon.code.toLowerCase())
			.sort()
			.join('|');

	const buildLines = () => {
		const decimals = currency.decimals ?? 2;
		const originalCoupons = couponCodes((order?.coupon_lines ?? []).map((line) => ({ code: line.code })));
		const couponsChanged = couponCodes(coupons) !== originalCoupons;

		const lineItems = lines
			.map((line) => {
				if (!line.id) {
					return { product_id: line.product_id, ...(line.variation_id ? { variation_id: line.variation_id } : {}), quantity: Number(line.quantity) || 1 };
				}

				if (line.removed) {
					return { id: line.id, quantity: 0 };
				}

				const quantity = Number(line.quantity) || 1;
				const original = order?.line_items?.find((item) => item.id === line.id);

				if (original && Number(original.quantity) === quantity) {
					return null;
				}

				// WooCommerce keeps the line totals when only the quantity is sent, so send them explicitly.
				// Coupons are re-applied below and recalculate the discounted total.
				const subtotal = ((line.unitSubtotal ?? 0) * quantity).toFixed(decimals);

				return { id: line.id, quantity, subtotal, total: subtotal };
			})
			.filter(Boolean);

		const hasCoupons = visibleCoupons.length > 0 || originalCoupons !== '';

		return {
			line_items: lineItems,
			shipping_lines: shippingLines.map((line) =>
				line.id && line.removed
					? { id: line.id, method_id: null }
					: { ...(line.id ? { id: line.id } : {}), method_id: line.method_id, method_title: line.method_title, total: toDecimal(line.total) || '0' }
			),
			fee_lines: feeLines.map((line) =>
				line.id && line.removed ? { id: line.id, name: null } : { ...(line.id ? { id: line.id } : {}), name: line.name.trim(), total: toDecimal(line.total) || '0', tax_status: 'none' }
			),
			// The v3 API replaces the whole coupon list; re-sending it also recalculates discounts after item changes.
			...(couponsChanged || (hasCoupons && lineItems.length) ? { coupon_lines: visibleCoupons.map((coupon) => ({ code: coupon.code })) } : {}),
		};
	};

	const save = async () => {
		if (!visibleLines.length) {
			notify({ title: __('Add at least one product to the order.'), tone: 'error' });
			return;
		}

		if (visibleFees.some((line) => !line.name.trim())) {
			notify({ title: __('Give every fee a name.'), tone: 'error' });
			return;
		}

		const data: Record<string, unknown> = buildLines();

		if (isNew) {
			const gateway = store.payment_gateways.find((item) => item.value === form.payment_method);

			Object.assign(data, {
				status: form.status,
				customer_id: form.customer_id || 0,
				billing: form.billing,
				shipping: form.ship_to_billing ? Object.fromEntries(Object.entries(form.billing).filter(([key]) => key !== 'email')) : form.shipping,
				payment_method: form.payment_method,
				payment_method_title: gateway?.label || '',
				set_paid: form.set_paid,
				customer_note: form.customer_note,
			});
		}

		setSaving(true);

		try {
			const response = isNew ? await wc<Order>('orders', { method: 'POST', data }) : await wc<Order>(`orders/${id}`, { method: 'PUT', data });
			const saved = response.data as unknown as Order;

			if (!saved) {
				return;
			}

			setDirty(false);
			notify({ title: isNew ? sprintf(__('Order #%s created'), saved.number) : __('Order items updated'), tone: 'success' });
			queryClient.invalidateQueries({ queryKey: orderKeys.ordersRoot });
			queryClient.invalidateQueries({ queryKey: orderKeys.order(saved.id) });
			navigate(`/order/${saved.id}`, { replace: true });
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-72" />
				<Skeleton className="h-96 w-full rounded-2xl" />
			</div>
		);
	}

	const shippingMethodOptions = [{ value: 'other', label: __('Other') }, ...store.shipping_methods];
	const paymentOptions = [{ value: '', label: __('No payment method') }, ...store.payment_gateways];
	const statusOptions = store.order_statuses.filter((status) => !['checkout-draft', 'refunded'].includes(status.value));

	return (
		<div>
			<PageHeader
				title={isNew ? __('Add order') : sprintf(__('Edit items of %s'), orderTitle(order))}
				description={isNew ? __('Create an order manually, e.g. for phone or in-store sales.') : customerName(order)}
				breadcrumbs={[
					{ label: __('Orders'), onClick: () => navigate('/') },
					...(isNew ? [] : [{ label: `#${order?.number || id}`, onClick: () => navigate(`/order/${id}`) }]),
					{ label: isNew ? __('Add order') : __('Edit items') },
				]}
				actions={
					<>
						<Button variant="outline" onClick={() => navigate(isNew ? '/' : `/order/${id}`)}>
							{__('Cancel')}
						</Button>
						<Button icon="check" loading={saving} disabled={!isEditable} onClick={save}>
							{isNew ? __('Create order') : __('Save items')}
						</Button>
					</>
				}
			/>

			{!isEditable ? (
				<Alert
					variant="warning"
					className="mb-6"
					title={__('This order can no longer be edited')}
					message={__('Only pending or on-hold orders can have their items changed. Change the status first.')}
				/>
			) : null}

			<div className="grid gap-6 xl:grid-cols-3">
				<div className="min-w-0 space-y-6 xl:col-span-2">
					<Card title={__('Items')}>
						<div className="relative">
							<SearchInput value={productSearch} onChange={setProductSearch} debounce={0} placeholder={__('Search products by name or SKU to add')} disabled={!isEditable} />

							{productSearch.trim().length >= 2 ? (
								<div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg custom-scrollbar dark:border-gray-800 dark:bg-gray-900">
									{productLoading || variationPicker.loading ? (
										<div className="flex justify-center py-6">
											<Spinner />
										</div>
									) : variationPicker.product ? (
										<>
											<button
												type="button"
												className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-theme-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
												onClick={() => setVariationPicker({ product: null, variations: [], loading: false })}
											>
												<Icon name="arrow_back" className="text-theme-md" />
												{decodeHtml(variationPicker.product.name)}
											</button>
											{!variationPicker.variations.length ? (
												<p className="px-3 py-4 text-center text-theme-sm text-gray-500">{__('This product has no variations.')}</p>
											) : (
												variationPicker.variations.map((variation) => (
													<button
														key={variation.id}
														type="button"
														className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/[0.03]"
														disabled={variation.stock_status === 'outofstock'}
														onClick={() => addLine(variationPicker.product as Product, variation)}
													>
														<span className="text-theme-sm text-gray-800 dark:text-white/90">
															{variation.attributes.map((attribute) => attribute.option).join(', ') || sprintf(__('Variation #%s'), variation.id)}
														</span>
														<span className="whitespace-nowrap text-theme-sm text-gray-500 dark:text-gray-400">
															{variation.stock_status === 'outofstock' ? __('Out of stock') : price(variation.price)}
														</span>
													</button>
												))
											)}
										</>
									) : !productResults.length ? (
										<p className="px-3 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No products found.')}</p>
									) : (
										productResults.map((product) => (
											<button
												key={product.id}
												type="button"
												className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 dark:hover:bg-white/[0.03]"
												onClick={() => pickProduct(product)}
											>
												<span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
													{product.images?.[0]?.src ? <img src={product.images[0].src} alt="" className="h-full w-full object-cover" /> : <Icon name="inventory" className="text-gray-400" />}
												</span>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{decodeHtml(product.name)}</span>
													<span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">
														{product.sku || '—'}
														{product.stock_status === 'outofstock' ? ` · ${__('Out of stock')}` : null}
													</span>
												</span>
												<span className="whitespace-nowrap text-theme-sm text-gray-500 dark:text-gray-400">
													{product.type === 'variable' ? `${__('Choose variation')} ›` : price(product.price)}
												</span>
											</button>
										))
									)}
								</div>
							) : null}
						</div>

						{!visibleLines.length ? (
							<EmptyState className="mt-4" compact icon="shopping_bag" title={__('No items yet')} description={__('Search for products above to add them to the order.')} />
						) : (
							<ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
								{visibleLines.map((line) => (
									<li key={line.key} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
										<span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
											{line.image ? <img src={line.image} alt="" className="h-full w-full object-cover" /> : <Icon name="inventory" className="text-gray-400" />}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{line.name}</span>
											<span className="block text-theme-xs text-gray-500 dark:text-gray-400">
												{money(line.price)}
												{line.sku ? ` · ${line.sku}` : null}
											</span>
										</span>
										<Input
											value={String(line.quantity)}
											onChange={(event) => {
												const quantity = Number(event.target.value) || 1;
												setLines((current) => current.map((item) => (item.key === line.key ? { ...item, quantity } : item)));
												touch();
											}}
											type="number"
											min={1}
											step={1}
											size="sm"
											className="w-20"
											disabled={!isEditable}
											aria-label={__('Quantity')}
										/>
										<span className="w-24 whitespace-nowrap text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
											{money((Number(line.price) || 0) * (Number(line.quantity) || 0))}
										</span>
										<Button variant="ghost" size="xs" icon="delete" iconOnly disabled={!isEditable} aria-label={__('Remove item')} onClick={() => removeLine(line)} />
									</li>
								))}
							</ul>
						)}
					</Card>

					<Card title={__('Shipping and fees')}>
						<div className="space-y-3">
							{visibleShipping.map((line) => (
								<div key={line.key} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_9rem_auto]">
									<Select
										value={line.method_id}
										onChange={(event) => {
											const method = store.shipping_methods.find((item) => item.value === event.target.value);
											setShippingLines((current) =>
												current.map((item) => (item.key === line.key ? { ...item, method_id: event.target.value, method_title: method?.label ?? item.method_title } : item))
											);
											touch();
										}}
										options={shippingMethodOptions}
										label={__('Shipping method')}
										disabled={!isEditable}
									/>
									<Input
										value={line.method_title}
										onChange={(event) => {
											setShippingLines((current) => current.map((item) => (item.key === line.key ? { ...item, method_title: event.target.value } : item)));
											touch();
										}}
										label={__('Name shown to customer')}
										disabled={!isEditable}
									/>
									<Input
										value={line.total}
										onChange={(event) => {
											setShippingLines((current) => current.map((item) => (item.key === line.key ? { ...item, total: event.target.value } : item)));
											touch();
										}}
										label={__('Cost')}
										prefix={currency.symbol}
										inputMode="decimal"
										disabled={!isEditable}
									/>
									<Button variant="ghost" icon="delete" iconOnly disabled={!isEditable} aria-label={__('Remove shipping')} onClick={() => removeShipping(line)} />
								</div>
							))}

							{visibleFees.map((line) => (
								<div key={line.key} className="grid items-end gap-3 sm:grid-cols-[2fr_9rem_auto]">
									<Input
										value={line.name}
										onChange={(event) => {
											setFeeLines((current) => current.map((item) => (item.key === line.key ? { ...item, name: event.target.value } : item)));
											touch();
										}}
										label={__('Fee name')}
										disabled={!isEditable}
									/>
									<Input
										value={line.total}
										onChange={(event) => {
											setFeeLines((current) => current.map((item) => (item.key === line.key ? { ...item, total: event.target.value } : item)));
											touch();
										}}
										label={__('Amount')}
										prefix={currency.symbol}
										inputMode="decimal"
										hint={__('Use a negative value for a discount.')}
										disabled={!isEditable}
									/>
									<Button variant="ghost" icon="delete" iconOnly disabled={!isEditable} aria-label={__('Remove fee')} onClick={() => removeFee(line)} />
								</div>
							))}

							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									variant="outline"
									icon="local_shipping"
									disabled={!isEditable}
									onClick={() => {
										const method = store.shipping_methods[0];
										setShippingLines((current) => [
											...current,
											{ key: nextKey(), method_id: method?.value || 'other', method_title: method?.label || __('Shipping'), total: '', removed: false },
										]);
										touch();
									}}
								>
									{__('Add shipping')}
								</Button>
								<Button
									size="sm"
									variant="outline"
									icon="add"
									disabled={!isEditable}
									onClick={() => {
										setFeeLines((current) => [...current, { key: nextKey(), name: '', total: '', removed: false }]);
										touch();
									}}
								>
									{__('Add fee')}
								</Button>
							</div>
						</div>
					</Card>

					{isNew ? (
						<>
							<Card title={__('Billing address')}>
								<AddressFields
									address={form.billing}
									onChange={(billing) => {
										setForm((current) => ({ ...current, billing }));
										touch();
									}}
									type="billing"
								/>
							</Card>

							<Card title={__('Shipping address')}>
								<Switch
									checked={form.ship_to_billing}
									onCheckedChange={(ship_to_billing) => {
										setForm((current) => ({ ...current, ship_to_billing }));
										touch();
									}}
									label={__('Same as billing address')}
								/>
								{!form.ship_to_billing ? (
									<div className="mt-5">
										<AddressFields
											address={form.shipping}
											onChange={(shipping) => {
												setForm((current) => ({ ...current, shipping }));
												touch();
											}}
											type="shipping"
										/>
									</div>
								) : null}
							</Card>
						</>
					) : null}
				</div>

				<div className="min-w-0 space-y-6">
					{isNew ? (
						<Card title={__('Customer')}>
							{customer ? (
								<div className="flex items-center gap-3">
									<Avatar src={customer.avatar_url || ''} name={customerLabel(customer)} />
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-gray-800 dark:text-white/90">{customerLabel(customer)}</p>
										<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{customer.email}</p>
									</div>
									<Button
										variant="ghost"
										size="xs"
										icon="close"
										iconOnly
										aria-label={__('Remove customer')}
										onClick={() => {
											setCustomer(null);
											setForm((current) => ({ ...current, customer_id: 0 }));
											touch();
										}}
									/>
								</div>
							) : (
								<div className="relative">
									<SearchInput value={customerSearch} onChange={setCustomerSearch} debounce={0} placeholder={__('Search customers by name or email')} />
									<p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">{__('Leave empty to create a guest order.')}</p>
									{customerSearch.trim().length >= 2 ? (
										<div className="absolute inset-x-0 top-12 z-20 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg custom-scrollbar dark:border-gray-800 dark:bg-gray-900">
											{customerLoading ? (
												<div className="flex justify-center py-4">
													<Spinner />
												</div>
											) : !customerResults.length ? (
												<p className="px-3 py-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No customers found.')}</p>
											) : (
												customerResults.map((result) => (
													<button
														key={result.id}
														type="button"
														className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 dark:hover:bg-white/[0.03]"
														onClick={() => selectCustomer(result)}
													>
														<Avatar src={result.avatar_url || ''} name={customerLabel(result)} size="sm" />
														<span className="min-w-0">
															<span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{customerLabel(result)}</span>
															<span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">{result.email}</span>
														</span>
													</button>
												))
											)}
										</div>
									) : null}
								</div>
							)}
						</Card>
					) : null}

					{isNew ? (
						<Card title={__('Order')}>
							<div className="space-y-4">
								<Select
									value={form.status}
									onChange={(event) => {
										setForm((current) => ({ ...current, status: event.target.value }));
										touch();
									}}
									options={statusOptions}
									label={__('Status')}
								/>
								<Select
									value={form.payment_method}
									onChange={(event) => {
										setForm((current) => ({ ...current, payment_method: event.target.value }));
										touch();
									}}
									options={paymentOptions}
									label={__('Payment method')}
								/>
								<Checkbox
									checked={form.set_paid}
									onCheckedChange={(set_paid) => {
										setForm((current) => ({ ...current, set_paid }));
										touch();
									}}
									label={__('Mark as paid')}
									description={__('Sets the payment date and moves the order to processing or completed.')}
								/>
								<Textarea
									value={form.customer_note}
									onChange={(event) => {
										setForm((current) => ({ ...current, customer_note: event.target.value }));
										touch();
									}}
									rows={3}
									label={__('Customer note')}
								/>
							</div>
						</Card>
					) : null}

					<Card title={__('Coupons')}>
						<form
							className="flex gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								addCoupon();
							}}
						>
							<Input
								value={couponInput}
								onChange={(event) => setCouponInput(event.target.value)}
								size="sm"
								className="flex-1"
								placeholder={__('Coupon code')}
								disabled={!isEditable}
								aria-label={__('Coupon code')}
							/>
							<Button type="submit" size="sm" variant="outline" disabled={!isEditable}>
								{__('Apply')}
							</Button>
						</form>
						{visibleCoupons.length ? (
							<div className="mt-3 flex flex-wrap gap-2">
								{visibleCoupons.map((coupon) => (
									<span
										key={coupon.key}
										className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 ps-3 pe-1.5 font-mono text-theme-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-300"
									>
										{coupon.code}
										<button
											type="button"
											className="rounded-full p-0.5 text-gray-400 hover:text-error-500"
											aria-label={__('Remove coupon')}
											disabled={!isEditable}
											onClick={() => removeCoupon(coupon)}
										>
											<Icon name="close" className="text-theme-sm" />
										</button>
									</span>
								))}
							</div>
						) : null}
					</Card>

					<Card title={__('Summary')}>
						<dl className="space-y-2.5 text-theme-sm">
							<div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
								<dt>{__('Items subtotal')}</dt>
								<dd className="text-gray-800 dark:text-white/90">{money(itemsSubtotal)}</dd>
							</div>
							<div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
								<dt>{__('Shipping')}</dt>
								<dd className="text-gray-800 dark:text-white/90">{money(shippingTotal)}</dd>
							</div>
							{feesTotal ? (
								<div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
									<dt>{__('Fees')}</dt>
									<dd className="text-gray-800 dark:text-white/90">{money(feesTotal)}</dd>
								</div>
							) : null}
							<div className="flex justify-between gap-4 border-t border-gray-100 pt-2.5 text-theme-md font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
								<dt>{__('Estimated total')}</dt>
								<dd>{money(estimatedTotal)}</dd>
							</div>
						</dl>
						<p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">{__('Coupons and taxes are applied by WooCommerce when the order is saved.')}</p>
					</Card>
				</div>
			</div>
		</div>
	);
};
