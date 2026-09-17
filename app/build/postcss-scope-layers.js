/**
 * PostCSS plugin that scopes Tailwind output to a container selector.
 *
 * Rules placed inside `@layer <source>` are prefixed with the configured
 * selector and moved to `@layer <target>`. This keeps Tailwind's preflight and
 * utilities from leaking into native WordPress admin screens.
 *
 * Example config:
 * {
 *   'fd-isolation-scope': { layer: 'fd-isolation', prefix: ':where(.flexify-dashboard-isolation)' },
 *   'fd-theme-scope': { layer: 'fd-theme', prefix: '#fd-body-holder' },
 * }
 *
 * @since 3.0.0
 */

/**
 * Split a selector list on top-level commas only.
 *
 * @param {string} selector
 * @returns {string[]}
 */
function splitSelectors(selector) {
	const parts = [];
	let depth = 0;
	let bracket = 0;
	let quote = null;
	let current = '';

	for (let i = 0; i < selector.length; i++) {
		const char = selector[i];

		if (char === '\\') {
			current += char + (selector[i + 1] ?? '');
			i++;
			continue;
		}

		if (quote) {
			if (char === quote) quote = null;
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === '(') {
			depth++;
		} else if (char === ')') {
			depth--;
		} else if (char === '[') {
			bracket++;
		} else if (char === ']') {
			bracket--;
		} else if (char === ',' && depth === 0 && bracket === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}

		current += char;
	}

	if (current.trim()) {
		parts.push(current.trim());
	}

	return parts;
}

/**
 * Find the index of the first class selector token (an unescaped dot outside
 * of attribute brackets and strings).
 *
 * @param {string} selector
 * @returns {number}
 */
function firstClassIndex(selector) {
	let bracket = 0;
	let quote = null;

	for (let i = 0; i < selector.length; i++) {
		const char = selector[i];

		if (char === '\\') {
			i++;
			continue;
		}

		if (quote) {
			if (char === quote) quote = null;
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
		} else if (char === '[') {
			bracket++;
		} else if (char === ']') {
			bracket--;
		} else if (char === '.' && bracket === 0) {
			return i;
		}
	}

	return -1;
}

/**
 * Prefix a single selector with the scope selector.
 *
 * Utilities are prefixed right before their first class token so selectors
 * such as `:where(.space-y-2 > :not(:last-child))` keep their specificity.
 * Element selectors (preflight) are prefixed at the start.
 *
 * @param {string} selector
 * @param {string} prefix
 * @returns {string}
 */
function prefixSelector(selector, prefix) {
	const index = firstClassIndex(selector);

	if (index === -1) {
		return `${prefix} ${selector}`;
	}

	return `${selector.slice(0, index)}${prefix} ${selector.slice(index)}`;
}

/**
 * Check whether a node lives inside a keyframes block.
 *
 * @param {import('postcss').Node} node
 * @returns {boolean}
 */
function insideKeyframes(node) {
	let parent = node.parent;

	while (parent) {
		if (parent.type === 'atrule' && /keyframes$/.test(parent.name)) {
			return true;
		}

		parent = parent.parent;
	}

	return false;
}

/**
 * @param {Record<string, {layer: string, prefix: string}>} scopes
 */
export default function scopeLayers(scopes = {}) {
	return {
		postcssPlugin: 'flexify-dashboard-scope-layers',
		OnceExit(root) {
			root.walkAtRules('layer', (atRule) => {
				const scope = scopes[atRule.params];

				if (!scope) {
					return;
				}

				atRule.walkRules((rule) => {
					if (insideKeyframes(rule)) {
						return;
					}

					rule.selector = splitSelectors(rule.selector)
						.map((selector) => prefixSelector(selector, scope.prefix))
						.join(',');
				});

				atRule.params = scope.layer;
			});
		},
	};
}

scopeLayers.postcss = true;
