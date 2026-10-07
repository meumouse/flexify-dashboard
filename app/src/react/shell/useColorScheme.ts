import { useCallback, useEffect, useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';

/**
 * Dark mode preference.
 *
 * Shares the storage key and the `flexify-dashboard-theme-update` event with the Vue shell, so
 * a page still running Vue follows the theme the React shell sets, and the other way round.
 */

const STORAGE_KEY = 'uipc_theme';
const EVENT = 'flexify-dashboard-theme-update';

export type ColorScheme = 'light' | 'dark' | 'system';

const readPreference = (): ColorScheme => {
	const stored = window.localStorage.getItem(STORAGE_KEY);

	return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
};

const systemPrefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export const useColorScheme = () => {
	const { settings } = useWpData();
	const forced = (settings as { force_global_theme?: string }).force_global_theme;
	// The site can pin every user to one theme; "off" and an empty value mean it does not.
	const globalOverride = forced && forced !== 'off' ? forced : null;

	const [preference, setPreference] = useState<ColorScheme>(readPreference);
	const [systemDark, setSystemDark] = useState(systemPrefersDark);

	useEffect(() => {
		const query = window.matchMedia?.('(prefers-color-scheme: dark)');
		const onChange = () => setSystemDark(systemPrefersDark());

		query?.addEventListener('change', onChange);

		const onThemeEvent = (event: Event) => {
			const detail = (event as CustomEvent<ColorScheme>).detail;

			if (detail) {
				setPreference(detail);
			}
		};

		document.addEventListener(EVENT, onThemeEvent);

		return () => {
			query?.removeEventListener('change', onChange);
			document.removeEventListener(EVENT, onThemeEvent);
		};
	}, []);

	const isDark = globalOverride ? globalOverride === 'dark' : preference === 'dark' || (preference === 'system' && systemDark);

	const setColorScheme = useCallback((next: ColorScheme) => {
		setPreference(next);

		try {
			window.localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// The choice then lasts for this visit only.
		}

		document.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
	}, []);

	return { isDark, preference, setColorScheme, globalOverride };
};
