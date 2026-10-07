import '@/apps/css/flexify-dashboard.css';

import { AppProviders } from '@/react/app/AppProviders';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { AppShell } from '@/react/shell/AppShell';

/**
 * The shell wraps every wp-admin screen, so it mounts into a node of its own at the top of the
 * body instead of replacing a page.
 */

if (document.getElementById('adminmenumain')) {
	const container = document.createElement('div');
	container.id = 'flexify-dashboard-app-wrapper';
	document.body.prepend(container);

	createRoot(container).render(
		<StrictMode>
			<AppProviders>
				<AppShell />
			</AppProviders>
		</StrictMode>
	);
}

// The inline style that hides the page until the shell is ready can go now.
document.querySelector('#fd-temporary-body-hider')?.remove();
