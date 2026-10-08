import { useMemo } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { DropdownMenu, Icon } from '@/react/ui';

/**
 * The WordPress toolbar, drawn from what the plugin collected.
 *
 * It used to be the native `#wpadminbar`, moved bodily into the shell. `AdminBar` reads the
 * nodes from `WP_Admin_Bar` instead and prints them as JSON, so this is a component like any
 * other — and the items can be laid out the way the rest of the bar is, rather than however
 * the toolbar's own stylesheet left them.
 *
 * Each item keeps the id and classes WordPress would have given it, so a plugin that paints
 * its own icon from CSS still finds what it is looking for.
 */

export const BAR_SCRIPT_ID = 'fd-admin-bar';

export type BarItem = {
	id: string;
	label: string;
	count: number | null;
	/** Set when the title is neither a label nor a count, such as an avatar. */
	html: string;
	href: string;
	target: string;
	tooltip: string;
	classes: string[];
	children: BarItem[];
};

export type Bar = { primary: BarItem[]; secondary: BarItem[] };

/** Items the shell already shows somewhere better. */
const DROPPED = ['wp-admin-bar-my-account', 'wp-admin-bar-wp-logo', 'wp-admin-bar-site-name', 'wp-admin-bar-menu-toggle', 'wp-admin-bar-search'];

/** Icons from the plugin's own set, for the items WordPress always puts there. */
const ICONS: Record<string, string> = {
	'wp-admin-bar-comments': 'chat',
	'wp-admin-bar-updates': 'update',
	'wp-admin-bar-new-content': 'library_add',
	'wp-admin-bar-customize': 'palette',
	'wp-admin-bar-edit': 'edit',
	'wp-admin-bar-view': 'visibility',
};

export const readBar = (root: Document = document): Bar => {
	const script = root.getElementById(BAR_SCRIPT_ID);

	if (!script?.textContent) {
		return { primary: [], secondary: [] };
	}

	try {
		const bar = JSON.parse(script.textContent) as Bar;

		return {
			primary: (bar.primary ?? []).filter((item) => !DROPPED.includes(item.id)),
			secondary: (bar.secondary ?? []).filter((item) => !DROPPED.includes(item.id)),
		};
	} catch {
		return { primary: [], secondary: [] };
	}
};

const itemClass = 'flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-theme-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200';

/*
 * A count of zero draws no bubble, the way WordPress hides one with `count-0`: the comments
 * item is always in the bar, and a grey "0" beside it is noise.
 */
const ItemBody = ({ item }: { item: BarItem }) => (
	<>
		{ICONS[item.id] ? (
			<Icon name={ICONS[item.id]} className="text-theme-lg" />
		) : (
			// No icon of ours: the holder carries the classes the item's own stylesheet uses.
			<span className="ab-icon" aria-hidden />
		)}
		{item.count === null ? (
			<span className="ab-label max-w-32 truncate">{item.label}</span>
		) : item.count === 0 ? null : (
			<span className="ab-label inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-50 px-1.5 text-theme-xs font-medium text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
				{item.count}
			</span>
		)}
	</>
);

const Item = ({ item }: { item: BarItem }) => {
	const classes = cn(itemClass, item.classes);

	if (item.children.length > 0) {
		return (
			<DropdownMenu
				align="start"
				items={item.children.map((child) => ({ label: child.label || child.id, href: child.href || undefined, target: child.target || undefined }))}
				trigger={
					<button type="button" id={item.id} className={classes} title={item.tooltip || undefined}>
						<ItemBody item={item} />
						<Icon name="expand_more" className="text-theme-md text-gray-400" />
					</button>
				}
			/>
		);
	}

	if (!item.href) {
		return (
			<span id={item.id} className={classes} title={item.tooltip || undefined}>
				<ItemBody item={item} />
			</span>
		);
	}

	return (
		<a id={item.id} href={item.href} target={item.target || undefined} className={classes} title={item.tooltip || undefined} rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}>
			<ItemBody item={item} />
		</a>
	);
};

export const WpToolbar = () => {
	const bar = useMemo(() => readBar(), []);
	const items = [...bar.primary, ...bar.secondary];

	if (!items.length) {
		return null;
	}

	return (
		<nav id="fd-wpadminbar" className="flex flex-row items-center gap-1 font-sans" aria-label={__('WordPress toolbar')}>
			{items.map((item) => (
				<Item key={item.id} item={item} />
			))}
		</nav>
	);
};
