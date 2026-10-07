import { useMemo } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { useWoo } from '@/react/woo/WooProvider';
import { classicOrderUrl, orderPrice } from '@/react/features/orders/orderFormat';
import type { MenuItem } from '@/react/ui';
import type { Order } from '@/react/woo/types';

/**
 * Binds the order helpers that need the store data to the current page.
 */
export const useOrderHelpers = () => {
	const { adminUrl } = useWpData();
	const { store, currency, orderStatus } = useWoo();

	return useMemo(
		() => ({
			/** Money of an order, honouring a currency different from the store default. */
			price: (value: string | number | null | undefined, order?: Order | null) => orderPrice(value, order, currency),
			classicUrl: (id: number) => classicOrderUrl(id, store, adminUrl),
			/**
			 * Menu entries to move the order to another status, skipping the current one.
			 */
			statusActions: (onSelect: (status: string) => void, current?: string): MenuItem[] =>
				store.order_statuses
					.filter((status) => !['checkout-draft', 'trash'].includes(status.value) && status.value !== current)
					.map((status) => ({ label: status.label, onSelect: () => onSelect(status.value) })),
			orderStatus,
		}),
		[adminUrl, currency, orderStatus, store]
	);
};
