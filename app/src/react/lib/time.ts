/**
 * "5 minutes ago", in the browser's language, for anything that happened recently.
 *
 * Past a week a relative time stops being easier to read than the date, so `older` formats it
 * instead; each screen passes the date format it already uses.
 */
export const relativeTime = (value: string | null | undefined, older: (value: string) => string): string => {
	if (!value) {
		return '';
	}

	const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
	const abs = Math.abs(seconds);
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

	if (abs < 60) {
		return rtf.format(seconds, 'second');
	}

	if (abs < 3600) {
		return rtf.format(Math.round(seconds / 60), 'minute');
	}

	if (abs < 86400) {
		return rtf.format(Math.round(seconds / 3600), 'hour');
	}

	if (abs < 86400 * 7) {
		return rtf.format(Math.round(seconds / 86400), 'day');
	}

	return older(value);
};
