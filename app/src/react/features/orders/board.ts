import type { OrderStatusOption } from '@/react/woo/types';

/**
 * Which statuses the orders board shows as columns, and what a drop means.
 *
 * The board is for orders that still move: waiting for payment, being prepared, on hold, done.
 * Cancelled, refunded and failed orders are where an order stops, and a column of each would
 * grow forever beside the ones that matter.
 */

export const BOARD_STATUSES = ['pending', 'processing', 'on-hold', 'completed'];

/** The columns, in board order, for the statuses this store actually has. */
export const boardColumns = (statuses: OrderStatusOption[]): OrderStatusOption[] =>
	BOARD_STATUSES.map((value) => statuses.find((status) => status.value === value)).filter((status): status is OrderStatusOption => Boolean(status));

/** The status an order should change to when dropped on a column, or null when nothing changes. */
export const statusAfterDrop = (current: string, target: string): string | null => (current === target || !BOARD_STATUSES.includes(target) ? null : target);
