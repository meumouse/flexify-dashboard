import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { useColorScheme } from '@/react/shell/useColorScheme';
import { Avatar, DropdownMenu, Icon, type MenuItem } from '@/react/ui';

/**
 * The plugin's bar on the site itself, in place of the WordPress admin bar.
 *
 * It is a smaller thing than the admin toolbar: a way back into the admin, the theme switch
 * and the user menu. There is no sidebar to collapse and no admin notices to count.
 */

const button =
	'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300';

export const FrontendBar = () => {
	const { userName, userEmail, adminUrl, loginUrl, settings } = useWpData();
	const { isDark, setColorScheme, globalOverride } = useColorScheme();
	const logo = String((settings as { logo?: string }).logo ?? '');

	const userMenu: MenuItem[] = [
		{ label: __('Dashboard'), icon: 'dashboard', href: adminUrl },
		{ label: __('Edit my profile'), icon: 'person', href: `${adminUrl}profile.php` },
		{ separator: true },
		{ label: __('Log out'), icon: 'logout', href: `${loginUrl}?action=logout` },
	];

	return (
		<div className="flexify-dashboard-isolation">
			<div className={cn('flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900', isDark && 'dark')}>
				<a href={adminUrl} className="me-2 flex items-center gap-2" aria-label={__('Go to the dashboard')}>
					{logo ? <img src={logo} alt="" aria-hidden className="h-5 object-contain" /> : <Icon name="dashboard" className="text-theme-lg text-gray-500 dark:text-gray-400" />}
				</a>

				<span className="flex-1" />

				{!globalOverride ? (
					<button type="button" onClick={() => setColorScheme(isDark ? 'light' : 'dark')} className={button} aria-label={isDark ? __('Use the light theme') : __('Use the dark theme')}>
						<Icon name={isDark ? 'light_mode' : 'dark_mode'} className="text-theme-lg" />
					</button>
				) : null}

				<DropdownMenu
					items={userMenu}
					trigger={
						<button type="button" className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-white/5" aria-label={__('Your account')}>
							<Avatar name={userName || userEmail} size="sm" />
						</button>
					}
				/>
			</div>
		</div>
	);
};
