import { useEffect, useState } from 'react';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Modal, Select } from '@/react/ui';
import type { Option } from '@/react/woo/types';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'add' | 'remove';
	options: Option[];
	count: number;
	onApply: (categoryId: number) => void;
};

export const BulkCategoryModal = ({ open, onOpenChange, mode, options, count, onApply }: Props) => {
	const [category, setCategory] = useState('');

	useEffect(() => {
		if (open) {
			setCategory('');
		}
	}, [open]);

	const apply = () => {
		if (!category) {
			return;
		}

		onApply(Number(category));
		onOpenChange(false);
	};

	const title = mode === 'add' ? __('Add category') : __('Remove category');

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			size="sm"
			title={title}
			description={sprintf(__('%d selected product(s).'), count)}
			footer={
				<>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{__('Cancel')}
					</Button>
					<Button variant={mode === 'add' ? 'primary' : 'danger'} disabled={!category} onClick={apply}>
						{title}
					</Button>
				</>
			}
		>
			<Select
				value={category}
				onChange={(next) => setCategory(next)}
				label={__('Category')}
				placeholder={__('Select a category')}
				options={options}
			/>
		</Modal>
	);
};
