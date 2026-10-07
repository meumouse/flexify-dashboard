/**
 * Decode the HTML entities WordPress returns in titles and term names.
 */
export const decodeHtml = (value: string | null | undefined): string => {
	if (!value) {
		return '';
	}

	if (typeof document === 'undefined') {
		return value;
	}

	const textarea = document.createElement('textarea');
	textarea.innerHTML = value;

	return textarea.value;
};
