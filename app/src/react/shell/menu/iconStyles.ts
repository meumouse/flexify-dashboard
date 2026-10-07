import type { DashIcon } from '@/react/shell/menu/types';

/**
 * WordPress icons live in `:before` pseudo-elements that belong to the native stylesheet.
 * The sidebar renders its own markup, so those rules are rebuilt here for the new classes.
 */

const ICON_BOX = `
	height: 1.2rem;
	width: 1.2rem;
	min-height: 1.2rem;
	min-width: 1.2rem;
	display: block;
	font-size: 1.2rem;
`;

export const dashIconStyles = (icons: DashIcon[]): string =>
	icons
		.map((icon) => {
			// A dashicon whose content is an image belongs in the background instead.
			const isImageContent = icon.before.includes('url(');
			const background = isImageContent ? icon.before : icon.backGroundImage;
			const content = isImageContent ? '' : icon.before;

			return `${icon.class}:before {
	content: '${content}';
${ICON_BOX}	color: currentColor;
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center center;
	${icon.font ? `font-family: '${icon.font}' !important;` : ''}
	${background ? `background-image: ${background} !important; filter: contrast(0.3);` : ''}
}`;
		})
		.join('\n');

/** Dashicons replaced by the plugin icon set, so the sidebar looks like the rest of the app. */
const OVERRIDES: [string, string][] = [
	['dashboard', 'dashboard'],
	['admin-post', 'keep'],
	['admin-media', 'photo_library'],
	['admin-page', 'description'],
	['admin-comments', 'forum'],
	['admin-appearance', 'palette'],
	['admin-plugins', 'extension'],
	['admin-users', 'group'],
	['admin-tools', 'build'],
	['admin-settings', 'tune'],
	['archive', 'inventory'],
	['chart-bar', 'equalizer'],
];

export const iconOverrideStyles = (pluginBase: string): string =>
	OVERRIDES.map(
		([dashicon, icon]) => `.dashicons-${dashicon}:before {
	content: '';
${ICON_BOX}	background-color: currentColor;
	-webkit-mask: url(${pluginBase}assets/icons/${icon}.svg) no-repeat center;
	-webkit-mask-size: contain;
	mask: url(${pluginBase}assets/icons/${icon}.svg) no-repeat center;
	mask-size: contain;
}`
	).join('\n');
