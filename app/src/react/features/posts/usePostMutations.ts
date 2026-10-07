import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __, sprintf } from '@/react/lib/i18n';
import type { PostRow } from '@/react/features/posts/types';

/**
 * Every write a post goes through from the list, through the core REST routes.
 *
 * Each post carries its own `rest_base`, because a page of search results can hold several
 * post types and each has its own route.
 */

type Patch = { post: PostRow; data: Record<string, unknown> };

export const usePostMutations = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => queryClient.invalidateQueries({ queryKey: ['posts'] });

	const update = useMutation<unknown, Error, Patch & { message?: string }>({
		mutationFn: ({ post, data }) => rest.post(`wp/v2/${post.rest_base}/${post.id}`, data),
		onSuccess: (_result, { message }) => {
			notify({ tone: 'success', title: message ?? __('Item updated') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	/**
	 * The REST API has no batch route, so a bulk action is one request per post. They run in
	 * sequence: a hundred parallel writes is what takes a shared host down.
	 */
	const runAll = async (posts: PostRow[], action: (post: PostRow) => Promise<unknown>) => {
		let failed = 0;

		for (const post of posts) {
			try {
				await action(post);
			} catch {
				failed += 1;
			}
		}

		return failed;
	};

	const bulk = useMutation<number, Error, { posts: PostRow[]; action: (post: PostRow) => Promise<unknown>; message: string }>({
		mutationFn: ({ posts, action }) => runAll(posts, action),
		onSuccess: (failed, { posts, message }) => {
			notify(
				failed
					? { tone: 'error', title: __('Some items could not be updated.'), message: sprintf(__('%1$s of %2$s failed.'), String(failed), String(posts.length)) }
					: { tone: 'success', title: message }
			);
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return {
		update,
		bulk,
		/** A post in the trash is deleted for good; anything else is moved to the trash first. */
		remove: (post: PostRow) => rest.remove(`wp/v2/${post.rest_base}/${post.id}`, { force: post.single_status === 'trash' }),
		publish: (post: PostRow) => rest.post(`wp/v2/${post.rest_base}/${post.id}`, { status: 'publish' }),
		restore: (post: PostRow) => rest.post(`wp/v2/${post.rest_base}/${post.id}`, { status: 'draft' }),
		duplicate: async (post: PostRow) => {
			const source = await rest.get<Record<string, unknown>>(`wp/v2/${post.rest_base}/${post.id}`, { context: 'edit' });
			const title = (source.title as { raw?: string } | undefined)?.raw ?? '';

			// What identifies the original, and when it was written, belong to the original.
			const { id, date, date_gmt, guid, link, modified, modified_gmt, slug, ...copy } = source;
			void id;
			void date;
			void date_gmt;
			void guid;
			void link;
			void modified;
			void modified_gmt;
			void slug;

			return rest.post(`wp/v2/${post.rest_base}`, { ...copy, title: `${title} (${__('copy')})`, status: 'draft' });
		},
		refresh,
	};
};
