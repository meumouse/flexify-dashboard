import { useEffect, useRef, useState } from 'react';
import { usePageData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, DropdownMenu, Icon, type MenuItem } from '@/react/ui';
import { EntityPicker, userItem } from '@/react/data/EntityPicker';
import { countChildren } from '@/react/features/posts/usePostsData';
import type { PostRow, PostStatus, PostTerm } from '@/react/features/posts/types';

/**
 * The cells that do more than print a value: the title (editable in place, with the thumbnail
 * and the child count), the status and the author.
 */

const STATUS_TONES: Record<string, string> = {
	publish: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
	future: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
	pending: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
	trash: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
	private: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
};

export const StatusCell = ({ post, onChange }: { post: PostRow; onChange: (status: string) => void }) => {
	const statuses = usePageData<PostStatus[]>('postStatuses', []);
	const current = post.status ?? { value: post.single_status, label: post.single_status };
	const tone = STATUS_TONES[current.value] ?? STATUS_TONES.private;

	const badge = (
		<span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-theme-xs font-medium whitespace-nowrap', tone)}>{decodeHtml(stripTags(current.label))}</span>
	);

	if (!post.is_editable || !statuses.length) {
		return badge;
	}

	const items: MenuItem[] = [
		{ heading: __('Update status') },
		...statuses.map((status) => ({
			label: status.label,
			icon: status.value === current.value ? 'check' : undefined,
			onSelect: () => (status.value === current.value ? undefined : onChange(status.value)),
		})),
	];

	return (
		<DropdownMenu
			align="start"
			width="w-52"
			items={items}
			trigger={
				<button type="button" onClick={(event) => event.stopPropagation()} className="cursor-pointer" aria-label={sprintf(__('Status: %s'), stripTags(current.label))}>
					{badge}
				</button>
			}
		/>
	);
};

export const AuthorCell = ({ post, onChange }: { post: PostRow; onChange: (authorId: number) => void }) => {
	const author = post.author;

	const name = (
		<span className="flex items-center gap-2 whitespace-nowrap">
			{/* The avatar arrives as the markup `get_avatar()` produced, so only its source is used. */}
			{author?.avatar ? <img src={avatarUrl(author.avatar)} alt="" aria-hidden className="h-6 w-6 rounded-full bg-gray-100 object-cover dark:bg-gray-800" /> : null}
			<span className="truncate text-gray-700 dark:text-gray-300">{author?.name ? decodeHtml(author.name) : __('Unknown author')}</span>
		</span>
	);

	if (!post.is_editable) {
		return name;
	}

	return (
		<EntityPicker
			endpoint="wp/v2/users"
			toItem={userItem}
			multiple={false}
			params={{ who: 'authors' }}
			value={author?.id ? [author.id] : []}
			onChange={(ids) => (ids[0] ? onChange(ids[0]) : undefined)}
			placeholder={__('Unknown author')}
			searchPlaceholder={__('Search users')}
			trigger={
				<button type="button" onClick={(event) => event.stopPropagation()} className="cursor-pointer text-start" aria-label={__('Change author')}>
					{name}
				</button>
			}
		/>
	);
};

export const avatarUrl = (avatar?: string): string => avatar?.match(/src=['"]([^'"]+)['"]/)?.[1] ?? avatar ?? '';

type TitleProps = {
	post: PostRow;
	hierarchical: boolean;
	expanded: boolean;
	onToggle: () => void;
	onRename: (title: string) => void;
};

export const TitleCell = ({ post, hierarchical, expanded, onToggle, onRename }: TitleProps) => {
	const [value, setValue] = useState(() => decodeHtml(post.title?.value ?? ''));
	const [editing, setEditing] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const children = countChildren(post);

	useEffect(() => {
		setValue(decodeHtml(post.title?.value ?? ''));
	}, [post.title?.value]);

	useEffect(() => {
		if (editing) {
			input.current?.focus();
			input.current?.select();
		}
	}, [editing]);

	const commit = () => {
		setEditing(false);

		const next = value.trim();

		if (next && next !== decodeHtml(post.title?.value ?? '')) {
			onRename(next);
		} else {
			setValue(decodeHtml(post.title?.value ?? ''));
		}
	};

	return (
		<div className="flex items-center gap-3" style={{ paddingInlineStart: `${post.depth * 24}px` }}>
			{hierarchical ? (
				<Button
					variant="ghost"
					size="xs"
					iconOnly
					icon={expanded ? 'expand_more' : 'chevron_right'}
					className={post.children?.length ? '' : 'invisible'}
					onClick={(event) => {
						event.stopPropagation();
						onToggle();
					}}
					aria-label={expanded ? __('Collapse') : __('Expand')}
					aria-expanded={expanded}
				/>
			) : null}

			{post.title?.image_url ? (
				<img src={post.title.image_url} alt="" aria-hidden className="h-9 w-9 shrink-0 rounded-lg object-cover" />
			) : (
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
					<Icon name="description" className="text-base" />
				</span>
			)}

			<div className="min-w-0">
				{editing ? (
					<input
						ref={input}
						value={value}
						onChange={(event) => setValue(event.target.value)}
						onBlur={commit}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								commit();
							}

							if (event.key === 'Escape') {
								setValue(decodeHtml(post.title?.value ?? ''));
								setEditing(false);
							}
						}}
						onClick={(event) => event.stopPropagation()}
						className="w-full rounded-lg border border-brand-300 bg-white px-2 py-1 text-theme-sm text-gray-900 outline-none dark:border-brand-700 dark:bg-gray-900 dark:text-gray-100"
						aria-label={__('Item title')}
					/>
				) : (
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();

							if (post.is_editable) {
								setEditing(true);
							}
						}}
						className="block max-w-full truncate text-start text-theme-sm font-semibold text-gray-900 dark:text-gray-100"
						title={post.is_editable ? __('Click to rename') : undefined}
					>
						{value || __('(No title)')}
					</button>
				)}

				{children ? (
					<p className="text-theme-xs font-normal text-gray-500 dark:text-gray-400">
						{children === 1 ? __('1 child item') : sprintf(__('%s child items'), String(children))}
					</p>
				) : null}
			</div>
		</div>
	);
};

export const TermsCell = ({ terms }: { terms: PostTerm[] }) => {
	if (!terms.length) {
		return <span className="text-gray-400">—</span>;
	}

	return (
		<div className="flex flex-wrap gap-1.5">
			{terms.map((term) => (
				<a
					key={term.id}
					href={term.url}
					onClick={(event) => event.stopPropagation()}
					className="inline-flex items-center whitespace-nowrap rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-theme-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
				>
					{decodeHtml(term.title)}
				</a>
			))}
		</div>
	);
};
