import { __ } from '@/react/lib/i18n';

/**
 * The command syntax of the palette: a prefix narrows the search to one kind of result.
 */

export const COMMAND_PATTERNS: Record<string, string> = {
	'>post': 'post',
	'>page': 'page',
	'@user': 'user',
	'#category': 'category',
	'!action': 'quickActions',
	'?help': 'help',
};

export type ParsedQuery = {
	filter: string | null;
	cleanQuery: string;
};

export const parseCommandSyntax = (query: string): ParsedQuery => {
	if (!query) {
		return { filter: null, cleanQuery: '' };
	}

	const trimmed = query.trim();

	for (const [prefix, filter] of Object.entries(COMMAND_PATTERNS)) {
		if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
			return { filter, cleanQuery: trimmed.slice(prefix.length).trim() };
		}
	}

	// A custom post type can be filtered the same way: ">produto camiseta".
	const customType = trimmed.match(/^>(\w+)\s+(.+)$/i);

	if (customType) {
		return { filter: customType[1], cleanQuery: customType[2] };
	}

	return { filter: null, cleanQuery: trimmed };
};

export const exampleSearches = () => [
	{ query: '>post', label: __('Search posts'), icon: 'description' },
	{ query: '@user', label: __('Find users'), icon: 'person' },
	{ query: '!action', label: __('Quick actions'), icon: 'bolt' },
	{ query: '?help', label: __('View commands'), icon: 'help' },
];

export const STATUS_BADGE_CLASSES: Record<string, string> = {
	publish: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
	draft: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
	pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
	private: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
	future: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
};

export const statusLabel = (status: string): string =>
	({
		publish: __('Published'),
		draft: __('Draft'),
		pending: __('Pending'),
		private: __('Private'),
		future: __('Scheduled'),
	})[status] ?? status;

/** Whether any of the given fields contains the search term. */
export const inSearch = (search: string, ...fields: (string | undefined | null)[]): boolean => {
	if (!search) {
		return true;
	}

	const term = search.toLowerCase();

	return fields.some((field) => field && field.toLowerCase().includes(term));
};
