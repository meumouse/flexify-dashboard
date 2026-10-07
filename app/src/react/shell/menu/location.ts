/**
 * Decode a URL that carries encoded characters.
 *
 * WordPress prints `admin.php?page=wc-admin&path=/analytics/overview`, while some scripts
 * encode the slash in the address bar; comparing both forms keeps the active item right.
 */
export const formatUrl = (url?: string | null): string => {
	if (!url) {
		return '';
	}

	if (url.includes('%')) {
		try {
			return decodeURIComponent(url);
		} catch {
			return url;
		}
	}

	return url;
};

let cachedLocationKey = '';
let cachedCurrentLocations: string[] = [];

const getCurrentLocationVariations = (): string[] => {
	const key = `${window.location.pathname}${window.location.search}${window.location.hash}`;

	if (key === cachedLocationKey && cachedCurrentLocations.length) {
		return cachedCurrentLocations;
	}

	const path = window.location.pathname + window.location.search;
	const pathWithHash = path + window.location.hash;

	cachedLocationKey = key;
	cachedCurrentLocations = [...new Set([window.location.href, formatUrl(window.location.href), path, formatUrl(path), pathWithHash, formatUrl(pathWithHash)])];

	return cachedCurrentLocations;
};

/**
 * Whether the current address points at this menu item, comparing encoded and decoded forms.
 */
export const isCurrentLocationMatch = (linkUrl?: string | null): boolean => {
	if (!linkUrl) {
		return false;
	}

	const currentLocations = getCurrentLocationVariations();
	const formatted = formatUrl(linkUrl);
	const variations = [...new Set([linkUrl, formatted, encodeURI(linkUrl), encodeURI(formatted)])];

	return variations.some((variation) => currentLocations.some((current) => current === variation || current.endsWith(variation)));
};
