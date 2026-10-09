import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest, useWpData } from '@/react/app/WpDataProvider';

/**
 * Notices the site published for its users through the plugin, as opposed to the ones
 * WordPress itself prints.
 *
 * Both the notifications panel and the announcement bar read them, so they share one query:
 * a dismissal made in either disappears from both.
 */

export type AdminNotice = {
	id: number;
	/** When it was published, in the site's time */
	date?: string;
	title?: { rendered?: string };
	content?: { rendered?: string };
	meta?: {
		/** The key the notice editor and `AdminNotices::register_meta_fields()` use */
		notice_type?: 'info' | 'success' | 'warning' | 'error';
		/** `bar` also shows it across the top of every screen */
		display?: 'panel' | 'bar';
		dismissible?: boolean;
		roles?: { type: string; id?: number; value?: string }[];
		seen_by?: number[];
	};
};

const KEY = ['admin-notices'];

export const useAdminNotices = () => {
	const rest = useRest();
	const queryClient = useQueryClient();
	const { userId, userRoles } = useWpData();
	const [dismissing, setDismissing] = useState<number | null>(null);

	const query = useQuery({
		queryKey: KEY,
		staleTime: 60_000,
		queryFn: async ({ signal }) => (await rest.list<AdminNotice>('wp/v2/flexify-dashboard-notices', { status: 'publish', per_page: 100 }, signal)).data ?? [],
	});

	/** A notice is shown until this user dismisses it, and only to the roles it targets. */
	const appliesToUser = useCallback(
		(notice: AdminNotice) => {
			const seenBy = notice.meta?.seen_by ?? [];

			if (seenBy.includes(Number(userId))) {
				return false;
			}

			const roles = notice.meta?.roles ?? [];

			if (!roles.length) {
				return true;
			}

			return roles.some((rule) => (rule.type === 'user' && Number(rule.id) === userId) || (rule.type === 'role' && userRoles.includes(String(rule.value))));
		},
		[userId, userRoles]
	);

	const dismiss = useCallback(
		async (notice: AdminNotice) => {
			setDismissing(notice.id);

			try {
				const response = (await rest.post<{ seen_by?: number[] }>('flexify-dashboard/v1/notices/seen', { notice_id: notice.id })) ?? {};
				const seenBy = response.seen_by ?? [...(notice.meta?.seen_by ?? []), userId];

				queryClient.setQueryData<AdminNotice[]>(KEY, (current = []) => current.map((entry) => (entry.id === notice.id ? { ...entry, meta: { ...entry.meta, seen_by: seenBy } } : entry)));
			} finally {
				setDismissing(null);
			}
		},
		[queryClient, rest, userId]
	);

	return { notices: (query.data ?? []).filter(appliesToUser), loading: query.isLoading, dismiss, dismissing };
};
