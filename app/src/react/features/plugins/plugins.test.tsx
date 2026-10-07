import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { PluginsList } from '@/react/features/plugins/PluginsList';
import { formatInstalls, isInstalled } from '@/react/features/plugins/PluginRepository';
import { pluginPath, type Plugin } from '@/react/features/plugins/queries';
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

const plugin = (name: string, file: string, folder: string, active: boolean, update = false): Plugin => ({
	Name: name,
	PluginURI: '',
	Version: '1.0.0',
	Description: `${name} does things.`,
	Author: 'Someone',
	AuthorURI: '',
	active,
	slug: file,
	splitSlug: folder,
	has_update: update,
	auto_update_enabled: false,
	action_links: [],
});

const installed = [
	plugin('WooCommerce', 'woocommerce/woocommerce.php', 'woocommerce', true),
	plugin('Yoast SEO', 'wordpress-seo/wp-seo.php', 'wordpress-seo', false, true),
];

const stubFetch = (onWrite?: (url: string, method: string) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (init?.method && init.method !== 'GET') {
				onWrite?.(url, init.method);

				return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			return new Response(JSON.stringify({ success: true, plugins: Object.fromEntries(installed.map((item) => [item.slug, item])) }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		})
	);

const renderList = () =>
	render(
		<AppProviders wpData={wpData}>
			<MemoryRouter>
				<PluginsList />
			</MemoryRouter>
		</AppProviders>
	);

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('plugin identifiers', () => {
	it('escapes the slash in a plugin file so the route sees one segment', () => {
		expect(pluginPath('woocommerce/woocommerce.php')).toBe('woocommerce%2Fwoocommerce.php');
	});

	it('recognises a directory plugin that is already installed', () => {
		expect(isInstalled('woocommerce', installed)?.Name).toBe('WooCommerce');
		expect(isInstalled('akismet', installed)).toBeUndefined();
	});

	it('writes install counts the way the directory does', () => {
		expect(formatInstalls(undefined)).toBe('—');
		expect(formatInstalls(400)).toBe('400+');
		expect(formatInstalls(60_000)).toBe('60k+');
		expect(formatInstalls(8_000_000)).toBe('8M+');
	});
});

describe('plugins screen', () => {
	it('counts what is installed, active and waiting for an update', async () => {
		stubFetch();
		renderList();

		expect(await screen.findByRole('tab', { name: 'Installed (2)' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Active (1)' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Updates (1)' })).toBeInTheDocument();
	});

	it('deactivates the plugin that is on', async () => {
		const user = userEvent.setup();
		const writes: string[] = [];

		stubFetch((url) => writes.push(url));
		renderList();

		const row = (await screen.findByText('WooCommerce')).closest('li') as HTMLElement;
		await user.click(within(row).getByRole('button', { name: 'Deactivate' }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(writes[0]).toContain('plugin/deactivate/woocommerce%2Fwoocommerce.php');
	});

	it('offers an update only to the plugin that has one', async () => {
		stubFetch();
		renderList();

		const woo = (await screen.findByText('WooCommerce')).closest('li') as HTMLElement;
		const yoast = screen.getByText('Yoast SEO').closest('li') as HTMLElement;

		expect(within(woo).queryByRole('button', { name: 'Update' })).toBeNull();
		expect(within(yoast).getByRole('button', { name: 'Update' })).toBeInTheDocument();
	});
});
