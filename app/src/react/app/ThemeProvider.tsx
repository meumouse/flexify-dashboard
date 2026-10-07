import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Dark mode follows the `dark` class the plugin toggles on `<body>`, so React pages stay
 * in sync with the Vue shell and with the theme script that runs on every admin screen.
 */

const ThemeContext = createContext(false);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [isDark, setIsDark] = useState(() => (typeof document === 'undefined' ? false : document.body.classList.contains('dark')));

	useEffect(() => {
		// The initial value comes from the first render; only react to later changes.
		const update = () => setIsDark((current) => (current === document.body.classList.contains('dark') ? current : !current));

		const observer = new MutationObserver(update);
		observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

		return () => observer.disconnect();
	}, []);

	return <ThemeContext.Provider value={isDark}>{children}</ThemeContext.Provider>;
};

/** True when the admin is in dark mode. */
export const useIsDark = (): boolean => useContext(ThemeContext);
