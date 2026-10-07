import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import type { RestListResult } from '@/react/types/wordpress';

/**
 * The activity log: what was done on the site, by whom and when.
 */

export type ActivityUser = { id: number; name?: string; display_name?: string; avatar?: string; email?: string };

export type Activity = {
	id: number;
	user_id: number;
	user?: ActivityUser;
	action: string;
	object_type: string;
	object_id?: number;
	object_name?: string;
	ip_address?: string;
	user_agent?: string;
	created_at: string;
	metadata?: Record<string, unknown>;
	old_value?: Record<string, unknown>;
	new_value?: Record<string, unknown>;
};

export type ActivityStats = {
	total: number;
	actions: { action: string; count: number }[];
	object_types: { object_type: string; count: number }[];
	top_users: { user_id: number; count: number; user?: ActivityUser }[];
};

export type ActivityParams = {
	search: string;
	action: string;
	object_type: string;
	user_id: string;
	date_from: string;
	date_to: string;
	page: number;
	per_page: number;
	orderby: string;
	order: string;
};

export const userName = (user?: ActivityUser): string => user?.display_name || user?.name || '';

export const useActivities = (params: ActivityParams) => {
	const rest = useRest();

	return useQuery<RestListResult<Activity>>({
		queryKey: ['activity', params],
		placeholderData: (previous) => previous,
		queryFn: ({ signal }) =>
			rest.list<Activity>(
				'flexify-dashboard/v1/activity-log',
				{
					page: params.page,
					per_page: params.per_page,
					search: params.search,
					orderby: params.orderby,
					order: params.order,
					action: params.action === 'all' ? undefined : params.action,
					object_type: params.object_type === 'all' ? undefined : params.object_type,
					user_id: params.user_id || undefined,
					date_from: params.date_from || undefined,
					date_to: params.date_to || undefined,
				},
				signal
			),
	});
};

export const useActivity = (id: number | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['activity-entry', id],
		enabled: Boolean(id),
		queryFn: ({ signal }) => rest.get<Activity>(`flexify-dashboard/v1/activity-log/${id}`, {}, signal),
	});
};

/** The counts behind the filters: which actions and object types the log actually holds. */
export const useActivityStats = (dateFrom: string, dateTo: string) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['activity-stats', dateFrom, dateTo],
		staleTime: 60_000,
		queryFn: ({ signal }) => rest.get<ActivityStats>('flexify-dashboard/v1/activity-log/stats', { date_from: dateFrom || undefined, date_to: dateTo || undefined }, signal),
	});
};

export const useActivityCleanup = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	return useMutation<{ deleted?: number }, Error, void>({
		mutationFn: () => rest.post<{ deleted?: number }>('flexify-dashboard/v1/activity-log/cleanup'),
		onSuccess: (result) => {
			notify({ tone: 'success', title: __('Old entries removed'), message: result?.deleted ? String(result.deleted) : undefined });
			queryClient.invalidateQueries({ queryKey: ['activity'] });
			queryClient.invalidateQueries({ queryKey: ['activity-stats'] });
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});
};
