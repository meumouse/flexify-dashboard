import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { NoticeEditor } from '@/react/features/notices/NoticeEditor';
import { NoticesList } from '@/react/features/notices/NoticesList';
import type { Notice } from '@/react/features/notices/queries';
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

const notice = (id: number, title: string, status: string, roles: string[] = []): Notice => ({
	id,
	title: { rendered: title, raw: title },
	content: { rendered: `<p>${title}.</p>`, raw: `<p>${title}.</p>` },
	status,
	date: '2026-10-01T10:00:00',
	modified: '2026-10-01T10:00:00',
	meta: { notice_type: 'info', roles, dismissible: true, seen_by: [] },
});

const list = [notice(800, 'Manutenção na sexta', 'publish'), notice(801, 'Licença expira', 'draft', ['administrator'])];

const stubFetch = (onWrite?: (url: string, body: unknown) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (init?.method && init.method !== 'GET') {
				onWrite?.(url, init.body ? JSON.parse(String(init.body)) : null);

				return new Response(JSON.stringify(list[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			const single = url.match(/notices\/(\d+)/);
			const body = url.includes('user-roles')
				? [{ slug: 'administrator', name: 'Administrador' }]
				: single
					? list.find((item) => item.id === Number(single[1]))
					: list;

			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(list.length), 'X-WP-TotalPages': '1' },
			});
		})
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('notices screen', () => {
	it('shows who each notice is for', async () => {
		stubFetch();

		render(
			<AppProviders wpData={wpData}>
				<MemoryRouter>
					<NoticesList />
				</MemoryRouter>
			</AppProviders>
		);

		expect(await screen.findByText('Manutenção na sexta')).toBeInTheDocument();
		expect(screen.getByText('Everyone')).toBeInTheDocument();
		expect(screen.getByText('administrator')).toBeInTheDocument();
	});

	it('saves a paused notice as a draft, not as published', async () => {
		const user = userEvent.setup();
		const writes: { url: string; body: unknown }[] = [];

		stubFetch((url, body) => writes.push({ url, body }));

		render(
			<AppProviders wpData={wpData}>
				<MemoryRouter initialEntries={['/notice/800']}>
					<Routes>
						<Route path="/notice/:id" element={<NoticeEditor />} />
					</Routes>
				</MemoryRouter>
			</AppProviders>
		);

		await user.click(await screen.findByRole('switch', { name: 'Show this notice' }));
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect((writes[0].body as { status: string }).status).toBe('draft');
	});
});
