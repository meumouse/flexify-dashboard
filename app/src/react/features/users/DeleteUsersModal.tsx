import { useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Field, Modal, Radio } from '@/react/ui';
import { EntityPicker, userItem } from '@/react/data/EntityPicker';
import { useUserMutations } from '@/react/features/users/queries';

/**
 * Deleting people asks what happens to what they wrote.
 *
 * WordPress will not delete a user without being told, and the Vue screen answered for it —
 * everything always went to user 1, whoever that happens to be on the site.
 */

type Props = {
	open: boolean;
	onClose: () => void;
	ids: number[];
	onDone: () => void;
};

export const DeleteUsersModal = ({ open, onClose, ids, onDone }: Props) => {
	const { userId } = useWpData();
	const { bulk, remove } = useUserMutations();
	const [mode, setMode] = useState<'reassign' | 'delete'>('reassign');
	const [heir, setHeir] = useState<number[]>([userId]);

	const confirm = () =>
		bulk.mutate(
			{
				ids,
				action: remove(mode === 'reassign' ? (heir[0] ?? userId) : null),
				message: __('Users deleted'),
			},
			{
				onSuccess: () => {
					onDone();
					onClose();
				},
			}
		);

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : onClose())}
			title={__('Delete these users?')}
			description={sprintf(__('%d user(s) will be deleted. This cannot be undone.'), ids.length)}
			footer={
				<>
					<Button variant="outline" onClick={onClose}>
						{__('Cancel')}
					</Button>
					<Button variant="danger" loading={bulk.isPending} disabled={mode === 'reassign' && !heir.length} onClick={confirm}>
						{__('Delete')}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4">
				<Radio
					name="fd-delete-users"
					checked={mode === 'reassign'}
					onSelect={() => setMode('reassign')}
					label={__('Give their content to someone else')}
					value="reassign"
				/>

				{mode === 'reassign' ? (
					<div className="ps-7">
						<Field label={__('New owner')}>
							<EntityPicker endpoint="wp/v2/users" toItem={userItem} value={heir} onChange={setHeir} multiple={false} placeholder={__('Choose a user')} />
						</Field>
					</div>
				) : null}

				<Radio
					name="fd-delete-users"
					checked={mode === 'delete'}
					onSelect={() => setMode('delete')}
					label={__('Delete their content too')}
					description={__('Posts, pages and uploads they own go with them.')}
					value="delete"
				/>
			</div>
		</Modal>
	);
};
