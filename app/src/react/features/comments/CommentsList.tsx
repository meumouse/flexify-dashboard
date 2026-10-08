import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Avatar, Button, Card, DataTable, Icon, PageHeader, Pagination, SearchInput, Tabs, type Column, type RowKey, type TabItem } from '@/react/ui';
import { STATUS_LABELS, postOf, useCommentCounts, useCommentMutations, useComments, type Comment } from '@/react/features/comments/queries';

/**
 * The comments screen: every comment the site received, what it was left on, and the moderation
 * decisions that can be made about it one at a time or in bulk.
 */

const DEFAULTS = { status: 'all', search: '', page: 1, per_page: 30, orderby: 'date', order: 'desc' };

const STATUS_TONES: Record<string, string> = {
	approved: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
	hold: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
	spam: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
	trash: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
};

const dateText = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const CommentsList = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const [selected, setSelected] = useState<RowKey[]>([]);

	const params = {
		status: String(filters.status),
		search: String(filters.search),
		page: Number(filters.page),
		per_page: Number(filters.per_page),
		orderby: String(filters.orderby),
		order: String(filters.order),
	};

	const comments = useComments(params);
	const counts = useCommentCounts(params.search);
	const { bulk, setStatus, remove } = useCommentMutations();

	const rows = comments.data?.data ?? [];
	const total = comments.data?.totalItems ?? 0;
	const labels = STATUS_LABELS();
	const inTrash = params.status === 'trash';

	const apply = (patch: Partial<typeof DEFAULTS>) => {
		setSelected([]);
		setFilters({ ...patch, page: patch.page ?? 1 });
	};

	const ids = selected.map(Number);

	const run = (action: (id: number) => Promise<unknown>, message: string) => bulk.mutate({ ids, action, message }, { onSuccess: () => setSelected([]) });

	const askThenRemove = async () => {
		const confirmed = await confirm({
			title: inTrash ? __('Delete permanently?') : __('Move to the trash?'),
			message: inTrash
				? sprintf(__('%d comment(s) will be deleted for good. There is no undo.'), ids.length)
				: sprintf(__('%d comment(s) will be moved to the trash.'), ids.length),
			confirmLabel: inTrash ? __('Delete permanently') : __('Move to the trash'),
			variant: 'danger',
		});

		if (confirmed) {
			run(remove(inTrash), inTrash ? __('Comments deleted') : __('Comments moved to the trash'));
		}
	};

	const tabs: TabItem[] = useMemo(() => {
		const data = counts.data ?? {};

		return [
			{ value: 'all', label: __('All') },
			...(['approved', 'hold', 'spam', 'trash'] as const).map((status) => ({
				value: status,
				label: data[status] === undefined ? labels[status] : `${labels[status]} (${data[status]})`,
			})),
		];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [counts.data]);

	const columns: Column<Comment>[] = [
		{
			key: 'author',
			label: __('Author'),
			cell: (comment) => (
				<div className="flex items-start gap-3">
					<Avatar src={comment.author_avatar_urls?.['48']} name={comment.author_name} size="sm" />
					<div className="min-w-0">
						<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{decodeHtml(comment.author_name) || __('Anonymous')}</p>
						{comment.author_email ? <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{comment.author_email}</p> : null}
					</div>
				</div>
			),
		},
		{
			key: 'content',
			label: __('Comment'),
			cell: (comment) => (
				<p className="line-clamp-2 max-w-xl text-theme-sm text-gray-600 dark:text-gray-400">{decodeHtml(stripTags(comment.content?.rendered ?? ''))}</p>
			),
		},
		{
			key: 'post',
			label: __('In reply to'),
			cell: (comment) => {
				const post = postOf(comment);

				if (!post) {
					return <span className="text-gray-400">—</span>;
				}

				return (
					<a
						href={post.link}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(event) => event.stopPropagation()}
						className="line-clamp-2 max-w-48 text-theme-sm text-brand-600 hover:underline dark:text-brand-400"
					>
						{decodeHtml(stripTags(post.title?.rendered ?? '')) || __('(No title)')}
					</a>
				);
			},
		},
		{
			key: 'status',
			label: __('Status'),
			cell: (comment) => (
				<span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-theme-xs font-medium', STATUS_TONES[comment.status] ?? STATUS_TONES.trash)}>
					{labels[comment.status] ?? comment.status}
				</span>
			),
		},
		{ key: 'date', label: __('Date'), sortable: true, className: 'whitespace-nowrap', cell: (comment) => <span className="text-theme-sm">{dateText(comment.date)}</span> },
	];

	return (
		<>
			<PageHeader title={__('Comments')} description={sprintf(__('%s comment(s)'), String(total))} />

			<Tabs items={tabs} value={params.status} onChange={(status) => apply({ status })} className="mb-5" />

			<Card className="p-0">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
					<SearchInput
						value={String(filters.search)}
						onChange={(search) => apply({ search })}
						placeholder={__('Search comments')}
						aria-label={__('Search comments')}
						className="w-full sm:w-72"
					/>

					{comments.isFetching ? <Icon name="progress_activity" className="animate-spin text-theme-md text-gray-400" /> : null}
				</div>

				<DataTable
					columns={columns}
					rows={rows}
					loading={comments.isLoading}
					selectable
					selected={selected}
					onSelectedChange={setSelected}
					clickableRows
					onRowClick={(comment) => navigate(`/comment/${comment.id}`)}
					sort={{ key: params.orderby, direction: params.order === 'asc' ? 'asc' : 'desc' }}
					onSortChange={(sort) => apply({ orderby: sort.key, order: sort.direction })}
					emptyIcon="forum"
					emptyTitle={__('No comments here')}
					emptyDescription={__('Comments left on this site show up here.')}
					bulkActions={() => (
						<>
							<Button variant="outline" size="sm" icon="check_circle" loading={bulk.isPending} onClick={() => run(setStatus('approved'), __('Comments approved'))}>
								{__('Approve')}
							</Button>
							<Button variant="outline" size="sm" icon="schedule" loading={bulk.isPending} onClick={() => run(setStatus('hold'), __('Comments held for moderation'))}>
								{__('Pending')}
							</Button>
							<Button variant="outline" size="sm" icon="block" loading={bulk.isPending} onClick={() => run(setStatus('spam'), __('Comments marked as spam'))}>
								{__('Spam')}
							</Button>
							<Button variant="outline" size="sm" icon="delete" className="text-error-600" onClick={askThenRemove}>
								{inTrash ? __('Delete permanently') : __('Move to the trash')}
							</Button>
						</>
					)}
				/>

				<div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
					<Pagination page={params.page} perPage={params.per_page} total={total} onPageChange={(page) => setFilters({ page })} />
				</div>
			</Card>
		</>
	);
};
