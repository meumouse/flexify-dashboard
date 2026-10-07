import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '@/react/features/login/LoginScreen';
import { errorFrom, hexToRgb, siteInfoFrom } from '@/react/features/login/useLoginScreen';

/**
 * The login screen runs for somebody who is not signed in, so what it sends and what it says
 * when the server refuses is all there is.
 */

const config = {
	ajaxUrl: 'https://site.test/wp-admin/admin-ajax.php',
	loginAjaxAction: 'flexify_dashboard_login',
	loginNonce: 'nonce-1',
	redirectTo: '/wp-admin/',
	adminUrl: '/wp-admin/',
	siteName: 'Loja de exemplo',
};

const stubFetch = (answer: unknown, ok = true) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(JSON.stringify(answer), { status: ok ? 200 : 403, headers: { 'Content-Type': 'application/json' } }))
	);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('login helpers', () => {
	it('turns a brand colour into what a CSS variable wants', () => {
		expect(hexToRgb('#008aff')).toBe('0 138 255');
		expect(hexToRgb('008aff')).toBe('0 138 255');
		expect(hexToRgb('not a colour')).toBe('0 138 255');
		expect(hexToRgb('', '1 2 3')).toBe('1 2 3');
	});

	it('falls back to what the page already knew about the site', () => {
		const info = siteInfoFrom({}, { siteName: 'Loja', asideColor: '#112233' });

		expect(info.siteName).toBe('Loja');
		expect(info.asideColor).toBe('#112233');
		expect(info.asideGradientStart).toBe('#0070e0');
	});

	it('says what the server said went wrong, wherever it put it', () => {
		expect(errorFrom({ data: { error: 'Wrong password' } }, 'fallback')).toBe('Wrong password');
		expect(errorFrom({ data: { message: 'Too many tries' } }, 'fallback')).toBe('Too many tries');
		expect(errorFrom({ message: 'Nope' }, 'fallback')).toBe('Nope');
		expect(errorFrom(null, 'fallback')).toBe('fallback');
	});
});

describe('login screen', () => {
	it('will not submit until there is something to submit', async () => {
		const user = userEvent.setup();
		stubFetch({ success: true });

		render(<LoginScreen config={config} />);

		const button = screen.getByRole('button', { name: 'Sign in' });
		expect(button).toBeDisabled();

		await user.type(screen.getByLabelText('Username or email'), 'maria');
		expect(button).toBeDisabled();

		await user.type(screen.getByLabelText('Password'), 'something');
		expect(button).toBeEnabled();
	});

	it('shows what the server said when it refuses', async () => {
		const user = userEvent.setup();
		stubFetch({ success: false, data: { error: 'Essa senha não confere.' } }, false);

		render(<LoginScreen config={config} />);

		await user.type(screen.getByLabelText('Username or email'), 'maria');
		await user.type(screen.getByLabelText('Password'), 'wrong');
		await user.click(screen.getByRole('button', { name: 'Sign in' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Essa senha não confere.');
	});

	it('switches to asking for a reset and carries the username over', async () => {
		const user = userEvent.setup();
		stubFetch({ success: true });

		render(<LoginScreen config={config} />);

		await user.type(screen.getByLabelText('Username or email'), 'maria');
		await user.click(screen.getByRole('button', { name: 'I forgot my password' }));

		await waitFor(() => expect(screen.getByLabelText('Username or email')).toHaveValue('maria'));
		expect(screen.getByRole('button', { name: 'Send the link' })).toBeInTheDocument();
	});
});
