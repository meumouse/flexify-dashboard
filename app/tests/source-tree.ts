import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Reading the React source as text, for the tests that hold a project-wide convention.
 *
 * Some rules cannot be checked by rendering a component — "no icon name without a file",
 * "no border radius outside the scale". They are checked by reading every file, so this is
 * the one place that knows how to walk the tree.
 */

export const REACT_SOURCE = join(__dirname, '../src/react');

export type SourceFile = {
	/** Path relative to `app/src/react`, which is how a failure should name the file. */
	path: string;
	contents: string;
};

const walk = (directory: string): string[] =>
	readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);

		if (statSync(path).isDirectory()) {
			return walk(path);
		}

		return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
	});

/** Every TypeScript file under `app/src/react`, tests excluded. */
export const reactSourceFiles = (root: string = REACT_SOURCE): SourceFile[] =>
	walk(root).map((path) => ({ path: relative(root, path).split(sep).join('/'), contents: readFileSync(path, 'utf8') }));

/**
 * The string literals in a file, which is where Tailwind classes live.
 *
 * Scanning the whole file instead would also match prop names and identifiers — `rounded` is
 * a prop of `Avatar`, and `text-balance` is not a type scale. Literals keep the two apart
 * without a parser. Interpolations inside a template literal come back as part of the text;
 * that is fine, since a class never spans one. An escaped quote cuts a literal in two, which
 * costs nothing: neither half can spell a class that was not there.
 */
export const stringLiterals = (contents: string): string[] => [...contents.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
