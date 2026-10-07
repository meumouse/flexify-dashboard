import { useEffect, useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { useColorScheme } from '@/react/shell/useColorScheme';
import { Avatar, DropdownMenu, Icon, Tooltip, type MenuItem } from '@/react/ui';

/**
 * Top bar: collapse the sidebar, open the menu on small screens, switch the theme and the
 * user menu.
 */

const headerButton =
	'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 lg:h-11 lg:w-11';

const roundButton =
	'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:h-11 lg:w-11';

/** Gravatar addresses the user by the SHA-256 of their email. */
const gravatarUrl = async (email: string): Promise<string> => {
	if (!email || !window.crypto?.subtle) {
		return '';
	}

	const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
	const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

	return `https://gravatar.com/avatar/${hash}?d=404&s=88`;
};

type Props = {
	collapsed: boolean;
	onToggleSidebar: () => void;
	onOpenMenu: () => void;
};

export const AppToolbar = ({ collapsed, onToggleSidebar, onOpenMenu }: Props) => {
	const { userName, userEmail, userRoles, adminUrl, siteUrl, loginUrl } = useWpData();
	const { isDark, setColorScheme, globalOverride } = useColorScheme();
	const [gravatar, setGravatar] = useState('');

	useEffect(() => {
		let active = true;

		gravatarUrl(userEmail).then((url) => {
			if (active) {
				setGravatar(url);
			}
		});

		return () => {
			active = false;
		};
	}, [userEmail]);

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
					<Icon name={collapsed ? 'menu' : 'left_panel_close'} className="text-xl" />
				</button>
			</Tooltip>

			<button type="button" className={cn(headerButton, 'lg:hidden')} aria-label={__('Toggle menu')} onClick={onOpenMenu}>
				<Icon name="menu" className="text-xl" />
			</button>

			<div className="min-w-0 grow" />

			{!globalOverride ? (
				<Tooltip text={isDark ? __('Light mode') : __('Dark mode')} side="bottom">
					<button type="button" className={roundButton} aria-label={__('Toggle dark mode')} onClick={() => setColorScheme(isDark ? 'light' : 'dark')}>
						<Icon name={isDark ? 'light_mode' : 'dark_mode'} className="text-xl" />
					</button>
				</Tooltip>
			) : null}

			<DropdownMenu
				items={userLinks}
				align="end"
				width="w-[260px]"
				trigger={
					<button type="button" className="flex items-center gap-3 rounded-full text-gray-700 dark:text-gray-400" aria-label={__('User menu')}>
						<Avatar src={gravatar} name={userName} size="md" />
						<span className="hidden max-w-32 truncate text-theme-sm font-medium xl:block">{userName}</span>
					</button>
				}
			/>
		</header>
	);
};
