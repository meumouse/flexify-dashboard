import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { formatUrl } from '@/react/shell/menu/location';
import { Icon } from '@/react/ui';
import type { MenuItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * One row of the sidebar, shared by top level items and their children.
 */

export const NotificationBadge = ({ count }: { count?: number | null }) => {
	const value = Number(count);

	if (!value || Number.isNaN(value) || value <= 0) {
		return null;
	}

	return (
		<span className="inline-flex h-5 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 px-2 text-theme-xs font-medium leading-none text-brand-500 transition-colors group-[.active]:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:group-[.active]:bg-brand-500/20">
			{value > 99 ? '99+' : value}
		</span>
	);
};

const itemClass = (active: boolean) =>
	cn(
		'group relative flex min-h-10 w-full cursor-pointer flex-row items-center gap-1 rounded-lg text-theme-sm font-medium transition-colors duration-150',
		active
			? 'active bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400'
			: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
	);

const iconClass = 'text-gray-500 transition-colors duration-150 group-hover:text-gray-700 group-[.active]:text-brand-500 dark:text-gray-400 dark:group-hover:text-gray-300 dark:group-[.active]:text-brand-400';

/**
 * The icon of a top-level item.
 *
 * A menu that was not given an icon is painted by the plugin that registered it, from its own
 * stylesheet — so the holder keeps the id and the classes WordPress would have used, and that
 * CSS still finds it.
 */
export const MenuIcon = ({ item }: { item: MenuItem }) => {
	if (item.settings?.icon) {
		return <Icon name={item.settings.icon} className={cn('text-title-xs', iconClass)} />;
	}

	if (item.icon?.kind === 'image') {
		return <img src={item.icon.value} alt="" aria-hidden className="h-5 w-5 object-contain opacity-80" />;
	}

	return (
		<span
			id={item.id ? `${item.id}-icon` : undefined}
			className={cn('wp-menu-image dashicons-before flex h-6 w-6 items-center justify-center', iconClass, item.icon?.kind === 'dashicon' && item.icon.value)}
		/>
	);
};

type Props = {
	item: MenuItem;
	active: boolean;
	/** The submenu is open, either because the user asked or because a child is current */
	expanded: boolean;
	hasSubmenu: boolean;
	favorite: boolean;
	onToggle: () => void;
	onFavorite: () => void;
};

export const SidebarItem = ({ item, active, expanded, hasSubmenu, favorite, onToggle, onFavorite }: Props) => (
	<a href={formatUrl(item.url)} id={item.id} className={cn(itemClass(active), 'py-2 pe-3')} target={item.settings?.open_new ? '_blank' : undefined}>
		<span className="absolute start-0 flex items-center px-3">
			<MenuIcon item={item} />
		</span>

		<span className="flex min-w-0 flex-grow items-center justify-between gap-3 ps-9">
			{/* The name carries the markup WordPress printed, such as the update bubbles. */}
			<span className="min-w-0 flex-1 font-medium leading-5" dangerouslySetInnerHTML={{ __html: item.settings?.name || item.name || '' }} />
			<NotificationBadge count={item.notifications} />
		</span>

		{!favorite ? (
			<button
				type="button"
				className="shrink-0 text-gray-400 opacity-0 transition-opacity hover:text-warning-500 group-hover:opacity-100"
				aria-label={__('Add to favourites')}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onFavorite();
				}}
			>
				<Icon name="star" className="text-theme-md" />
			</button>
		) : null}

		{hasSubmenu ? (
			<button
				type="button"
				className="shrink-0"
				aria-label={expanded ? __('Collapse submenu') : __('Expand submenu')}
				aria-expanded={expanded}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onToggle();
				}}
			>
				<Icon
					name="expand_more"
					className={cn('text-theme-lg transition-transform duration-200', expanded ? 'rotate-180 text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400')}
				/>
			</button>
		) : null}

		{item.settings?.open_new ? <Icon name="open_new" className={cn('text-theme-md opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100', active && 'opacity-100')} /> : null}
	</a>
);

export const SidebarSubItem = ({ item, active, favorite, onFavorite }: { item: SubMenuItem; active: boolean; favorite: boolean; onFavorite: () => void }) => (
	<a href={formatUrl(item.url)} className={cn(itemClass(active), 'px-3 py-1.5')} target={item.settings?.open_new ? '_blank' : undefined}>
		<span className="min-w-0 flex-1 truncate" dangerouslySetInnerHTML={{ __html: item.settings?.name || item.name || '' }} />
		<NotificationBadge count={item.notifications} />
		{!favorite ? (
			<button
				type="button"
				className="shrink-0 text-gray-400 opacity-0 transition-opacity hover:text-warning-500 group-hover:opacity-100"
				aria-label={__('Add to favourites')}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onFavorite();
				}}
			>
				<Icon name="star" className="text-theme-sm" />
			</button>
		) : null}
	</a>
);
