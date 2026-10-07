import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, DataTable, DropdownMenu, Icon, PageHeader, Pagination, SearchInput, type Column } from '@/react/ui';
import { NOTICE_TYPES, useNoticeMutations, useNotices, type Notice } from '@/react/features/notices/queries';

/**
 * The notices this plugin shows inside wp-admin: what they say, who sees them, and whether
 * they are being shown at all.
 */

const DEFAULTS = { search: '', page: 1, per_page: 20 };

export const NoticesList = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const { remove } = useNoticeMutations();

	const params = { search: String(filters.search), page: Number(filters.page), per_page: Number(filters.per_page) };
	const notices = useNotices(params);

	const rows = notices.data?.data ?? [];
	const total = notices.data?.totalItems ?? 0;
	const types = NOTICE_TYPES();

	const askThenDelete = async (notice: Notice) => {
		const confirmed = await confirm({
			title: __('Delete this notice?'),
			message: __('It stops being shown and cannot be brought back.'),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (confirmed) {
			remove.mutate(notice.id);
		}
	};

	const columns: Column<Notice>[] = [
		{
			key: 'title',
			label: __('Notice'),
			cell: (notice) => {
				const type = types.find((item) => item.value === (notice.meta?.notice_type ?? 'info')) ?? types[0];

				return (
					<div className="flex items-start gap-3">
						<Icon name={type.icon} className={cn('mt-0.5 text-base', type.tone)} />
						<div className="min-w-0">
							<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{decodeHtml(stripTags(notice.title.rendered)) || __('(No title)')}</p>
							<p className="line-clamp-1 text-theme-xs text-gray-500 dark:text-gray-400">{decodeHtml(stripTags(notice.content.rendered))}</p>
						</div>
					</div>
				);
			},
		},
		{
			key: 'roles',
			label: __('Shown to'),
			cell: (notice) =>
				notice.meta?.roles?.length ? (
					<div className="flex flex-wrap gap-1.5">
						{notice.meta.roles.map((role) => (
							<Badge key={role} variant="light" color="primary">
								{role}
							</Badge>
						))}
					</div>
				) : (
					<span className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Everyone')}</span>
				),
		},
		{
			key: 'status',
			label: __('Status'),
			cell: (notice) => (
				<Badge variant="light" color={notice.status === 'publish' ? 'success' : 'light'}>
					{notice.status === 'publish' ? __('Active') : __('Paused')}
				</Badge>
			),
		},
		{
			key: 'seen',
			label: __('Seen by'),
			cell: (notice) => <span className="text-theme-sm">{notice.meta?.seen_by?.length ?? 0}</span>,
		},
		{
			key: 'fd_actions',
			label: '',
			align: 'end',
			width: '1%',
			cell: (notice) => (
				<DropdownMenu
					items={[
						{ label: __('Edit'), icon: 'edit', onSelect: () => navigate(`/notice/${notice.id}`) },
						{ separator: true },
						{ label: __('Delete'), icon: 'delete', danger: true, onSelect: () => askThenDelete(notice) },
					]}
					trigger={<Button variant="ghost" size="sm" iconOnly icon="more_vert" aria-label={__('Notice actions')} />}
				/>
			),
		},
	];

	return (
		<>
			<PageHeader
				title={__('Admin notices')}
				description={sprintf(__('%s notice(s)'), String(total))}
				actions={
					<Button icon="add" onClick={() => navigate('/notice/new')}>
						{__('Add notice')}
					</Button>
				}
			/>

			<Card className="p-0">
				<div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
					<SearchInput
						value={String(filters.search)}
						onChange={(search) => setFilters({ search, page: 1 })}
						placeholder={__('Search notices')}
						aria-label={__('Search notices')}
						className="w-full sm:w-64"
					/>

					{notices.isFetching ? <Icon name="progress_activity" className="ms-auto animate-spin text-base text-gray-400" /> : null}
				</div>

				<DataTable
					columns={columns}
					rows={rows}
					loading={notices.isLoading}
					clickableRows
					onRowClick={(notice) => navigate(`/notice/${notice.id}`)}
					emptyIcon="campaign"
					emptyTitle={__('No notices yet')}
					emptyDescription={__('A notice is a message shown to the people who use this site’s admin.')}
				/>

				<div className="flex items-center justify-end border-t border-gray-100 p-4 dark:border-gray-800">
					<Pagination page={params.page} perPage={params.per_page} total={total} onPageChange={(page) => setFilters({ page })} />
				</div>
			</Card>
		</>
	);
};
