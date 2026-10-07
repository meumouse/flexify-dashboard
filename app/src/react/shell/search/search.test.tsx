import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/react/app/AppProviders';
import { CommandPalette } from '@/react/shell/search/CommandPalette';
import { inSearch, parseCommandSyntax } from '@/react/shell/search/commands';
import type { MenuItem } from '@/react/shell/menu/types';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: 'https://site.test/plugin/',
	restBase: 'https://site.test/wp-json/',
	restNonce: '',
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

const MENU: MenuItem[] = [
	{
		id: 'menu-plugins',
		name: 'Plugins',
		url: 'plugins.php',
		submenu: [{ id: 'sub-add', name: 'Adicionar plugin', url: 'plugin-install.php' }],
	},
	{ id: 'menu-users', name: 'Usuários', url: 'users.php' },
];

const stubRest = () => {
	const calls: string[] = [];

	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			calls.push(`${url.pathname}${url.search}`);

			const body = url.pathname.includes('/posts')
				? [{ id: 9, title: { rendered: 'Plugin favorito' }, link: 'https://site.test/plugin-favorito', status: 'draft' }]
				: [];

			return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
		})
	);

	return calls;
};

const renderPalette = () =>
	render(
		<AppProviders wpData={wpData}>
			<CommandPalette open onOpenChange={() => {}} menu={MENU} />
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('parseCommandSyntax', () => {
	it('splits a known command from the query', () => {
		expect(parseCommandSyntax('>post camiseta')).toEqual({ filter: 'post', cleanQuery: 'camiseta' });
		expect(parseCommandSyntax('@user maria')).toEqual({ filter: 'user', cleanQuery: 'maria' });
		expect(parseCommandSyntax('?help')).toEqual({ filter: 'help', cleanQuery: '' });
	});

	it('accepts a custom post type as the command', () => {
		expect(parseCommandSyntax('>produto camiseta')).toEqual({ filter: 'produto', cleanQuery: 'camiseta' });
	});

	it('treats anything else as a plain query', () => {
		expect(parseCommandSyntax('  camiseta ')).toEqual({ filter: null, cleanQuery: 'camiseta' });
		expect(parseCommandSyntax('')).toEqual({ filter: null, cleanQuery: '' });
	});
});

describe('inSearch', () => {
	it('matches any field, ignoring case, and accepts everything with no term', () => {
		expect(inSearch('plu', 'Plugins', 'plugins.php')).toBe(true);
		expect(inSearch('xyz', 'Plugins', 'plugins.php')).toBe(false);
		expect(inSearch('', 'Plugins')).toBe(true);
	});
});

describe('CommandPalette', () => {
	it('offers the quick actions before anything is typed', async () => {
		stubRest();
		renderPalette();

		expect(await screen.findByText('New Post')).toBeInTheDocument();
		expect(screen.getByText('View dashboard')).toBeInTheDocument();
	});

	it('finds menu entries and content, and names the parent of a submenu item', async () => {
		const user = userEvent.setup();
		stubRest();
		renderPalette();

		await user.type(screen.getByRole('textbox', { name: 'Search' }), 'plugin');

		const dialog = screen.getByRole('dialog');
		await waitFor(() => expect(within(dialog).getByText('Plugin favorito')).toBeInTheDocument());
		expect(within(dialog).getByText('Plugins')).toBeInTheDocument();
		expect(within(dialog).getByText(/Adicionar plugin/)).toBeInTheDocument();
	});

	it('narrows the request to one post type when a command is used', async () => {
		const user = userEvent.setup();
		const calls = stubRest();
		renderPalette();

		await user.type(screen.getByRole('textbox', { name: 'Search' }), '>post camiseta');

		await waitFor(() => expect(calls.some((call) => call.includes('/wp/v2/posts'))).toBe(true));
		expect(calls.some((call) => call.includes('/wp/v2/users'))).toBe(false);
	});

	it('walks the results with the arrow keys', async () => {
		const user = userEvent.setup();
		stubRest();
		renderPalette();

		// The palette renders in a portal, so the highlighted row is looked up in the document.
		const highlighted = () => document.querySelector('[data-active="true"]')?.textContent;

		const input = screen.getByRole('textbox', { name: 'Search' });
		await waitFor(() => expect(highlighted()).toBe('New Post'));

		await user.type(input, '{ArrowDown}');
		expect(highlighted()).toBe('New Page');

		// The list wraps around at the top.
		await user.type(input, '{ArrowUp}{ArrowUp}');
		expect(highlighted()).not.toBe('New Page');
	});

	it('lists the commands on ?help instead of searching', async () => {
		const user = userEvent.setup();
		const calls = stubRest();
		renderPalette();

		await user.type(screen.getByRole('textbox', { name: 'Search' }), '?help');

		expect(await screen.findByText('Commands')).toBeInTheDocument();
		expect(screen.getByText('>post')).toBeInTheDocument();
		expect(calls.some((call) => call.includes('/wp/v2/'))).toBe(false);
	});
});
