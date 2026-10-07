import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { DatabaseExplorer, cellText } from '@/react/features/database/DatabaseExplorer';
import { formatSize, isReadOnly } from '@/react/features/database/queries';
import { RoleDetails } from '@/react/features/roles/RoleDetails';
import { slugify } from '@/react/features/roles/queries';
import type { WpData } from '@/react/types/wordpress';

/** The database explorer and the role editor: the two screens that can lock a site. */

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

const TABLES = [{ name: 'wp_options', row_count: 480, size_mb: 3.2, is_wp_table: true }];

const CAPABILITIES = {
	all: ['read', 'edit_posts', 'manage_options'],
	grouped: { general: ['read'], posts: ['edit_posts'], settings: ['manage_options'] },
};

const stubFetch = (onWrite?: (url: string, body: unknown) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (init?.method && init.method !== 'GET') {
				onWrite?.(url, init.body ? JSON.parse(String(init.body)) : null);

				return new Response(JSON.stringify({ data: [], rows_affected: 0, verified: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			const body = url.includes('role-editor/capabilities')
				? CAPABILITIES
				: url.includes('role-editor/role/')
					? { slug: 'editor', name: 'Editor', capabilities: ['read'], user_count: 2 }
					: url.includes('/data')
						? { data: [], pagination: { page: 1, per_page: 25, total: 0, total_pages: 0 } }
						: url.includes('database/tables')
							? TABLES
							: [];

			return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
		})
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('database helpers', () => {
	it('recognises the only kind of query the server will run', () => {
		expect(isReadOnly('SELECT * FROM wp_options')).toBe(true);
		expect(isReadOnly('  select 1')).toBe(true);
		expect(isReadOnly('DELETE FROM wp_options')).toBe(false);
		expect(isReadOnly('UPDATE wp_options SET x = 1')).toBe(false);
	});

	it('writes a table size the way a person reads one', () => {
		expect(formatSize(0.06)).toBe('0.06 MB');
		expect(formatSize(12.4)).toBe('12.4 MB');
		expect(formatSize(2048)).toBe('2.0 GB');
	});

	it('shows a cell of any kind as text', () => {
		expect(cellText(null)).toBe('');
		expect(cellText(42)).toBe('42');
		expect(cellText({ a: 1 })).toBe('{"a":1}');
	});
});

describe('role slugs', () => {
	it('writes a name the way WordPress stores it', () => {
		expect(slugify('Gerente da Loja')).toBe('gerente_da_loja');
		expect(slugify('Çãó Editor!')).toBe('cao_editor');
	});
});

describe('deleting a table', () => {
	it('will not go ahead until the name is typed and the password given', async () => {
		const user = userEvent.setup();
		const writes: string[] = [];

		stubFetch((url) => writes.push(url));

		render(
			<AppProviders wpData={wpData}>
				<MemoryRouter initialEntries={['/?table=wp_options']}>
					<DatabaseExplorer />
				</MemoryRouter>
			</AppProviders>
		);

		await user.click(await screen.findByRole('button', { name: 'Delete table' }));

		const confirm = await screen.findByRole('button', { name: 'Delete the table' });
		expect(confirm).toBeDisabled();

		await user.type(screen.getByRole('textbox', { name: 'Type wp_options to confirm' }), 'wp_options');
		expect(confirm).toBeDisabled();

		expect(writes).toHaveLength(0);
	});
});

describe('role capabilities', () => {
	it('sends the whole list the role should end up with', async () => {
		const user = userEvent.setup();
		const writes: { url: string; body: unknown }[] = [];

		stubFetch((url, body) => writes.push({ url, body }));

		render(
			<AppProviders wpData={wpData}>
				<MemoryRouter initialEntries={['/role/editor']}>
					<Routes>
						<Route path="/role/:slug" element={<RoleDetails />} />
					</Routes>
				</MemoryRouter>
			</AppProviders>
		);

		await user.click(await screen.findByRole('checkbox', { name: 'edit_posts' }));
		await user.click(screen.getByRole('button', { name: 'Save changes' }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect((writes[0].body as { capabilities: string[] }).capabilities).toEqual(['read', 'edit_posts']);
	});
});
