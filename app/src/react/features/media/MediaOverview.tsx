import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Icon, ProgressBar, Skeleton } from '@/react/ui';
import { formatBytes, typeBreakdown, useMediaAnalytics, type MediaTypeKey } from '@/react/features/media/queries';

/**
 * The library at a glance, above the files: how many of each kind, and how much room it all
 * takes. Each kind is also the way into it — clicking narrows the library to that type.
 */

const KINDS: { key: Exclude<MediaTypeKey, 'other'>; label: () => string; icon: string; tone: string }[] = [
	{ key: 'image', label: () => __('Images'), icon: 'image', tone: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500' },
	{ key: 'video', label: () => __('Video'), icon: 'videocam', tone: 'bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/15' },
	{ key: 'audio', label: () => __('Audio'), icon: 'audio_file', tone: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15' },
	{ key: 'document', label: () => __('Documents'), icon: 'description', tone: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400' },
];

type Props = {
	/** The type tab that is open, so its tile reads as chosen */
	active: string;
	onPick: (type: string) => void;
};

export const MediaOverview = ({ active, onPick }: Props) => {
	const analytics = useMediaAnalytics();
	const data = analytics.data;

	if (analytics.isError) {
		// The overview is a convenience; without it the library below still works.
		return null;
	}

	const counts = typeBreakdown(data?.file_types);
	const total = data?.total_files ?? 0;

	return (
		<div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
			{KINDS.map((kind) => {
				const chosen = active === kind.key;

				return (
					<button
						key={kind.key}
						type="button"
						onClick={() => onPick(chosen ? 'all' : kind.key)}
						aria-pressed={chosen}
						className={cn(
							'flex items-center gap-4 rounded-2xl border bg-white p-4 text-start transition-colors dark:bg-white/[0.03]',
							chosen ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
						)}
					>
						<span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', kind.tone)}>
							<Icon name={kind.icon} className="text-theme-xl" />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{kind.label()}</span>
							{analytics.isLoading ? (
								<Skeleton className="mt-1 h-4 w-20" />
							) : (
								<span className="block text-theme-xs text-gray-500 dark:text-gray-400">
									{`${sprintf(__('%s files'), counts[kind.key].toLocaleString())} · ${total ? Math.round((counts[kind.key] / total) * 100) : 0}%`}
								</span>
							)}
						</span>
					</button>
				);
			})}

			<div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2 xl:col-span-1">
				<div className="flex items-center justify-between gap-3">
					<span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{__('Storage')}</span>
					{analytics.isLoading ? (
						<Skeleton className="h-4 w-16" />
					) : (
						<span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{data?.total_size_formatted ?? formatBytes(data?.total_size ?? 0)}</span>
					)}
				</div>
				{/* The share of files nothing uses: the part of the storage that could be won back. */}
				<ProgressBar value={data?.unused_media ?? 0} max={total} tone="warning" size="sm" label={__('Unused files')} className="mt-3" />
				<p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
					{analytics.isLoading ? ' ' : sprintf(__('%1$s of %2$s files unused'), (data?.unused_media ?? 0).toLocaleString(), total.toLocaleString())}
				</p>
			</div>
		</div>
	);
};
