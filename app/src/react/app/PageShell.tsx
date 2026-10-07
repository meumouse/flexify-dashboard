import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { useIsDark } from '@/react/app/ThemeProvider';

/**
 * Page container used by every React screen that replaces a native wp-admin page.
 *
 * Keeps the plugin styles isolated from the admin CSS, owns the scroll area and hosts the
 * portal target used by dialogs, dropdowns and tooltips.
 */

type Props = {
	children: ReactNode;
	/** Max content width; `full` fills the screen (used by editors and tables) */
	width?: 'default' | 'full';
	className?: string;
};

export const PORTAL_ID = 'fd-kit-portal';

export const PageShell = ({ children, width = 'default', className }: Props) => {
	const isDark = useIsDark();

	return (
		<div className="flexify-dashboard-isolation">
			<style>{':root{font-size:14px}#wpcontent{padding:0}#wpbody-content{padding:0}'}</style>
			<div className={cn('font-sans', isDark && 'dark')}>
				<div className="h-[var(--fd-body-height)] max-h-[var(--fd-body-height)] overflow-y-auto bg-gray-50 custom-scrollbar dark:bg-gray-900">
					<div className={cn('mx-auto w-full p-4 pb-20 md:p-6', width === 'default' && 'max-w-[1536px]', className)}>{children}</div>
				</div>
				<div id={PORTAL_ID} />
			</div>
		</div>
	);
};
