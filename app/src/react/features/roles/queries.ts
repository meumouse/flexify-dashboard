import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';

/**
 * Roles and what they are allowed to do.
 *
 * WordPress keeps capabilities as a flat list of names; the endpoint also groups them, which
 * is the only way a screen can show four hundred of them without being useless.
 */

export type RoleSummary = { slug: string; name: string; user_count?: number; capability_count?: number; is_default?: boolean };

export type RoleDetail = { slug: string; name: string; capabilities: string[]; user_count?: number; is_default?: boolean };

export type Capabilities = { all: string[]; grouped: Record<string, string[]> };

const BASE = 'flexify-dashboard/v1/role-editor';

export const GROUP_LABELS = (): Record<string, string> => ({
	general: __('General'),
	posts: __('Posts'),
	pages: __('Pages'),
	media: __('Media'),
	users: __('Users'),
	plugins: __('Plugins'),
	themes: __('Themes'),
	settings: __('Settings'),
	other: __('Other'),
});

export const useRoleList = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['roles'],
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ roles?: RoleSummary[] } | RoleSummary[]>('flexify-dashboard/v1/user-roles', {}, signal);

			return Array.isArray(result) ? result : (result.roles ?? []);
		},
	});
};

export const useRole = (slug: string | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['role', slug],
		enabled: Boolean(slug),
		queryFn: ({ signal }) => rest.get<RoleDetail>(`${BASE}/role/${slug}`, {}, signal),
	});
};

export const useCapabilities = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['capabilities'],
		staleTime: 300_000,
		queryFn: ({ signal }) => rest.get<Capabilities>(`${BASE}/capabilities`, {}, signal),
	});
};

export const useRoleMutations = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['roles'] });
		queryClient.invalidateQueries({ queryKey: ['role'] });
		queryClient.invalidateQueries({ queryKey: ['user-roles'] });
	};

	const saveCapabilities = useMutation<unknown, Error, { slug: string; capabilities: string[] }>({
		mutationFn: ({ slug, capabilities }) => rest.post(`${BASE}/role/${slug}`, { capabilities }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Role updated') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const rename = useMutation<unknown, Error, { slug: string; name: string }>({
		mutationFn: ({ slug, name }) => rest.post(`${BASE}/role/${slug}/name`, { name }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Role renamed') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const create = useMutation<RoleDetail, Error, { name: string; slug: string }>({
		mutationFn: ({ name, slug }) => rest.post<RoleDetail>(`${BASE}/roles`, { name, slug, capabilities: [] }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Role created') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const remove = useMutation<unknown, Error, string>({
		mutationFn: (slug) => rest.remove(`${BASE}/role/${slug}`),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Role deleted') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return { saveCapabilities, rename, create, remove, refresh };
};

/** A role's name becomes its slug the way WordPress would write it. */
export const slugify = (name: string): string =>
	name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 40);
