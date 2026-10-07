/**
 * Translation helpers backed by `wp.i18n`.
 *
 * The plugin loads the `flexify-dashboard` text domain for the main app handle, so the
 * translations are already in the page when a React bundle runs. Outside WordPress
 * (tests and the visual harness) the original string is returned.
 */

type WpI18n = {
	__?: (text: string, domain?: string) => string;
	_n?: (single: string, plural: string, number: number, domain?: string) => string;
	_x?: (text: string, context: string, domain?: string) => string;
	sprintf?: (format: string, ...args: unknown[]) => string;
};

const DOMAIN = 'flexify-dashboard';

const wpI18n = (): WpI18n => (typeof window !== 'undefined' ? ((window as never as { wp?: { i18n?: WpI18n } }).wp?.i18n ?? {}) : {});

/**
 * Translate a string.
 */
export const __ = (text: string, domain: string = DOMAIN): string => wpI18n().__?.(text, domain) ?? text;

/**
 * Translate a string with singular and plural forms.
 */
export const _n = (single: string, plural: string, number: number, domain: string = DOMAIN): string =>
	wpI18n()._n?.(single, plural, number, domain) ?? (number === 1 ? single : plural);

/**
 * Translate a string with context.
 */
export const _x = (text: string, context: string, domain: string = DOMAIN): string => wpI18n()._x?.(text, context, domain) ?? text;

/**
 * Fill placeholders (%s, %d and %1$s) in a translated string.
 */
export const sprintf = (format: string, ...args: unknown[]): string => {
	const native = wpI18n().sprintf;

	if (native) {
		return native(format, ...args);
	}

	let index = 0;

	return String(format).replace(/%(\d+\$)?[sd]/g, (_match, position?: string) => {
		const value = position ? args[Number.parseInt(position, 10) - 1] : args[index++];

		return value === undefined || value === null ? '' : String(value);
	});
};
