/**
 * The colour scale generator, shared with the Vue settings screen.
 *
 * It turns one colour into the twelve steps the theme is built from; the arithmetic belongs
 * to neither framework.
 */
declare module '@/shared/settings/generateColorScheme.js' {
	export function generateColorScheme(hex: string): Record<string, string>;
}
