/**
 * Dashicons the sidebar draws with the plugin's own icons instead.
 *
 * Everything else keeps the dashicon WordPress registered: the admin's own stylesheet already
 * defines the glyph for `.dashicons-admin-post:before`, and the sidebar gives its icon holder
 * that class.
 */

const ICON_BOX = `
	height: 1.2rem;
	width: 1.2rem;
	min-height: 1.2rem;
	min-width: 1.2rem;
	display: block;
	font-size: 1.2rem;
`;

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
