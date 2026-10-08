import { useQuery } from '@tanstack/react-query';
import { useWpData } from '@/react/app/WpDataProvider';
import { __ } from '@/react/lib/i18n';
import type { PostRow, PostTypeObject, PostsPayload, PostsQuery } from '@/react/features/posts/types';

/**
 * Read the posts list from the endpoint the plugin hides behind `admin.php`.
 *
 * It is not REST and cannot be. The columns, views and row actions are whatever the site's
 * own plugins added to the list table, and those are only registered in an admin request —
 * WooCommerce loads the class that adds the product columns behind `is_admin()`, which is
 * false while REST is answering. What the endpoint returns is JSON, nothing around it.
 */

const DATA_PAGE = 'flexify-dashboard-posts-data';

/**
 * What a view narrows the list to.
 *
 * WordPress builds the same arguments on its side, and the hidden page accepts them; working
 * them out here means the first request already knows what `?view=pending` asks for, instead
 * of having to wait for a list it would then throw away.
 */
export const viewParams = (view: string, userId: number): Record<string, string> => {
	if (view === 'mine') {
		return { author: String(userId) };
	}

	return { post_status: view === 'all' ? 'any' : view };
};

export const buildPostsUrl = (adminUrl: string, nonce: string, query: PostsQuery, userId: number): string => {
	const url = new URL(`${adminUrl}admin.php`);

	url.searchParams.set('page', DATA_PAGE);
	url.searchParams.set('_wpnonce', nonce);
	url.searchParams.set('post_type', query.post_type);
	url.searchParams.set('per_page', String(query.per_page));
	url.searchParams.set('paged', String(query.page));
	url.searchParams.set('orderby', query.orderby);
	url.searchParams.set('order', query.order);
	url.searchParams.set('s', query.search);
	url.searchParams.set('categories', query.categories.join(','));

	if (query.start_date && query.end_date) {
		url.searchParams.set('start_date', query.start_date);
		url.searchParams.set('end_date', query.end_date);
	}

	Object.entries(viewParams(query.view, userId)).forEach(([key, value]) => url.searchParams.set(key, value));

	return url.toString();
};

/** An error page, a login redirect or a PHP notice all arrive here as something that is not JSON. */
export const parsePostsPayload = (body: string): PostsPayload => {
	try {
		return JSON.parse(body) as PostsPayload;
	} catch {
		throw new Error(__('The posts list could not be read. Reload the page and try again.'));
	}
};

export const usePostsData = (query: PostsQuery) => {
	const { adminUrl, restNonce, userId } = useWpData();

	return useQuery<PostsPayload>({
		queryKey: ['posts', query],
		placeholderData: (previous) => previous,
		queryFn: async ({ signal }) => {
			const response = await fetch(buildPostsUrl(adminUrl, restNonce, query, userId), {
				headers: { 'X-Requested-With': 'XMLHttpRequest' },
				credentials: 'same-origin',
				signal,
			});

			return parsePostsPayload(await response.text());
		},
	});
};

/** Pages carry their children with them; the table needs one list in the order it shows them. */
export const flattenPosts = (posts: PostRow[], expanded: number[], expandAll: boolean): PostRow[] =>
	posts.flatMap((post) => {
		const children = expandAll || expanded.includes(post.id) ? flattenPosts(post.children ?? [], expanded, expandAll) : [];

		return [post, ...children];
	});

export const countChildren = (post: PostRow): number =>
	(post.children ?? []).reduce((total, child) => total + 1 + countChildren(child), 0);

/** The post type this screen is about, as WordPress describes it. */
export const usePostType = (): PostTypeObject => {
	const { page } = useWpData();

	const types = (page.postTypes ?? {}) as Record<string, PostTypeObject>;
	const requested = new URLSearchParams(window.location.search).get('post_type') ?? 'post';

	return types[requested] ?? types.post ?? { name: requested, rest_base: requested };
};
