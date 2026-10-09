import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/react/ui';
import { useCountries, useOrder } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import { customerName, formatAddress, formatDate, orderTitle, totalRefunded } from '@/react/features/orders/orderFormat';
import { useOrderHelpers } from '@/react/features/orders/useOrderHelpers';

/**
 * One order on a sheet of paper: who sold, who bought, what, and for how much.
 *
 * Printing the details screen printed the menu, the toolbar and every button with it. This page
 * draws only the sheet, and the print rules hide everything around it.
 */

// Visibility rather than display: the sheet sits deep inside the shell, and hiding its ancestors
// with display would hide it too.
const PRINT_STYLES = `
@media print {
	body * { visibility: hidden !important; }
	.fd-print-sheet, .fd-print-sheet * { visibility: visible !important; }
	.fd-print-sheet { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0 !important; }
	.fd-print-sheet tr { break-inside: avoid; }
	@page { margin: 14mm; }
}`;

/** Paper is white: the dark theme is taken off for the print and put back after it. */
const usePrintInLight = () => {
	useEffect(() => {
		const root = document.documentElement;
		let wasDark = false;

		const before = () => {
			wasDark = root.classList.contains('dark');
			root.classList.remove('dark');
		};

		const after = () => {
			if (wasDark) {
				root.classList.add('dark');
			}
		};

		window.addEventListener('beforeprint', before);
		window.addEventListener('afterprint', after);

		return () => {
			window.removeEventListener('beforeprint', before);
			window.removeEventListener('afterprint', after);
		};
	}, []);
};

export const OrderPrint = () => {
	const navigate = useNavigate();
	const id = Number(useParams().id) || 0;
	const { store } = useWoo();
	const { price, orderStatus } = useOrderHelpers();
	const orderQuery = useOrder(id);
	const { data: countries = [] } = useCountries();
	const order = orderQuery.data ?? null;

	usePrintInLight();

	if (orderQuery.isLoading) {
		return <Skeleton className="mx-auto h-[640px] w-full max-w-3xl rounded-2xl" />;
	}

	if (!order) {
		return (
			<Card>
				<EmptyState icon="search_off" title={__('Order not found')} description={__('The order may have been deleted or you do not have permission to view it.')} />
			</Card>
		);
	}

	const countryName = (code?: string) => countries.find((country) => country.code === code)?.name ?? code ?? '';
	// The name is already the heading of the block, so the address starts after it.
	const address = (value: typeof order.billing) => formatAddress(value ? { ...value, first_name: '', last_name: '', country: countryName(value.country) } : value);
	const refunded = totalRefunded(order);
	const status = orderStatus(order.status);
	const shop = store.store;

	const totals: { label: string; value: string; strong?: boolean }[] = [
		{ label: __('Items subtotal'), value: price((order.line_items ?? []).reduce((total, item) => total + (Number(item.subtotal) || 0), 0), order) },
		...(Number(order.discount_total) ? [{ label: __('Coupons'), value: `-${price(order.discount_total, order)}` }] : []),
		...(Number(order.shipping_total) ? [{ label: __('Shipping'), value: price(order.shipping_total, order) }] : []),
		...(order.fee_lines ?? []).map((fee) => ({ label: decodeHtml(fee.name), value: price(fee.total, order) })),
		...(Number(order.total_tax) ? [{ label: __('Taxes'), value: price(order.total_tax, order) }] : []),
		{ label: __('Order total'), value: price(order.total, order), strong: true },
		...(refunded ? [{ label: __('Refunded'), value: `-${price(refunded, order)}` }] : []),
	];

	return (
		<div>
			<style>{PRINT_STYLES}</style>

			<PageHeader
				title={sprintf(__('Print order #%s'), order.number)}
				breadcrumbs={[
					{ label: __('Orders'), onClick: () => navigate('/') },
					{ label: `#${order.number}`, onClick: () => navigate(`/order/${order.id}`) },
					{ label: __('Print') },
				]}
				actions={
					<>
						<Button variant="outline" icon="arrow_back" onClick={() => navigate(`/order/${order.id}`)}>
							{__('Back to order')}
						</Button>
						<Button icon="print" onClick={() => window.print()}>
							{__('Print')}
						</Button>
					</>
				}
			/>

			<Card className="fd-print-sheet mx-auto max-w-3xl" padding="none">
				<div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-6 py-6 dark:border-gray-800 sm:px-8">
					<div>
						<h3 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">{orderTitle(order)}</h3>
						<p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(order.date_created, true)}</p>
					</div>
					<Badge color={status.color as never} size="md">
						{status.label}
					</Badge>
				</div>

				<div className="grid gap-6 border-b border-gray-100 px-6 py-6 dark:border-gray-800 sm:grid-cols-2 sm:px-8">
					<div>
						<p className="mb-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400">{__('From')}</p>
						<p className="font-semibold text-gray-800 dark:text-white/90">{shop?.name ?? ''}</p>
						<address className="mt-1 space-y-0.5 text-theme-sm not-italic text-gray-600 dark:text-gray-400">
							{(shop?.address ?? []).map((line) => (
								<p key={line}>{line}</p>
							))}
							{shop?.email ? <p>{shop.email}</p> : null}
						</address>
					</div>
					<div className="sm:text-end">
						<p className="mb-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400">{__('To')}</p>
						<p className="font-semibold text-gray-800 dark:text-white/90">{customerName(order)}</p>
						<address className="mt-1 space-y-0.5 text-theme-sm not-italic text-gray-600 dark:text-gray-400">
							{address(order.billing).map((line) => (
								<p key={line}>{line}</p>
							))}
							{order.billing?.email ? <p>{order.billing.email}</p> : null}
							{order.billing?.phone ? <p>{order.billing.phone}</p> : null}
						</address>
					</div>
				</div>

				<div className="overflow-x-auto px-6 py-6 sm:px-8">
					<table className="w-full min-w-[480px] text-theme-sm">
						<thead>
							<tr className="border-b border-gray-100 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
								<th className="py-3 pe-4 text-start font-medium">{__('Product')}</th>
								<th className="px-4 py-3 text-center font-medium">{__('Qty')}</th>
								<th className="px-4 py-3 text-end font-medium">{__('Price')}</th>
								<th className="py-3 ps-4 text-end font-medium">{__('Total')}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{(order.line_items ?? []).map((item) => (
								<tr key={item.id}>
									<td className="py-3 pe-4 text-gray-800 dark:text-white/90">
										{decodeHtml(item.name)}
										{item.sku ? <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('SKU: %s'), item.sku)}</span> : null}
									</td>
									<td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
									<td className="whitespace-nowrap px-4 py-3 text-end text-gray-700 dark:text-gray-300">{price(item.price, order)}</td>
									<td className="whitespace-nowrap py-3 ps-4 text-end font-medium text-gray-800 dark:text-white/90">{price(item.total, order)}</td>
								</tr>
							))}
						</tbody>
					</table>

					<dl className="ms-auto mt-6 w-full space-y-2 text-theme-sm sm:max-w-xs">
						{totals.map((row) => (
							<div
								key={row.label}
								className={
									row.strong
										? 'flex justify-between gap-4 border-t border-gray-100 pt-2 text-theme-md font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90'
										: 'flex justify-between gap-4 text-gray-500 dark:text-gray-400'
								}
							>
								<dt>{row.label}</dt>
								<dd className={row.strong ? '' : 'text-gray-800 dark:text-white/90'}>{row.value}</dd>
							</div>
						))}
					</dl>
				</div>

				<div className="grid gap-4 border-t border-gray-100 px-6 py-5 text-theme-sm dark:border-gray-800 sm:grid-cols-2 sm:px-8">
					<div>
						<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Payment method')}</p>
						<p className="text-gray-800 dark:text-white/90">{order.payment_method_title || '—'}</p>
					</div>
					{order.shipping_lines?.length ? (
						<div className="sm:text-end">
							<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Shipping method')}</p>
							<p className="text-gray-800 dark:text-white/90">{order.shipping_lines.map((line) => decodeHtml(line.method_title)).join(', ')}</p>
						</div>
					) : null}
					{order.customer_note ? (
						<div className="sm:col-span-2">
							<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Customer note')}</p>
							<p className="whitespace-pre-line text-gray-800 dark:text-white/90">{order.customer_note}</p>
						</div>
					) : null}
				</div>
			</Card>
		</div>
	);
};
