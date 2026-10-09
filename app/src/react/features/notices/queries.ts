import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import type { RestListResult } from '@/react/types/wordpress';

/**
 * The notices the plugin shows inside wp-admin. They are a post type, so the core REST
 * routes handle them; what makes a notice a notice lives in its meta.
 */

export type NoticeMeta = {
	notice_type?: string;
	roles?: string[];
	dismissible?: boolean;
	display?: 'panel' | 'bar';
	seen_by?: number[];
};

export type Notice = {
	id: number;
	title: { rendered: string; raw?: string };
	content: { rendered: string; raw?: string };
	status: string;
	date: string;
	modified: string;
	meta?: NoticeMeta;
};

export const ENDPOINT = 'wp/v2/flexify-dashboard-notices';

export const NOTICE_TYPES = (): { value: string; label: string; icon: string; tone: string }[] => [
	{ value: 'info', label: __('Information'), icon: 'info', tone: 'text-blue-light-500' },
	{ value: 'success', label: __('Success'), icon: 'check_circle', tone: 'text-success-500' },
	{ value: 'warning', label: __('Warning'), icon: 'warning', tone: 'text-warning-500' },
	{ value: 'error', label: __('Error'), icon: 'error', tone: 'text-error-500' },
];

export const useNotices = (params: { search: string; page: number; per_page: number }) => {
	const rest = useRest();

	return useQuery<RestListResult<Notice>>({
		queryKey: ['notices', params],
		placeholderData: (previous) => previous,
		queryFn: ({ signal }) => rest.list<Notice>(ENDPOINT, { context: 'edit', status: 'publish,draft', ...params }, signal),
	});
};

export const useNoticeItem = (id: number | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['notice', id],
		enabled: Boolean(id),
		queryFn: ({ signal }) => rest.get<Notice>(`${ENDPOINT}/${id}`, { context: 'edit' }, signal),
	});
};

export const useNoticeMutations = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['notices'] });
		queryClient.invalidateQueries({ queryKey: ['notice'] });
	};

	const save = useMutation<Notice, Error, { id?: number; data: Record<string, unknown> }>({
		mutationFn: ({ id, data }) => rest.post<Notice>(id ? `${ENDPOINT}/${id}` : ENDPOINT, data, { context: 'edit' }),
		onSuccess: (_result, { id }) => {
			notify({ tone: 'success', title: id ? __('Notice updated') : __('Notice created') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const remove = useMutation<unknown, Error, number>({
		mutationFn: (id) => rest.remove(`${ENDPOINT}/${id}`, { force: true }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Notice deleted') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return { save, remove, refresh };
};
