import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { filterMenu } from '@/react/shell/menu/filterMenu';
import { formatUrl } from '@/react/shell/menu/location';
import { isItemActive } from '@/react/shell/menu/active';
import { useFavorites } from '@/react/shell/menu/useFavorites';
import { MenuIcon, NotificationBadge, SidebarItem, SidebarSubItem } from '@/react/shell/SidebarItem';
import { Icon, SearchInput, Skeleton, Tooltip } from '@/react/ui';
import type { MenuItem } from '@/react/shell/menu/types';
import { MAX_WIDTH, MIN_WIDTH } from '@/react/shell/menu/useSidebarWidth';

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
	/** Drawn dark, which picks the dark logo when the site has one */
	dark?: boolean;
	/** Expanded width; it differs from the default when the site lets the edge be dragged */
	width?: number;
	/** Present when the edge can be dragged: the width while dragging, then once at the end */
	onResize?: (width: number) => void;
	onResizeEnd?: (width: number) => void;
	onToggleOpen: (id: string) => void;
};

const RESIZE_STEP = 16;

export const AppSidebar = ({ menu, loading, collapsed, mobile = false, dark = false, width: expandedWidth = SIDEBAR_WIDTH, onResize, onResizeEnd, onToggleOpen }: Props) => {
	const { settings, siteUrl, adminUrl } = useWpData();
	const { favorites, add, remove, isFavorite } = useFavorites();
	const [query, setQuery] = useState('');
	const [dragging, setDragging] = useState(false);
	const dragStart = useRef<{ x: number; width: number; rtl: boolean } | null>(null);

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

	const searchable = (settings as { enable_admin_menu_search?: boolean }).enable_admin_menu_search === true;
	const shown = useMemo(() => filterMenu(menu, query), [menu, query]);

	const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragStart.current = { x: event.clientX, width: expandedWidth, rtl: getComputedStyle(event.currentTarget).direction === 'rtl' };
		setDragging(true);
	};

	const widthAt = (clientX: number) => {
		const start = dragStart.current;

		return start ? start.width + (clientX - start.x) * (start.rtl ? -1 : 1) : expandedWidth;
	};

	const resizeByKey = (event: KeyboardEvent<HTMLButtonElement>) => {
		const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
		const step = event.key === 'ArrowRight' ? RESIZE_STEP : event.key === 'ArrowLeft' ? -RESIZE_STEP : 0;

		if (step) {
			event.preventDefault();
			onResizeEnd?.(expandedWidth + (rtl ? -step : step));
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

	const logos = settings as { logo?: string; dark_logo?: string };
	const logo = (dark && logos.dark_logo) || logos.logo;

	const width = mobile ? '100%' : `${minified ? SIDEBAR_COLLAPSED_WIDTH : expandedWidth}px`;

	return (
		<aside
			id="fd-menu"
			className={cn(
				'relative flex h-full max-h-full flex-col overflow-hidden border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
				// The edge follows the pointer while it is dragged; easing it in would make it lag behind.
				!mobile && !dragging && 'transition-[width] duration-300'
			)}
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
								<span className="min-w-0 flex-1 truncate">{favorite.settings?.name || favorite.name || ''}</span>
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

			{searchable && !minified ? (
				<div className="mt-2 px-3" onKeyDown={(event) => (event.key === 'Escape' ? setQuery('') : undefined)}>
					<SearchInput value={query} onChange={setQuery} debounce={0} size="sm" placeholder={__('Filter the menu')} aria-label={__('Filter the menu')} />
				</div>
			) : null}

			<nav className={cn('custom-scrollbar flex min-h-0 grow flex-col gap-1 overflow-y-auto px-3 pb-16', !favorites.length && !searchable && 'mt-6', (favorites.length || searchable) && 'mt-3')} aria-label={__('Admin menu')}>
				{query && !shown.length ? <p className="px-3 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing in the menu matches that.')}</p> : null}
				{loading && !menu.length
					? [0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-10 w-full" />)
					: shown.map((item) => {
							if (item.type === 'separator') {
								if (item.settings?.hidden) {
									return null;
								}

								return item.settings?.name ? (
									<p key={item.id} id={item.id} className="mt-4 mb-2 px-3 text-theme-xs uppercase leading-5 text-gray-400">
										{item.settings.name}
									</p>
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

			{onResize && !minified && !mobile ? (
				<button
					type="button"
					role="separator"
					aria-orientation="vertical"
					aria-valuemin={MIN_WIDTH}
					aria-valuemax={MAX_WIDTH}
					aria-valuenow={expandedWidth}
					aria-label={__('Resize the menu')}
					title={__('Drag to resize; double-click to reset')}
					className={cn(
						'absolute inset-y-0 end-0 z-10 w-1.5 cursor-col-resize transition-colors hover:bg-brand-500/30 focus-visible:bg-brand-500/40 focus-visible:outline-hidden',
						dragging && 'bg-brand-500/40'
					)}
					onPointerDown={startDrag}
					onPointerMove={(event) => (dragStart.current ? onResize(widthAt(event.clientX)) : undefined)}
					onPointerUp={(event) => {
						if (dragStart.current) {
							onResizeEnd?.(widthAt(event.clientX));
						}

						dragStart.current = null;
						setDragging(false);
					}}
					onDoubleClick={() => onResizeEnd?.(SIDEBAR_WIDTH)}
					onKeyDown={resizeByKey}
				/>
			) : null}

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
