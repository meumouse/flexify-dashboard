import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { cn } from '@/react/lib/cn';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Avatar, Button, DataTable, DateRangePicker, Field, Icon, PageHeader, Pagination, SearchInput, Select, StatStrip, TableCard, periodText, recentPresets, type ActiveFilter, type Column, type StatItem } from '@/react/ui';
import { isoDate } from '@/react/form/dates';
import { EntityPicker, userItem } from '@/react/data/EntityPicker';
import { useActivities, useActivityCleanup, useActivityStats, userName, type Activity } from '@/react/features/activity/queries';

/**
 * The activity log: what happened on the site, with the filters the log itself says are
 * worth offering.
 */

const DEFAULTS = { search: '', action: 'all', object_type: 'all', user_id: '', date_from: '', date_to: '', page: 1, per_page: 25, orderby: 'created_at', order: 'desc' };

export const ACTION_LOOKS: Record<string, { icon: string; tone: string }> = {
	created: { icon: 'add_circle', tone: 'text-success-500' },
	updated: { icon: 'edit', tone: 'text-brand-500' },
	deleted: { icon: 'delete', tone: 'text-error-500' },
	trashed: { icon: 'delete', tone: 'text-warning-500' },
	restored: { icon: 'restore', tone: 'text-success-500' },
	login: { icon: 'login', tone: 'text-success-500' },
	logout: { icon: 'logout', tone: 'text-gray-400' },
	failed_login: { icon: 'lock', tone: 'text-error-500' },
	activated: { icon: 'toggle_on', tone: 'text-success-500' },
	deactivated: { icon: 'toggle_off', tone: 'text-gray-400' },
};

export const lookOf = (action: string) => ACTION_LOOKS[action] ?? { icon: 'history', tone: 'text-gray-400' };

/** What an entry is about, in the words the log kept. */
export const subjectOf = (activity: Activity): string =>
	activity.object_name ||
	(activity.metadata?.title as string | undefined) ||
	(activity.new_value?.title as string | undefined) ||
	(activity.object_id ? `${activity.object_type} #${activity.object_id}` : activity.object_type);

const when = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value.replace(' ', 'T')));

export const ActivityList = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const [user, setUser] = useState<number[]>(filters.user_id ? [Number(filters.user_id)] : []);

	const params = {
		search: String(filters.search),
		action: String(filters.action),
		object_type: String(filters.object_type),
		user_id: String(filters.user_id),
		date_from: String(filters.date_from),
		date_to: String(filters.date_to),
		page: Number(filters.page),
		per_page: Number(filters.per_page),
		orderby: String(filters.orderby),
		order: String(filters.order),
	};

	const activities = useActivities(params);
	const stats = useActivityStats(params.date_from, params.date_to);
	const cleanup = useActivityCleanup();

	const rows = activities.data?.data ?? [];
	const total = activities.data?.totalItems ?? 0;

	const apply = (patch: Partial<typeof DEFAULTS>) => setFilters({ ...patch, page: patch.page ?? 1 });

	const pickUser = (ids: number[]) => {
		setUser(ids);
		apply({ user_id: ids[0] ? String(ids[0]) : '' });
	};

	// Every row on screen belongs to the chosen person, so the first one already has their name.
	const chosenName = rows[0] ? decodeHtml(userName(rows[0].user)) : '';

	const activeFilters: ActiveFilter[] = [
		...(params.action !== 'all' ? [{ key: 'action', label: sprintf(__('Action: %s'), params.action), onRemove: () => apply({ action: 'all' }) }] : []),
		...(params.object_type !== 'all' ? [{ key: 'type', label: sprintf(__('Type: %s'), params.object_type), onRemove: () => apply({ object_type: 'all' }) }] : []),
		...(params.user_id ? [{ key: 'user', label: sprintf(__('Person: %s'), chosenName || `#${params.user_id}`), onRemove: () => pickUser([]) }] : []),
		...(params.date_from && params.date_to
			? [{ key: 'date', label: periodText({ from: params.date_from, to: params.date_to }), onRemove: () => apply({ date_from: '', date_to: '' }) }]
			: []),
	];

	const clearFilters = () => {
		setUser([]);
		apply({ action: 'all', object_type: 'all', user_id: '', date_from: '', date_to: '' });
	};

	const askThenClean = async () => {
		const confirmed = await confirm({
			title: __('Remove old entries?'),
			message: __('Entries older than the period the plugin keeps are deleted. There is no undo.'),
			confirmLabel: __('Remove them'),
			variant: 'danger',
		});

		if (confirmed) {
			cleanup.mutate();
		}
	};

	const summary: StatItem[] = [
		{ key: 'total', label: __('Entries'), value: String(stats.data?.total ?? 0) },
		{ key: 'actions', label: __('Kinds of action'), value: String(stats.data?.actions.length ?? 0) },
		{ key: 'people', label: __('People'), value: String(stats.data?.top_users.length ?? 0) },
	];

	const columns: Column<Activity>[] = [
		{
			key: 'action',
			label: __('What happened'),
			cell: (activity) => {
				const look = lookOf(activity.action);

				return (
					<div className="flex items-start gap-3">
						<Icon name={look.icon} className={cn('mt-0.5 text-theme-md', look.tone)} />
						<div className="min-w-0">
							<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{decodeHtml(subjectOf(activity))}</p>
							<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
								{activity.action} · {activity.object_type}
							</p>
						</div>
					</div>
				);
			},
		},
		{
			key: 'user',
			label: __('Who'),
			cell: (activity) =>
				activity.user_id ? (
					<div className="flex items-center gap-2">
						<Avatar src={activity.user?.avatar} name={userName(activity.user)} size="sm" />
						<span className="truncate text-theme-sm text-gray-700 dark:text-gray-300">{decodeHtml(userName(activity.user)) || `#${activity.user_id}`}</span>
					</div>
				) : (
					<span className="text-theme-sm text-gray-400">{__('The site itself')}</span>
				),
		},
		{ key: 'ip_address', label: __('From'), cell: (activity) => <span className="text-theme-sm text-gray-500">{activity.ip_address || '—'}</span> },
		{ key: 'created_at', label: __('When'), sortable: true, className: 'whitespace-nowrap', cell: (activity) => <span className="text-theme-sm">{when(activity.created_at)}</span> },
	];

	return (
		<>
			<PageHeader
				title={__('Activity log')}
				description={sprintf(__('%s entries'), String(total))}
				actions={
					<Button variant="outline" icon="delete" loading={cleanup.isPending} onClick={askThenClean}>
						{__('Remove old entries')}
					</Button>
				}
			/>

			<StatStrip items={summary} className="mb-5" />

			<TableCard
				search={<SearchInput value={String(filters.search)} onChange={(search) => apply({ search })} placeholder={__('Search the log')} aria-label={__('Search the log')} />}
				filters={
					<>
						<Select
							label={__('Action')}
							value={params.action}
							options={[
								{ value: 'all', label: __('Any action') },
								...(stats.data?.actions ?? []).map((item) => ({ value: item.action, label: `${item.action} (${item.count})` })),
							]}
							onChange={(next) => apply({ action: next })}
						/>
						<Select
							label={__('Type')}
							value={params.object_type}
							options={[
								{ value: 'all', label: __('Anything') },
								...(stats.data?.object_types ?? []).map((item) => ({ value: item.object_type, label: `${item.object_type} (${item.count})` })),
							]}
							onChange={(next) => apply({ object_type: next })}
						/>
						<Field label={__('Person')}>
							<EntityPicker endpoint="wp/v2/users" toItem={userItem} multiple={false} value={user} onChange={pickUser} placeholder={__('Anyone')} />
						</Field>
						<DateRangePicker
							label={__('Period')}
							value={{ from: params.date_from, to: params.date_to }}
							onChange={(next) => apply({ date_from: next.from, date_to: next.to })}
							presets={recentPresets()}
							max={isoDate(new Date())}
						/>
					</>
				}
				activeFilters={activeFilters}
				onClearFilters={clearFilters}
				busy={activities.isFetching}
				footer={<Pagination page={params.page} perPage={params.per_page} total={total} onPageChange={(page) => setFilters({ page })} />}
			>
				<DataTable
					columns={columns}
					rows={rows}
					loading={activities.isLoading}
					clickableRows
					onRowClick={(activity) => navigate(`/entry/${activity.id}`)}
					sort={{ key: params.orderby, direction: params.order === 'asc' ? 'asc' : 'desc' }}
					onSortChange={(sort) => apply({ orderby: sort.key, order: sort.direction })}
					emptyIcon="history"
					emptyTitle={__('Nothing logged yet')}
					emptyDescription={__('What happens on the site shows up here.')}
				/>
			</TableCard>
		</>
	);
};
