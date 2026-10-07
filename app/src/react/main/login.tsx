import '@/apps/css/login.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LoginScreen } from '@/react/features/login/LoginScreen';
import type { LoginConfig } from '@/react/features/login/useLoginScreen';

/**
 * The login screen stands on its own: nobody is signed in, so there is no REST nonce, no
 * admin data and none of the providers the admin screens share.
 *
 * WordPress's own form is in the page as a fallback and is revealed if this never mounts.
 */

const mount = document.querySelector('#fd-login-app');
const fallback = document.querySelector<HTMLElement>('#flexify-dashboard-login-fallback');
const REVEAL_AFTER = 3000;

const showFallback = () => {
	document.body.classList.remove('fd-modern-login-pending', 'fd-modern-login-mounted');

	if (fallback) {
		fallback.hidden = false;
	}
};

if (!mount) {
	showFallback();
} else {
	const reveal = window.setTimeout(showFallback, REVEAL_AFTER);

	try {
		const config = ((window as unknown as { flexifyDashboardLoginConfig?: LoginConfig }).flexifyDashboardLoginConfig ?? {}) as LoginConfig;

		createRoot(mount).render(
			<StrictMode>
				<LoginScreen config={config} />
			</StrictMode>
		);

		window.clearTimeout(reveal);
		document.body.classList.remove('fd-modern-login-pending');
		document.body.classList.add('fd-modern-login-mounted');

		if (fallback) {
			fallback.hidden = true;
		}
	} catch (error) {
		window.clearTimeout(reveal);
		showFallback();
		console.error('Flexify Dashboard login mount failed.', error);
	}
}
