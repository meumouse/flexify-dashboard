import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import type { RestListResult } from '@/react/types/wordpress';

/**
 * Comments, through the core REST routes.
 *
 * Each comment is asked to bring its post along (`_embed=up`), so a page of thirty shows
 * what was commented on without thirty more requests for it.
 */

export type CommentStatus = 'approved' | 'hold' | 'spam' | 'trash';

export type Comment = {
	id: number;
	author_name: string;
	author_email: string;
	author_url: string;
	author_ip: string;
	author_avatar_urls?: Record<string, string>;
	content: { rendered: string; raw?: string };
	date: string;
	status: CommentStatus | string;
	post: number;
	parent: number;
	link: string;
	type: string;
	_embedded?: { up?: { id: number; title?: { rendered?: string }; link?: string }[] };
};

export type CommentsParams = {
	status: string;
	search: string;
	page: number;
	per_page: number;
	orderby: string;
	order: string;
};

/** WordPress calls a comment awaiting moderation "hold" when writing and "pending" when reading. */
export const STATUS_LABELS = (): Record<string, string> => ({
	approved: __('Approved'),
	hold: __('Pending'),
	spam: __('Spam'),
	trash: __('Trash'),
});

export const postOf = (comment: Comment) => comment._embedded?.up?.[0];

export const useComments = (params: CommentsParams) => {
	const rest = useRest();

	return useQuery<RestListResult<Comment>>({
		queryKey: ['comments', params],
		placeholderData: (previous) => previous,
		queryFn: ({ signal }) =>
			rest.list<Comment>(
				'wp/v2/comments',
				{
					context: 'edit',
					_embed: 'up',
					page: params.page,
					per_page: params.per_page,
					search: params.search,
					order: params.order,
					orderby: params.orderby,
					status: params.status === 'all' ? undefined : params.status,
				},
				signal
			),
	});
};

/**
 * How many comments each status holds.
 *
 * There is no endpoint that counts them, so each status is asked for one comment and the
 * total comes back in the headers — four tiny requests instead of four full pages.
 */
export const useCommentCounts = (search: string) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['comment-counts', search],
		staleTime: 30_000,
		queryFn: async ({ signal }) => {
			const statuses = ['approved', 'hold', 'spam', 'trash'];
			const results = await Promise.all(
				statuses.map((status) => rest.list<Comment>('wp/v2/comments', { context: 'edit', status, search, per_page: 1 }, signal).catch(() => ({ totalItems: 0 })))
			);

			return Object.fromEntries(statuses.map((status, index) => [status, results[index].totalItems])) as Record<string, number>;
		},
	});
};

export const useComment = (id: number | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['comment', id],
		enabled: Boolean(id),
		queryFn: ({ signal }) => rest.get<Comment>(`wp/v2/comments/${id}`, { context: 'edit', _embed: 'up' }, signal),
	});
};

export const useCommentMutations = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['comments'] });
		queryClient.invalidateQueries({ queryKey: ['comment-counts'] });
		queryClient.invalidateQueries({ queryKey: ['comment'] });
	};

	const save = useMutation<Comment, Error, { id: number; data: Record<string, unknown>; message?: string }>({
		mutationFn: ({ id, data }) => rest.post<Comment>(`wp/v2/comments/${id}`, data, { context: 'edit' }),
		onSuccess: (_result, { message }) => {
			notify({ tone: 'success', title: message ?? __('Comment updated') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	/**
	 * Several comments at once. They go in sequence: the REST API has no batch route, and a
	 * page of thirty parallel writes is enough to make a shared host start refusing them.
	 */
	const bulk = useMutation<number, Error, { ids: number[]; message: string; action: (id: number) => Promise<unknown> }>({
		mutationFn: async ({ ids, action }) => {
			let failed = 0;

			for (const id of ids) {
				try {
					await action(id);
				} catch {
					failed += 1;
				}
			}

			return failed;
		},
		onSuccess: (failed, { message }) => {
			notify(failed ? { tone: 'error', title: __('Some comments could not be updated.') } : { tone: 'success', title: message });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return {
		save,
		bulk,
		setStatus: (status: CommentStatus) => (id: number) => rest.post(`wp/v2/comments/${id}`, { status }),
		/** A comment in the trash is deleted for good; anything else is moved there first. */
		remove: (force: boolean) => (id: number) => rest.remove(`wp/v2/comments/${id}`, { force }),
		refresh,
	};
};
