import { useState } from 'react';
import { useRest } from '@/react/app/WpDataProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Field, Input, Modal, Textarea } from '@/react/ui';
import { useMediaMutations } from '@/react/features/media/queries';

/**
 * The same caption, alt text or description on several files at once. A field left empty is
 * left alone, so this never clears what it was not told about.
 */

type Props = {
	open: boolean;
	onClose: () => void;
	ids: number[];
	onDone: () => void;
};

export const MediaBulkEdit = ({ open, onClose, ids, onDone }: Props) => {
	const rest = useRest();
	const { bulk } = useMediaMutations();
	const [form, setForm] = useState({ title: '', alt_text: '', caption: '', description: '' });

	const filled = Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim()));
	const hasChanges = Object.keys(filled).length > 0;

	const save = () =>
		bulk.mutate(
			{ ids, action: (id) => rest.post(`wp/v2/media/${id}`, filled), message: __('Files updated') },
			{
				onSuccess: () => {
					setForm({ title: '', alt_text: '', caption: '', description: '' });
					onDone();
					onClose();
				},
			}
		);

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : onClose())}
			title={__('Edit files')}
			description={sprintf(__('%d file(s) will be changed. Fields left empty stay as they are.'), ids.length)}
			footer={
				<>
					<Button variant="outline" onClick={onClose}>
						{__('Cancel')}
					</Button>
					<Button onClick={save} loading={bulk.isPending} disabled={!hasChanges}>
						{__('Save changes')}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4">
				<Field label={__('Title')}>
					<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
				</Field>
				<Field label={__('Alternative text')} hint={__('What the file shows, for people who cannot see it.')}>
					<Input value={form.alt_text} onChange={(event) => setForm({ ...form, alt_text: event.target.value })} />
				</Field>
				<Field label={__('Caption')}>
					<Input value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} />
				</Field>
				<Field label={__('Description')}>
					<Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
				</Field>
			</div>
		</Modal>
	);
};
