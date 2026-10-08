import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportUsersToCSV } from '@/shared/exportUsersToCSV.js';
import { useNotify } from '@/react/app/ToastProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Avatar, Badge, Button, Card, DataTable, DropdownMenu, Icon, PageHeader, Pagination, SearchInput, Select, type Column, type RowKey } from '@/react/ui';
import { DeleteUsersModal } from '@/react/features/users/DeleteUsersModal';
import { ImportUsersModal } from '@/react/features/users/ImportUsersModal';
import { BulkEditUsersModal, CreateUserModal } from '@/react/features/users/UserModals';
import { useRoles, useUserMutations, useUsers, type User } from '@/react/features/users/queries';

/**
 * The users screen: who has an account, what they can do, and adding, changing or removing
 * them one at a time or together.
 */

const DEFAULTS = { role: 'all', search: '', page: 1, per_page: 25, orderby: 'name', order: 'asc' };

const dateText = (value: string) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—');

export const UsersList = () => {
	const navigate = useNavigate();
	const { notify } = useNotify();
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const [selected, setSelected] = useState<RowKey[]>([]);
	const [createOpen, setCreateOpen] = useState(false);
	const [bulkOpen, setBulkOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);

	const params = {
		role: String(filters.role),
		search: String(filters.search),
		page: Number(filters.page),
		per_page: Number(filters.per_page),
		orderby: String(filters.orderby),
		order: String(filters.order),
	};

	const users = useUsers(params);
	const rolesQuery = useRoles();
	const { refresh } = useUserMutations();

	const rows = users.data?.data ?? [];
	const total = users.data?.totalItems ?? 0;
	const roles = rolesQuery.data ?? [];
	const roleName = (slug: string) => roles.find((role) => role.slug === slug)?.name ?? slug;

	const apply = (patch: Partial<typeof DEFAULTS>) => {
		setSelected([]);
		setFilters({ ...patch, page: patch.page ?? 1 });
	};

	/**
	 * The page that is on screen is what is exported. Exporting a whole site's users would be
	 * a long run of requests nobody asked for; the filters are what narrows it.
	 */
	const exportPage = () => {
		if (!rows.length) {
			notify({ tone: 'error', title: __('There is nothing to export.') });
			return;
		}

		exportUsersToCSV(
			rows.map((user) => ({
				id: user.id,
				username: user.slug,
				email: user.email,
				name: user.name,
				first_name: String(user.meta?.first_name ?? ''),
				last_name: String(user.meta?.last_name ?? ''),
				url: user.url,
				description: user.description,
				roles: user.roles,
				registered: user.registered_date,
				avatar_url: user.avatar_urls?.['96'] ?? '',
			})),
			[],
			`users-${new Date().toISOString().split('T')[0]}`
		);

		notify({ tone: 'success', title: sprintf(__('%d user(s) exported'), rows.length) });
	};

	const columns: Column<User>[] = [
		{
			key: 'name',
			label: __('User'),
			sortable: true,
			cell: (user) => (
				<div className="flex items-center gap-3">
					<Avatar src={user.avatar_urls?.['96']} name={user.name} size="sm" />
					<div className="min-w-0">
						<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{decodeHtml(user.name)}</p>
						<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{user.slug}</p>
					</div>
				</div>
			),
		},
		{ key: 'email', label: __('Email'), sortable: true, cell: (user) => <span className="text-theme-sm">{user.email}</span> },
		{
			key: 'roles',
			label: __('Roles'),
			cell: (user) =>
				user.roles.length ? (
					<div className="flex flex-wrap gap-1.5">
						{user.roles.map((role) => (
							<Badge key={role} variant="light" color="primary">
								{roleName(role)}
							</Badge>
						))}
					</div>
				) : (
					<span className="text-gray-400">—</span>
				),
		},
		{
			key: 'registered_date',
			label: __('Registered'),
			sortable: true,
			className: 'whitespace-nowrap',
			cell: (user) => <span className="text-theme-sm">{dateText(user.registered_date)}</span>,
		},
		{
			key: 'fd_actions',
			label: '',
			align: 'end',
			width: '1%',
			cell: (user) => (
				<DropdownMenu
					items={[
						{ label: __('Edit'), icon: 'edit', onSelect: () => navigate(`/user/${user.id}`) },
						{ label: __('View profile'), icon: 'visibility', href: user.link, target: '_blank' },
						{ separator: true },
						{
							label: __('Delete'),
							icon: 'delete',
							danger: true,
							onSelect: () => {
								setSelected([user.id]);
								setDeleteOpen(true);
							},
						},
					]}
					trigger={<Button variant="ghost" size="sm" iconOnly icon="more_vert" aria-label={__('User actions')} />}
				/>
			),
		},
	];

	return (
		<>
			<PageHeader
				title={__('Users')}
				description={sprintf(__('%s user(s)'), String(total))}
				actions={
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="outline" icon="upload_file" onClick={() => setImportOpen(true)}>
							{__('Import')}
						</Button>
						<Button variant="outline" icon="download" onClick={exportPage}>
							{__('Export')}
						</Button>
						<Button icon="person" onClick={() => setCreateOpen(true)}>
							{__('Add user')}
						</Button>
					</div>
				}
			/>

			<Card className="p-0">
				<div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
					<SearchInput
						value={String(filters.search)}
						onChange={(search) => apply({ search })}
						placeholder={__('Search users')}
						aria-label={__('Search users')}
						className="w-full sm:w-64"
					/>

					<Select
						size="sm"
						value={params.role}
						options={[{ value: 'all', label: __('All roles') }, ...roles.map((role) => ({ value: role.slug, label: role.name }))]}
						onChange={(next) => apply({ role: next })}
						aria-label={__('Role')}
					/>

					{users.isFetching ? <Icon name="progress_activity" className="ms-auto animate-spin text-theme-md text-gray-400" /> : null}
				</div>

				<DataTable
					columns={columns}
					rows={rows}
					loading={users.isLoading}
					selectable
					selected={selected}
					onSelectedChange={setSelected}
					clickableRows
					onRowClick={(user) => navigate(`/user/${user.id}`)}
					sort={{ key: params.orderby, direction: params.order === 'asc' ? 'asc' : 'desc' }}
					onSortChange={(sort) => apply({ orderby: sort.key === 'registered_date' ? 'registered_date' : sort.key, order: sort.direction })}
					emptyIcon="group"
					emptyTitle={__('No users here')}
					emptyDescription={__('People with an account on this site show up here.')}
					bulkActions={() => (
						<>
							<Button variant="outline" size="sm" icon="edit" onClick={() => setBulkOpen(true)}>
								{__('Edit')}
							</Button>
							<Button variant="outline" size="sm" icon="delete" className="text-error-600" onClick={() => setDeleteOpen(true)}>
								{__('Delete')}
							</Button>
						</>
					)}
				/>

				<div className="flex items-center justify-end border-t border-gray-100 p-4 dark:border-gray-800">
					<Pagination page={params.page} perPage={params.per_page} total={total} onPageChange={(page) => setFilters({ page })} />
				</div>
			</Card>

			<CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} roles={roles} onCreated={(user) => navigate(`/user/${user.id}`)} />
			<BulkEditUsersModal open={bulkOpen} onClose={() => setBulkOpen(false)} ids={selected.map(Number)} roles={roles} onDone={() => setSelected([])} />
			<DeleteUsersModal open={deleteOpen} onClose={() => setDeleteOpen(false)} ids={selected.map(Number)} onDone={() => setSelected([])} />
			<ImportUsersModal open={importOpen} onClose={() => setImportOpen(false)} roles={roles} onDone={refresh} />
		</>
	);
};
