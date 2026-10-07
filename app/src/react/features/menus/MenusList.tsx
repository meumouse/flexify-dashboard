import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, DataTable, DropdownMenu, Icon, PageHeader, Pagination, SearchInput, type Column } from '@/react/ui';
import { useMenuMutations, useMenus, type CustomMenu } from '@/react/features/menus/queries';

/**
 * The custom admin menus this site has, and who each one is for.
 */

const DEFAULTS = { search: '', page: 1, per_page: 20 };

const audienceOf = (menu: CustomMenu): string => {
	const settings = menu.meta?.menu_settings;

	if (!settings || settings.applies_to_everyone) {
		return __('Everyone');
	}

	const parts = [
		settings.roles?.length ? sprintf(__('%d role(s)'), settings.roles.length) : '',
		settings.includes?.length ? sprintf(__('%d person included'), settings.includes.length) : '',
		settings.excludes?.length ? sprintf(__('%d person excluded'), settings.excludes.length) : '',
	].filter(Boolean);

	return parts.length ? parts.join(' · ') : __('Nobody yet');
};

export const MenusList = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const { save, remove, flushCache } = useMenuMutations();

	const params = { search: String(filters.search), page: Number(filters.page), per_page: Number(filters.per_page) };
	const menus = useMenus(params);

	const rows = menus.data?.data ?? [];
	const total = menus.data?.totalItems ?? 0;

	const askThenDelete = async (menu: CustomMenu) => {
		const confirmed = await confirm({
			title: __('Delete this menu?'),
			message: __('The people it applied to go back to the menu WordPress builds.'),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (confirmed) {
			remove.mutate(menu.id);
		}
	};

	const columns: Column<CustomMenu>[] = [
		{
			key: 'title',
			label: __('Menu'),
			cell: (menu) => (
				<div className="min-w-0">
					<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{decodeHtml(stripTags(menu.title.rendered)) || __('(No title)')}</p>
					<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%d item(s)'), menu.meta?.menu_items?.length ?? 0)}</p>
				</div>
			),
		},
		{ key: 'audience', label: __('For'), cell: (menu) => <span className="text-theme-sm">{audienceOf(menu)}</span> },
		{
			key: 'status',
			label: __('Status'),
			cell: (menu) => (
				<Badge variant="light" color={menu.status === 'publish' ? 'success' : 'light'}>
					{menu.status === 'publish' ? __('In use') : __('Draft')}
				</Badge>
			),
		},
		{
			key: 'fd_actions',
			label: '',
			align: 'end',
			width: '1%',
			cell: (menu) => (
				<DropdownMenu
					items={[
						{ label: __('Edit'), icon: 'edit', onSelect: () => navigate(`/menu/${menu.id}`) },
						{ separator: true },
						{ label: __('Delete'), icon: 'delete', danger: true, onSelect: () => askThenDelete(menu) },
					]}
					trigger={<Button variant="ghost" size="sm" iconOnly icon="more_vert" aria-label={__('Menu actions')} />}
				/>
			),
		},
	];

	return (
		<>
			<PageHeader
				title={__('Admin menus')}
				description={__('A menu replaces the one WordPress builds, for the people it is meant for.')}
				actions={
					<div className="flex items-center gap-3">
						<Button variant="outline" icon="refresh" loading={flushCache.isPending} onClick={() => flushCache.mutate()}>
							{__('Apply to everyone now')}
						</Button>
						<Button
							icon="add"
							loading={save.isPending}
							onClick={() =>
								save.mutate(
									{ data: { title: __('New menu'), status: 'draft', meta: { menu_items: [], menu_settings: { applies_to_everyone: false } } } },
									{ onSuccess: (menu) => navigate(`/menu/${menu.id}`) }
								)
							}
						>
							{__('Add menu')}
						</Button>
					</div>
				}
			/>

			<Card className="p-0">
				<div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
					<SearchInput
						value={String(filters.search)}
						onChange={(search) => setFilters({ search, page: 1 })}
						placeholder={__('Search menus')}
						aria-label={__('Search menus')}
						className="w-full sm:w-64"
					/>

					{menus.isFetching ? <Icon name="progress_activity" className="ms-auto animate-spin text-base text-gray-400" /> : null}
				</div>

				<DataTable
					columns={columns}
					rows={rows}
					loading={menus.isLoading}
					clickableRows
					onRowClick={(menu) => navigate(`/menu/${menu.id}`)}
					emptyIcon="menu"
					emptyTitle={__('No menus yet')}
					emptyDescription={__('Build one to change what the admin menu looks like for some or all of the people here.')}
				/>

				<div className="flex items-center justify-end border-t border-gray-100 p-4 dark:border-gray-800">
					<Pagination page={params.page} perPage={params.per_page} total={total} onPageChange={(page) => setFilters({ page })} />
				</div>
			</Card>
		</>
	);
};
