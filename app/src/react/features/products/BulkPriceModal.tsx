import { useEffect, useState } from 'react';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Input, Modal, Tabs } from '@/react/ui';
import { useWoo } from '@/react/woo/WooProvider';
import type { BulkPriceValue } from '@/react/woo/types';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	count: number;
	onApply: (value: BulkPriceValue) => void;
};

const EMPTY = { target: 'regular' as const, operation: 'increase' as const, mode: 'percent' as const, amount: '' };

export const BulkPriceModal = ({ open, onOpenChange, count, onApply }: Props) => {
	const { currency, toDecimal } = useWoo();
	const [form, setForm] = useState<{ target: 'regular' | 'sale'; operation: 'increase' | 'decrease' | 'set'; mode: 'percent' | 'fixed'; amount: string }>(EMPTY);

	useEffect(() => {
		if (open) {
			setForm(EMPTY);
		}
	}, [open]);

	const valid = form.amount !== '' && Number(toDecimal(form.amount)) >= 0;

	const apply = () => {
		if (!valid) {
			return;
		}

		onApply({
			target: form.target,
			operation: form.operation,
			mode: form.operation === 'set' ? 'fixed' : form.mode,
			amount: toDecimal(form.amount),
		});

		onOpenChange(false);
	};

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			size="sm"
			title={__('Adjust prices')}
			description={sprintf(__('%d selected product(s). Variations of variable products are updated too.'), count)}
			footer={
				<>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{__('Cancel')}
					</Button>
					<Button type="submit" form="fd-bulk-price" disabled={!valid}>
						{__('Apply')}
					</Button>
				</>
			}
		>
			<form
				id="fd-bulk-price"
				className="space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					apply();
				}}
			>
				<div>
					<p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">{__('Price')}</p>
					<Tabs
						value={form.target}
						onChange={(target) => setForm((current) => ({ ...current, target }))}
						variant="segmented"
						ariaLabel={__('Price')}
						items={[
							{ value: 'regular', label: __('Regular price') },
							{ value: 'sale', label: __('Sale price') },
						]}
					/>
				</div>
				<div>
					<p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">{__('Operation')}</p>
					<Tabs
						value={form.operation}
						onChange={(operation) => setForm((current) => ({ ...current, operation }))}
						variant="segmented"
						ariaLabel={__('Operation')}
						items={[
							{ value: 'increase', label: __('Increase') },
							{ value: 'decrease', label: __('Decrease') },
							{ value: 'set', label: __('Set to') },
						]}
					/>
				</div>
				{form.operation !== 'set' ? (
					<div>
						<p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">{__('Adjust by')}</p>
						<Tabs
							value={form.mode}
							onChange={(mode) => setForm((current) => ({ ...current, mode }))}
							variant="segmented"
							ariaLabel={__('Adjust by')}
							items={[
								{ value: 'percent', label: __('Percentage') },
								{ value: 'fixed', label: __('Fixed amount') },
							]}
						/>
					</div>
				) : null}
				<Input
					value={form.amount}
					onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
					label={__('Amount')}
					inputMode="decimal"
					prefix={form.operation === 'set' || form.mode === 'fixed' ? currency.symbol : undefined}
					suffix={form.operation !== 'set' && form.mode === 'percent' ? '%' : undefined}
					required
				/>
			</form>
		</Modal>
	);
};
