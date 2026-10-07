import { useState } from 'react';
import { usePageData } from '@/react/app/WpDataProvider';
import { useRest } from '@/react/app/WpDataProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Field, Modal, Select } from '@/react/ui';
import { EntityPicker, termItem, userItem } from '@/react/data/EntityPicker';
import { usePostMutations } from '@/react/features/posts/usePostMutations';
import type { PostRow, PostStatus } from '@/react/features/posts/types';

/**
 * Change the same few fields on several posts at once. Only what is filled in is sent, so a
 * batch edit never clears a field by saying nothing about it.
 */

type Props = {
	open: boolean;
	onClose: () => void;
	posts: PostRow[];
	onDone: () => void;
};

export const BatchEditModal = ({ open, onClose, posts, onDone }: Props) => {
	const rest = useRest();
	const { bulk } = usePostMutations();
	const statuses = usePageData<PostStatus[]>('postStatuses', []);
	const supportsCategories = usePageData<boolean>('supportsCategories', false);
	const supportsTags = usePageData<boolean>('supportsTags', false);

	const [status, setStatus] = useState('');
	const [categories, setCategories] = useState<number[]>([]);
	const [tags, setTags] = useState<number[]>([]);
	const [author, setAuthor] = useState<number[]>([]);

	const hasChanges = Boolean(status || categories.length || tags.length || author.length);

	const save = () => {
		const data: Record<string, unknown> = {};

		if (status) data.status = status;
		if (categories.length) data.categories = categories;
		if (tags.length) data.tags = tags;
		if (author.length) data.author = author[0];

		bulk.mutate(
			{
				posts,
				action: (post) => rest.post(`wp/v2/${post.rest_base}/${post.id}`, data),
				message: __('Items updated'),
			},
			{
				onSuccess: () => {
					setStatus('');
					setCategories([]);
					setTags([]);
					setAuthor([]);
					onDone();
					onClose();
				},
			}
		);
	};

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : onClose())}
			title={__('Edit items')}
			description={sprintf(__('%d item(s) will be changed. Fields left empty stay as they are.'), posts.length)}
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
				<Select
						value={status}
						placeholder={__('Leave unchanged')}
						options={statuses.map((item) => ({ value: item.value, label: item.label }))}
						onChange={(event) => setStatus(event.target.value)} label={__('Status')} />

				<Field label={__('Author')}>
					<EntityPicker endpoint="wp/v2/users" toItem={userItem} value={author} onChange={setAuthor} multiple={false} placeholder={__('Leave unchanged')} params={{ who: 'authors' }} />
				</Field>

				{supportsCategories ? (
					<Field label={__('Categories')} hint={__('The chosen categories replace the current ones.')}>
						<EntityPicker endpoint="wp/v2/categories" toItem={termItem} value={categories} onChange={setCategories} placeholder={__('Leave unchanged')} />
					</Field>
				) : null}

				{supportsTags ? (
					<Field label={__('Tags')} hint={__('The chosen tags replace the current ones.')}>
						<EntityPicker endpoint="wp/v2/tags" toItem={termItem} value={tags} onChange={setTags} placeholder={__('Leave unchanged')} />
					</Field>
				) : null}
			</div>
		</Modal>
	);
};
