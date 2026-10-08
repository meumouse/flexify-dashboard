import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Join class names, letting a later one win over an earlier one that sets the same thing.
 *
 * tailwind-merge is told about the design system's own scales, or it reads `text-theme-sm` as
 * a text colour and drops the colour that was meant to apply.
 */
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			text: ['title-2xl', 'title-xl', 'title-lg', 'title-md', 'title-sm', 'title-xs', 'theme-xl', 'theme-lg', 'theme-md', 'theme-sm', 'theme-xs', 'theme-2xs'],
			shadow: ['theme-xs', 'theme-sm', 'theme-md', 'theme-lg', 'theme-xl', 'focus-ring', 'slider-navigation', 'tooltip', 'datepicker'],
			breakpoint: ['2xsm', 'xsm', '3xl'],
		},
	},
});

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
