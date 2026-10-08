import { describe, expect, it } from 'vitest';
import { reactSourceFiles, stringLiterals } from '../../../tests/source-tree';

/**
 * Raw HTML controls belong to the kit, not to a screen.
 *
 * A native control carries the browser's own look, which is a different one on every
 * platform, and none of the states the design system draws. Wrapped in a component it is
 * styled once and every screen gets the same thing. See AGENTS.md.
 *
 * `app/src/react/form` is where the native element is allowed to live — that is the point of
 * the kit — so it is the one directory this test skips.
 */

const FORBIDDEN = /<(select)\b|<input\b[^>]*type=(?:"|{')(checkbox|radio|range|color|file)(?:"|'})/g;

/** Where the control should have come from instead. Kept here so a failure says what to use. */
const INSTEAD: Record<string, string> = {
	select: 'Select',
	checkbox: 'Checkbox',
	radio: 'Radio',
	range: 'Slider',
	color: 'ColorPicker',
	file: 'useFilePicker',
};

describe('raw controls', () => {
	it('only appear inside the kit', () => {
		const found = new Map<string, Set<string>>();

		reactSourceFiles().forEach(({ path, contents }) => {
			if (path.startsWith('form/')) {
				return;
			}

			[...contents.matchAll(FORBIDDEN)].forEach(([, tag, type]) => {
				const control = tag ?? type;
				const key = `${control} (use ${INSTEAD[control]})`;

				found.set(key, (found.get(key) ?? new Set()).add(path));
			});
		});

		expect(Object.fromEntries([...found].map(([control, files]) => [control, [...files].sort()]))).toEqual({});
	});
});

/**
 * The same rule, read from the other side: nothing outside the kit should be reaching for a
 * native control through a class either, which is how the first version of these screens
 * styled checkboxes.
 */
describe('native control styling', () => {
	it('does not appear outside the kit', () => {
		const found = new Map<string, Set<string>>();

		reactSourceFiles().forEach(({ path, contents }) => {
			if (path.startsWith('form/')) {
				return;
			}

			stringLiterals(contents).forEach((literal) => {
				[...literal.matchAll(/\baccent-[a-z]+-\d+\b/g)].forEach(([className]) => {
					found.set(className, (found.get(className) ?? new Set()).add(path));
				});
			});
		});

		expect(Object.fromEntries([...found].map(([className, files]) => [className, [...files].sort()]))).toEqual({});
	});
});
