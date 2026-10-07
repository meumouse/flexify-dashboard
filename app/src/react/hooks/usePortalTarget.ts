import { useEffect, useState } from 'react';
import { PORTAL_ID } from '@/react/app/PageShell';

/**
 * Overlays render inside the isolated container so they inherit the plugin styles
 * instead of the admin ones. Falls back to the body when the page has no shell.
 */
export const usePortalTarget = (): HTMLElement | undefined => {
	const [target, setTarget] = useState<HTMLElement | undefined>(undefined);

	useEffect(() => {
		setTarget(document.getElementById(PORTAL_ID) ?? undefined);
	}, []);

	return target;
};
