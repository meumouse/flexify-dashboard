import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { PostsList } from '@/react/features/posts/PostsList';
import { applyStoredColumns } from '@/react/features/posts/usePostColumns';
import { buildPostsUrl, countChildren, flattenPosts, parsePostsPayload, viewParams } from '@/react/features/posts/usePostsData';
import type { PostRow, PostsPayload, PostsQuery } from '@/react/features/posts/types';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: 'https://site.test/plugin/',
	restBase: 'https://site.test/wp-json/',
	restNonce: 'nonce-1',
	adminUrl: 'https://site.test/wp-admin/',
	loginUrl: '',
	siteUrl: 'https://site.test/',
	userId: 7,
	userName: 'Maria',
	userEmail: '',
	userRoles: ['administrator'],
	canManageOptions: true,
	currentUser: null,
	settings: {},
	page: {
		postTypes: { post: { name: 'post', rest_base: 'posts', labels: { name: 'Posts', new_item: 'Novo post' } } },
		postStatuses: [
			{ value: 'publish', label: 'Published' },
			{ value: 'draft', label: 'Draft' },
		],
	},
};

const post = (id: number, title: string, status = 'publish', children: PostRow[] = []): PostRow => ({
	id,
	title: { value: title, image_url: null },
	type: 'post',
	rest_base: 'posts',
	edit_url: `https://site.test/wp-admin/post.php?post=${id}&action=edit`,
	view_url: `https://site.test/?p=${id}`,
	single_status: status,
	is_editable: true,
	row_actions: [],
	children,
	depth: children.length ? 0 : 0,
	cell_classes: {},
	status: { value: status, label: status === 'publish' ? 'Published' : 'Draft' },
	author: { id: 7, name: 'Maria Silva' },
	date: '<span title="2026-10-01">2 dias atrás</span>',
});

const payload: PostsPayload = {
	items: [post(1, 'Como vender mais no Pix'), post(2, 'Guia de frete', 'draft')],
	total: 2,
	pages: 1,
	columns: {
		title: { key: 'title', label: 'Title', sort_key: 'title', active: true },
		status: { key: 'status', label: 'Status', sort_key: false, active: true },
		author: { key: 'author', label: 'Author', sort_key: 'author', active: true },
		date: { key: 'date', label: 'Published', sort_key: 'date', active: true },
	},
	column_classes: {},
	custom_styles: [],
	views: {
		all: { value: 'all', label: 'All (2)', count: 2, current: true, query_params: { post_status: ['any'] } },
		draft: { value: 'draft', label: 'Draft (1)', count: 1, current: false, query_params: { post_status: 'draft' } },
	},
};

const dataPage = (body: PostsPayload) =>
	`<html><body><script type="application/json" id="flexify-dashboard-posts-data">${JSON.stringify(body)}</script></body></html>`;

/**
 * Answers the hidden data page with the payload and every REST call with an empty object.
 * Only writes reach `onWrite`; the pickers read from the same REST base and would drown it.
 */
const stubFetch = (onWrite?: (url: string, init?: RequestInit) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (url.includes('page=flexify-dashboard-posts-data')) {
				return new Response(dataPage(payload), { status: 200, headers: { 'Content-Type': 'text/html' } });
			}

			if (init?.method && init.method !== 'GET') {
				onWrite?.(url, init);
			}

			return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		})
	);

const renderList = () =>
	render(
		<AppProviders wpData={wpData}>
			<MemoryRouter>
				<PostsList />
			</MemoryRouter>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('posts request', () => {
	const query: PostsQuery = {
		post_type: 'post',
		search: 'pix',
		page: 2,
		per_page: 20,
		orderby: 'title',
		order: 'ASC',
		view: 'draft',
		categories: [3, 9],
		start_date: '',
		end_date: '',
	};

	it('asks the hidden page for what the filters say', () => {
		const url = new URL(buildPostsUrl('https://site.test/wp-admin/', 'nonce-1', query, 7));

		expect(url.pathname).toContain('admin.php');
		expect(url.searchParams.get('page')).toBe('flexify-dashboard-posts-data');
		expect(url.searchParams.get('_wpnonce')).toBe('nonce-1');
		expect(url.searchParams.get('paged')).toBe('2');
		expect(url.searchParams.get('s')).toBe('pix');
		expect(url.searchParams.get('categories')).toBe('3,9');
		expect(url.searchParams.get('post_status')).toBe('draft');
	});

	it('knows what a view narrows the list to without having been told', () => {
		expect(viewParams('all', 7)).toEqual({ post_status: 'any' });
		expect(viewParams('pending', 7)).toEqual({ post_status: 'pending' });
		expect(viewParams('mine', 7)).toEqual({ author: '7' });
	});

	it('reads the payload out of the page it comes wrapped in', () => {
		expect(parsePostsPayload(dataPage(payload)).items).toHaveLength(2);
	});

	it('says so when the page answers with something else', () => {
		expect(() => parsePostsPayload('<html><body>Fatal error</body></html>')).toThrow();
	});
});

describe('hierarchical posts', () => {
	const tree = [post(1, 'Parent', 'publish', [post(2, 'Child', 'publish', [post(3, 'Grandchild')])])];

	it('leaves children out until their parent is open', () => {
		expect(flattenPosts(tree, [], false)).toHaveLength(1);
		expect(flattenPosts(tree, [1], false)).toHaveLength(2);
		expect(flattenPosts(tree, [1, 2], false)).toHaveLength(3);
		expect(flattenPosts(tree, [], true)).toHaveLength(3);
	});

	it('counts every descendant, not just the immediate ones', () => {
		expect(countChildren(tree[0])).toBe(2);
	});
});

describe('column preferences', () => {
	const columns = [
		{ key: 'title', label: 'Title', sort_key: 'title' as const, active: true },
		{ key: 'author', label: 'Author', sort_key: 'author' as const, active: true },
		{ key: 'date', label: 'Published', sort_key: 'date' as const, active: true },
	];

	it('applies the stored order and visibility', () => {
		const applied = applyStoredColumns(columns, [
			{ key: 'date', active: true },
			{ key: 'title', active: false },
		]);

		expect(applied.map((column) => column.key)).toEqual(['date', 'title', 'author']);
		expect(applied[1].active).toBe(false);
	});

	it('keeps a column the site added after the preference was stored', () => {
		const applied = applyStoredColumns(columns, [{ key: 'date', active: true }]);

		expect(applied.map((column) => column.key)).toEqual(['date', 'title', 'author']);
		expect(applied.every((column) => column.active)).toBe(true);
	});
});

describe('posts screen', () => {
	it('shows the list with the views the site sent', async () => {
		stubFetch();
		renderList();

		expect(await screen.findByText('Como vender mais no Pix')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'All (2)' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Draft (1)' })).toBeInTheDocument();
	});

	it('renames a post in place', async () => {
		const user = userEvent.setup();
		const writes: { url: string; body: unknown }[] = [];

		stubFetch((url, init) => writes.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null }));
		renderList();

		await user.click(await screen.findByRole('button', { name: 'Como vender mais no Pix' }));

		const input = screen.getByRole('textbox', { name: 'Item title' });
		await user.clear(input);
		await user.type(input, 'Novo título');
		await user.tab();

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(writes[0].url).toContain('wp/v2/posts/1');
		expect(writes[0].body).toEqual({ title: 'Novo título' });
	});

	it('does not save a title that was not changed', async () => {
		const user = userEvent.setup();
		const writes: string[] = [];

		stubFetch((url) => writes.push(url));
		renderList();

		await user.click(await screen.findByRole('button', { name: 'Guia de frete' }));
		await user.tab();

		expect(writes).toHaveLength(0);
	});

	it('changes the status from the badge', async () => {
		const user = userEvent.setup();
		const writes: { url: string; body: unknown }[] = [];

		stubFetch((url, init) => writes.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null }));
		renderList();

		await screen.findByText('Como vender mais no Pix');

		const rows = screen.getAllByRole('row');
		await user.click(within(rows[1]).getByRole('button', { name: 'Status: Published' }));
		await user.click(await screen.findByRole('menuitem', { name: 'Draft' }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(writes[0].body).toEqual({ status: 'draft' });
	});
});
