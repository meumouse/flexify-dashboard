import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQuery } from '@tanstack/react-query';
import { AppProviders } from '@/react/app/AppProviders';
import { PageShell, PORTAL_ID } from '@/react/app/PageShell';
import { useNotify } from '@/react/app/ToastProvider';
import { useCan, useRest, useWpData } from '@/react/app/WpDataProvider';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: 'https://site.test/plugin/',
	restBase: 'https://site.test/wp-json/',
	restNonce: 'nonce123',
	adminUrl: 'https://site.test/wp-admin/',
	loginUrl: '',
	siteUrl: 'https://site.test/',
	userId: 7,
	userName: 'Maria',
	userEmail: 'maria@example.com',
	userRoles: ['administrator'],
	canManageOptions: true,
	currentUser: { id: 7, allcaps: { edit_shop_orders: true } },
	settings: {},
	page: { woocommerce: { active: true } },
};

afterEach(() => vi.unstubAllGlobals());

// Reset before rendering so the theme observer of the previous test is already unmounted.
beforeEach(() => {
	document.body.className = '';
});

const Probe = () => {
	const wp = useWpData();
	const can = useCan();

	return (
		<div>
			<span>{wp.userName}</span>
			<span>{can('edit_shop_orders') ? 'pode editar' : 'sem permissão'}</span>
			<span>{can('manage_network') ? 'rede' : 'sem rede'}</span>
		</div>
	);
};

describe('AppProviders', () => {
	it('exposes WordPress data and capabilities', () => {
		render(
			<AppProviders wpData={wpData}>
				<Probe />
			</AppProviders>
		);

		expect(screen.getByText('Maria')).toBeInTheDocument();
		expect(screen.getByText('pode editar')).toBeInTheDocument();
		expect(screen.getByText('sem rede')).toBeInTheDocument();
	});

	it('runs queries through the REST client and reports failures as toasts', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Falhou' }), { status: 500, headers: { 'Content-Type': 'application/json' } }))
		);

		const Failing = () => {
			const rest = useRest();
			const query = useQuery({ queryKey: ['boom'], queryFn: () => rest.get('wc/v3/orders'), retry: false });

			return <span>{query.isError ? 'erro' : 'carregando'}</span>;
		};

		render(
			<AppProviders wpData={wpData}>
				<Failing />
			</AppProviders>
		);

		await waitFor(() => expect(screen.getByText('erro')).toBeInTheDocument());
		expect(await screen.findByText('Falhou')).toBeInTheDocument();
	});

	it('shows and dismisses toasts', async () => {
		const user = userEvent.setup();

		const Notifier = () => {
			const { notify } = useNotify();

			return (
				<button type="button" onClick={() => notify({ tone: 'success', title: 'Salvo' })}>
					notificar
				</button>
			);
		};

		render(
			<AppProviders wpData={wpData}>
				<Notifier />
			</AppProviders>
		);

		await user.click(screen.getByRole('button', { name: 'notificar' }));
		expect(await screen.findByText('Salvo')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Dismiss' }));
		await waitFor(() => expect(screen.queryByText('Salvo')).not.toBeInTheDocument());
	});
});

describe('PageShell', () => {
	it('keeps the isolation wrapper, the portal target and follows dark mode', async () => {
		document.body.classList.add('dark');

		const { container } = render(
			<AppProviders wpData={wpData}>
				<PageShell>
					<p>conteúdo</p>
				</PageShell>
			</AppProviders>
		);

		expect(container.querySelector('.flexify-dashboard-isolation')).toBeTruthy();
		expect(container.querySelector(`#${PORTAL_ID}`)).toBeTruthy();
		await waitFor(() => expect(container.querySelector('.font-sans')?.classList.contains('dark')).toBe(true));
	});
});
