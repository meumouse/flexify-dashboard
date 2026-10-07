import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, DataTable, DropdownMenu, Input, Modal, PageHeader, type Column } from '@/react/ui';
import { slugify, useRoleList, useRoleMutations, type RoleSummary } from '@/react/features/roles/queries';

/**
 * The roles on this site, and the way into what each one is allowed to do.
 */

const CreateRoleModal = ({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (slug: string) => void }) => {
	const { create } = useRoleMutations();
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugEdited, setSlugEdited] = useState(false);

	const finalSlug = slugEdited ? slug : slugify(name);

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : onClose())}
			title={__('Add a role')}
			footer={
				<>
					<Button variant="outline" onClick={onClose}>
						{__('Cancel')}
					</Button>
					<Button
						loading={create.isPending}
						disabled={!name.trim() || !finalSlug}
						onClick={() =>
							create.mutate(
								{ name: name.trim(), slug: finalSlug },
								{
									onSuccess: () => {
										setName('');
										setSlug('');
										setSlugEdited(false);
										onCreated(finalSlug);
										onClose();
									},
								}
							)
						}
					>
						{__('Add role')}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4">
				<Input value={name} onChange={(event) => setName(event.target.value)} label={__('Name')} hint={__('What people see, for example "Shop manager".')} required />

				<Input
						value={finalSlug}
						onChange={(event) => {
							setSlugEdited(true);
							setSlug(slugify(event.target.value));
						}} label={__('Slug')} hint={__('How WordPress stores it. It cannot be changed later.')} required />
			</div>
		</Modal>
	);
};

export const RolesList = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const roles = useRoleList();
	const { remove } = useRoleMutations();
	const [createOpen, setCreateOpen] = useState(false);

	const askThenDelete = async (role: RoleSummary) => {
		const confirmed = await confirm({
			title: __('Delete this role?'),
			message: role.user_count
				? sprintf(__('%1$d user(s) have the role %2$s. They keep their account but lose what the role allowed.'), role.user_count, role.name)
				: __('No one has this role, so nothing changes for anybody.'),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (confirmed) {
			remove.mutate(role.slug);
		}
	};

	const columns: Column<RoleSummary>[] = [
		{
			key: 'name',
			label: __('Role'),
			cell: (role) => (
				<div className="min-w-0">
					<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</p>
					<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{role.slug}</p>
				</div>
			),
		},
		{ key: 'user_count', label: __('People'), cell: (role) => <span className="text-theme-sm">{role.user_count ?? 0}</span> },
		{ key: 'capability_count', label: __('Capabilities'), cell: (role) => <span className="text-theme-sm">{role.capability_count ?? 0}</span> },
		{
			key: 'is_default',
			label: __('Kind'),
			cell: (role) => (
				<Badge variant="light" color={role.is_default ? 'primary' : 'light'}>
					{role.is_default ? __('From WordPress') : __('Added here')}
				</Badge>
			),
		},
		{
			key: 'fd_actions',
			label: '',
			align: 'end',
			width: '1%',
			cell: (role) => (
				<DropdownMenu
					items={[
						{ label: __('Edit'), icon: 'edit', onSelect: () => navigate(`/role/${role.slug}`) },
						{ separator: true },
						{
							label: __('Delete'),
							icon: 'delete',
							danger: true,
							disabled: role.is_default || role.slug === 'administrator',
							onSelect: () => askThenDelete(role),
						},
					]}
					trigger={<Button variant="ghost" size="sm" iconOnly icon="more_vert" aria-label={sprintf(__('Actions for %s'), role.name)} />}
				/>
			),
		},
	];

	return (
		<>
			<PageHeader
				title={__('Roles')}
				description={__('What each kind of account on this site is allowed to do.')}
				actions={
					<Button icon="add" onClick={() => setCreateOpen(true)}>
						{__('Add role')}
					</Button>
				}
			/>

			<Card className="p-0">
				<DataTable
					columns={columns}
					rows={roles.data ?? []}
					rowKey="slug"
					loading={roles.isLoading}
					clickableRows
					onRowClick={(role) => navigate(`/role/${role.slug}`)}
					emptyIcon="badge"
					emptyTitle={__('No roles')}
					emptyDescription={__('A role is a set of things an account may do.')}
				/>
			</Card>

			<CreateRoleModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(slug) => navigate(`/role/${slug}`)} />
		</>
	);
};
