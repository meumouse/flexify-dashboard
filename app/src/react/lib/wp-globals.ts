import { __, _n, _x, sprintf } from '@/react/lib/i18n';

/**
 * Put the translation helpers on `window`, where the plugin's shared JavaScript expects them.
 *
 * Files like the settings schema and the dashboard card registry are plain JavaScript shared
 * with the Vue screens, and they call a global `__` while they are being evaluated. The Vue
 * shell installs it; a React screen that does not load the Vue shell has to install it too,
 * or importing one of those files throws before anything renders.
 *
 * Import this **first** in an entry that loads shared JavaScript: module evaluation follows
 * import order, so it has to come before whatever needs it.
 */

type Globals = { __?: unknown; _n?: unknown; _x?: unknown; sprintf?: unknown };

if (typeof window !== 'undefined') {
	const scope = window as unknown as Globals;

	// The Vue shell may have installed its own, which also applies the white-label
	// replacements; that one wins.
	scope.__ = scope.__ ?? __;
	scope._n = scope._n ?? _n;
	scope._x = scope._x ?? _x;
	scope.sprintf = scope.sprintf ?? sprintf;
}
