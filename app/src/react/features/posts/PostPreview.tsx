import { decodeHtml, stripTags } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Button, EmptyState, Icon } from '@/react/ui';
import { AuthorCell, StatusCell, TermsCell } from '@/react/features/posts/PostCells';
import { PostRowMenu } from '@/react/features/posts/PostRowMenu';
import type { PostRow, PostTerm } from '@/react/features/posts/types';

/**
 * What one post looks like next to the list: its details, the fields that can be changed from
 * here, and the page itself.
 */

const Label = ({ children }: { children: React.ReactNode }) => (
	<span className="mb-2 block text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{children}</span>
);

type Props = {
	post: PostRow | null;
	onUpdate: (post: PostRow, data: Record<string, unknown>, message: string) => void;
};

export const PostPreview = ({ post, onUpdate }: Props) => {
	if (!post) {
		return (
			<div className="flex h-full items-center justify-center p-6">
				<EmptyState icon="article" title={__('Item details')} description={__('Choose an item from the list to see it and change its properties.')} />
			</div>
		);
	}

	const title = decodeHtml(stripTags(post.title?.value ?? '')) || __('(No title)');
	const categories = (post.categories as PostTerm[] | undefined) ?? [];
	const tags = (post.tags as PostTerm[] | undefined) ?? [];

	return (
		<div className="h-full overflow-y-auto p-6 custom-scrollbar">
			{post.title?.image_url ? (
				<div className="mb-6 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
					<img src={post.title.image_url} alt={title} className="max-h-96 w-full object-cover" />
				</div>
			) : null}

			<div className="mb-6">
				<div className="mb-4 flex items-start justify-between gap-4">
					<h1 className="flex-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
					<PostRowMenu post={post} />
				</div>

				<div className="flex flex-wrap items-center gap-3 text-theme-sm text-gray-500 dark:text-gray-400">
					<span className="flex items-center gap-1.5">
						<Icon name="schedule" className="text-base" />
						{/* The date arrives as WordPress rendered it, with its own title attribute. */}
						<span>{stripTags(String(post.date ?? ''))}</span>
					</span>
				</div>
			</div>

			<div className="mb-6 flex items-center gap-2 border-b border-gray-200 pb-6 dark:border-gray-700">
				{post.is_editable ? (
					<Button href={post.edit_url} icon="edit" size="sm">
						{__('Edit')}
					</Button>
				) : null}
				<Button href={post.view_url} target="_blank" rel="noopener noreferrer" variant="outline" icon="visibility" size="sm">
					{__('View')}
				</Button>
			</div>

			<div className="space-y-6">
				{post.status ? (
					<div>
						<Label>{__('Status')}</Label>
						<StatusCell post={post} onChange={(status) => onUpdate(post, { status }, __('Item status updated'))} />
					</div>
				) : null}

				{post.author ? (
					<div>
						<Label>{__('Author')}</Label>
						<AuthorCell post={post} onChange={(author) => onUpdate(post, { author }, __('Item author updated'))} />
					</div>
				) : null}

				{categories.length ? (
					<div>
						<Label>{__('Categories')}</Label>
						<TermsCell terms={categories} />
					</div>
				) : null}

				{tags.length ? (
					<div>
						<Label>{__('Tags')}</Label>
						<TermsCell terms={tags} />
					</div>
				) : null}

				<div>
					<Label>{__('URL')}</Label>
					<a href={post.view_url} target="_blank" rel="noopener noreferrer" className="break-all text-theme-sm text-brand-600 hover:underline dark:text-brand-400">
						{post.view_url}
					</a>
				</div>
			</div>

			<div className="mt-8 border-t border-gray-200 pt-8 dark:border-gray-700">
				<Label>{__('Preview')}</Label>
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
					<iframe src={post.view_url} title={title} loading="lazy" className="h-[600px] w-full border-0" />
				</div>
			</div>
		</div>
	);
};
