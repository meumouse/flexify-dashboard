import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { useAdminNotices } from '@/react/shell/notices/useAdminNotices';
import { Button, Icon } from '@/react/ui';
import { alertColors } from '@/react/ui/recipes';

/**
 * The newest notice marked "show as a bar", across the top of every screen.
 *
 * One at a time: a stack of bars would push the page down by however many the site published.
 * The rest wait in the notifications panel, which "Read more" opens.
 */

const TONES: Record<string, string> = {
	info: 'border-blue-light-200 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/10',
	success: 'border-success-200 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10',
	warning: 'border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10',
	error: 'border-error-200 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10',
};

const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const AnnouncementBar = ({ onOpenPanel }: { onOpenPanel: () => void }) => {
	const { notices, dismiss, dismissing } = useAdminNotices();
	const notice = notices.find((entry) => entry.meta?.display === 'bar');

	if (!notice) {
		return null;
	}

	const tone = notice.meta?.notice_type && TONES[notice.meta.notice_type] ? notice.meta.notice_type : 'info';
	const title = plainText(notice.title?.rendered ?? '');
	const text = plainText(notice.content?.rendered ?? '');

	return (
		<div role="status" className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 sm:px-6', TONES[tone])}>
			<Icon name={alertColors[tone].iconName} className={cn('shrink-0 text-theme-lg', alertColors[tone].icon)} />
			<p className="min-w-0 flex-1 truncate text-theme-sm text-gray-700 dark:text-gray-300">
				{title ? <strong className="me-1.5 font-semibold text-gray-800 dark:text-white/90">{title}</strong> : null}
				{text}
			</p>
			<div className="flex shrink-0 items-center gap-2">
				<Button size="xs" variant="outline" onClick={onOpenPanel}>
					{__('Read more')}
				</Button>
				{notice.meta?.dismissible !== false ? (
					<Button size="xs" variant="ghost" icon="close" iconOnly loading={dismissing === notice.id} aria-label={__('Dismiss')} onClick={() => dismiss(notice)} />
				) : null}
			</div>
		</div>
	);
};
