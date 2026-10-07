import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { CommentsList } from '@/react/features/comments/CommentsList';
import { postOf, type Comment } from '@/react/features/comments/queries';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: '',
	restBase: 'https://site.test/wp-json/',
	restNonce: 'nonce-1',
	adminUrl: 'https://site.test/wp-admin/',
	loginUrl: '',
	siteUrl: 'https://site.test/',
	userId: 1,
	userName: 'Maria',
	userEmail: '',
	userRoles: ['administrator'],
	canManageOptions: true,
	currentUser: null,
	settings: {},
	page: {},
};

const comment = (id: number, author: string, status: string): Comment => ({
	id,
	author_name: author,
	author_email: `${author.toLowerCase()}@example.com`,
	author_url: '',
	author_ip: '192.0.2.10',
	author_avatar_urls: {},
	content: { rendered: '<p>Adorei o artigo</p>', raw: 'Adorei o artigo' },
	date: '2026-10-01T10:00:00',
	status,
	post: 100,
	parent: 0,
	link: 'https://site.test/?p=100#comment-1',
	type: 'comment',
	_embedded: { up: [{ id: 100, title: { rendered: 'Como vender mais no Pix' }, link: 'https://site.test/?p=100' }] },
});

const list = [comment(500, 'Ana', 'approved'), comment(501, 'Bruno', 'hold')];

const stubFetch = (onWrite?: (url: string, init?: RequestInit) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (init?.method && init.method !== 'GET') {
				onWrite?.(url, init);

				return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			const status = new URL(url).searchParams.get('status');
			const body = status ? list.filter((item) => item.status === status) : list;

			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(body.length), 'X-WP-TotalPages': '1' },
			});
		})
	);

const renderList = () =>
	render(
		<AppProviders wpData={wpData}>
			<MemoryRouter>
				<CommentsList />
			</MemoryRouter>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('comments screen', () => {
	it('shows the comment and what it was left on', async () => {
		stubFetch();
		renderList();

		expect(await screen.findByText('Ana')).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: 'Como vender mais no Pix' })).toHaveLength(2);
	});

	it('counts each status from the pagination headers', async () => {
		stubFetch();
		renderList();

		expect(await screen.findByRole('tab', { name: 'Approved (1)' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Pending (1)' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Spam (0)' })).toBeInTheDocument();
	});

	it('approves the selected comments one request at a time', async () => {
		const user = userEvent.setup();
		const writes: { url: string; body: unknown }[] = [];

		stubFetch((url, init) => writes.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null }));
		renderList();

		await screen.findByText('Ana');

		const rows = screen.getAllByRole('row');
		await user.click(within(rows[1]).getByRole('checkbox'));
		await user.click(within(rows[2]).getByRole('checkbox'));
		await user.click(screen.getByRole('button', { name: 'Approve' }));

		await waitFor(() => expect(writes).toHaveLength(2));
		expect(writes.map((write) => write.url)).toEqual([expect.stringContaining('comments/500'), expect.stringContaining('comments/501')]);
		expect(writes[0].body).toEqual({ status: 'approved' });
	});

	it('reads the post a comment was left on out of what it brought with it', () => {
		expect(postOf(list[0])?.title?.rendered).toBe('Como vender mais no Pix');
		expect(postOf({ ...list[0], _embedded: undefined })).toBeUndefined();
	});
});
