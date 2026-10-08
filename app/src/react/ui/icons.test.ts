import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reactSourceFiles } from '../../../tests/source-tree';

/**
 * Every icon name the screens ask for has to exist in `assets/icons`.
 *
 * `Icon` builds a CSS mask from the name, so a name with no file behind it draws an empty
 * square — on screen, not in the console, and only on whichever screen happens to use it.
 * Ten of them had got in that way before this test existed.
 */

const ICONS = join(__dirname, '../../../../assets/icons');

/**
 * The names passed as `icon="…"` or `name="…"`, which is how every call site spells it.
 * Names built at runtime are not caught here and are not meant to be.
 */
const iconNames = (contents: string): string[] => [...contents.matchAll(/\b(?:icon|name)=(?:"([a-z_]+)"|\{'([a-z_]+)'\})/g)].map((match) => match[1] ?? match[2]);

describe('icon names', () => {
	it('all exist as files', () => {
		const available = new Set(readdirSync(ICONS).filter((file) => file.endsWith('.svg')).map((file) => file.replace(/\.svg$/, '')));

		const missing = new Map<string, Set<string>>();

		reactSourceFiles().forEach(({ path, contents }) => {
			iconNames(contents).forEach((name) => {
				if (available.has(name)) {
					return;
				}

				missing.set(name, (missing.get(name) ?? new Set()).add(path));
			});
		});

		expect(Object.fromEntries([...missing].map(([name, files]) => [name, [...files]]))).toEqual({});
	});
});
