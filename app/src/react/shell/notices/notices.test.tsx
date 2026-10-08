import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/react/app/AppProviders';
import { NotificationsPanel } from '@/react/shell/notices/NotificationsPanel';
import { NOTICES_SCRIPT_ID, readWpNotices } from '@/react/shell/notices/useWpNotices';
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

const printNotices = (notices: unknown) => {
	document.body.innerHTML = `<script type="application/json" id="${NOTICES_SCRIPT_ID}">${JSON.stringify(notices)}</script>`;
};

const CAPTURED = [
	{
		"id": "",
		"type": "success",
		"dismissible": true,
		"html": "<p>Configurações salvas.</p>"
	},
	{
		"id": "",
		"type": "error",
		"dismissible": false,
		"html": "<p>Algo falhou.</p>"
	},
	{
		"id": "",
		"type": "info",
		"dismissible": false,
		"html": "<p>  </p>"
	}
];

beforeEach(() => printNotices(CAPTURED));

// The body is rebuilt in beforeEach; wiping it here would run before Testing Library unmounts.
afterEach(() => vi.unstubAllGlobals());

describe('readWpNotices', () => {
	it('reads what the server captured and drops the ones with nothing to say', () => {
		const notices = readWpNotices();

		expect(notices).toHaveLength(2);
		expect(notices.map((notice) => notice.type)).toEqual(['success', 'error']);
	});

	it('answers with none when the page printed none', () => {
		document.body.innerHTML = '';

		expect(readWpNotices()).toEqual([]);
	});
});

describe('NotificationsPanel', () => {
	const renderPanel = () =>
		render(
			<AppProviders wpData={wpData}>
				<NotificationsPanel open onOpenChange={() => {}} wpNotices={[]} onDismissWpNotice={() => {}} />
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

	it("draws what WordPress printed, with the notice's own markup inside", async () => {
		stubRest();

		render(
			<AppProviders wpData={wpData}>
				<NotificationsPanel
					open
					onOpenChange={() => {}}
					wpNotices={[{ id: 'wp-1', type: 'error', dismissible: true, html: '<p>Algo falhou. <a href="/fix">Corrigir</a></p>' }]}
					onDismissWpNotice={() => {}}
				/>
			</AppProviders>
		);

		await screen.findByRole('dialog');

		expect(screen.getByText(/Algo falhou/)).toBeInTheDocument();
		// The link the plugin put in its notice is still a link.
		expect(screen.getByRole('link', { name: 'Corrigir' })).toHaveAttribute('href', '/fix');
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
