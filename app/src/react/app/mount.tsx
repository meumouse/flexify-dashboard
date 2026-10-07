import { StrictMode, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AppProviders } from '@/react/app/AppProviders';

/**
 * Mount a React screen inside the admin page.
 *
 * Returns the root so the harness (and future hot reloads) can unmount it again.
 */
export const mountApp = (mountId: string, children: ReactNode, pageScript?: string): Root | null => {
	const container = document.getElementById(mountId);

	if (!container) {
		return null;
	}

	const root = createRoot(container);

	root.render(
		<StrictMode>
			<AppProviders pageScript={pageScript}>{children}</AppProviders>
		</StrictMode>
	);

	return root;
};
