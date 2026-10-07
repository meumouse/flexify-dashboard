import { useParams } from 'react-router-dom';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { decodeHtml } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Avatar, Card, Icon, PageHeader, Skeleton } from '@/react/ui';
import { lookOf, subjectOf } from '@/react/features/activity/ActivityList';
import { useActivity, userName } from '@/react/features/activity/queries';

/**
 * One entry of the log, including what changed — before on one side, after on the other.
 */

const Detail = ({ label, value }: { label: string; value: string }) => (
	<div className="flex justify-between gap-4 text-theme-sm">
		<dt className="text-gray-500 dark:text-gray-400">{label}</dt>
		<dd className="truncate font-medium text-gray-800 dark:text-white/90">{value || '—'}</dd>
	</div>
);

/** A value out of the log can be anything; this shows it as something readable. */
const show = (value: unknown): string => {
	if (value === null || value === undefined || value === '') {
		return '—';
	}

	return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
};

const Changes = ({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) => {
	const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];

	if (!keys.length) {
		return <p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing was recorded about what changed.')}</p>;
	}

	return (
		<ul className="space-y-3">
			{keys.map((key) => {
				const was = show(before?.[key]);
				const now = show(after?.[key]);
				const same = was === now;

				return (
					<li key={key}>
						<p className="mb-1 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{key}</p>
						<div className="grid gap-2 sm:grid-cols-2">
							<pre className={cn('overflow-x-auto whitespace-pre-wrap break-words rounded-lg p-2 text-theme-xs', same ? 'bg-gray-50 dark:bg-white/[0.03]' : 'bg-error-50 dark:bg-error-500/10')}>
								{was}
							</pre>
							<pre className={cn('overflow-x-auto whitespace-pre-wrap break-words rounded-lg p-2 text-theme-xs', same ? 'bg-gray-50 dark:bg-white/[0.03]' : 'bg-success-50 dark:bg-success-500/10')}>
								{now}
							</pre>
						</div>
					</li>
				);
			})}
		</ul>
	);
};

export const ActivityDetails = () => {
	const { id } = useParams();
	const { adminUrl } = useWpData();
	const entry = useActivity(Number(id) || null);

	if (entry.isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (entry.isError || !entry.data) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This entry could not be loaded.')}</p>
			</Card>
		);
	}

	const activity = entry.data;
	const look = lookOf(activity.action);

	return (
		<>
			<PageHeader title={decodeHtml(subjectOf(activity))} breadcrumbs={[{ label: __('Activity log'), href: '#/' }, { label: __('Entry') }]} />

			<div className="grid gap-6 lg:grid-cols-3">
				<Card title={__('What changed')} className="lg:col-span-2">
					<Changes before={activity.old_value} after={activity.new_value} />
				</Card>

				<div className="flex flex-col gap-6">
					<Card title={__('Entry')}>
						<div className="mb-4 flex items-center gap-2">
							<Icon name={look.icon} className={cn('text-base', look.tone)} />
							<span className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">{activity.action}</span>
						</div>

						<dl className="space-y-2">
							<Detail label={__('Type')} value={activity.object_type} />
							<Detail label={__('Object')} value={activity.object_id ? `#${activity.object_id}` : ''} />
							<Detail label={__('When')} value={new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(activity.created_at.replace(' ', 'T')))} />
							<Detail label={__('From')} value={activity.ip_address ?? ''} />
						</dl>

						{activity.user_agent ? <p className="mt-3 break-words text-theme-xs text-gray-400">{activity.user_agent}</p> : null}
					</Card>

					<Card title={__('Who')}>
						{activity.user_id ? (
							<a href={`${adminUrl}admin.php?page=flexify-dashboard-users#/user/${activity.user_id}`} className="flex items-center gap-3">
								<Avatar src={activity.user?.avatar} name={userName(activity.user)} />
								<span className="min-w-0">
									<span className="block truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">
										{decodeHtml(userName(activity.user)) || `#${activity.user_id}`}
									</span>
									{activity.user?.email ? <span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">{activity.user.email}</span> : null}
								</span>
							</a>
						) : (
							<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('The site itself, with nobody signed in.')}</p>
						)}
					</Card>
				</div>
			</div>
		</>
	);
};
