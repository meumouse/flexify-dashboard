import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import type { RestListResult } from '@/react/types/wordpress';

/**
 * The people with an account on the site, through the core REST routes, plus the role list
 * the plugin publishes because core does not.
 */

export type User = {
	id: number;
	name: string;
	slug: string;
	email: string;
	url: string;
	description: string;
	link: string;
	roles: string[];
	registered_date: string;
	avatar_urls?: Record<string, string>;
	meta?: Record<string, unknown>;
};

export type Role = { slug: string; name: string; count?: number };

export type UsersParams = {
	role: string;
	search: string;
	page: number;
	per_page: number;
	orderby: string;
	order: string;
};

export const useUsers = (params: UsersParams) => {
	const rest = useRest();

	return useQuery<RestListResult<User>>({
		queryKey: ['users', params],
		placeholderData: (previous) => previous,
		queryFn: ({ signal }) =>
			rest.list<User>(
				'wp/v2/users',
				{
					context: 'edit',
					page: params.page,
					per_page: params.per_page,
					search: params.search,
					order: params.order,
					orderby: params.orderby,
					roles: params.role === 'all' ? undefined : params.role,
				},
				signal
			),
	});
};

export const useRoles = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['user-roles'],
		staleTime: 300_000,
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ roles?: Record<string, { name: string }> | Role[] } | Role[]>('flexify-dashboard/v1/user-roles', {}, signal);
			const roles = Array.isArray(result) ? result : (result.roles ?? []);

			// The endpoint answers with a map on some versions and a list on others.
			return Array.isArray(roles) ? roles : Object.entries(roles).map(([slug, role]) => ({ slug, name: role.name }));
		},
	});
};

export const useUser = (id: number | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['user', id],
		enabled: Boolean(id),
		queryFn: ({ signal }) => rest.get<User>(`wp/v2/users/${id}`, { context: 'edit' }, signal),
	});
};

export const useUserMutations = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['users'] });
		queryClient.invalidateQueries({ queryKey: ['user'] });
	};

	const create = useMutation<User, Error, Record<string, unknown>>({
		mutationFn: (data) => rest.post<User>('wp/v2/users', data, { context: 'edit' }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('User created') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const save = useMutation<User, Error, { id: number; data: Record<string, unknown>; message?: string }>({
		mutationFn: ({ id, data }) => rest.post<User>(`wp/v2/users/${id}`, data, { context: 'edit' }),
		onSuccess: (_result, { message }) => {
			notify({ tone: 'success', title: message ?? __('User updated') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const bulk = useMutation<number, Error, { ids: number[]; message: string; action: (id: number) => Promise<unknown> }>({
		mutationFn: async ({ ids, action }) => {
			let failed = 0;

			for (const id of ids) {
				try {
					await action(id);
				} catch {
					failed += 1;
				}
			}

			return failed;
		},
		onSuccess: (failed, { message }) => {
			notify(failed ? { tone: 'error', title: __('Some users could not be updated.') } : { tone: 'success', title: message });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return {
		create,
		save,
		bulk,
		/**
		 * Deleting a user asks what becomes of what they wrote. `reassign` hands it to someone
		 * else; without it WordPress refuses rather than quietly deleting their posts too.
		 */
		remove: (reassign: number | null) => (id: number) =>
			rest.remove(`wp/v2/users/${id}`, reassign ? { force: true, reassign } : { force: true, reassign: false }),
		refresh,
	};
};
