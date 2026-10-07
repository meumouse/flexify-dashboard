import { useEffect, useState } from 'react';
import { useNotify } from '@/react/app/ToastProvider';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Button, Checkbox, Input, Modal } from '@/react/ui';
import { orderKeys, useWooMutation } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import { totalRefunded } from '@/react/features/orders/orderFormat';
import { useOrderHelpers } from '@/react/features/orders/useOrderHelpers';
import type { Order, OrderContextItem, OrderTax } from '@/react/woo/types';

/**
 * Refund an order, by item or by amount, with optional restock.
 */

type Line = {
	id: number;
	name: string;
	max: number;
	quantity: number;
	unit: number;
	taxes: OrderTax[];
	total: number;
	originalQuantity: number;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	order: Order;
	/** Extra item data from the context endpoint, keyed by item id */
	items?: Record<number, OrderContextItem>;
	supportsGatewayRefund?: boolean;
	onRefunded: () => void;
};

export const RefundModal = ({ open, onOpenChange, order, items = {}, supportsGatewayRefund = false, onRefunded }: Props) => {
	const { notify } = useNotify();
	const { wc, currency, toDecimal } = useWoo();
	const { price } = useOrderHelpers();

	const [lines, setLines] = useState<Line[]>([]);
	const [form, setForm] = useState({ amount: '', reason: '', restock: true, manual: false });
	const [error, setError] = useState('');

	const createRefund = useWooMutation<{ id: number }, Record<string, unknown>>(
		async (data) => (await wc<{ id: number }>(`orders/${order.id}/refunds`, { method: 'POST', data })).data as unknown as { id: number },
		[orderKeys.order(order.id), orderKeys.context(order.id), orderKeys.notes(order.id), orderKeys.ordersRoot]
	);

	const available = Math.max(0, (Number(order.total) || 0) - totalRefunded(order));

	useEffect(() => {
		if (!open) {
			return;
		}

		setError('');
		setForm({ amount: '', reason: '', restock: true, manual: !supportsGatewayRefund });
		setLines(
			(order.line_items ?? []).map((item) => {
				const quantity = Number(item.quantity) || 0;
				const unit = quantity ? ((Number(item.total) || 0) + (Number(item.total_tax) || 0)) / quantity : 0;

				return {
					id: item.id,
					name: decodeHtml(item.name),
					max: Math.max(0, quantity - (Number(items[item.id]?.refunded_qty) || 0)),
					quantity: 0,
					unit,
					taxes: item.taxes ?? [],
					total: Number(item.total) || 0,
					originalQuantity: quantity,
				};
			})
		);
		// `items` is rebuilt by the context query on every refetch, so only the open state matters here.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, order, supportsGatewayRefund]);

	/** Picking quantities fills the amount; typing an amount by hand still wins afterwards. */
	const setQuantity = (id: number, quantity: number) => {
		const next = lines.map((line) => (line.id === id ? { ...line, quantity } : line));
		const total = next.reduce((sum, line) => sum + (Number(line.quantity) || 0) * line.unit, 0);

		setLines(next);

		if (total > 0) {
			setForm((current) => ({ ...current, amount: total.toFixed(currency.decimals ?? 2).replace('.', currency.decimal_separator || ',') }));
		}
	};

	const submit = async () => {
		setError('');
		const amount = Number(toDecimal(form.amount));

		if (!amount || amount <= 0) {
			setError(__('Enter a refund amount greater than zero.'));
			return;
		}

		if (amount > available + 0.001) {
			setError(sprintf(__('The refund amount cannot exceed %s.'), price(available, order)));
			return;
		}

		const lineItems = lines
			.filter((line) => Number(line.quantity) > 0)
			.map((line) => {
				const ratio = line.originalQuantity ? Number(line.quantity) / line.originalQuantity : 0;

				return {
					id: line.id,
					quantity: Number(line.quantity),
					refund_total: Number((line.total * ratio).toFixed(4)),
					refund_tax: line.taxes.map((tax) => ({ id: tax.id, refund_total: Number(((Number(tax.total) || 0) * ratio).toFixed(4)) })),
				};
			});

		await createRefund.mutateAsync({
			amount: toDecimal(form.amount),
			reason: form.reason,
			api_refund: !form.manual,
			api_restock: form.restock,
			line_items: lineItems,
		});

		notify({ title: __('Refund created'), tone: 'success' });
		onOpenChange(false);
		onRefunded();
	};

	const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			size="lg"
			title={__('Refund order')}
			description={sprintf(__('Available to refund: %s'), price(available, order))}
			footer={
				<>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{__('Cancel')}
					</Button>
					<Button variant="danger" loading={createRefund.isPending} onClick={submit}>
						{form.amount ? sprintf(__('Refund %s'), price(toDecimal(form.amount), order)) : __('Refund')}
					</Button>
				</>
			}
		>
			<div className="space-y-5">
				{error ? <Alert variant="error" title={error} /> : null}

				{lines.length ? (
					<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
						<table className="w-full text-theme-sm">
							<thead className="bg-gray-50 text-theme-xs text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
								<tr>
									<th className="px-4 py-2.5 text-start font-medium">{__('Item')}</th>
									<th className="px-4 py-2.5 text-end font-medium">{__('Unit price')}</th>
									<th className="w-28 px-4 py-2.5 text-end font-medium">{__('Qty to refund')}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
								{lines.map((line) => (
									<tr key={line.id}>
										<td className="px-4 py-3 text-gray-800 dark:text-white/90">
											{line.name}
											<span className="block text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%d available'), line.max)}</span>
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-end text-gray-500 dark:text-gray-400">{price(line.unit, order)}</td>
										<td className="px-4 py-3">
											<Input
												value={String(line.quantity)}
												onChange={(event) => setQuantity(line.id, Number(event.target.value) || 0)}
												type="number"
												min={0}
												max={line.max}
												step={1}
												size="sm"
												disabled={!line.max}
												aria-label={__('Quantity to refund')}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}

				<div className="grid gap-4 sm:grid-cols-2">
					<Input value={form.amount} onChange={(event) => set({ amount: event.target.value })} label={__('Refund amount')} prefix={currency.symbol} inputMode="decimal" required />
					<Input value={form.reason} onChange={(event) => set({ reason: event.target.value })} label={__('Reason (optional)')} />
				</div>

				<div className="space-y-3">
					<Checkbox checked={form.restock} onCheckedChange={(restock) => set({ restock })} label={__('Restock refunded items')} />
					{supportsGatewayRefund ? (
						<Checkbox
							checked={form.manual}
							onCheckedChange={(manual) => set({ manual })}
							label={__('Refund manually')}
							description={__('Record the refund without sending it to the payment gateway.')}
						/>
					) : (
						<Alert
							variant="info"
							title={__('Manual refund')}
							message={__('The payment method does not support automatic refunds. Remember to return the money to the customer manually.')}
						/>
					)}
				</div>
			</div>
		</Modal>
	);
};
