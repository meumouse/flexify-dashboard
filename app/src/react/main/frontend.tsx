// The frontend bar runs on the site's own pages, where the theme's CSS is in charge.
import '@/react/lib/wp-globals';

import '@/apps/css/frontend.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/react/app/AppProviders';
import { FrontendBar } from '@/react/features/frontend/FrontendBar';

/**
 * The plugin's bar on the site itself.
 *
 * It renders inside a shadow root: on the frontend the theme's CSS is in charge of the page,
 * and a shadow root is the only way to be sure none of it reaches the bar — and that none of
 * the bar's own styles reach the theme.
 */

const STYLE_ID = 'flexify-dashboard-frontend-css';

/** Hand the plugin's own stylesheet to the shadow root, which inherits nothing. */
const adoptStyles = (root: ShadowRoot) => {
	const source = document.querySelector<HTMLStyleElement | HTMLLinkElement>(`#${STYLE_ID}`);
	const sheet = source && 'sheet' in source ? source.sheet : null;

	if (!sheet || typeof CSSStyleSheet === 'undefined') {
		return;
	}

	try {
		const adopted = new CSSStyleSheet();

		[...sheet.cssRules].forEach((rule) => adopted.insertRule(rule.cssText, adopted.cssRules.length));

		root.adoptedStyleSheets = [adopted];
	} catch {
		// A stylesheet served from another origin will not say what is in it; the bar then
		// renders unstyled rather than not at all.
	}
};

const bar = document.querySelector('#wpadminbar');

if (bar) {
	const host = document.createElement('div');
	host.id = 'fd-frontend-bar';
	bar.appendChild(host);

	const root = host.attachShadow({ mode: 'open' });
	adoptStyles(root);

	const mount = document.createElement('div');
	root.appendChild(mount);

	createRoot(mount).render(
		<StrictMode>
			<AppProviders>
				<FrontendBar />
			</AppProviders>
		</StrictMode>
	);
}
