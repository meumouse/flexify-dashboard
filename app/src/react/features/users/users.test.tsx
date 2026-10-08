import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseOption } from '../../../../tests/select';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { UsersList } from '@/react/features/users/UsersList';
import { guessMapping } from '@/react/features/users/ImportUsersModal';
import { generatePassword } from '@/react/features/users/UserModals';
import type { User } from '@/react/features/users/queries';
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

const user = (id: number, name: string, roles: string[]): User => ({
	id,
	name,
	slug: name.toLowerCase(),
	email: `${name.toLowerCase()}@example.com`,
	url: '',
	description: '',
	link: '#',
	roles,
	registered_date: '2026-01-10T10:00:00',
	avatar_urls: {},
	meta: {},
});

const people = [user(1, 'Maria', ['administrator']), user(2, 'Joao', ['customer'])];
const roles = [
	{ slug: 'administrator', name: 'Administrador' },
	{ slug: 'customer', name: 'Cliente' },
];

const stubFetch = (onRequest?: (url: string, init?: RequestInit) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			onRequest?.(url, init);

			const body = url.includes('user-roles') ? roles : people;

			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(people.length), 'X-WP-TotalPages': '1' },
			});
		})
	);

const renderList = () =>
	render(
		<AppProviders wpData={wpData}>
			<MemoryRouter>
				<UsersList />
			</MemoryRouter>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('import mapping', () => {
	it('matches the headings a spreadsheet actually has', () => {
		expect(guessMapping(['User Login', 'E-mail', 'Display Name', 'Nothing'])).toEqual({
			'User Login': 'username',
			'E-mail': 'email',
			'Display Name': 'name',
		});
	});

	it('gives a heading to one field only', () => {
		const mapping = guessMapping(['email', 'Email Address']);

		expect(Object.values(mapping).filter((field) => field === 'email')).toHaveLength(1);
	});
});

describe('generated passwords', () => {
	it('is long and different every time', () => {
		const first = generatePassword();
		const second = generatePassword();

		expect(first).toHaveLength(20);
		expect(first).not.toBe(second);
	});
});

describe('users screen', () => {
	it('shows the users with their roles by name', async () => {
		stubFetch();
		renderList();

		expect(await screen.findByText('Maria')).toBeInTheDocument();

		// The role filter lists every role too, so the badge is looked for in its own row.
		const rows = await screen.findAllByRole('row');
		expect(within(rows[1]).getByText('Administrador')).toBeInTheDocument();
		expect(within(rows[2]).getByText('Cliente')).toBeInTheDocument();
	});

	it('narrows the list to one role on the server', async () => {
		const user = userEvent.setup();
		const urls: string[] = [];

		stubFetch((url) => urls.push(url));
		renderList();

		await screen.findByText('Maria');
		await chooseOption(user, 'Role', 'Cliente');

		await waitFor(() => expect(urls.some((url) => url.includes('roles=customer'))).toBe(true));
	});

	it('asks who inherits the content before deleting anyone', async () => {
		const user = userEvent.setup();
		const writes: { url: string; method?: string }[] = [];

		stubFetch((url, init) => (init?.method === 'DELETE' ? writes.push({ url, method: init.method }) : undefined));
		renderList();

		await screen.findByText('Maria');

		const rows = screen.getAllByRole('row');
		await user.click(within(rows[1]).getByRole('checkbox'));
		await user.click(screen.getByRole('button', { name: 'Delete' }));

		expect(await screen.findByText('Give their content to someone else')).toBeInTheDocument();
		expect(writes).toHaveLength(0);

		await user.click(screen.getByRole('button', { name: 'Delete', hidden: false }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(writes[0].url).toContain('reassign=1');
	});
});
