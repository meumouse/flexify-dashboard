import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/react/app/AppProviders';
import { AppSidebar } from '@/react/shell/AppSidebar';
import { MENU_SCRIPT_ID, readAdminMenu } from '@/react/shell/menu/read';
import { reconcileMenu } from '@/react/shell/menu/useAdminMenu';
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

/** What `AdminMenu::get_menu()` prints, trimmed to what the sidebar reads. */
const ADMIN_MENU = [
	{
		id: 'menu-dashboard',
		name: 'Painel',
		url: 'index.php',
		notifications: null,
		icon: { kind: 'dashicon', value: 'dashicons-dashboard' },
		classes: ['menu-top'],
		submenu: [
			{ id: 'menu-index-php', name: 'Início', url: 'index.php', notifications: null },
			{ id: 'menu-update-core-php', name: 'Atualizações', url: 'update-core.php', notifications: 2 },
		],
	},
	{ id: 'separator1', type: 'separator' },
	{
		id: 'menu-comments',
		name: 'Comentários',
		url: 'edit-comments.php',
		notifications: 4,
		icon: { kind: 'dashicon', value: 'dashicons-admin-comments' },
		classes: ['menu-top'],
		submenu: [],
	},
	{
		id: 'menu-plugins',
		name: 'Plugins',
		url: 'plugins.php',
		notifications: null,
		icon: { kind: 'dashicon', value: 'dashicons-admin-plugins' },
		classes: ['menu-top'],
		submenu: [{ id: 'menu-plugins-php', name: 'Instalados', url: 'plugins.php', notifications: null }],
	},
];

const printMenu = (items: unknown = ADMIN_MENU) => {
	document.body.innerHTML = `<script type="application/json" id="${MENU_SCRIPT_ID}">${JSON.stringify(items)}</script>`;
};

beforeEach(() => {
	printMenu();
	window.history.replaceState({}, '', '/wp-admin/edit-comments.php');
});

afterEach(() => {
	document.body.innerHTML = '';
	window.localStorage.clear();
	vi.unstubAllGlobals();
});

describe('readAdminMenu', () => {
	it('reads the items, the separators and the notification counts', () => {
		const menu = readAdminMenu();

		expect(menu.map((item) => item.type ?? item.name)).toEqual(['Painel', 'separator', 'Comentários', 'Plugins']);
		expect(menu[2].notifications).toBe(4);
		expect(menu[0].submenu?.map((entry) => entry.name)).toEqual(['Início', 'Atualizações']);
		expect(menu[0].submenu?.[1].notifications).toBe(2);
	});

	it('answers with an empty menu when the page printed none', () => {
		document.body.innerHTML = '';

		expect(readAdminMenu()).toEqual([]);
	});

	it('answers with an empty menu when what it printed is not JSON', () => {
		document.body.innerHTML = `<script type="application/json" id="${MENU_SCRIPT_ID}">not json</script>`;

		expect(readAdminMenu()).toEqual([]);
	});

	it('marks the item matching the address, and only that one', () => {
		const menu = readAdminMenu();

		// The browser is on the comments screen.
		expect(menu[2].active).toBe(true);
		expect(menu[0].active).toBe(false);
		expect(menu[0].submenu?.every((entry) => !entry.active)).toBe(true);
	});
});

describe('reconcileMenu', () => {
	const native: MenuItem[] = [
		{ id: 'menu-dashboard', name: 'Painel', url: 'index.php', notifications: 3, submenu: [{ id: 'sub-home', name: 'Início', url: 'index.php' }] },
		{ id: 'menu-new', name: 'Novo plugin', url: 'new.php' },
	];

	it('keeps a custom menu but drops what the site no longer has', () => {
		const custom: MenuItem[] = [
			{ id: 'menu-dashboard', name: 'Meu painel', url: 'index.php', notifications: 0 },
			{ id: 'menu-gone', name: 'Removido', url: 'gone.php' },
		];

		const result = reconcileMenu(custom, native);

		expect(result.map((item) => item.id)).toEqual(['menu-dashboard', 'menu-new']);
		// The custom name wins, the live notification count does not.
		expect(result[0].name).toBe('Meu painel');
		expect(result[0].notifications).toBe(3);
	});

	it('keeps items the custom menu added itself', () => {
		const custom: MenuItem[] = [{ id: 'custom-1', name: 'Atalho', url: 'https://site.test', custom: true }];

		expect(reconcileMenu(custom, native).map((item) => item.id)).toEqual(['custom-1', 'menu-dashboard', 'menu-new']);
	});
});

describe('AppSidebar', () => {
	const renderSidebar = (collapsed = false) => {
		const menu = readAdminMenu();

		const { container } = render(
			<AppProviders wpData={wpData}>
				<AppSidebar menu={menu} loading={false} collapsed={collapsed} onToggleOpen={() => {}} />
			</AppProviders>
		);

		return within(container);
	};

	it('renders the menu with its badges and marks the current item', () => {
		const sidebar = renderSidebar();

		const comments = sidebar.getByRole('link', { name: /Comentários/ });
		expect(comments).toHaveClass('active');
		expect(within(comments).getByText('4')).toBeInTheDocument();
	});

	it('shows only the icons when collapsed', () => {
		const sidebar = renderSidebar(true);

		expect(sidebar.queryByText('Plugins')).not.toBeInTheDocument();
		expect(sidebar.getByRole('link', { name: 'Painel' })).toBeInTheDocument();
	});

	it('pins an item to the favourites and keeps it in storage', async () => {
		const user = userEvent.setup();
		const sidebar = renderSidebar();

		const plugins = sidebar.getByRole('link', { name: /Plugins/ });
		await user.click(within(plugins).getByRole('button', { name: 'Add to favourites' }));

		await waitFor(() => expect(sidebar.getByText('Favourites')).toBeInTheDocument());
		expect(JSON.parse(window.localStorage.getItem('fd-menu-favorites') ?? '[]')).toHaveLength(1);
	});
});
