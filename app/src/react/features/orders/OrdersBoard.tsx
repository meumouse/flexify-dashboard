import { useState, type DragEvent } from 'react';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, DropdownMenu, Skeleton } from '@/react/ui';
import type { BadgeColor } from '@/react/ui/recipes';
import { useOrders, useUpdateOrder } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { Order, OrderStatusOption } from '@/react/woo/types';
import { boardColumns, statusAfterDrop } from '@/react/features/orders/board';
import { customerName, itemsCount, relativeDate } from '@/react/features/orders/orderFormat';
import { useOrderHelpers } from '@/react/features/orders/useOrderHelpers';

/**
 * The orders as a board: a column per status, a card per order, and moving a card is changing
 * the status.
 *
 * Dragging is the quick way; every card also has a menu with the same moves, which is the way
 * for a keyboard or a screen reader — and the way on a phone, where dragging scrolls.
 */

const PER_COLUMN = 20;

type Props = {
	/** The search and filters of the list, without status or paging: the board pages by column */
	params: Record<string, unknown>;
	counts: Record<string, number | undefined>;
	onOpen: (order: Order) => void;
};

type Dragging = { order: Order } | null;

const Column = ({
	status,
	params,
	count,
	dragging,
	onDragStart,
	onDragEnd,
	onMove,
	onOpen,
}: {
	status: OrderStatusOption;
	params: Record<string, unknown>;
	count?: number;
	dragging: Dragging;
	onDragStart: (order: Order) => void;
	onDragEnd: () => void;
	onMove: (order: Order, status: string) => void;
	onOpen: (order: Order) => void;
}) => {
	const { price, statusActions } = useOrderHelpers();
	const orders = useOrders({ ...params, status: status.value, per_page: PER_COLUMN, page: 1, orderby: 'date', order: 'desc' });
	const [over, setOver] = useState(false);
	const rows = orders.data?.data ?? [];
	const accepts = Boolean(dragging && statusAfterDrop(dragging.order.status, status.value));

	const onDragOver = (event: DragEvent<HTMLElement>) => {
		if (accepts) {
			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
			setOver(true);
		}
	};

	const onDrop = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		setOver(false);

		if (dragging && accepts) {
			onMove(dragging.order, status.value);
		}
	};

	return (
		<section
			aria-label={status.label}
			onDragOver={onDragOver}
			onDragLeave={(event) => (!event.currentTarget.contains(event.relatedTarget as Node | null) ? setOver(false) : undefined)}
			onDrop={onDrop}
			className={cn(
				'flex w-72 shrink-0 snap-start flex-col rounded-2xl border bg-gray-50 transition-colors dark:bg-white/[0.02] sm:w-80',
				over ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-gray-200 dark:border-gray-800',
				dragging && !accepts && 'opacity-60'
			)}
		>
			<header className="flex items-center justify-between gap-2 px-4 py-3">
				<span className="flex items-center gap-2">
					<Badge color={(status.color as BadgeColor) ?? 'light'} dot>
						{status.label}
					</Badge>
				</span>
				<span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">{(count ?? orders.data?.totalItems ?? 0).toLocaleString()}</span>
			</header>

			<ul className="flex min-h-24 flex-col gap-3 px-3 pb-3">
				{orders.isLoading
					? [0, 1, 2].map((index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)
					: rows.map((order) => (
							<li
								key={order.id}
								draggable
								onDragStart={(event) => {
									event.dataTransfer.effectAllowed = 'move';
									event.dataTransfer.setData('text/plain', String(order.id));
									onDragStart(order);
								}}
								onDragEnd={onDragEnd}
								className={cn(
									'cursor-grab rounded-xl border border-gray-200 bg-white p-3 shadow-theme-xs transition-opacity active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900',
									dragging?.order.id === order.id && 'opacity-40'
								)}
							>
								<div className="flex items-start justify-between gap-2">
									<button
										type="button"
										onClick={() => onOpen(order)}
										className="min-w-0 text-start text-theme-sm font-semibold text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
									>
										#{order.number}
										<span className="block truncate text-theme-xs font-normal text-gray-500 dark:text-gray-400">{customerName(order)}</span>
									</button>
									<DropdownMenu
										items={[{ heading: __('Move to') }, ...statusActions((next) => onMove(order, next), order.status)]}
										width="w-52"
										trigger={<Button variant="ghost" size="xs" icon="more_horiz" iconOnly aria-label={sprintf(__('Move order #%s'), order.number)} />}
									/>
								</div>
								<div className="mt-3 flex items-center justify-between gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
									<span>{`${relativeDate(order.date_created)} · ${sprintf(__('%d item(s)'), itemsCount(order))}`}</span>
									<span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{price(order.total, order)}</span>
								</div>
							</li>
						))}

				{!orders.isLoading && !rows.length ? <li className="py-6 text-center text-theme-xs text-gray-400">{__('No orders here')}</li> : null}

				{(orders.data?.totalItems ?? 0) > rows.length ? (
					<li className="text-center text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('Showing the newest %d'), rows.length)}</li>
				) : null}
			</ul>
		</section>
	);
};

export const OrdersBoard = ({ params, counts, onOpen }: Props) => {
	const { store } = useWoo();
	const { orderStatus } = useOrderHelpers();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const update = useUpdateOrder();
	const [dragging, setDragging] = useState<Dragging>(null);

	const move = async (order: Order, target: string) => {
		setDragging(null);

		// The menu offers every status, the columns only the board's ones; either way the same move.
		const next = target !== order.status ? target : null;

		if (!next) {
			return;
		}

		// A status change can send the customer an email, so it is asked, not assumed.
		const confirmed = await confirm({
			title: sprintf(__('Move order #%1$s to %2$s?'), order.number, orderStatus(next).label),
			message: __('WooCommerce may email the customer about the new status.'),
			confirmLabel: __('Move'),
		});

		if (!confirmed) {
			return;
		}

		update.mutate(
			{ id: order.id, data: { status: next } },
			{
				onSuccess: () => notify({ tone: 'success', title: sprintf(__('Order #%1$s is now %2$s'), order.number, orderStatus(next).label) }),
				onError: (error) => notify({ tone: 'error', title: (error as Error).message }),
			}
		);
	};

	return (
		<div className="flex snap-x gap-4 overflow-x-auto p-4 custom-scrollbar sm:p-5">
			{boardColumns(store.order_statuses).map((status) => (
				<Column
					key={status.value}
					status={status}
					params={params}
					count={counts[status.value]}
					dragging={dragging}
					onDragStart={(order) => setDragging({ order })}
					onDragEnd={() => setDragging(null)}
					onMove={move}
					onOpen={onOpen}
				/>
			))}
		</div>
	);
};
