import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/react/app/AppProviders';
import { NotificationsPanel } from '@/react/shell/notices/NotificationsPanel';
import { useWpNotices } from '@/react/shell/notices/useWpNotices';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: 'https://site.test/plugin/',
	restBase: 'https://site.test/wp-json/',
	restNonce: '',
	adminUrl: 'https://site.test/wp-admin/',
	loginUrl: '',
	siteUrl: 'https://site.test/',
	userId: 7,
	userName: 'Maria',
	userEmail: '',
	userRoles: ['editor'],
	canManageOptions: false,
	currentUser: null,
	settings: {},
	page: {},
};

const NOTICES = [
	{ id: 1, title: { rendered: 'Manutenção' }, content: { rendered: '<p>O site será atualizado hoje.</p>' }, meta: { type: 'warning', roles: [], seen_by: [] } },
	{ id: 2, title: { rendered: 'Só para admins' }, content: { rendered: '<p>Oi</p>' }, meta: { type: 'info', roles: [{ type: 'role', value: 'administrator' }], seen_by: [] } },
	{ id: 3, title: { rendered: 'Já lida' }, content: { rendered: '<p>Oi</p>' }, meta: { type: 'info', roles: [], seen_by: [7] } },
];

const stubRest = () => {
	const calls: { url: string; body: unknown }[] = [];

	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			calls.push({ url: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : null });

			const body = url.pathname.includes('notices/seen') ? { seen_by: [7] } : NOTICES;

			return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
		})
	);

	return calls;
};

/**
 * Probe that exposes what the hook decided about the notices WordPress printed.
 *
 * The holder only exists while the panel is open, which is what decides whether the notices
 * stay hidden on the page or move into it.
 */
const WpNoticesProbe = ({ panelOpen = false }: { panelOpen?: boolean }) => {
	const { count, attach } = useWpNotices();

	return (
		<div>
			<span data-testid="count">{count}</span>
			{panelOpen ? <div data-testid="holder" ref={attach} /> : null}
		</div>
	);
};

beforeEach(() => {
	document.body.innerHTML = `
		<div id="wpbody-content">
			<div class="notice notice-success"><p>Configurações salvas.</p></div>
			<div class="notice notice-error"><p>Algo falhou.</p></div>
			<div class="notice notice-info hidden"><p>Escondida pelo WordPress.</p></div>
			<div class="notice" id="setting-error-settings_updated"><p>Ignorada.</p></div>
		</div>
	`;
});

// The body is rebuilt in beforeEach; wiping it here would run before Testing Library unmounts.
afterEach(() => vi.unstubAllGlobals());

describe('useWpNotices', () => {
	it('counts only the notices that carry a message and hides them in place', () => {
		render(<WpNoticesProbe />);

		expect(screen.getByTestId('count')).toHaveTextContent('2');
		expect(document.querySelector<HTMLElement>('.notice-success')?.style.display).toBe('none');
	});

	it('moves the notices into the panel instead of copying them', () => {
		render(<WpNoticesProbe panelOpen />);

		const holder = screen.getByTestId('holder');
		expect(holder.querySelectorAll('.notice')).toHaveLength(2);
		// The originals are gone from the page, markup and listeners intact in their new home.
		expect(document.querySelectorAll('#wpbody-content .notice')).toHaveLength(2);
		expect(holder.querySelector<HTMLElement>('.notice-success')?.style.display).toBe('');
	});
});

describe('NotificationsPanel', () => {
	const renderPanel = () =>
		render(
			<AppProviders wpData={wpData}>
				<NotificationsPanel open onOpenChange={() => {}} attachWpNotices={() => {}} wpCount={0} />
			</AppProviders>
		);

	it('shows only the notices meant for this user', async () => {
		stubRest();
		renderPanel();

		expect(await screen.findByText('Manutenção')).toBeInTheDocument();
		// Targeted at a role the user does not have, and one already dismissed.
		expect(screen.queryByText('Só para admins')).not.toBeInTheDocument();
		expect(screen.queryByText('Já lida')).not.toBeInTheDocument();
	});

	it('dismisses a notice for this user only', async () => {
		const user = userEvent.setup();
		const calls = stubRest();
		renderPanel();

		await user.click(await screen.findByRole('button', { name: 'Dismiss' }));

		await waitFor(() => expect(screen.queryByText('Manutenção')).not.toBeInTheDocument());
		expect(calls.find((call) => call.url.includes('notices/seen'))?.body).toEqual({ notice_id: 1 });
	});
});
