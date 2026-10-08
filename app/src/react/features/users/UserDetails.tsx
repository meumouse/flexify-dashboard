import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWpData } from '@/react/app/WpDataProvider';
import { decodeHtml } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Avatar, Button, Card, PageHeader, Skeleton, Tabs, type TabItem } from '@/react/ui';
import { DeleteUsersModal } from '@/react/features/users/DeleteUsersModal';
import { PANELS } from '@/react/features/users/panels';
import { useUser } from '@/react/features/users/queries';

/**
 * One user's page: their profile, what they have been doing, and what they bought — each as a
 * panel, with the ones whose plugin is not installed left out.
 */

export const UserDetails = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const { page } = useWpData();
	const user = useUser(Number(id) || null);
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
	const Panel = (panels.find((panel) => panel.value === tab) ?? panels[0]).component;

	return (
		<>
			<PageHeader
				title={decodeHtml(user.data.name)}
				breadcrumbs={[{ label: __('Users'), href: '#/' }, { label: decodeHtml(user.data.name) }]}
				actions={
					<>
						<Button href={user.data.link} target="_blank" rel="noopener noreferrer" variant="outline" icon="visibility">
							{__('View profile')}
						</Button>
						<Button variant="outline" icon="delete" className="text-error-600" onClick={() => setDeleteOpen(true)}>
							{__('Delete')}
						</Button>
					</>
				}
			/>

			<div className="mb-5 flex items-center gap-4">
				<Avatar src={user.data.avatar_urls?.['96']} name={user.data.name} size="lg" />
				<div className="min-w-0">
					<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{user.data.email}</p>
					<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{user.data.slug}</p>
				</div>
			</div>

			<Tabs items={tabs} value={tab} onChange={setTab} className="mb-5" />

			<Panel user={user.data} />

			<DeleteUsersModal open={deleteOpen} onClose={() => setDeleteOpen(false)} ids={[user.data.id]} onDone={() => navigate('/')} />
		</>
	);
};
