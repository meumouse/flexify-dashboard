import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/react/app/AppProviders';
import { AppSidebar } from '@/react/shell/AppSidebar';
import { processMenu } from '@/react/shell/menu/parse';
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

/** The markup WordPress prints for the admin menu, trimmed to what the parser reads. */
const ADMIN_MENU = `
<div id="adminmenumain">
	<ul id="adminmenu">
		<li class="wp-has-submenu wp-menu-open menu-top" id="menu-dashboard">
			<a href="index.php" class="wp-has-submenu wp-menu-open menu-top current">
				<div class="wp-menu-image dashicons-before dashicons-dashboard"></div>
				<div class="wp-menu-name">Painel</div>
			</a>
			<ul class="wp-submenu">
				<li class="current"><a href="index.php" class="current">Início</a></li>
				<li><a href="update-core.php">Atualizações <span class="update-count">2</span></a></li>
			</ul>
		</li>
		<li class="wp-menu-separator"><div class="separator"></div></li>
		<li class="menu-top" id="menu-comments">
			<a href="edit-comments.php" class="menu-top">
				<div class="wp-menu-image dashicons-before dashicons-admin-comments"></div>
				<div class="wp-menu-name">Comentários <span class="awaiting-mod">4</span></div>
			</a>
		</li>
		<li class="menu-top" id="menu-plugins">
			<a href="plugins.php" class="menu-top">
				<div class="wp-menu-image dashicons-before dashicons-admin-plugins"></div>
				<div class="wp-menu-name">Plugins</div>
			</a>
			<ul class="wp-submenu">
				<li><a href="plugins.php">Instalados</a></li>
				<li><a href="plugin-install.php" class="hide-if-js">Adicionar</a></li>
			</ul>
		</li>
	</ul>
</div>
`;

beforeEach(() => {
	document.body.innerHTML = ADMIN_MENU;
	window.history.replaceState({}, '', '/wp-admin/edit-comments.php');
});

afterEach(() => {
	document.body.innerHTML = '';
	window.localStorage.clear();
	vi.unstubAllGlobals();
});

describe('processMenu', () => {
	it('reads the items, the separators and the notification counts', () => {
		const { menu } = processMenu(document.getElementById('adminmenumain'));

		expect(menu.map((item) => item.type ?? item.name)).toEqual(['Painel', 'separator', 'Comentários ', 'Plugins']);
		expect(menu[2].notifications).toBe(4);
		expect(menu[0].submenu?.map((entry) => entry.name)).toEqual(['Início', 'Atualizações ']);
		expect(menu[0].submenu?.[1].notifications).toBe(2);
	});

	it('leaves out submenu entries WordPress hides from scripts', () => {
		const { menu } = processMenu(document.getElementById('adminmenumain'));

		expect(menu[3].submenu?.map((entry) => entry.name)).toEqual(['Instalados']);
	});

	it('prefers the item matching the address over the branch WordPress marked', () => {
		const { menu } = processMenu(document.getElementById('adminmenumain'));

		// WordPress printed Painel as current, but the browser is on the comments screen.
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
	// The native menu stays in the document, so every query is scoped to the sidebar.
	const renderSidebar = (collapsed = false) => {
		const { menu } = processMenu(document.getElementById('adminmenumain'));

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
