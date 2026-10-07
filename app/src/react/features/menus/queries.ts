import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import type { MenuItem } from '@/react/shell/menu/types';
import type { RestListResult } from '@/react/types/wordpress';

/**
 * Custom admin menus. A menu is a post type whose meta holds the items and who they are for.
 */

export type MenuAudience = {
	applies_to_everyone?: boolean;
	includes?: number[];
	excludes?: number[];
	roles?: string[];
};

export type CustomMenu = {
	id: number;
	title: { rendered: string; raw?: string };
	status: string;
	modified: string;
	meta?: {
		menu_items?: MenuItem[];
		menu_settings?: MenuAudience;
	};
};

export const ENDPOINT = 'wp/v2/flexify-dashboard-menus';

export const useMenus = (params: { search: string; page: number; per_page: number }) => {
	const rest = useRest();

	return useQuery<RestListResult<CustomMenu>>({
		queryKey: ['menus', params],
		placeholderData: (previous) => previous,
		queryFn: ({ signal }) => rest.list<CustomMenu>(ENDPOINT, { context: 'edit', status: 'publish,draft', ...params }, signal),
	});
};

export const useMenu = (id: number | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['menu', id],
		enabled: Boolean(id),
		queryFn: ({ signal }) => rest.get<CustomMenu>(`${ENDPOINT}/${id}`, { context: 'edit' }, signal),
	});
};

export const useMenuMutations = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['menus'] });
		queryClient.invalidateQueries({ queryKey: ['menu'] });
	};

	const save = useMutation<CustomMenu, Error, { id?: number; data: Record<string, unknown> }>({
		mutationFn: ({ id, data }) => rest.post<CustomMenu>(id ? `${ENDPOINT}/${id}` : ENDPOINT, data, { context: 'edit' }),
		onSuccess: (_result, { id }) => {
			notify({ tone: 'success', title: id ? __('Menu saved') : __('Menu created') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const remove = useMutation<unknown, Error, number>({
		mutationFn: (id) => rest.remove(`${ENDPOINT}/${id}`, { force: true }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Menu deleted') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	/**
	 * The menu each person sees is cached under a key. Changing a menu that is already
	 * published only reaches people once that key changes.
	 */
	const flushCache = useMutation<unknown, Error, void>({
		mutationFn: () => rest.post('flexify-dashboard/v1/menu-cache/rotate'),
		onSuccess: () => notify({ tone: 'success', title: __('Everyone will see the new menu now') }),
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return { save, remove, flushCache, refresh };
};
