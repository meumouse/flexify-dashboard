import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { NotificationBell } from '@/react/shell/notices/NotificationsPanel';
import { useColorScheme } from '@/react/shell/useColorScheme';
import { WpToolbar } from '@/react/shell/WpToolbar';
import { Avatar, DropdownMenu, Icon, Tooltip, type MenuItem } from '@/react/ui';

/**
 * Top bar: collapse the sidebar, open the menu on small screens, switch the theme and the
 * user menu.
 */

const headerButton =
	'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 lg:h-11 lg:w-11';

const roundButton =
	'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:h-11 lg:w-11';

/** Macs show the command key, everything else shows Ctrl. */
const shortcutLabel = () => (typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K');

type Props = {
	collapsed: boolean;
	onToggleSidebar: () => void;
	onOpenMenu: () => void;
	onOpenSearch?: () => void;
	onOpenNotifications: () => void;
	notificationsCount: number;
};

export const AppToolbar = ({ collapsed, onToggleSidebar, onOpenMenu, onOpenSearch, onOpenNotifications, notificationsCount }: Props) => {
	const { userName, userRoles, adminUrl, siteUrl, loginUrl, currentUser } = useWpData();
	const { isDark, setColorScheme, globalOverride } = useColorScheme();

	const userLinks: MenuItem[] = [
		{ label: __('Edit profile'), icon: 'person', href: `${adminUrl}profile.php` },
		{ label: __('Visit site'), icon: 'home', href: siteUrl },
		...(userRoles.includes('administrator') ? [{ label: __('Site settings'), icon: 'settings', href: `${adminUrl}options-general.php` }] : []),
		{ separator: true },
		{ label: __('Log out'), icon: 'logout', href: loginUrl || `${adminUrl}../wp-login.php?action=logout` },
	];

	return (
		<header
			id="fd-toolbar"
			className="pointer-events-auto flex max-w-full flex-row items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 lg:gap-4 lg:py-4 xl:px-6"
		>
			<Tooltip text={collapsed ? __('Expand sidebar') : __('Collapse sidebar')} side="bottom">
				<button type="button" className={cn(headerButton, 'hidden lg:flex')} aria-label={__('Toggle sidebar')} onClick={onToggleSidebar}>
					<Icon name={collapsed ? 'menu' : 'left_panel_close'} className="text-theme-xl" />
				</button>
			</Tooltip>

			<button type="button" className={cn(headerButton, 'lg:hidden')} aria-label={__('Toggle menu')} onClick={onOpenMenu}>
				<Icon name="menu" className="text-theme-xl" />
			</button>

			{onOpenSearch ? (
				<button
					type="button"
					className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg border border-gray-200 px-3.5 text-theme-sm text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-500 dark:border-gray-800 dark:hover:border-gray-700 lg:h-11 lg:w-[26rem]"
					onClick={onOpenSearch}
				>
					<Icon name="search" className="shrink-0 text-theme-lg" />
					<span className="hidden flex-1 text-start lg:block">{__('Search…')}</span>
					<kbd className="hidden shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-theme-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 lg:block">
						{shortcutLabel()}
					</kbd>
				</button>
			) : null}

			<div className="relative flex min-w-0 grow flex-row items-center max-lg:overflow-hidden">
				<div className="no-scrollbar flex w-full flex-row items-center gap-4 max-lg:overflow-auto">
					<WpToolbar />
				</div>
				<div className="pointer-events-none absolute end-0 top-0 bottom-0 hidden w-16 bg-gradient-to-l from-white to-transparent max-lg:block dark:from-gray-900" />
			</div>

			<NotificationBell count={notificationsCount} onClick={onOpenNotifications} />

			{!globalOverride ? (
				<Tooltip text={isDark ? __('Light mode') : __('Dark mode')} side="bottom">
					<button type="button" className={roundButton} aria-label={__('Toggle dark mode')} onClick={() => setColorScheme(isDark ? 'light' : 'dark')}>
						<Icon name={isDark ? 'light_mode' : 'dark_mode'} className="text-theme-xl" />
					</button>
				</Tooltip>
			) : null}

			<DropdownMenu
				items={userLinks}
				align="end"
				width="w-[260px]"
				trigger={
					<button type="button" className="flex items-center gap-3 rounded-full text-gray-700 dark:text-gray-400" aria-label={__('User menu')}>
						<Avatar src={currentUser?.avatar} name={userName} size="md" />
						<span className="hidden max-w-32 truncate text-theme-sm font-medium xl:block">{userName}</span>
					</button>
				}
			/>
		</header>
	);
};
