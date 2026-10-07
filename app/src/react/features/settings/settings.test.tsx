import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/react/app/AppProviders';
import { SettingsScreen, isApplicable, matchesSearch } from '@/react/features/settings/SettingsScreen';
import { SAVED_ELSEWHERE } from '@/react/features/settings/queries';
import { googleFontUrl, normaliseSiteUrl } from '@/react/features/settings/custom/connections';
import type { SettingDefinition } from '@/pages/settings/src/settings-config.js';
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

const STORED = { use_classic_post_tables: false, enable_activity_logger: false, custom_css: '&lt;style&gt;' };

const stubFetch = (onWrite?: (url: string, body: unknown) => void) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (init?.method && init.method !== 'GET') {
				onWrite?.(url, init.body ? JSON.parse(String(init.body)) : null);

				return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			return new Response(JSON.stringify({ flexify_dashboard_settings: STORED }), { status: 200, headers: { 'Content-Type': 'application/json' } });
		})
	);

const renderScreen = () =>
	render(
		<AppProviders wpData={wpData}>
			<MemoryRouter>
				<SettingsScreen />
			</MemoryRouter>
		</AppProviders>
	);

const setting = (overrides: Partial<SettingDefinition> = {}): SettingDefinition => ({
	id: 'thing',
	category: 'general',
	type: 'toggle',
	label: 'A thing',
	description: 'It does something',
	...overrides,
});

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

describe('finding a setting', () => {
	it('searches the label, the description and the key', () => {
		expect(matchesSearch(setting(), 'thing')).toBe(true);
		expect(matchesSearch(setting(), 'something')).toBe(true);
		expect(matchesSearch(setting({ id: 'enable_turnstyle' }), 'turnstyle')).toBe(true);
		expect(matchesSearch(setting(), 'woocommerce')).toBe(false);
	});
});

describe('when a setting applies', () => {
	it('shows one with no condition', () => {
		expect(isApplicable(setting(), {})).toBe(true);
	});

	it('asks the condition about the settings as they are now', () => {
		const conditional = setting({ condition: (settings) => settings.style_login === true });

		expect(isApplicable(conditional, { style_login: true })).toBe(true);
		expect(isApplicable(conditional, { style_login: false })).toBe(false);
	});

	it('hides one whose condition throws rather than breaking the screen', () => {
		expect(
			isApplicable(
				setting({
					condition: () => {
						throw new Error('nope');
					},
				}),
				{}
			)
		).toBe(false);
	});
});

describe('helpers', () => {
	it('reads a site address however it was typed', () => {
		expect(normaliseSiteUrl('outro-site.com')).toBe('https://outro-site.com');
		expect(normaliseSiteUrl('https://outro-site.com/')).toBe('https://outro-site.com');
		expect(normaliseSiteUrl('  ')).toBeNull();
	});

	it('builds the stylesheet Google serves', () => {
		expect(googleFontUrl('Plus Jakarta Sans', ['700', '400'])).toContain('family=Plus+Jakarta+Sans:wght@400;700');
	});
});

describe('settings screen', () => {
	it('shows the settings of the chosen section', async () => {
		stubFetch();
		renderScreen();

		expect(await screen.findByText('Licence key')).toBeInTheDocument();
	});

	it('keeps out of the way of what other endpoints encrypt', async () => {
		const user = userEvent.setup();
		const writes: { url: string; body: unknown }[] = [];

		stubFetch((url, body) => writes.push({ url, body }));
		renderScreen();

		await screen.findByText('Licence key');
		await user.click(screen.getByRole('button', { name: /^Menu/ }));
		await user.click((await screen.findAllByRole('switch'))[0]);
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => expect(writes).toHaveLength(1));

		const saved = (writes[0].body as { flexify_dashboard_settings: Record<string, unknown> }).flexify_dashboard_settings;

		SAVED_ELSEWHERE.forEach((key) => expect(saved).not.toHaveProperty(key));
	});

	it('shows what was written in the CSS, not what WordPress stored', async () => {
		stubFetch();
		renderScreen();

		await screen.findByText('Licence key');
		await userEvent.setup().click(screen.getByRole('button', { name: /^Theme/ }));

		expect(await screen.findByRole('textbox', { name: 'Custom css' })).toHaveValue('<style>');
	});
});
