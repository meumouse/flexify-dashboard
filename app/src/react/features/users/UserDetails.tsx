import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWpData } from '@/react/app/WpDataProvider';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Avatar, Badge, Button, Card, PageHeader, Skeleton, Tabs, type TabItem } from '@/react/ui';
import { DeleteUsersModal } from '@/react/features/users/DeleteUsersModal';
import { PANELS } from '@/react/features/users/panels';
import { DangerZone, SecurityCard } from '@/react/features/users/UserSecurity';
import { useRoles, useUser } from '@/react/features/users/queries';

/**
 * One user's page: their profile, what they have been doing, and what they bought — each as a
 * panel, with the ones whose plugin is not installed left out.
 */

export const UserDetails = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const { page } = useWpData();
	const user = useUser(Number(id) || null);
	const roles = useRoles().data ?? [];
	const [tab, setTab] = useState('details');
	const [deleteOpen, setDeleteOpen] = useState(false);

	const installed = new Set(((page.plugins as { path?: string; slug?: string }[] | undefined) ?? []).flatMap((plugin) => [plugin.path, plugin.slug].filter(Boolean) as string[]));

	// A panel that needs a plugin the site does not have would only ever say so; it is left out.
	const panels = PANELS().filter((panel) => !panel.requiresPlugin || !installed.size || installed.has(panel.requiresPlugin));

	if (user.isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (user.isError || !user.data) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This user could not be loaded.')}</p>
			</Card>
		);
	}

	const tabs: TabItem[] = panels.map((panel) => ({ value: panel.value, label: panel.label }));
	const current = panels.find((panel) => panel.value === tab) ?? panels[0];
	const Panel = current.component;
	const roleName = (slug: string) => roles.find((role) => role.slug === slug)?.name ?? slug;
	const memberSince = user.data.registered_date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(user.data.registered_date)) : '';

	return (
		<>
			<PageHeader
				title={__('User profile')}
				breadcrumbs={[{ label: __('Users'), href: '#/' }, { label: decodeHtml(user.data.name) }]}
				actions={
					<Button href={user.data.link} target="_blank" rel="noopener noreferrer" variant="outline" icon="visibility">
						{__('View profile')}
					</Button>
				}
			/>

			<Card className="mb-6">
				<div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-start">
					<Avatar src={user.data.avatar_urls?.['96']} name={user.data.name} size="2xl" />
					<div className="min-w-0 flex-1">
						<h3 className="truncate text-theme-lg font-semibold text-gray-800 dark:text-white/90">{decodeHtml(user.data.name)}</h3>
						<div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-theme-sm text-gray-500 dark:text-gray-400 sm:justify-start">
							<span className="truncate">{user.data.email}</span>
							<span className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 sm:block" aria-hidden="true" />
							<span className="truncate">@{user.data.slug}</span>
							{memberSince ? (
								<>
									<span className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 sm:block" aria-hidden="true" />
									<span>{sprintf(__('Member since %s'), memberSince)}</span>
								</>
							) : null}
						</div>
					</div>
					<div className="flex flex-wrap justify-center gap-2">
						{user.data.roles.map((role) => (
							<Badge key={role} color="primary">
								{roleName(role)}
							</Badge>
						))}
					</div>
				</div>
			</Card>

			<Tabs items={tabs} value={current.value} onChange={setTab} className="mb-5" ariaLabel={__('User sections')} />

			<Panel user={user.data} />

			{current.value === 'details' ? (
				<div className="mt-6 grid gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2">
						<SecurityCard user={user.data} />
					</div>
					<DangerZone onDelete={() => setDeleteOpen(true)} />
				</div>
			) : null}

			<DeleteUsersModal open={deleteOpen} onClose={() => setDeleteOpen(false)} ids={[user.data.id]} onDone={() => navigate('/')} />
		</>
	);
};
