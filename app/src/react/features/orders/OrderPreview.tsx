import { useEffect, useState } from 'react';
import { useNotify } from '@/react/app/ToastProvider';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, DropdownMenu, Icon, Sheet } from '@/react/ui';
import { useUpdateOrder } from '@/react/woo/queries';
import { formatAddress, formatDate, orderTitle } from '@/react/features/orders/orderFormat';
import { useOrderHelpers } from '@/react/features/orders/useOrderHelpers';
import type { Order } from '@/react/woo/types';

/**
 * Read-only summary of an order with a status change, opened from the list.
 */

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	order: Order | null;
	onStatusChanged: () => void;
	onOpenDetails: (order: Order) => void;
};

export const OrderPreview = ({ open, onOpenChange, order, onStatusChanged, onOpenDetails }: Props) => {
	const { notify } = useNotify();
	const { price, statusActions, orderStatus } = useOrderHelpers();
	const updateOrder = useUpdateOrder();
	const [current, setCurrent] = useState<Order | null>(order);

	useEffect(() => setCurrent(order), [order]);

	if (!current) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange} size="lg" title="">
				{null}
			</Sheet>
		);
	}

	const status = orderStatus(current.status);
	const billingLines = formatAddress(current.billing);
	const shippingLines = formatAddress(current.shipping);
	const subtotal = (current.line_items ?? []).reduce((total, item) => total + (Number(item.subtotal) || 0), 0);

	const changeStatus = async (value: string) => {
		const updated = await updateOrder.mutateAsync({ id: current.id, data: { status: value } });

		setCurrent((previous) => (previous ? { ...previous, status: updated.status } : previous));
		notify({ title: __('Order status updated'), tone: 'success' });
		onStatusChanged();
	};

	const goToDetails = () => {
		onOpenChange(false);
		onOpenDetails(current);
	};

	const summaryRow = (label: string, value: string, negative = false) => (
		<div className="flex justify-between text-gray-500 dark:text-gray-400">
			<dt>{label}</dt>
			<dd>{negative ? <bdi>-{value}</bdi> : value}</dd>
		</div>
	);

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			size="lg"
			title={orderTitle(current)}
			description={formatDate(current.date_created, true)}
			footer={
				<>
					<DropdownMenu
						items={statusActions(changeStatus, current.status)}
						width="w-52"
						side="top"
						trigger={
							<Button variant="outline" iconRight="expand_more" loading={updateOrder.isPending}>
								{__('Change status')}
							</Button>
						}
					/>
					<Button iconRight="arrow_forward" onClick={goToDetails}>
						{__('View details')}
					</Button>
				</>
			}
		>
			<div className="space-y-6">
				<div className="flex flex-wrap items-center gap-3">
					<Badge color={status.color as never} size="md">
						{status.label}
					</Badge>
					{current.payment_method_title ? (
						<span className="text-theme-sm text-gray-500 dark:text-gray-400">
							{sprintf(current.date_paid ? __('Paid via %s') : __('Payment via %s'), current.payment_method_title)}
						</span>
					) : null}
				</div>

				<section>
					<h3 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Items')}</h3>
					<ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
						{current.line_items?.map((item) => (
							<li key={item.id} className="flex items-center gap-3 px-4 py-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
									{item.image?.src ? <img src={item.image.src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="inventory" className="text-lg text-gray-400" />}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{decodeHtml(item.name)}</p>
									<p className="text-theme-xs text-gray-500 dark:text-gray-400">
										{item.quantity} × {price(item.price, current)}
										{item.sku ? ` · ${item.sku}` : null}
									</p>
								</div>
								<span className="whitespace-nowrap text-theme-sm font-medium text-gray-800 dark:text-white/90">{price(item.total, current)}</span>
							</li>
						))}
					</ul>

					<dl className="mt-4 space-y-2 text-theme-sm">
						{summaryRow(__('Subtotal'), price(subtotal, current))}
						{Number(current.discount_total) ? summaryRow(__('Discount'), price(current.discount_total, current), true) : null}
						{current.shipping_lines?.length ? summaryRow(__('Shipping'), price(current.shipping_total, current)) : null}
						{Number(current.total_tax) ? summaryRow(__('Taxes'), price(current.total_tax, current)) : null}
						<div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
							<dt>{__('Total')}</dt>
							<dd>{price(current.total, current)}</dd>
						</div>
					</dl>
				</section>

				<section className="grid gap-4 sm:grid-cols-2">
					<div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
						<h3 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Billing')}</h3>
						{billingLines.map((line, index) => (
							<p key={index} className="text-theme-sm text-gray-500 dark:text-gray-400">
								{line}
							</p>
						))}
						{current.billing?.email ? (
							<a href={`mailto:${current.billing.email}`} dir="ltr" className="mt-2 block truncate text-theme-sm text-brand-500 hover:text-brand-600">
								{current.billing.email}
							</a>
						) : null}
						{current.billing?.phone ? (
							<a href={`tel:${current.billing.phone}`} dir="ltr" className="block text-theme-sm text-brand-500 hover:text-brand-600">
								{current.billing.phone}
							</a>
						) : null}
					</div>
					<div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
						<h3 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Shipping')}</h3>
						{shippingLines.length ? (
							shippingLines.map((line, index) => (
								<p key={index} className="text-theme-sm text-gray-500 dark:text-gray-400">
									{line}
								</p>
							))
						) : (
							<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No shipping address.')}</p>
						)}
						{current.shipping_lines?.map((line) => (
							<p key={line.id} className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
								{line.method_title}
							</p>
						))}
					</div>
				</section>

				{current.customer_note ? (
					<section className="rounded-xl bg-warning-50 p-4 dark:bg-warning-500/10">
						<h3 className="mb-1 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Customer note')}</h3>
						<p className="whitespace-pre-line text-theme-sm text-gray-600 dark:text-gray-300">{current.customer_note}</p>
					</section>
				) : null}
			</div>
		</Sheet>
	);
};
