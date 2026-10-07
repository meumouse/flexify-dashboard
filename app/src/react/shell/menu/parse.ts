import { isCurrentLocationMatch } from '@/react/shell/menu/location';
import type { DashIcon, MenuItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * Read the WordPress admin menu out of the DOM.
 *
 * WordPress prints the menu as markup, not as data, so the sidebar is built by walking
 * `#adminmenu`: links, names, notification bubbles and the icons, which live in `:before`
 * pseudo-elements that have to be copied into the new stylesheet.
 */

/** First number found inside an element, which is how WordPress prints its bubbles. */
export const extractNumberFromHtml = (node: Element | null): number | null => {
	if (!node) {
		return null;
	}

	for (const child of node.getElementsByTagName('*')) {
		const value = child.textContent?.trim() ?? '';

		if (value !== '' && !Number.isNaN(Number(value))) {
			return Number.parseInt(value, 10);
		}
	}

	return null;
};

export const getDashiconClass = (element: Element): string | null => {
	for (const className of element.classList) {
		if (className.startsWith('dashicons-') && className !== 'dashicons-before') {
			return className;
		}
	}

	return null;
};

/** Content and font of the `:before` pseudo-element, where dashicons keep their glyph. */
export const getBeforeContent = (element: Element): { content: string; font: string; backGroundImage: string | false } => {
	const styles = window.getComputedStyle(element, ':before');
	const rawContent = styles.getPropertyValue('content');
	const backgroundImage = styles.getPropertyValue('background-image');

	return {
		content: (rawContent === 'none' ? '' : rawContent).replace(/^["']|["']$/g, ''),
		font: styles.getPropertyValue('font-family'),
		backGroundImage: backgroundImage !== 'none' ? backgroundImage : false,
	};
};

const processSubmenu = (item: Element): SubMenuItem[] => {
	const entries: SubMenuItem[] = [];
	const parentId = item.getAttribute('id') ?? '';

	item.querySelectorAll(':scope .wp-submenu > li').forEach((li) => {
		const link = li.querySelector(':scope > a');

		if (!link || link.classList.contains('hide-if-js')) {
			return;
		}

		const url = link.getAttribute('href') ?? '';
		const name = link.innerHTML;
		const [firstPart] = name.split('<');

		entries.push({
			name: firstPart !== '' ? firstPart : name,
			url,
			target: link.getAttribute('target'),
			// Direct location matching and precedence happen below, over the whole menu.
			active: link.classList.contains('current') || li.classList.contains('current'),
			id: `${parentId}-${url}`,
			notifications: extractNumberFromHtml(link),
			sub_id: link.getAttribute('id'),
		});
	});

	return entries;
};

export type ParsedMenu = {
	menu: MenuItem[];
	dashIcons: DashIcon[];
};

export const processMenu = (root: Element | null): ParsedMenu => {
	const menuNode = root?.querySelector('#adminmenu') ?? null;

	if (!menuNode) {
		return { menu: [], dashIcons: [] };
	}

	const items: MenuItem[] = [];
	const dashIcons: DashIcon[] = [];

	for (const item of menuNode.children) {
		if (item.classList.contains('wp-menu-separator')) {
			items.push({ type: 'separator', id: `separator-${items.filter((entry) => entry.type === 'separator').length}` });
			continue;
		}

		const link = item.querySelector(':scope > a');
		const nameNode = item.querySelector(':scope .wp-menu-name');
		const image = item.querySelector(':scope .wp-menu-image');

		if (!link || !nameNode || !image) {
			continue;
		}

		const id = item.getAttribute('id') ?? '';
		const name = nameNode.innerHTML;
		const [firstPart] = name.split('<');
		const classes = [...image.classList];
		const imageIcon = image.querySelector(':scope img');
		const imageSrc = imageIcon?.getAttribute('src');

		const { content, font, backGroundImage } = getBeforeContent(image);
		const dashClass = getDashiconClass(image);

		if (dashClass) {
			dashIcons.push({ class: `.${dashClass}`, before: content, font, backGroundImage });
		} else if (backGroundImage || content) {
			dashIcons.push({ class: `#${id} .wp-menu-image`, before: content, font, backGroundImage });
		}

		items.push({
			id,
			url: link.getAttribute('href') ?? '',
			target: link.getAttribute('target'),
			name: firstPart !== '' ? firstPart : name,
			notifications: extractNumberFromHtml(nameNode),
			imageClasses: classes,
			iconStyles: imageSrc ? `background-image: url("${imageSrc}");height:1.2rem;background-size:contain;` : classes.includes('svg') ? (image.getAttribute('style') ?? '') : '',
			submenu: processSubmenu(item),
			active: link.classList.contains('current') || link.getAttribute('aria-current') === 'page' || item.classList.contains('wp-menu-open'),
		});
	}

	return { menu: applyDirectMatches(items), dashIcons };
};

/**
 * WordPress marks a whole branch as current; an exact URL match is a better answer, so when one
 * exists it wins and every other item is turned off.
 */
export const applyDirectMatches = (items: MenuItem[]): MenuItem[] => {
	const result = items.map((item) => ({ ...item, submenu: item.submenu ? item.submenu.map((entry) => ({ ...entry })) : undefined }));

	let matchedIndex = -1;

	for (let index = 0; index < result.length && matchedIndex === -1; index += 1) {
		const item = result[index];

		if (item.type === 'separator' || !Array.isArray(item.submenu)) {
			continue;
		}

		const match = item.submenu.findIndex((entry) => isCurrentLocationMatch(entry.url));

		if (match > -1) {
			item.submenu.forEach((entry, entryIndex) => {
				entry.active = entryIndex === match;
				entry.directMatch = entryIndex === match;
			});
			item.active = true;
			item.directMatch = true;
			matchedIndex = index;
		}
	}

	if (matchedIndex === -1) {
		matchedIndex = result.findIndex((item) => item.type !== 'separator' && item.url && isCurrentLocationMatch(item.url));

		if (matchedIndex > -1) {
			result[matchedIndex].active = true;
			result[matchedIndex].directMatch = true;
		}
	}

	if (matchedIndex > -1) {
		result.forEach((item, index) => {
			if (index === matchedIndex || item.type === 'separator' || item.directMatch) {
				return;
			}

			item.active = false;
			item.submenu?.forEach((entry) => {
				if (!entry.directMatch) {
					entry.active = false;
				}
			});
		});
	}

	return result;
};

/** Whether a menu item points at the page being shown. */
export const isItemActive = (item: MenuItem | SubMenuItem): boolean => {
	if (item.url && isCurrentLocationMatch(item.url)) {
		return true;
	}

	if (item.active) {
		return true;
	}

	const submenu = (item as MenuItem).submenu;

	return Boolean(submenu?.some((entry) => (entry.url && isCurrentLocationMatch(entry.url)) || entry.active));
};
