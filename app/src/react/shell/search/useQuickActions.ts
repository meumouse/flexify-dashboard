import { useMemo } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { __ } from '@/react/lib/i18n';
import { inSearch } from '@/react/shell/search/commands';
import { useColorScheme } from '@/react/shell/useColorScheme';

/**
 * Things the palette can do, as opposed to things it can find.
 */

export type QuickAction = {
	id: string;
	name: string;
	icon: string;
	run: () => void;
};

export const useQuickActions = () => {
	const { adminUrl, siteUrl, userRoles } = useWpData();
	const { isDark, setColorScheme, globalOverride } = useColorScheme();

	const actions = useMemo<QuickAction[]>(() => {
		const go = (url: string) => () => {
			window.location.href = url;
		};

		const list: QuickAction[] = [
			{ id: 'new-post', name: __('New Post'), icon: 'add', run: go(`${adminUrl}post-new.php`) },
			{ id: 'new-page', name: __('New Page'), icon: 'add', run: go(`${adminUrl}post-new.php?post_type=page`) },
			{ id: 'view-dashboard', name: __('View dashboard'), icon: 'equalizer', run: go(adminUrl) },
			{ id: 'view-site', name: __('View site'), icon: 'home', run: go(siteUrl) },
		];

		if (userRoles.includes('administrator')) {
			list.push({ id: 'site-settings', name: __('Site settings'), icon: 'tune', run: go(`${adminUrl}options-general.php`) });
		}

		// With a theme forced for everyone, offering to switch it would do nothing.
		if (!globalOverride) {
			list.push(
				isDark
					? { id: 'light-mode', name: __('Light mode'), icon: 'light_mode', run: () => setColorScheme('light') }
					: { id: 'dark-mode', name: __('Dark mode'), icon: 'dark_mode', run: () => setColorScheme('dark') }
			);
		}

		return list;
	}, [adminUrl, globalOverride, isDark, setColorScheme, siteUrl, userRoles]);

	const filterActions = (query: string, commandFilter: string | null): QuickAction[] => {
		if (commandFilter === 'quickActions' || commandFilter === 'help') {
			return actions;
		}

		if (commandFilter) {
			return [];
		}

		return query ? actions.filter((action) => inSearch(query, action.name)) : actions;
	};

	return { actions, filterActions };
};
