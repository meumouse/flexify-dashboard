import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { ActivityList, lookOf, subjectOf } from '@/react/features/activity/ActivityList';
import { userName, type Activity } from '@/react/features/activity/queries';
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

const entry = (id: number, action: string, name: string): Activity => ({
	id,
	user_id: 1,
	user: { id: 1, display_name: 'Maria Silva' },
	action,
	object_type: 'post',
	object_id: 100,
	object_name: name,
	ip_address: '192.0.2.10',
	created_at: '2026-10-01 10:00:00',
});

const log = [entry(900, 'updated', 'Como vender mais no Pix'), entry(901, 'created', 'Guia de frete')];

const STATS = {
	total: 128,
	actions: [{ action: 'updated', count: 70 }],
	object_types: [{ object_type: 'post', count: 90 }],
	top_users: [{ user_id: 1, count: 70 }],
};

const stubFetch = (onRequest?: (url: string) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			onRequest?.(url);

			const body = url.includes('/stats') ? STATS : url.includes('wp/v2/users') ? [] : log;

			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(log.length), 'X-WP-TotalPages': '1' },
			});
		})
	);

const renderList = () =>
	render(
		<AppProviders wpData={wpData}>
			<MemoryRouter>
				<ActivityList />
			</MemoryRouter>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('activity helpers', () => {
	it('says what an entry is about, in the words the log kept', () => {
		expect(subjectOf(log[0])).toBe('Como vender mais no Pix');
		expect(subjectOf({ ...log[0], object_name: undefined, metadata: { title: 'From metadata' } })).toBe('From metadata');
		expect(subjectOf({ ...log[0], object_name: undefined })).toBe('post #100');
	});

	it('has a look for an action it does not know', () => {
		expect(lookOf('updated').icon).toBe('edit');
		expect(lookOf('something_new').icon).toBe('history');
	});

	it('reads a name however the log spelled it', () => {
		expect(userName({ id: 1, display_name: 'Maria' })).toBe('Maria');
		expect(userName({ id: 1, name: 'Maria' })).toBe('Maria');
		expect(userName(undefined)).toBe('');
	});
});

describe('activity screen', () => {
	it('shows the log with who did what', async () => {
		stubFetch();
		renderList();

		expect(await screen.findByText('Como vender mais no Pix')).toBeInTheDocument();
		expect(screen.getAllByText('Maria Silva').length).toBeGreaterThan(0);
	});

	it('offers only the actions the log actually holds', async () => {
		stubFetch();
		renderList();

		const filter = await screen.findByRole('combobox', { name: 'Action' });

		await waitFor(() => expect(within(filter).getByText('updated (70)')).toBeInTheDocument());
	});

	it('narrows by action on the server', async () => {
		const user = userEvent.setup();
		const urls: string[] = [];

		stubFetch((url) => urls.push(url));
		renderList();

		await screen.findByText('Como vender mais no Pix');

		const filter = screen.getByRole('combobox', { name: 'Action' });
		await waitFor(() => expect(within(filter).getByText('updated (70)')).toBeInTheDocument());
		await user.selectOptions(filter, 'updated');

		await waitFor(() => expect(urls.some((url) => url.includes('action=updated'))).toBe(true));
	});
});
