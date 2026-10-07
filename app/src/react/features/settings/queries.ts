import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { decodeHtml } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';

/**
 * The plugin's settings, which live in one WordPress option.
 */

export type Settings = Record<string, unknown>;

/**
 * Some values are written by endpoints of their own, which encrypt them. Sending them back
 * with everything else would overwrite the encrypted value with whatever the screen happens
 * to be holding — usually nothing.
 */
export const SAVED_ELSEWHERE = ['google_analytics_service_account', 'google_recaptcha_secret_key'];

export const useSettings = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['plugin-settings'],
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ flexify_dashboard_settings?: Settings }>('wp/v2/settings', {}, signal);
			const settings = { ...(result.flexify_dashboard_settings ?? {}) };

			// The CSS comes back with its angle brackets escaped, and an editor has to show
			// what was written, not what WordPress stored.
			if (typeof settings.custom_css === 'string') {
				settings.custom_css = decodeHtml(settings.custom_css);
			}

			return settings;
		},
	});
};

export const useSaveSettings = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, Settings>({
		mutationFn: (settings) => {
			const payload = { ...settings };

			SAVED_ELSEWHERE.forEach((key) => delete payload[key]);

			return rest.post('wp/v2/settings', { flexify_dashboard_settings: payload });
		},
		onSuccess: () => {
			notify({ tone: 'success', title: __('Settings saved') });
			queryClient.invalidateQueries({ queryKey: ['plugin-settings'] });
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});
};

export const useResetSettings = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, void>({
		mutationFn: () => rest.post('flexify-dashboard/v1/settings/reset'),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Settings reset') });
			queryClient.invalidateQueries({ queryKey: ['plugin-settings'] });
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});
};
