import { useCallback, useRef } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';

/**
 * The native WordPress admin bar, moved into the shell top bar.
 *
 * It is moved rather than rebuilt so the `#wpadminbar` selectors other plugins rely on keep
 * working; only the items the shell already shows elsewhere are dropped.
 */

const REMOVED_ITEMS = ['#wp-admin-bar-my-account', '#wp-admin-bar-wp-logo', '#wp-admin-bar-site-name', '#wp-admin-bar-menu-toggle'];

const ICON_OVERRIDES: [string, string][] = [
	['wp-admin-bar-comments', 'chat'],
	['wp-admin-bar-updates', 'update'],
	['wp-admin-bar-new-content', 'library_add'],
	['wp-admin-bar-customize', 'palette'],
];

const maskRule = (url: string) => `
	content: '';
	height: 1.2rem;
	width: 1.2rem;
	min-height: 1.2rem;
	min-width: 1.2rem;
	display: block;
	line-height: 1rem;
	background-color: currentColor;
	-webkit-mask: url(${url}) no-repeat center;
	-webkit-mask-size: contain;
	mask: url(${url}) no-repeat center;
	mask-size: contain;
`;

const toolbarStyles = (pluginBase: string) => `
${ICON_OVERRIDES.map(([id, icon]) => `#${id} .ab-icon::before {${maskRule(`${pluginBase}assets/icons/${icon}.svg`)}}`).join('\n')}
#wp-admin-bar-customize, #wp-admin-bar-edit { display: flex; align-items: center; gap: 0.5rem; }
#wp-admin-bar-customize::before {${maskRule(`${pluginBase}assets/icons/palette.svg`)}}
#wp-admin-bar-edit::before {${maskRule(`${pluginBase}assets/icons/edit.svg`)}}
`;

export const WpToolbar = () => {
	const { pluginBase } = useWpData();
	const moved = useRef(false);

	const container = useCallback((node: HTMLDivElement | null) => {
		if (!node || moved.current) {
			return;
		}

		const move = () => {
			// Ignore the container itself, which carries the same id once the bar is inside it.
			const adminBar = document.body.querySelector('#wpadminbar:not(.fd-wp-admin-bar)');
			const toolbar = adminBar?.querySelector('#wp-toolbar');

			if (!adminBar || !toolbar) {
				return;
			}

			REMOVED_ITEMS.forEach((selector) => toolbar.querySelector(selector)?.remove());

			if (adminBar.parentNode !== node) {
				node.replaceChildren();
				node.appendChild(adminBar);
			}

			moved.current = true;
		};

		move();
		// Other scripts add their own items shortly after load, so the move is repeated once.
		window.setTimeout(move, 500);
	}, []);

	return (
		<>
			<style>{toolbarStyles(pluginBase)}</style>
			<div ref={container} id="fd-wpadminbar" className="fd-wp-admin-bar flex flex-row items-center gap-5 font-sans" />
		</>
	);
};
