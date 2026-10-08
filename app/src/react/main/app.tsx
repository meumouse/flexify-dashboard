import '@/apps/css/flexify-dashboard.css';

import { AppProviders } from '@/react/app/AppProviders';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { AppShell } from '@/react/shell/AppShell';
import { MENU_SCRIPT_ID } from '@/react/shell/menu/read';

/**
 * The shell wraps every wp-admin screen, so it mounts into a node of its own at the top of the
 * body instead of replacing a page.
 *
 * The menu the plugin prints is what says this is one of those screens. The module runs after
 * the document is parsed, so the tag is always there by now.
 */

if (document.getElementById(MENU_SCRIPT_ID)) {
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
