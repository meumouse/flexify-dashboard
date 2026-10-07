import { useCallback, useEffect, useState } from 'react';
import { useRest, useWpData } from '@/react/app/WpDataProvider';

/**
 * Notices the site published for its users through the plugin, as opposed to the ones
 * WordPress itself prints.
 */

export type AdminNotice = {
	id: number;
	title?: { rendered?: string };
	content?: { rendered?: string };
	meta?: {
		type?: 'info' | 'success' | 'warning' | 'error';
		roles?: { type: string; id?: number; value?: string }[];
		seen_by?: number[];
	};
};

export const useAdminNotices = () => {
	const rest = useRest();
	const { userId, userRoles } = useWpData();

	const [notices, setNotices] = useState<AdminNotice[]>([]);
	const [loading, setLoading] = useState(true);
	const [dismissing, setDismissing] = useState<number | null>(null);

	useEffect(() => {
		let active = true;

		rest
			.list<AdminNotice>('wp/v2/flexify-dashboard-notices', { status: 'publish', per_page: 100 })
			.then((response) => {
				if (active) {
					setNotices(response.data ?? []);
				}
			})
			.catch(() => undefined)
			.finally(() => {
				if (active) {
					setLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [rest]);

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

				setNotices((current) => current.map((entry) => (entry.id === notice.id ? { ...entry, meta: { ...entry.meta, seen_by: seenBy } } : entry)));
			} finally {
				setDismissing(null);
			}
		},
		[rest, userId]
	);

	return { notices: notices.filter(appliesToUser), loading, dismiss, dismissing };
};
