import { useMemo, useState } from 'react';

/**
 * The notices WordPress and the site's plugins printed on this screen.
 *
 * They used to be left where WordPress put them, hidden, and then moved node by node into the
 * panel. Now the plugin captures the `admin_notices` actions on the server and prints the
 * result as JSON, so the panel draws them like anything else it shows.
 */

export const NOTICES_SCRIPT_ID = 'fd-admin-notices';

export type WpNotice = {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	dismissible: boolean;
	/** The notice's own markup, minus the wrapper, which is ours now. */
	html: string;
};

export const readWpNotices = (root: Document = document): WpNotice[] => {
	const script = root.getElementById(NOTICES_SCRIPT_ID);

	if (!script?.textContent) {
		return [];
	}

	try {
		const notices = JSON.parse(script.textContent) as WpNotice[];

		// An action can fire with nothing to say, and a notice with no text is not one.
		return notices.filter((notice) => notice.html.replace(/<[^>]*>/g, '').trim() !== '');
	} catch {
		return [];
	}
};

export const useWpNotices = () => {
	const [dismissed, setDismissed] = useState<string[]>([]);
	const all = useMemo(() => readWpNotices(), []);
	const notices = all.filter((notice) => !dismissed.includes(notice.id));

	return {
		notices,
		count: notices.length,
		dismiss: (id: string) => setDismissed((current) => [...current, id]),
	};
};
