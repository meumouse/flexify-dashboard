import { useEffect } from 'react';

/**
 * Warn before the browser leaves the page while a form has unsaved changes.
 *
 * In-app navigation is confirmed by the screens themselves; this only covers closing the tab,
 * reloading and following a link out of the dashboard.
 */
export const useUnsavedChanges = (dirty: boolean): void => {
	useEffect(() => {
		if (!dirty) {
			return;
		}

		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Older browsers only show the prompt when returnValue is set.
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', onBeforeUnload);

		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	}, [dirty]);
};
