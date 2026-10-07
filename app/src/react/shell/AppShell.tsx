import { useEffect, useRef, useState } from 'react';
import { useWpData } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { dashIconStyles, iconOverrideStyles } from '@/react/shell/menu/iconStyles';
import { useAdminMenu } from '@/react/shell/menu/useAdminMenu';
import { AppSidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from '@/react/shell/AppSidebar';
import { AppToolbar } from '@/react/shell/AppToolbar';
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
	const { menu, dashIcons, loading, toggleOpen } = useAdminMenu();

	const [collapsed, setCollapsed] = useState(readCollapsed);
	const [drawerOpen, setDrawerOpen] = useState(false);
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

	const customCss = (settings as { custom_css?: string }).custom_css ?? '';
	const externalStylesheets = (settings as { external_stylesheets?: string[] }).external_stylesheets;

	return (
		<div className="flexify-dashboard-container">
			<style>{':root{font-size:14px}'}</style>
			<style>{iconOverrideStyles(pluginBase)}</style>
			<style>{dashIconStyles(dashIcons)}</style>
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
						<AppToolbar collapsed={collapsed} onToggleSidebar={toggleSidebar} onOpenMenu={() => setDrawerOpen(true)} />
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
			</div>
		</div>
	);
};
