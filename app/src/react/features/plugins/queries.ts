import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';

/**
 * Plugins: what is installed, what the directory offers, and the things that can be done to
 * either — all through the routes the plugin adds, since WordPress has no REST for this.
 */

export type ActionLink = { label: string; url: string };

export type Plugin = {
	Name: string;
	PluginURI: string;
	Version: string;
	Description: string;
	Author: string;
	AuthorURI: string;
	RequiresWP?: string;
	RequiresPHP?: string;
	active: boolean;
	/** The plugin file, which is what every route identifies a plugin by */
	slug: string;
	splitSlug: string;
	has_update: boolean;
	auto_update_enabled: boolean;
	action_links?: ActionLink[];
};

export type RepoPlugin = {
	slug: string;
	name: string;
	short_description: string;
	author: string;
	version: string;
	rating?: number;
	num_ratings?: number;
	active_installs?: number;
	icons?: Record<string, string>;
	homepage?: string;
	tested?: string;
	requires?: string;
};

/**
 * The routes take the plugin file in the path, and a plugin file has a slash in it. Leaving
 * it as a slash would make the server read it as another path segment.
 */
export const pluginPath = (slug: string) => encodeURIComponent(slug);

export const usePlugins = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['plugins'],
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ plugins?: Record<string, Plugin> }>('flexify-dashboard/v1/plugins', {}, signal);

			return Object.values(result.plugins ?? {});
		},
	});
};

export const usePluginPerformance = (slug: string | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['plugin-performance', slug],
		enabled: Boolean(slug),
		retry: false,
		queryFn: ({ signal }) => rest.get<Record<string, unknown>>(`flexify-dashboard/v1/plugins/performance/${pluginPath(slug ?? '')}`, {}, signal),
	});
};

export const useRepositoryAssets = (slug: string | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['plugin-assets', slug],
		enabled: Boolean(slug),
		retry: false,
		staleTime: 3_600_000,
		queryFn: ({ signal }) => rest.get<{ icon?: string; banner?: string; rating?: number; active_installs?: number }>(`flexify-dashboard/v1/plugin/repository-assets/${slug}`, {}, signal),
	});
};

/** The WordPress.org directory, asked directly — it is public and has no nonce of ours. */
export const useRepositorySearch = (search: string, page: number) =>
	useQuery({
		queryKey: ['plugin-repo', search, page],
		enabled: search.length > 1,
		staleTime: 600_000,
		queryFn: async ({ signal }) => {
			const url = new URL('https://api.wordpress.org/plugins/info/1.2/');
			url.searchParams.set('action', 'query_plugins');
			url.searchParams.set('request[search]', search);
			url.searchParams.set('request[page]', String(page));
			url.searchParams.set('request[per_page]', '12');
			url.searchParams.set('request[fields][short_description]', '1');
			url.searchParams.set('request[fields][icons]', '1');

			const response = await fetch(url, { signal });

			if (!response.ok) {
				throw new Error(__('The plugin directory could not be reached.'));
			}

			return (await response.json()) as { plugins: RepoPlugin[]; info?: { pages?: number; results?: number } };
		},
	});

/**
 * What can be done to an installed plugin. Each one reports what happened and makes the list
 * read itself again, because any of them changes what the list says.
 */
export const usePluginActions = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => queryClient.invalidateQueries({ queryKey: ['plugins'] });

	const options = (title: string) => ({
		onSuccess: () => {
			notify({ tone: 'success', title });
			refresh();
		},
		onError: (error: Error) => notify({ tone: 'error', title: error.message }),
	});

	const activate = useMutation<unknown, Error, string>({
		mutationFn: (slug) => rest.post(`flexify-dashboard/v1/plugin/activate/${pluginPath(slug)}`),
		...options(__('Plugin activated')),
	});

	const deactivate = useMutation<unknown, Error, string>({
		mutationFn: (slug) => rest.post(`flexify-dashboard/v1/plugin/deactivate/${pluginPath(slug)}`),
		...options(__('Plugin deactivated')),
	});

	const update = useMutation<unknown, Error, string>({
		mutationFn: (slug) => rest.post(`flexify-dashboard/v1/plugin/update/${pluginPath(slug)}`),
		...options(__('Plugin updated')),
	});

	const remove = useMutation<unknown, Error, string>({
		mutationFn: (slug) => rest.remove(`flexify-dashboard/v1/plugin/delete/${pluginPath(slug)}`),
		...options(__('Plugin deleted')),
	});

	const toggleAutoUpdate = useMutation<unknown, Error, string>({
		mutationFn: (slug) => rest.post(`flexify-dashboard/v1/plugin/toggle-auto-update/${pluginPath(slug)}`),
		...options(__('Automatic updates changed')),
	});

	const installFromRepo = useMutation<unknown, Error, string>({
		mutationFn: (slug) => rest.post(`flexify-dashboard/v1/plugin/install-repo/${slug}`),
		...options(__('Plugin installed')),
	});

	return { activate, deactivate, update, remove, toggleAutoUpdate, installFromRepo, refresh };
};

export const useUploadPlugin = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, File>({
		mutationFn: (file) => {
			const body = new FormData();
			body.append('plugin_zip', file, file.name);

			return rest.post('flexify-dashboard/v1/plugin/install', body);
		},
		onSuccess: () => {
			notify({ tone: 'success', title: __('Plugin installed') });
			queryClient.invalidateQueries({ queryKey: ['plugins'] });
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});
};
