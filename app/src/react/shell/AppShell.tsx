import { useEffect, useRef, useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { iconOverrideStyles } from '@/react/shell/menu/iconStyles';
import { useAdminMenu } from '@/react/shell/menu/useAdminMenu';
import { AppSidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from '@/react/shell/AppSidebar';
import { AppToolbar } from '@/react/shell/AppToolbar';
import { PORTAL_ID } from '@/react/app/PageShell';
import { NotificationsPanel } from '@/react/shell/notices/NotificationsPanel';
import { useWpNotices } from '@/react/shell/notices/useWpNotices';
import { CommandPalette } from '@/react/shell/search/CommandPalette';
import { useColorScheme } from '@/react/shell/useColorScheme';
import { Sheet } from '@/react/ui';

/**
 * Frame around every wp-admin screen: the sidebar, the top bar and the slot the native page
 * is moved into.
 *
 * The page itself keeps being rendered by WordPress (and, for a few screens, by Vue); the shell
 * only relocates `#wpcontent` so it sits beside the sidebar.
 */

const COLLAPSED_KEY = 'fd-menu-minimised';

const readCollapsed = (): boolean => {
	try {
		return window.localStorage.getItem(COLLAPSED_KEY) === '1';
	} catch {
		return false;
	}
};

export const AppShell = () => {
	const { pluginBase, settings } = useWpData();
	const { isDark } = useColorScheme();
	const { menu, loading, toggleOpen } = useAdminMenu();

	const [collapsed, setCollapsed] = useState(readCollapsed);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [noticesOpen, setNoticesOpen] = useState(false);
	const wpNotices = useWpNotices();
	const bodyHolder = useRef<HTMLDivElement>(null);
	const moved = useRef(false);

	// WordPress renders the page outside this tree, so it is moved in next to the sidebar.
	useEffect(() => {
		const content = document.getElementById('wpcontent');

		if (!moved.current && bodyHolder.current && content) {
			bodyHolder.current.appendChild(content);
			moved.current = true;
		}
	}, []);

	useEffect(() => {
		document.body.classList.toggle('dark', isDark);
		document.documentElement.classList.toggle('dark', isDark);
	}, [isDark]);

	useEffect(() => {
		document.body.classList.add('fd-body');
		document.documentElement.classList.add('fd-rounded', 'uixp');
	}, []);

	// Ctrl/⌘K opens the palette from anywhere in the admin.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				setSearchOpen((current) => !current);
			}
		};

		window.addEventListener('keydown', onKeyDown);

		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	const toggleSidebar = () => {
		setCollapsed((current) => {
			const next = !current;

			try {
				window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
			} catch {
				// The choice then lasts for this visit only.
			}

			return next;
		});
	};

	const searchEnabled = !(settings as { disable_search?: boolean }).disable_search;
	const customCss = (settings as { custom_css?: string }).custom_css ?? '';
	const externalStylesheets = (settings as { external_stylesheets?: string[] }).external_stylesheets;

	return (
		<div className="flexify-dashboard-container">
			<style>{':root{font-size:14px}'}</style>
			<style>{iconOverrideStyles(pluginBase)}</style>
			{customCss ? <style>{customCss}</style> : null}
			{Array.isArray(externalStylesheets)
				? externalStylesheets.map((href, index) => <link key={href} rel="stylesheet" id={`fd-external-${index}-css`} href={href} media="all" />)
				: null}

			<div className="flexify-dashboard-layout">
				<div
					className={cn('flexify-dashboard-isolation fd-sidebar-container flexify-dashboard-normalize sticky top-0 box-border h-screen max-h-screen font-sans', isDark && 'dark')}
					style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
				>
					<AppSidebar menu={menu} loading={loading} collapsed={collapsed} onToggleOpen={toggleOpen} />
				</div>

				<div className="fd-right-column">
					<div className={cn('flexify-dashboard-isolation sticky top-0 z-[2]', isDark && 'dark')}>
						<AppToolbar
							collapsed={collapsed}
							onToggleSidebar={toggleSidebar}
							onOpenMenu={() => setDrawerOpen(true)}
							onOpenSearch={searchEnabled ? () => setSearchOpen(true) : undefined}
							onOpenNotifications={() => setNoticesOpen(true)}
							notificationsCount={wpNotices.count}
						/>
					</div>

					<div className="fd-body-container font-sans">
						<div id="fd-body-holder" ref={bodyHolder} />
					</div>
				</div>
			</div>

			<div className={cn('flexify-dashboard-isolation', isDark && 'dark')}>
				<Sheet open={drawerOpen} onOpenChange={setDrawerOpen} side="left" size="sm" bare title={__('Menu')}>
					<div className="h-full max-h-full w-full overflow-hidden">
						<AppSidebar menu={menu} loading={loading} collapsed={false} mobile onToggleOpen={toggleOpen} />
					</div>
				</Sheet>

				{searchEnabled ? <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} menu={menu} /> : null}

				<NotificationsPanel open={noticesOpen} onOpenChange={setNoticesOpen} attachWpNotices={wpNotices.attach} wpCount={wpNotices.count} />

				{/* Overlays of the shell render here, inside the isolated container. */}
				<div id={PORTAL_ID} />
			</div>
		</div>
	);
};
