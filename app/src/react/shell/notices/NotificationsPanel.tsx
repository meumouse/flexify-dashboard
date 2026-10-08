import { useCallback, useState } from 'react';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { useAdminNotices } from '@/react/shell/notices/useAdminNotices';
import { Button, EmptyState, Icon, Sheet, Skeleton } from '@/react/ui';

/**
 * Everything waiting for attention on this screen: the notices the site published and the ones
 * WordPress printed, which are moved in here instead of being copied.
 */

const DOT_COLORS: Record<string, string> = {
	info: 'bg-brand-500',
	success: 'bg-success-500',
	warning: 'bg-warning-500',
	error: 'bg-error-500',
};

const PREVIEW_LENGTH = 180;

/** Long notices are cut at a word boundary until the user expands them. */
const preview = (html: string): string => {
	const text = html.replace(/<[^>]*>/g, '');

	if (text.length <= PREVIEW_LENGTH) {
		return text;
	}

	const cut = text.slice(0, PREVIEW_LENGTH);
	const lastSpace = cut.lastIndexOf(' ');

	return `${cut.slice(0, lastSpace > 140 ? lastSpace : PREVIEW_LENGTH)}…`;
};

const isLong = (html: string) => html.replace(/<[^>]*>/g, '').length > PREVIEW_LENGTH;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Moves the native WordPress notices into the given container */
	attachWpNotices: (container: HTMLElement | null) => void;
	wpCount: number;
};

export const NotificationsPanel = ({ open, onOpenChange, attachWpNotices, wpCount }: Props) => {
	const { notices, loading, dismiss, dismissing } = useAdminNotices();
	const [expanded, setExpanded] = useState<number[]>([]);

	// The native notices are appended once the panel has a place to put them.
	const container = useCallback((node: HTMLDivElement | null) => attachWpNotices(node), [attachWpNotices]);

	const toggle = (id: number) => setExpanded((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

	const total = notices.length + wpCount;

	return (
		<Sheet open={open} onOpenChange={onOpenChange} side="right" size="md" title={__('Notifications')} description={total ? sprintf(__('%d waiting for you'), total) : __('Nothing waiting')}>
			<div className="space-y-4">
				{loading ? (
					<>
						<Skeleton className="h-20 w-full rounded-xl" />
						<Skeleton className="h-20 w-full rounded-xl" />
					</>
				) : null}

				{notices.map((notice) => {
					const html = notice.content?.rendered ?? '';
					const open_ = expanded.includes(notice.id);

					return (
						<article key={notice.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
							<div className="flex items-start gap-3">
								<span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT_COLORS[notice.meta?.type ?? 'info'] ?? DOT_COLORS.info)} />
								<div className="min-w-0 flex-1">
									{notice.title?.rendered ? (
										<h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90" dangerouslySetInnerHTML={{ __html: notice.title.rendered }} />
									) : null}

									{/* The body is authored in the WordPress editor, so it keeps its markup. */}
									{open_ || !isLong(html) ? (
										<div className="fd-notice-content mt-1 text-theme-sm text-gray-600 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: html }} />
									) : (
										<p className="mt-1 text-theme-sm text-gray-600 dark:text-gray-300">{preview(html)}</p>
									)}

									<div className="mt-3 flex items-center gap-3">
										{isLong(html) ? (
											<button type="button" className="text-theme-xs font-medium text-brand-500 hover:text-brand-600" onClick={() => toggle(notice.id)}>
												{open_ ? __('Show less') : __('Read more')}
											</button>
										) : null}
										<Button size="xs" variant="ghost" loading={dismissing === notice.id} onClick={() => dismiss(notice)}>
											{__('Dismiss')}
										</Button>
									</div>
								</div>
							</div>
						</article>
					);
				})}

				{wpCount ? (
					<section>
						<p className="mb-2 text-theme-xs uppercase tracking-wide text-gray-400">{__('From WordPress')}</p>
						{/* The notices themselves are moved here, markup and behaviour intact. */}
						<div ref={container} className="wp-notifications-container space-y-3" />
					</section>
				) : null}

				{!loading && !total ? <EmptyState compact icon="check_circle" title={__('All caught up')} description={__('No notifications on this screen.')} /> : null}
			</div>
		</Sheet>
	);
};

export const NotificationBell = ({ count, onClick }: { count: number; onClick: () => void }) => (
	<button
		type="button"
		className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:h-11 lg:w-11"
		aria-label={count ? sprintf(__('Notifications (%d)'), count) : __('Notifications')}
		onClick={onClick}
	>
		<Icon name="notifications" className="text-theme-xl" />
		{count ? (
			<span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-theme-2xs font-medium leading-none text-white">
				{count > 9 ? '9+' : count}
			</span>
		) : null}
	</button>
);
