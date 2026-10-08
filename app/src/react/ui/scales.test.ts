import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { reactSourceFiles, stringLiterals, REACT_SOURCE } from '../../../tests/source-tree';

/**
 * The visual scales are part of the design system, not a per-screen choice.
 *
 * Before this test there were nine distinct border radii and two competing type scales in
 * the same interface — the raw Tailwind one and the project's tokens — because nothing
 * stopped a screen from reaching for whichever class came to mind. See AGENTS.md.
 */

/** The four radii of the design system, plus `full` for avatars and circular indicators. */
const RADII = ['sm', 'lg', 'xl', '2xl', 'full', 'none'];

/**
 * Optional side or corner, then the size: `rounded-2xl`, `rounded-t-2xl`, `rounded-tl-lg`.
 *
 * The lookbehind keeps it from starting inside another class — `fd-rounded` is a flag the
 * shell sets on `<html>`, not a radius.
 */
const RADIUS = /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?(?:-([a-z0-9]+|\[[^\]]+\]))?(?![\w-])/g;

/**
 * The raw Tailwind type scale. `text-` also spells colours (`text-gray-500`) and alignment
 * (`text-left`), so only the size words count.
 */
const RAW_TYPE = /(?<![\w-])text-(xs|sm|base|lg|xl|[2-9]xl|\[[^\]]+\])(?![\w-])/g;

/** What the raw class should have been. Kept here so a failure says what to write instead. */
const INSTEAD: Record<string, string> = {
	'text-xs': 'text-theme-xs',
	'text-sm': 'text-theme-sm',
	'text-base': 'text-theme-md',
	'text-lg': 'text-theme-lg',
	'text-xl': 'text-theme-xl',
	'text-2xl': 'text-title-xs',
	'text-3xl': 'text-title-sm',
	'text-4xl': 'text-title-md',
	'text-5xl': 'text-title-lg',
	'text-[10px]': 'text-theme-2xs',
	rounded: 'rounded-sm',
	'rounded-md': 'rounded-lg',
	'rounded-3xl': 'rounded-2xl',
};

const SHARED = join(REACT_SOURCE, '../shared');

const offenders = (match: (literal: string) => string[]) => {
	const found = new Map<string, Set<string>>();

	/*
	 * `@/shared` is scanned too: `recipes.ts` re-exports the class strings from there, so raw
	 * classes hide in a file that is not under `app/src/react` and reach every component that
	 * uses a recipe.
	 */
	[...reactSourceFiles(), ...reactSourceFiles(SHARED)].forEach(({ path, contents }) => {
		stringLiterals(contents)
			.flatMap(match)
			.forEach((className) => {
				const key = INSTEAD[className] ? `${className} (use ${INSTEAD[className]})` : className;

				found.set(key, (found.get(key) ?? new Set()).add(path));
			});
	});

	return Object.fromEntries([...found].map(([className, files]) => [className, [...files].sort()]));
};

describe('border radius', () => {
	it('only uses the four values of the scale', () => {
		expect(offenders((literal) => [...literal.matchAll(RADIUS)].filter(([, size]) => !size || !RADII.includes(size)).map(([className]) => className))).toEqual({});
	});
});

describe('type scale', () => {
	it('only uses the design system tokens', () => {
		expect(offenders((literal) => [...literal.matchAll(RAW_TYPE)].map(([className]) => className))).toEqual({});
	});
});
