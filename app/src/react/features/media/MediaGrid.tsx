import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Checkbox, Icon, Skeleton } from '@/react/ui';
import { fileNameOf, formatBytes, thumbnailOf, type MediaItem } from '@/react/features/media/queries';

/**
 * The library as tiles or as rows. Both show the same things; a tile leads with the file and
 * a row leads with its name, which is what each way of looking is for.
 */

export const ICONS: Record<string, string> = {
	image: 'image',
	video: 'movie',
	audio: 'music_note',
	font: 'font_download',
	application: 'description',
	text: 'description',
};

export const iconFor = (mime: string): string => ICONS[mime.split('/')[0]] ?? 'insert_drive_file';

const isImage = (item: MediaItem) => item.mime_type.startsWith('image/') && !item.mime_type.includes('svg');

const Preview = ({ item, className }: { item: MediaItem; className?: string }) =>
	isImage(item) ? (
		<img src={thumbnailOf(item)} alt="" aria-hidden loading="lazy" className={cn('h-full w-full object-cover', className)} />
	) : (
		<span className={cn('flex h-full w-full items-center justify-center text-gray-400', className)}>
			<Icon name={iconFor(item.mime_type)} className="text-title-sm" />
		</span>
	);

type Props = {
	items: MediaItem[];
	view: 'grid' | 'list';
	selected: number[];
	onSelect: (id: number, checked: boolean) => void;
	onOpen: (item: MediaItem) => void;
	loading: boolean;
};

export const MediaGrid = ({ items, view, selected, onSelect, onOpen, loading }: Props) => {
	if (loading && !items.length) {
		return (
			<div className={view === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6' : 'space-y-2'}>
				{Array.from({ length: 12 }, (_, index) => (
					<Skeleton key={index} className={view === 'grid' ? 'aspect-square w-full' : 'h-16 w-full'} />
				))}
			</div>
		);
	}

	if (!items.length) {
		return (
			<div className="py-16 text-center">
				<Icon name="photo_library" className="mx-auto mb-3 text-title-md text-gray-300 dark:text-gray-600" />
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing in the library matches this.')}</p>
			</div>
		);
	}

	if (view === 'list') {
		return (
			<ul className="space-y-1">
				{items.map((item) => (
					<li
						key={item.id}
						className={cn(
							'flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors',
							selected.includes(item.id) ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
						)}
						onClick={() => onOpen(item)}
					>
						<span onClick={(event) => event.stopPropagation()}>
							<Checkbox
								size="sm"
								checked={selected.includes(item.id)}
								onCheckedChange={(checked) => onSelect(item.id, checked)}
								aria-label={decodeHtml(stripTags(item.title.rendered)) || fileNameOf(item)}
							/>
						</span>

						<span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
							<Preview item={item} />
						</span>

						<span className="min-w-0 flex-1">
							<span className="block truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">
								{decodeHtml(stripTags(item.title.rendered)) || fileNameOf(item)}
							</span>
							<span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">{fileNameOf(item)}</span>
						</span>

						<span className="hidden shrink-0 text-theme-xs text-gray-500 sm:block dark:text-gray-400">{item.mime_type}</span>
						<span className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">{formatBytes(item.media_details?.filesize ?? 0)}</span>
					</li>
				))}
			</ul>
		);
	}

	return (
		<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
			{items.map((item) => (
				<li key={item.id}>
					<div
						role="button"
						tabIndex={0}
						onClick={() => onOpen(item)}
						onKeyDown={(event) => (event.key === 'Enter' ? onOpen(item) : undefined)}
						className={cn(
							'group relative cursor-pointer overflow-hidden rounded-xl border bg-white transition-shadow dark:bg-white/[0.03]',
							selected.includes(item.id) ? 'border-brand-500 shadow-theme-sm' : 'border-gray-200 hover:shadow-theme-sm dark:border-gray-800'
						)}
					>
						<span className="absolute start-2 top-2 z-10 rounded-lg bg-white/90 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 has-[:checked]:opacity-100 dark:bg-gray-900/90">
							<span onClick={(event) => event.stopPropagation()}>
								<Checkbox
									size="sm"
									checked={selected.includes(item.id)}
									onCheckedChange={(checked) => onSelect(item.id, checked)}
									aria-label={decodeHtml(stripTags(item.title.rendered)) || fileNameOf(item)}
								/>
							</span>
						</span>

						<span className="block aspect-square bg-gray-100 dark:bg-gray-800">
							<Preview item={item} />
						</span>

						<span className="block p-2">
							<span className="block truncate text-theme-xs font-medium text-gray-900 dark:text-gray-100">
								{decodeHtml(stripTags(item.title.rendered)) || fileNameOf(item)}
							</span>
							<span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">{formatBytes(item.media_details?.filesize ?? 0)}</span>
						</span>
					</div>
				</li>
			))}
		</ul>
	);
};
