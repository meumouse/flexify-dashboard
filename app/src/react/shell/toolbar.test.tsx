import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/react/app/AppProviders';
import { BAR_SCRIPT_ID, WpToolbar, readBar } from '@/react/shell/WpToolbar';
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

const item = (id: string, label: string, count: number | null, children: unknown[] = []) => ({
	id,
	label,
	count,
	html: '',
	href: `/${id}`,
	target: '',
	tooltip: '',
	classes: [],
	children,
});

const BAR = {
	primary: [
		item('wp-admin-bar-updates', '2', 2),
		item('wp-admin-bar-new-content', 'Novo', null, [item('wp-admin-bar-new-post', 'Post', null)]),
	],
	secondary: [item('wp-admin-bar-my-account', 'Olá, Maria', null)],
};

const printBar = (bar: unknown = BAR) => {
	document.body.innerHTML = `<script type="application/json" id="${BAR_SCRIPT_ID}">${JSON.stringify(bar)}</script>`;
};

describe('readBar', () => {
	it('drops the items the shell already shows elsewhere', () => {
		printBar();

		expect(readBar().secondary).toEqual([]);
		expect(readBar().primary.map((entry) => entry.id)).toEqual(['wp-admin-bar-updates', 'wp-admin-bar-new-content']);
	});

	it('answers with an empty bar when the page printed none', () => {
		document.body.innerHTML = '';

		expect(readBar()).toEqual({ primary: [], secondary: [] });
	});
});

describe('WpToolbar', () => {
	it('keeps the id WordPress would have given each item, for stylesheets that target it', async () => {
		printBar();

		const { container } = render(
			<AppProviders wpData={wpData}>
				<WpToolbar />
			</AppProviders>
		);

		expect(container.querySelector('#wp-admin-bar-updates')).toBeInTheDocument();
		expect(await screen.findByText('2')).toBeInTheDocument();
	});

	it('draws no bubble for a count of zero', () => {
		printBar({ primary: [item('wp-admin-bar-comments', '0', 0)], secondary: [] });

		render(
			<AppProviders wpData={wpData}>
				<WpToolbar />
			</AppProviders>
		);

		expect(screen.queryByText('0')).not.toBeInTheDocument();
		expect(screen.getByRole('link')).toBeInTheDocument();
	});

	it('opens the children of an item as a menu', async () => {
		const user = userEvent.setup();
		printBar();

		render(
			<AppProviders wpData={wpData}>
				<WpToolbar />
			</AppProviders>
		);

		await user.click(screen.getByRole('button', { name: /Novo/ }));

		expect(await screen.findByRole('menuitem', { name: 'Post' })).toBeInTheDocument();
	});
});
