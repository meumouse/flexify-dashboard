import { useEffect, useState } from 'react';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import { Button, Modal } from '@/react/ui';
import { useUpdateOrder } from '@/react/woo/queries';
import { AddressFields } from '@/react/features/orders/AddressFields';
import { ADDRESS_FIELDS, emptyAddress } from '@/react/features/orders/orderFormat';
import type { Address, Order } from '@/react/woo/types';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	order: Order;
	type: 'billing' | 'shipping';
	onSaved: (order: Order) => void;
};

export const AddressModal = ({ open, onOpenChange, order, type, onSaved }: Props) => {
	const { notify } = useNotify();
	const updateOrder = useUpdateOrder();
	const [address, setAddress] = useState<Address>(emptyAddress);

	const isBilling = type === 'billing';

	useEffect(() => {
		if (open) {
			setAddress({ ...emptyAddress(), ...(order?.[type] ?? {}) });
		}
	}, [open, order, type]);

	const copyFromBilling = () => {
		const { email, ...billing } = order?.billing ?? {};

		setAddress((current) => ({ ...current, ...billing }));
	};

	const submit = async () => {
		const data = Object.fromEntries(ADDRESS_FIELDS.filter((field) => isBilling || field !== 'email').map((field) => [field, address[field] ?? '']));

		const updated = await updateOrder.mutateAsync({ id: order.id, data: { [type]: data } });

		notify({ title: isBilling ? __('Billing address updated') : __('Shipping address updated'), tone: 'success' });
		onOpenChange(false);
		onSaved(updated);
	};

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			size="lg"
			title={isBilling ? __('Edit billing address') : __('Edit shipping address')}
			footer={
				<>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{__('Cancel')}
					</Button>
					<Button type="submit" form="fd-order-address" loading={updateOrder.isPending}>
						{__('Save address')}
					</Button>
				</>
			}
		>
			<form
				id="fd-order-address"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				{!isBilling ? (
					<Button className="mb-4" variant="link" size="sm" icon="content_copy" type="button" onClick={copyFromBilling}>
						{__('Copy billing address')}
					</Button>
				) : null}
				<AddressFields address={address} onChange={setAddress} type={type} />
			</form>
		</Modal>
	);
};
