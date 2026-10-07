import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Avatar, Badge, Button, Card, DropdownMenu, EmptyState, Icon, PageHeader, Skeleton, Tooltip, type MenuItem } from '@/react/ui';
import { orderKeys, useCountries, useOrder, useOrderAction, useOrderContext, useOrderSiblings, useOrdersBulk, useUpdateOrder } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import { AddressModal } from '@/react/features/orders/AddressModal';
import { ExtensionCardRender } from '@/react/features/orders/ExtensionCardRender';
import { OrderNotes } from '@/react/features/orders/OrderNotes';
import { RefundModal } from '@/react/features/orders/RefundModal';
import { customerName, formatDate, itemsCount, orderTitle, totalRefunded } from '@/react/features/orders/orderFormat';
import { useOrderHelpers } from '@/react/features/orders/useOrderHelpers';
import type { Address, ExtensionCard, OrderLineItem } from '@/react/woo/types';

/**
 * Everything about one order: items, totals, refunds, notes, customer, addresses and payment.
 */

const DETAIL_STATUSES_WITHOUT_REFUND = ['pending', 'failed', 'cancelled', 'checkout-draft', 'trash'];
const EDITABLE_ITEM_STATUSES = ['pending', 'on-hold', 'checkout-draft'];

export const OrderDetails = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { can } = useWoo();
	const { price, classicUrl, statusActions, orderStatus } = useOrderHelpers();
	const queryClient = useQueryClient();

	const id = Number(useParams().id) || 0;

	/** Pull the order, its context and the notes again after an action changed them. */
	const reload = useCallback(() => {
		[orderKeys.order(id), orderKeys.context(id), orderKeys.notes(id)].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
	}, [id, queryClient]);

	const orderQuery = useOrder(id);
	const contextQuery = useOrderContext(id);
	const { data: countries = [] } = useCountries();

	const order = orderQuery.data ?? null;
	const context = contextQuery.data ?? null;

	const siblingsQuery = useOrderSiblings(id, order?.date_created_gmt);
	const siblings = siblingsQuery.data ?? { previous: null, next: null };

	const updateOrder = useUpdateOrder();
	const orderAction = useOrderAction(id);
	const bulk = useOrdersBulk();

	const [refundOpen, setRefundOpen] = useState(false);
	const [addressModal, setAddressModal] = useState<{ open: boolean; type: 'billing' | 'shipping' }>({ open: false, type: 'billing' });
	const [extensionCards, setExtensionCards] = useState<ExtensionCard[]>([]);

	useEffect(() => {
		if (!order) {
			return;
		}

		let active = true;

		Promise.resolve(applyFilters('flexify-dashboard/orders/detail/sidebar', [], { order, context })).then((cards: unknown) => {
			if (active) {
				setExtensionCards(Array.isArray(cards) ? (cards as ExtensionCard[]) : []);
			}
		});

		return () => {
			active = false;
		};
	}, [context, order]);

	if (orderQuery.isLoading) {
		return (
			<div>
				<div className="mb-6 space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-7 w-56" />
				</div>
				<div className="grid gap-6 xl:grid-cols-3">
					<div className="space-y-6 xl:col-span-2">
						<Skeleton className="h-80 w-full rounded-2xl" />
						<Skeleton className="h-64 w-full rounded-2xl" />
					</div>
					<div className="space-y-6">
						<Skeleton className="h-48 w-full rounded-2xl" />
						<Skeleton className="h-56 w-full rounded-2xl" />
					</div>
				</div>
			</div>
		);
	}

	if (orderQuery.isError || !order) {
		return (
			<Card>
				<EmptyState
					icon="search_off"
					title={__('Order not found')}
					description={__('The order may have been deleted or you do not have permission to view it.')}
				>
					<Button icon="arrow_back" variant="outline" onClick={() => navigate('/')}>
						{__('Back to orders')}
					</Button>
				</EmptyState>
			</Card>
		);
	}

	const status = orderStatus(order.status);
	const refunded = totalRefunded(order);
	const netTotal = (Number(order.total) || 0) - refunded;
	const itemsSubtotal = (order.line_items ?? []).reduce((total, item) => total + (Number(item.subtotal) || 0), 0);

	const canRefund = can('edit_shop_orders') && !DETAIL_STATUSES_WITHOUT_REFUND.includes(order.status) && (Number(order.total) || 0) - refunded > 0;
	const canEditItems = can('edit_shop_orders') && EDITABLE_ITEM_STATUSES.includes(order.status);

	const countryName = (code?: string) => countries.find((country) => country.code === code)?.name ?? code ?? '';

	const addressLines = (address?: Partial<Address> | null) =>
		[
			[address?.first_name, address?.last_name].filter(Boolean).join(' '),
			address?.company,
			address?.address_1,
			address?.address_2,
			[address?.city, address?.state].filter(Boolean).join(' - '),
			address?.postcode,
			address?.country ? countryName(address.country) : '',
		].filter((line): line is string => Boolean(line && String(line).trim()));

	const hasShipping = Boolean(order.shipping?.address_1 || order.shipping?.city || order.shipping?.first_name || order.shipping?.company);

	const mapsUrl = (address?: Partial<Address> | null) =>
		`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
			[address?.address_1, address?.address_2, address?.city, address?.state, address?.postcode, address?.country].filter(Boolean).join(', ')
		)}`;

	const changeStatus = async (value: string) => {
		await updateOrder.mutateAsync({ id, data: { status: value } });
		notify({ title: sprintf(__('Order marked as %s'), orderStatus(value).label), tone: 'success' });
		reload();
	};

	const runAction = async (action: { value: string; label: string }) => {
		const result = await orderAction.mutateAsync(action.value);

		if (!result?.success) {
			return;
		}

		notify({ title: __('Order action applied'), message: action.label, tone: 'success' });
		reload();
	};

	const trashOrder = async () => {
		const confirmed = await confirm({
			title: __('Move to trash?'),
			message: sprintf(__('%s will be moved to the trash.'), orderTitle(order)),
			confirmLabel: __('Move to trash'),
			variant: 'danger',
		});

		if (!confirmed) {
			return;
		}

		const result = await bulk.mutateAsync({ ids: [id], action: 'trash' });

		if (result?.updated?.length) {
			notify({ title: __('Order moved to the trash'), tone: 'success' });
			navigate('/');
		}
	};

	const actionItems: MenuItem[] = [
		...(context?.actions ?? []).map((action) => ({ label: action.label, icon: 'bolt', onSelect: () => runAction(action) })),
		...((context?.actions ?? []).length ? [{ separator: true as const }] : []),
		{ label: __('Print'), icon: 'print', onSelect: () => window.print() },
		{ label: __('Open in classic editor'), icon: 'open_in_new', href: context?.native_edit_url || classicUrl(id) },
		...(can('delete_shop_orders') && order.status !== 'trash'
			? [{ separator: true as const }, { label: __('Move to trash'), icon: 'delete', danger: true, onSelect: trashOrder }]
			: []),
	];

	const itemMeta = (item: OrderLineItem) => context?.items?.[item.id]?.meta ?? [];
	const itemImage = (item: OrderLineItem) => context?.items?.[item.id]?.image || item.image?.src || '';
	const itemEditUrl = (item: OrderLineItem) => context?.items?.[item.id]?.edit_url || '';
	const itemRefundedQty = (item: OrderLineItem) => Number(context?.items?.[item.id]?.refunded_qty) || 0;

	const device = String(context?.attribution?.device ?? '').toLowerCase();
	const deviceIcon = device.includes('mobile') ? 'mobile' : device.includes('tablet') ? 'tablet' : 'desktop';

	const totalsRow = (label: string, value: string, className = 'text-gray-800 dark:text-white/90', negative = false) => (
		<div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
			<dt className="truncate">{label}</dt>
			<dd className={className}>{negative ? <bdi>-{value}</bdi> : value}</dd>
		</div>
	);

	return (
		<div>
			<PageHeader
				title={
					<span className="flex flex-wrap items-center gap-3">
						{orderTitle(order)}
						<Badge color={status.color as never} size="md">
							{status.label}
						</Badge>
					</span>
				}
				breadcrumbs={[{ label: __('Orders'), onClick: () => navigate('/') }, { label: `#${order.number}` }]}
				actions={
					<>
						<div className="flex items-center gap-1">
							<Tooltip text={siblings.previous ? sprintf(__('Newer order #%s'), siblings.previous.number) : __('No newer orders')}>
								<Button
									variant="outline"
									icon="chevron_left"
									iconOnly
									disabled={!siblings.previous}
									aria-label={__('Newer order')}
									onClick={() => siblings.previous && navigate(`/order/${siblings.previous.id}`)}
								/>
							</Tooltip>
							<Tooltip text={siblings.next ? sprintf(__('Older order #%s'), siblings.next.number) : __('No older orders')}>
								<Button
									variant="outline"
									icon="chevron_right"
									iconOnly
									disabled={!siblings.next}
									aria-label={__('Older order')}
									onClick={() => siblings.next && navigate(`/order/${siblings.next.id}`)}
								/>
							</Tooltip>
						</div>
						<DropdownMenu
							items={actionItems}
							width="w-64"
							trigger={
								<Button variant="outline" iconRight="expand_more" loading={orderAction.isPending}>
									{__('Actions')}
								</Button>
							}
						/>
						{canEditItems ? (
							<Button variant="outline" icon="edit" onClick={() => navigate(`/order/${id}/edit`)}>
								{__('Edit items')}
							</Button>
						) : null}
						{canRefund ? (
							<Button variant="outline" icon="undo" onClick={() => setRefundOpen(true)}>
								{__('Refund')}
							</Button>
						) : null}
						<DropdownMenu
							items={statusActions(changeStatus, order.status)}
							width="w-52"
							trigger={
								<Button iconRight="expand_more" loading={updateOrder.isPending}>
									{__('Change status')}
								</Button>
							}
						/>
					</>
				}
			/>

			<p className="-mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-theme-sm text-gray-500 dark:text-gray-400">
				<span className="flex items-center gap-1.5">
					<Icon name="calendar_today" className="text-base" />
					{formatDate(order.date_created, true)}
				</span>
				{order.payment_method_title ? (
					<span className="flex items-center gap-1.5">
						<Icon name="payments" className="text-base" />
						{order.payment_method_title}
					</span>
				) : null}
				<span className="flex items-center gap-1.5">
					<Icon name="shopping_bag" className="text-base" />
					{sprintf(__('%d item(s)'), itemsCount(order))}
				</span>
			</p>

			<div className="grid gap-6 xl:grid-cols-3">
				<div className="min-w-0 space-y-6 xl:col-span-2">
					<Card title={__('Items')} padding="none">
						<div className="overflow-x-auto custom-scrollbar">
							<table className="w-full min-w-[560px] text-theme-sm">
								<thead>
									<tr className="border-y border-gray-100 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
										<th className="px-5 py-3 text-start font-medium sm:px-6">{__('Product')}</th>
										<th className="px-4 py-3 text-end font-medium">{__('Price')}</th>
										<th className="px-4 py-3 text-center font-medium">{__('Qty')}</th>
										<th className="px-5 py-3 text-end font-medium sm:px-6">{__('Total')}</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
									{order.line_items?.map((item) => {
										const editUrl = itemEditUrl(item);
										const meta = itemMeta(item);

										return (
											<tr key={item.id}>
												<td className="px-5 py-4 sm:px-6">
													<div className="flex items-start gap-3">
														<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
															{itemImage(item) ? (
																<img src={itemImage(item)} alt="" className="h-full w-full object-cover" loading="lazy" />
															) : (
																<Icon name="inventory" className="text-xl text-gray-400" />
															)}
														</div>
														<div className="min-w-0">
															{editUrl ? (
																<a href={editUrl} className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400">
																	{decodeHtml(item.name)}
																</a>
															) : (
																<span className="font-medium text-gray-800 dark:text-white/90">{decodeHtml(item.name)}</span>
															)}
															{item.sku ? (
																<p className="text-theme-xs text-gray-500 dark:text-gray-400">
																	{__('SKU')}: {item.sku}
																</p>
															) : null}
															{meta.length ? (
																<dl className="mt-1 space-y-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
																	{meta.map((entry) => (
																		<div key={entry.key} className="flex gap-1">
																			<dt className="font-medium">{entry.key}:</dt>
																			<dd>{entry.value}</dd>
																		</div>
																	))}
																</dl>
															) : null}
														</div>
													</div>
												</td>
												<td className="whitespace-nowrap px-4 py-4 text-end text-gray-500 dark:text-gray-400">{price(item.price, order)}</td>
												<td className="px-4 py-4 text-center text-gray-800 dark:text-white/90">
													× {item.quantity}
													{itemRefundedQty(item) ? (
														<span className="block text-theme-xs text-error-500">
															<bdi>-{itemRefundedQty(item)}</bdi>
														</span>
													) : null}
												</td>
												<td className="whitespace-nowrap px-5 py-4 text-end font-medium text-gray-800 dark:text-white/90 sm:px-6">
													{Number(item.subtotal) > Number(item.total) ? (
														<span className="me-1 text-theme-xs font-normal text-gray-400 line-through">{price(item.subtotal, order)}</span>
													) : null}
													{price(item.total, order)}
												</td>
											</tr>
										);
									})}
									{order.fee_lines?.map((fee) => (
										<tr key={`fee-${fee.id}`}>
											<td className="px-5 py-3 text-gray-700 dark:text-gray-300 sm:px-6" colSpan={3}>
												<span className="flex items-center gap-2">
													<Icon name="add" className="text-base text-gray-400" />
													{decodeHtml(fee.name)}
												</span>
											</td>
											<td className="whitespace-nowrap px-5 py-3 text-end text-gray-800 dark:text-white/90 sm:px-6">{price(fee.total, order)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="flex flex-col gap-6 border-t border-gray-100 px-5 py-5 dark:border-gray-800 sm:flex-row sm:justify-between sm:px-6">
							<div className="flex flex-wrap content-start gap-2">
								{order.coupon_lines?.map((coupon) => (
									<Badge key={coupon.id} color="light" icon="sell">
										{coupon.code}
									</Badge>
								))}
							</div>

							<dl className="w-full space-y-2.5 text-theme-sm sm:max-w-xs">
								{totalsRow(__('Items subtotal'), price(itemsSubtotal, order))}
								{Number(order.discount_total) ? totalsRow(__('Coupons'), price(order.discount_total, order), 'text-success-600 dark:text-success-500', true) : null}
								{order.shipping_lines?.map((line) => (
									<div key={`ship-${line.id}`} className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
										<dt className="truncate">{sprintf(__('Shipping: %s'), decodeHtml(line.method_title))}</dt>
										<dd className="text-gray-800 dark:text-white/90">{price(line.total, order)}</dd>
									</div>
								))}
								{Number(order.total_tax) ? totalsRow(__('Taxes'), price(order.total_tax, order)) : null}
								<div className="flex justify-between gap-4 border-t border-gray-100 pt-2.5 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
									<dt>{__('Order total')}</dt>
									<dd>{price(order.total, order)}</dd>
								</div>
								{refunded ? (
									<>
										<div className="flex justify-between gap-4 text-error-600 dark:text-error-500">
											<dt>{__('Refunded')}</dt>
											<dd>
												<bdi>-{price(refunded, order)}</bdi>
											</dd>
										</div>
										<div className="flex justify-between gap-4 font-semibold text-gray-800 dark:text-white/90">
											<dt>{__('Net payment')}</dt>
											<dd>{price(netTotal, order)}</dd>
										</div>
									</>
								) : null}
							</dl>
						</div>

						{order.refunds?.length ? (
							<div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
								<h4 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Refunds')}</h4>
								<ul className="space-y-1.5">
									{order.refunds.map((refund) => (
										<li key={refund.id} className="flex items-center justify-between gap-4 text-theme-sm">
											<span className="text-gray-500 dark:text-gray-400">
												{sprintf(__('Refund #%s'), refund.id)}
												{refund.reason ? ` — ${refund.reason}` : null}
											</span>
											<span className="whitespace-nowrap text-error-600 dark:text-error-500">{price(refund.total, order)}</span>
										</li>
									))}
								</ul>
							</div>
						) : null}
					</Card>

					{order.customer_note ? (
						<Card title={__('Customer note')}>
							<p className="whitespace-pre-line text-theme-sm text-gray-700 dark:text-gray-300">{order.customer_note}</p>
						</Card>
					) : null}

					<OrderNotes orderId={order.id} />
				</div>

				<div className="min-w-0 space-y-6">
					<Card
						title={__('Customer')}
						actions={
							context?.customer?.profile_url ? (
								<Tooltip text={__('View profile')}>
									<Button variant="ghost" size="xs" icon="open_in_new" iconOnly href={context.customer.profile_url} aria-label={__('View profile')} />
								</Tooltip>
							) : null
						}
					>
						<div className="flex items-center gap-3">
							<Avatar src={context?.customer?.avatar || ''} name={customerName(order)} size="lg" />
							<div className="min-w-0">
								<p className="truncate font-medium text-gray-800 dark:text-white/90">{customerName(order)}</p>
								<p className="text-theme-xs text-gray-500 dark:text-gray-400">{order.customer_id ? __('Registered customer') : __('Guest')}</p>
							</div>
						</div>

						{context?.customer ? (
							<div className="mt-4 grid grid-cols-2 gap-3">
								<div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
									<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Orders')}</p>
									<p className="font-semibold text-gray-800 dark:text-white/90">{Number(context.customer.orders_count || 0).toLocaleString()}</p>
								</div>
								{context.customer.total_spent !== null ? (
									<div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
										<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Total spent')}</p>
										<p className="truncate font-semibold text-gray-800 dark:text-white/90">{price(context.customer.total_spent, order)}</p>
									</div>
								) : null}
							</div>
						) : null}

						<ul className="mt-4 space-y-2 text-theme-sm">
							{order.billing?.email ? (
								<li className="flex items-center gap-2">
									<Icon name="email" className="shrink-0 text-base text-gray-400" />
									<a href={`mailto:${order.billing.email}`} dir="ltr" className="truncate text-brand-500 hover:text-brand-600 dark:text-brand-400">
										{order.billing.email}
									</a>
								</li>
							) : null}
							{order.billing?.phone ? (
								<li className="flex items-center gap-2">
									<Icon name="mobile" className="shrink-0 text-base text-gray-400" />
									<a href={`tel:${order.billing.phone}`} dir="ltr" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
										{order.billing.phone}
									</a>
								</li>
							) : null}
						</ul>
					</Card>

					<Card
						title={__('Billing address')}
						actions={<Button variant="ghost" size="xs" icon="edit" iconOnly aria-label={__('Edit billing address')} onClick={() => setAddressModal({ open: true, type: 'billing' })} />}
					>
						{addressLines(order.billing).length ? (
							<address className="space-y-0.5 text-theme-sm not-italic text-gray-600 dark:text-gray-400">
								{addressLines(order.billing).map((line, index) => (
									<p key={index}>{line}</p>
								))}
							</address>
						) : (
							<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No billing address.')}</p>
						)}
					</Card>

					<Card
						title={__('Shipping address')}
						actions={
							<>
								{hasShipping ? (
									<Tooltip text={__('View on map')}>
										<Button
											variant="ghost"
											size="xs"
											icon="location_on"
											iconOnly
											href={mapsUrl(order.shipping)}
											target="_blank"
											rel="noopener noreferrer"
											aria-label={__('View on map')}
										/>
									</Tooltip>
								) : null}
								<Button variant="ghost" size="xs" icon="edit" iconOnly aria-label={__('Edit shipping address')} onClick={() => setAddressModal({ open: true, type: 'shipping' })} />
							</>
						}
					>
						{hasShipping ? (
							<address className="space-y-0.5 text-theme-sm not-italic text-gray-600 dark:text-gray-400">
								{addressLines(order.shipping).map((line, index) => (
									<p key={index}>{line}</p>
								))}
							</address>
						) : (
							<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No shipping address set.')}</p>
						)}
						{order.shipping_lines?.map((line) => (
							<div key={line.id} className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
								<Icon name="local_shipping" className="shrink-0 text-base text-gray-400" />
								<span className="truncate">{decodeHtml(line.method_title)}</span>
							</div>
						))}
					</Card>

					<Card title={__('Payment')}>
						<dl className="space-y-3 text-theme-sm">
							<div className="flex justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">{__('Method')}</dt>
								<dd className="text-end text-gray-800 dark:text-white/90">{order.payment_method_title || '—'}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">{__('Paid on')}</dt>
								<dd className="text-end text-gray-800 dark:text-white/90">{order.date_paid ? formatDate(order.date_paid, true) : __('Not paid')}</dd>
							</div>
							{context?.payment?.transaction_id ? (
								<div className="flex justify-between gap-4">
									<dt className="text-gray-500 dark:text-gray-400">{__('Transaction ID')}</dt>
									<dd className="min-w-0 text-end">
										{context.payment.transaction_url ? (
											<a
												href={context.payment.transaction_url}
												target="_blank"
												rel="noopener noreferrer"
												className="break-all text-brand-500 hover:text-brand-600 dark:text-brand-400"
											>
												{context.payment.transaction_id}
											</a>
										) : (
											<span className="break-all text-gray-800 dark:text-white/90">{context.payment.transaction_id}</span>
										)}
									</dd>
								</div>
							) : null}
						</dl>
					</Card>

					{context?.attribution || context?.customer?.ip_address ? (
						<Card title={__('Order attribution')}>
							<dl className="space-y-3 text-theme-sm">
								{context.attribution ? (
									<div className="flex justify-between gap-4">
										<dt className="text-gray-500 dark:text-gray-400">{__('Origin')}</dt>
										<dd className="text-end text-gray-800 dark:text-white/90">
											{context.attribution.label}
											{context.attribution.source ? ` · ${context.attribution.source}` : null}
										</dd>
									</div>
								) : null}
								{context.attribution?.device ? (
									<div className="flex justify-between gap-4">
										<dt className="text-gray-500 dark:text-gray-400">{__('Device')}</dt>
										<dd className="flex items-center gap-1.5 text-gray-800 dark:text-white/90">
											<Icon name={deviceIcon} className="text-base text-gray-400" />
											{context.attribution.device}
										</dd>
									</div>
								) : null}
								{context.customer?.ip_address ? (
									<div className="flex justify-between gap-4">
										<dt className="text-gray-500 dark:text-gray-400">{__('IP address')}</dt>
										<dd className="text-end text-gray-800 dark:text-white/90">{context.customer.ip_address}</dd>
									</div>
								) : null}
							</dl>
						</Card>
					) : null}

					{context?.custom_fields?.length ? (
						<Card title={__('Custom fields')}>
							<dl className="space-y-3 text-theme-sm">
								{context.custom_fields.map((field, index) => (
									<div key={`${field.key}-${index}`}>
										<dt className="text-theme-xs text-gray-500 dark:text-gray-400">{field.key}</dt>
										<dd className="break-words text-gray-800 dark:text-white/90">{field.value || '—'}</dd>
									</div>
								))}
							</dl>
						</Card>
					) : null}

					{extensionCards.map((card, index) => (
						<Card key={card.metadata?.id || `extension-${index}`} title={card.title || ''}>
							<ExtensionCardRender card={card} props={{ order, context }} />
						</Card>
					))}
				</div>
			</div>

			<RefundModal
				open={refundOpen}
				onOpenChange={setRefundOpen}
				order={order}
				items={context?.items ?? {}}
				supportsGatewayRefund={Boolean(context?.payment?.supports_refunds)}
				onRefunded={reload}
			/>
			<AddressModal
				open={addressModal.open}
				onOpenChange={(open) => setAddressModal((current) => ({ ...current, open }))}
				order={order}
				type={addressModal.type}
				onSaved={reload}
			/>
		</div>
	);
};
