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

/**
 * Drop the markup WordPress wraps around a value, keeping the words.
 *
 * Column labels and row actions arrive as rendered HTML; where only the text is wanted this
 * gives it without handing the markup to the browser as markup.
 */
export const stripTags = (value: string | null | undefined): string => (value ?? '').replace(/<[^>]*>/g, '');
