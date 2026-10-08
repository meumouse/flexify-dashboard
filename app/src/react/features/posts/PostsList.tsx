import { useMemo, useState } from 'react';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useWpData } from '@/react/app/WpDataProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, DataTable, Icon, PageHeader, Pagination, SearchInput, Tabs, type Column, type RowKey, type TabItem } from '@/react/ui';
import { AuthorCell, StatusCell, TermsCell, TitleCell } from '@/react/features/posts/PostCells';
import { PostsSidebar } from '@/react/features/posts/PostsSidebar';
import { useViewMode } from '@/react/features/posts/useViewMode';
import { BatchEditModal } from '@/react/features/posts/BatchEditModal';
import { PostRowMenu } from '@/react/features/posts/PostRowMenu';
import { PostsSettings } from '@/react/features/posts/PostsSettings';
import { usePostColumns } from '@/react/features/posts/usePostColumns';
import { usePostMutations } from '@/react/features/posts/usePostMutations';
import { flattenPosts, usePostType, usePostsData } from '@/react/features/posts/usePostsData';
import type { PostRow, PostTerm, PostsQuery } from '@/react/features/posts/types';

/**
 * The posts screen: the list WordPress would have rendered, with the views, columns and row
 * actions the site's plugins gave it, plus editing in place and acting on several at once.
 */

const DEFAULTS = {
	view: 'all',
	search: '',
	page: 1,
	per_page: 20,
	orderby: 'date',
	order: 'DESC',
	categories: '',
	start_date: '',
	end_date: '',
};

export const PostsList = () => {
	const confirm = useConfirm();
	const { adminUrl } = useWpData();
	const postType = usePostType();
	const hierarchical = postType.name === 'page';

	const { filters, setFilters } = useQueryFilters({ ...DEFAULTS, orderby: hierarchical ? 'title' : 'date', order: hierarchical ? 'ASC' : 'DESC' });
	const [selected, setSelected] = useState<RowKey[]>([]);
	const [expanded, setExpanded] = useState<number[]>([]);
	const [batchOpen, setBatchOpen] = useState(false);
	const [currentId, setCurrentId] = useState<number | null>(null);
	const [mode, setMode] = useViewMode();

	const query: PostsQuery = useMemo(
		() => ({
			post_type: postType.name,
			search: String(filters.search),
			page: Number(filters.page),
			per_page: Number(filters.per_page),
			orderby: String(filters.orderby),
			order: filters.order === 'ASC' ? 'ASC' : 'DESC',
			view: String(filters.view),
			categories: String(filters.categories).split(',').filter(Boolean).map(Number),
			start_date: String(filters.start_date),
			end_date: String(filters.end_date),
		}),
		[filters, postType.name]
	);

	const posts = usePostsData(query);
	const { update, bulk, duplicate, publish, remove } = usePostMutations();
	const payload = posts.data;

	const serverColumns = useMemo(() => Object.values(payload?.columns ?? {}), [payload?.columns]);
	const { columns, toggleColumn, moveColumn, expandAll, setExpandAll } = usePostColumns(postType.name, serverColumns);

	const rows = useMemo(() => flattenPosts(payload?.items ?? [], expanded, expandAll), [payload?.items, expanded, expandAll]);
	const selectedPosts = useMemo(() => rows.filter((row) => selected.includes(row.id)), [rows, selected]);

	const apply = (patch: Partial<typeof DEFAULTS>) => {
		setSelected([]);
		setFilters({ ...patch, page: patch.page ?? 1 });
	};

	const tabs: TabItem[] = Object.values(payload?.views ?? {}).map((view) => ({ value: view.value, label: decodeHtml(stripTags(view.label)) }));

	const runBulk = (action: (post: PostRow) => Promise<unknown>, message: string) =>
		bulk.mutate({ posts: selectedPosts, action, message }, { onSuccess: () => setSelected([]) });

	const askThenTrash = async () => {
		const confirmed = await confirm({
			title: __('Move to the trash?'),
			message: sprintf(__('%d item(s) will be moved to the trash. Items already there are deleted for good.'), selectedPosts.length),
			confirmLabel: __('Move to the trash'),
			variant: 'danger',
		});

		if (confirmed) {
			runBulk(remove, __('Items deleted'));
		}
	};

	const tableColumns: Column<PostRow>[] = useMemo(
		() =>
			columns
				.filter((column) => column.active && column.key !== 'post_actions')
				.map((column) => ({
					key: column.key,
					label: column.label.includes('<') ? column.key : decodeHtml(stripTags(column.label)),
					sortable: Boolean(column.sort_key),
					className: column.key === 'date' ? 'whitespace-nowrap' : undefined,
					cell: (row) => {
						if (column.key === 'title') {
							return (
								<TitleCell
									post={row}
									hierarchical={hierarchical}
									expanded={expandAll || expanded.includes(row.id)}
									onToggle={() => setExpanded((current) => (current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]))}
									onRename={(title) => update.mutate({ post: row, data: { title }, message: __('Item title updated') })}
								/>
							);
						}

						if (column.key === 'status') {
							return <StatusCell post={row} onChange={(status) => update.mutate({ post: row, data: { status }, message: __('Item status updated') })} />;
						}

						if (column.key === 'author') {
							return <AuthorCell post={row} onChange={(author) => update.mutate({ post: row, data: { author }, message: __('Item author updated') })} />;
						}

						const value = row[column.key];

						if (Array.isArray(value)) {
							return <TermsCell terms={value as PostTerm[]} />;
						}

						// Anything the screen does not know about was rendered by WordPress and the
						// plugins on this site; it is printed as the markup they produced.
						return <span className="text-theme-sm" dangerouslySetInnerHTML={{ __html: String(value ?? '') }} />;
					},
				})),
		[columns, expandAll, expanded, hierarchical, update]
	);

	const withActions: Column<PostRow>[] = [
		...tableColumns,
		{ key: 'fd_actions', label: '', align: 'end', width: '1%', cell: (row) => <PostRowMenu post={row} /> },
	];

	const newUrl = `${adminUrl}post-new.php${postType.name === 'post' ? '' : `?post_type=${postType.name}`}`;
	const title = postType.labels?.name ?? __('Posts');
	const searchPlaceholder = postType.labels?.search_items ?? __('Search posts');

	const bulkButtons = (
		<>
			<Button variant="outline" size="sm" icon="edit" onClick={() => setBatchOpen(true)}>
				{__('Edit')}
			</Button>
			<Button variant="outline" size="sm" icon="publish" loading={bulk.isPending} onClick={() => runBulk(publish, __('Items published'))}>
				{__('Publish')}
			</Button>
			<Button variant="outline" size="sm" icon="copy" loading={bulk.isPending} onClick={() => runBulk(duplicate, __('Items duplicated'))}>
				{__('Duplicate')}
			</Button>
			<Button variant="outline" size="sm" icon="delete" className="text-error-600" onClick={askThenTrash}>
				{__('Delete')}
			</Button>
		</>
	);

	if (mode === 'sidebar') {
		return (
			<>
				<PostsSidebar
					posts={rows}
					views={Object.values(payload?.views ?? {})}
					view={String(filters.view)}
					onView={(view) => apply({ view })}
					search={String(filters.search)}
					onSearch={(search) => apply({ search })}
					selected={selected}
					onSelected={setSelected}
					current={rows.find((row) => row.id === currentId) ?? rows[0] ?? null}
					onCurrent={(post) => setCurrentId(post.id)}
					onUpdate={(post, data, message) => update.mutate({ post, data, message })}
					loading={posts.isLoading}
					total={payload?.total ?? 0}
					page={query.page}
					pages={Math.max(1, payload?.pages ?? 1)}
					onPage={(page) => setFilters({ page })}
					title={title}
					newUrl={newUrl}
					searchPlaceholder={searchPlaceholder}
					onTableView={() => setMode('table')}
					bulkBar={
						selected.length ? (
							<div className="fixed bottom-6 left-1/2 z-99998 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
								<span className="whitespace-nowrap text-theme-sm font-medium text-gray-700 dark:text-gray-300">
									{sprintf(__('%s selected'), String(selected.length))}
								</span>
								<span className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
								{bulkButtons}
								<Button variant="ghost" size="sm" iconOnly icon="close" onClick={() => setSelected([])} aria-label={__('Clear selection')} />
							</div>
						) : null
					}
				/>

				<BatchEditModal open={batchOpen} onClose={() => setBatchOpen(false)} posts={selectedPosts} onDone={() => setSelected([])} />
			</>
		);
	}

	return (
		<>
			<PageHeader
				title={title}
				actions={
					<>
						<PostsSettings
							query={query}
							onChange={(patch) =>
								apply({
									...(patch.per_page ? { per_page: patch.per_page } : {}),
									...(patch.orderby ? { orderby: patch.orderby } : {}),
									...(patch.order ? { order: patch.order } : {}),
									...(patch.categories ? { categories: patch.categories.join(',') } : patch.categories ? {} : { categories: '' }),
									...(patch.start_date !== undefined ? { start_date: patch.start_date } : {}),
									...(patch.end_date !== undefined ? { end_date: patch.end_date } : {}),
								})
							}
							columns={columns}
							onToggleColumn={toggleColumn}
							onMoveColumn={moveColumn}
							expandAll={expandAll}
							onExpandAll={setExpandAll}
							hierarchical={hierarchical}
						/>
						<Button variant="outline" size="sm" iconOnly icon="view_list" onClick={() => setMode('sidebar')} aria-label={__('Sidebar view')} />
						<Button href={newUrl} icon="add">
							{postType.labels?.new_item ?? __('Add new')}
						</Button>
					</>
				}
			/>

			{tabs.length ? <Tabs items={tabs} value={String(filters.view)} onChange={(view) => apply({ view })} className="mb-5" /> : null}

			<Card className="p-0">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
					<SearchInput
						value={String(filters.search)}
						onChange={(search) => apply({ search })}
						placeholder={searchPlaceholder}
						aria-label={searchPlaceholder}
						className="w-full sm:w-72"
					/>

					<span className="text-theme-sm text-gray-500 dark:text-gray-400">
						{sprintf(__('%s item(s)'), String(payload?.total ?? 0))}
					</span>
				</div>

				<DataTable
					columns={withActions}
					rows={rows}
					loading={posts.isLoading}
					selectable
					selected={selected}
					onSelectedChange={setSelected}
					clickableRows
					onRowClick={(row) => window.location.assign(row.is_editable ? row.edit_url : row.view_url)}
					sort={{ key: query.orderby, direction: query.order === 'ASC' ? 'asc' : 'desc' }}
					onSortChange={(sort) => apply({ orderby: sort.key, order: sort.direction === 'asc' ? 'ASC' : 'DESC' })}
					rowClassName={(row) => (row.depth ? 'bg-gray-50/50 dark:bg-white/[0.02]' : undefined)}
					emptyIcon="folder_open"
					emptyTitle={__('Nothing found')}
					emptyDescription={__('When you create new items they will show up here.')}
					bulkActions={() => bulkButtons}
				/>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
					<span className="flex items-center gap-2 text-theme-sm text-gray-500 dark:text-gray-400">
						{posts.isFetching ? <Icon name="progress_activity" className="animate-spin text-theme-md" /> : null}
						{sprintf(__('Page %1$s of %2$s'), String(query.page), String(Math.max(1, payload?.pages ?? 1)))}
					</span>

					<Pagination page={query.page} perPage={query.per_page} total={payload?.total ?? 0} onPageChange={(page) => setFilters({ page })} />
				</div>
			</Card>

			<BatchEditModal open={batchOpen} onClose={() => setBatchOpen(false)} posts={selectedPosts} onDone={() => setSelected([])} />
		</>
	);
};
