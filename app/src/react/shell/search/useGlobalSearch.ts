import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRest, useWpData } from '@/react/app/WpDataProvider';
import { __ } from '@/react/lib/i18n';
import { inSearch, parseCommandSyntax } from '@/react/shell/search/commands';
import type { MenuItem } from '@/react/shell/menu/types';

/**
 * Searches the site content and the admin menu at once.
 *
 * Content comes from the REST API, one request per post type the site exposes; the menu is
 * matched in memory, because it was already parsed for the sidebar.
 */

const DEBOUNCE = 300;
const PER_TYPE = 5;

export type SearchEndpoint = {
	name: string;
	slug: string;
	endpoint: string;
};

export type SearchResult = {
	id: string | number;
	name: string;
	url: string;
	status?: string;
	/** Result group: a post type, `menu`, or one of the history buckets */
	category: string;
};

type RestPost = {
	id: number;
	link?: string;
	status?: string;
	title?: { rendered?: string };
	name?: string;
	slug?: string;
};

export const useGlobalSearch = (menu: MenuItem[]) => {
	const { settings, canManageOptions, userId, adminUrl } = useWpData();
	const rest = useRest();

	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Record<string, SearchResult[]>>({});
	const [loading, setLoading] = useState(false);

	const parsed = useMemo(() => parseCommandSyntax(query), [query]);

	const endpoints = useMemo<SearchEndpoint[]>(() => {
		const postTypes = (settings as { search_post_types?: { name: string; slug: string; rest_base: string }[] }).search_post_types;

		const base: SearchEndpoint[] = Array.isArray(postTypes) && postTypes.length
			? postTypes.map((type) => ({ name: type.name, slug: type.slug, endpoint: type.rest_base }))
			: [
					{ name: __('Posts'), slug: 'post', endpoint: 'wp/v2/posts' },
					{ name: __('Pages'), slug: 'page', endpoint: 'wp/v2/pages' },
				];

		const list = [...base, { name: __('Categories'), slug: 'category', endpoint: 'wp/v2/categories' }];

		if (canManageOptions) {
			list.push({ name: __('Users'), slug: 'user', endpoint: 'wp/v2/users' });
		}

		return list;
	}, [canManageOptions, settings]);

	const categoryName = useCallback((slug: string) => endpoints.find((endpoint) => endpoint.slug === slug)?.name ?? slug, [endpoints]);

	/** Menu entries matching the query, parents prefixed to their children. */
	const menuResults = useMemo<SearchResult[]>(() => {
		const term = parsed.cleanQuery;

		if (!term) {
			return [];
		}

		const matches: SearchResult[] = [];

		menu.forEach((parent) => {
			if (parent.type === 'separator' || parent.settings?.hidden) {
				return;
			}

			const parentName = parent.settings?.name || parent.name || '';

			if (inSearch(term, parentName, parent.url)) {
				matches.push({ id: `${parent.url}-${parentName}`, url: parent.url ?? '', name: parentName, category: 'menu' });
			}

			parent.submenu?.forEach((child) => {
				const childName = child.settings?.name || child.name || '';

				if (child.settings?.hidden || !inSearch(term, childName, child.url)) {
					return;
				}

				matches.push({
					id: `${child.url}-${childName}`,
					url: child.url,
					name: `<span class="text-gray-400">${parentName} ›</span> ${childName}`,
					category: 'menu',
				});
			});
		});

		return matches;
	}, [menu, parsed.cleanQuery]);

	const timer = useRef<number>(undefined);
	const requestId = useRef(0);

	useEffect(() => {
		window.clearTimeout(timer.current);

		const term = parsed.cleanQuery;

		if (!term) {
			setResults({});
			setLoading(false);

			return;
		}

		timer.current = window.setTimeout(() => {
			const current = (requestId.current += 1);
			const filter = parsed.filter;
			const searched = filter && filter !== 'quickActions' && filter !== 'help' ? endpoints.filter((endpoint) => endpoint.slug === filter) : endpoints;

			if (!searched.length) {
				setResults({});

				return;
			}

			setLoading(true);

			Promise.all(
				searched.map((endpoint) =>
					rest
						.list<RestPost>(endpoint.endpoint, {
							search: term,
							per_page: PER_TYPE,
							context: 'view',
							// Without the capability to list others' content, only the user's own is searched.
							author: canManageOptions || endpoint.slug === 'user' || endpoint.slug === 'category' ? '' : userId,
						})
						.then((response) => ({ slug: endpoint.slug, data: response.data ?? [] }))
						.catch(() => ({ slug: endpoint.slug, data: [] as RestPost[] }))
				)
			).then((responses) => {
				if (current !== requestId.current) {
					return;
				}

				setResults(
					Object.fromEntries(
						responses.map(({ slug, data }) => [
							slug,
							data.map<SearchResult>((entry) => ({
								id: entry.id,
								name: entry.title?.rendered || entry.name || entry.slug || `#${entry.id}`,
								url: entry.link || `${adminUrl}post.php?post=${entry.id}&action=edit`,
								status: entry.status,
								category: slug,
							})),
						])
					)
				);
				setLoading(false);
			});
		}, DEBOUNCE);

		return () => window.clearTimeout(timer.current);
	}, [adminUrl, canManageOptions, endpoints, parsed.cleanQuery, parsed.filter, rest, userId]);

	/** Results grouped for display, narrowed by the command filter when there is one. */
	const grouped = useMemo<Record<string, SearchResult[]>>(() => {
		if (parsed.filter === 'quickActions' || parsed.filter === 'help') {
			return {};
		}

		const all: Record<string, SearchResult[]> = { ...results };

		if (menuResults.length) {
			all.menu = menuResults;
		}

		if (!parsed.filter) {
			return Object.fromEntries(Object.entries(all).filter(([, entries]) => entries.length));
		}

		return all[parsed.filter]?.length ? { [parsed.filter]: all[parsed.filter] } : {};
	}, [menuResults, parsed.filter, results]);

	return { query, setQuery, parsed, grouped, loading, categoryName, endpoints };
};
