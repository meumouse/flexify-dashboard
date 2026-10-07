import { useConfirm } from '@/react/app/ConfirmProvider';
import { __ } from '@/react/lib/i18n';
import { Button, DropdownMenu, type MenuItem } from '@/react/ui';
import { usePostMutations } from '@/react/features/posts/usePostMutations';
import type { PostRow } from '@/react/features/posts/types';

/**
 * What can be done to one post. Below the actions the screen knows sit the ones the site's
 * own plugins added, which arrive already built as links.
 */

export const PostRowMenu = ({ post }: { post: PostRow }) => {
	const confirm = useConfirm();
	const { bulk, duplicate, remove, restore } = usePostMutations();
	const inTrash = post.single_status === 'trash';

	const run = (action: (post: PostRow) => Promise<unknown>, message: string) => bulk.mutate({ posts: [post], action, message });

	const askThenRemove = async () => {
		const confirmed = await confirm({
			title: inTrash ? __('Delete permanently?') : __('Move to the trash?'),
			message: inTrash ? __('This item will be deleted for good. There is no undo.') : __('You can restore it from the trash later.'),
			confirmLabel: inTrash ? __('Delete permanently') : __('Move to the trash'),
			variant: 'danger',
		});

		if (confirmed) {
			run(remove, inTrash ? __('Item deleted') : __('Item moved to the trash'));
		}
	};

	const items: MenuItem[] = [
		...(post.is_editable ? [{ label: __('Edit'), icon: 'edit', href: post.edit_url }] : []),
		{ label: __('View'), icon: 'visibility', href: post.view_url, target: '_blank' },
		...(post.is_editable ? [{ label: __('Duplicate'), icon: 'copy', onSelect: () => run(duplicate, __('Item duplicated')) }] : []),
		...(post.row_actions.length ? ([{ separator: true }] as MenuItem[]) : []),
		...post.row_actions.map((action) => ({ label: action.text, href: action.url })),
		...(inTrash && post.is_editable ? ([{ separator: true }, { label: __('Restore'), icon: 'update', onSelect: () => run(restore, __('Item restored')) }] as MenuItem[]) : []),
		...(post.is_editable ? ([{ separator: true }, { label: inTrash ? __('Delete permanently') : __('Move to the trash'), icon: 'delete', danger: true, onSelect: askThenRemove }] as MenuItem[]) : []),
	];

	return <DropdownMenu items={items} width="w-56" trigger={<Button variant="ghost" size="sm" iconOnly icon="more_vert" aria-label={__('Item actions')} />} />;
};
