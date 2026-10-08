import { useEffect, useMemo, useRef, useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { formatUrl } from '@/react/shell/menu/location';
import { isItemActive } from '@/react/shell/menu/parse';
import { useFavorites } from '@/react/shell/menu/useFavorites';
import { MenuIcon, NotificationBadge, SidebarItem, SidebarSubItem } from '@/react/shell/SidebarItem';
import { Icon, Skeleton, Tooltip } from '@/react/ui';
import type { MenuItem } from '@/react/shell/menu/types';

/**
 * The admin sidebar.
 *
 * Collapsed it shows only the icons and expands over the content while the pointer is on it,
 * which keeps the narrow layout without hiding where the links go.
 */

export const SIDEBAR_WIDTH = 290;
export const SIDEBAR_COLLAPSED_WIDTH = 90;

type Props = {
	menu: MenuItem[];
	loading: boolean;
	collapsed: boolean;
	/** The drawer on small screens always renders the full sidebar */
	mobile?: boolean;
	onToggleOpen: (id: string) => void;
};

export const AppSidebar = ({ menu, loading, collapsed, mobile = false, onToggleOpen }: Props) => {
	const { settings, siteUrl, adminUrl } = useWpData();
	const { favorites, add, remove, isFavorite } = useFavorites();

	const [hoverExpanded, setHoverExpanded] = useState(false);
	const hoverTimer = useRef<number>(undefined);

	const minified = collapsed && !hoverExpanded && !mobile;
	const submenuOnHover = (settings as { submenu_style?: string }).submenu_style === 'hover';

	useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

	const onEnter = () => {
		if (!collapsed || mobile || !window.matchMedia?.('(hover: hover)').matches) {
			return;
		}

		window.clearTimeout(hoverTimer.current);
		hoverTimer.current = window.setTimeout(() => setHoverExpanded(true), 120);
	};

	const onLeave = () => {
		window.clearTimeout(hoverTimer.current);

		if (hoverExpanded) {
			hoverTimer.current = window.setTimeout(() => setHoverExpanded(false), 200);
		}
	};

	const activeById = useMemo(() => {
		const states = new Map<string, boolean>();

		menu.forEach((item) => {
			states.set(item.id, isItemActive(item));
			item.submenu?.forEach((entry) => states.set(entry.id, isItemActive(entry)));
		});

		return states;
	}, [menu]);

	const logo = (settings as { logo?: string; dark_logo?: string }).logo;

	const width = mobile ? '100%' : `${minified ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH}px`;

	return (
		<aside
			id="fd-menu"
			className={cn('flex h-full max-h-full flex-col overflow-hidden border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', !mobile && 'transition-[width] duration-300')}
			style={{ width }}
			onMouseEnter={onEnter}
			onMouseLeave={onLeave}
		>
			<a href={adminUrl} className={cn('flex h-16 shrink-0 items-center gap-2 px-5', minified && 'justify-center px-0')} aria-label={__('Dashboard')}>
				{logo && !minified ? <img src={logo} alt="" className="h-6" /> : <Icon name="flexify-dashboard" className="text-title-xs text-brand-500" />}
			</a>

			{favorites.length && !minified ? (
				<div className="mt-2 px-3">
					<p className="px-3 pb-1 text-theme-xs uppercase leading-5 text-gray-400">{__('Favourites')}</p>
					<div className="flex flex-col gap-1">
						{favorites.map((favorite) => (
							<a
								key={favorite.url}
								href={formatUrl(favorite.url)}
								className="group flex min-h-9 items-center gap-2 rounded-lg px-3 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
							>
								<Icon name={favorite.settings?.icon || 'link'} className="shrink-0 text-theme-md text-gray-400" />
								<span className="min-w-0 flex-1 truncate" dangerouslySetInnerHTML={{ __html: favorite.settings?.name || favorite.name || '' }} />
								<button
									type="button"
									className="shrink-0 text-gray-400 opacity-0 transition-opacity hover:text-error-500 group-hover:opacity-100"
									aria-label={__('Remove from favourites')}
									onClick={(event) => {
										event.preventDefault();
										remove(favorite.url as string);
									}}
								>
									<Icon name="close" className="text-theme-sm" />
								</button>
							</a>
						))}
					</div>
				</div>
			) : null}

			<nav className={cn('custom-scrollbar flex min-h-0 grow flex-col gap-1 overflow-y-auto px-3 pb-16', !favorites.length && 'mt-6')} aria-label={__('Admin menu')}>
				{loading && !menu.length
					? [0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-10 w-full" />)
					: menu.map((item) => {
							if (item.type === 'separator') {
								if (item.settings?.hidden) {
									return null;
								}

								return item.settings?.name ? (
									<p key={item.id} id={item.id} className="mt-4 mb-2 px-3 text-theme-xs uppercase leading-5 text-gray-400" dangerouslySetInnerHTML={{ __html: item.settings.name }} />
								) : (
									<hr key={item.id} id={item.id} className="my-2 w-full border-t border-gray-100 dark:border-gray-800" />
								);
							}

							const active = activeById.get(item.id) ?? false;
							const hasSubmenu = Boolean(item.submenu?.length);
							const expanded = hasSubmenu && !submenuOnHover && (item.open || active);

							if (minified) {
								// Collapsed rows show no text, so the name has to reach assistive tech another way.
								const label = (item.settings?.name || item.name || '').replace(/<[^>]*>/g, '').trim();

								return (
									<Tooltip key={item.id} text={label} side="right">
										<a
											href={formatUrl(item.url)}
											aria-label={label}
											className={cn(
												'group relative flex h-11 items-center justify-center rounded-lg transition-colors',
												active ? 'active bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
											)}
										>
											<MenuIcon item={item} />
											{item.notifications ? (
												<span className="absolute end-2 top-1.5">
													<NotificationBadge count={item.notifications} />
												</span>
											) : null}
										</a>
									</Tooltip>
								);
							}

							return (
								<div key={item.id} className="relative">
									<SidebarItem
										item={item}
										active={active}
										expanded={Boolean(expanded)}
										hasSubmenu={hasSubmenu && !submenuOnHover}
										favorite={isFavorite(item.url)}
										onToggle={() => onToggleOpen(item.id)}
										onFavorite={() => add(item)}
									/>

									{expanded ? (
										<div className="mt-1 mb-2 ms-9 flex flex-col gap-1">
											{item.submenu?.map((entry) => (
												<SidebarSubItem
													key={entry.id}
													item={entry}
													active={activeById.get(entry.id) ?? false}
													favorite={isFavorite(entry.url)}
													onFavorite={() => add(entry)}
												/>
											))}
										</div>
									) : null}
								</div>
							);
						})}
			</nav>

			{!minified ? (
				<div className="shrink-0 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
					<a href={siteUrl} className="flex items-center gap-2 rounded-lg px-3 py-2 text-theme-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5">
						<Icon name="home" className="text-theme-md" />
						{__('Visit site')}
					</a>
				</div>
			) : null}
		</aside>
	);
};
