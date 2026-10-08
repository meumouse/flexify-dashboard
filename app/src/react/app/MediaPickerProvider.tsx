import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { PER_PAGE, fileNameOf, thumbnailOf, useMediaLibrary, useMediaMutations, type MediaItem as Attachment } from '@/react/features/media/queries';
import { Button, EmptyState, Icon, Modal, SearchInput, Select, Skeleton, useFilePicker } from '@/react/ui';

/**
 * Choosing a file from the media library, with an imperative API:
 *
 * `const pickMedia = useMediaPicker(); const [image] = await pickMedia({ title });`
 *
 * This replaces `wp.media`, the modal WordPress opens, which was the last piece of someone
 * else's interface left inside ours. It reads the same REST endpoint the media screen does,
 * so there is one idea of what the library is.
 */

export type MediaPickerOptions = {
	title?: string;
	/** Label of the button that confirms the choice. */
	button?: string;
	multiple?: boolean;
	/** `image`, `video`, `audio`, `document`, `font`, or an empty string for everything. */
	type?: string;
};

/** What a call site gets back; the shape `wp.media` used, so the screens read the same. */
export type PickedMedia = {
	id: number;
	src: string;
	url: string;
	title: string;
	alt: string;
};

type PickFn = (options?: MediaPickerOptions) => Promise<PickedMedia[]>;

const MediaPickerContext = createContext<PickFn | null>(null);

const toPicked = (item: Attachment): PickedMedia => ({
	id: item.id,
	src: thumbnailOf(item),
	url: item.source_url,
	title: item.title?.rendered || fileNameOf(item),
	alt: item.alt_text ?? '',
});

const TYPES = [
	{ value: '', label: __('Every file') },
	{ value: 'image', label: __('Images') },
	{ value: 'video', label: __('Video') },
	{ value: 'audio', label: __('Audio') },
	{ value: 'document', label: __('Documents') },
	{ value: 'font', label: __('Fonts') },
];

const Picker = ({ options, onCancel, onChoose }: { options: MediaPickerOptions; onCancel: () => void; onChoose: (items: Attachment[]) => void }) => {
	const [search, setSearch] = useState('');
	const [type, setType] = useState(options.type ?? 'image');
	const [chosen, setChosen] = useState<Attachment[]>([]);
	const { upload } = useMediaMutations();

	const library = useMediaLibrary({ search, type: type || 'all', after: '', unused: false, tags: [], orderby: 'date', order: 'desc' });
	const items = (library.data?.pages ?? []).flatMap((page) => page.data);

	const picker = useFilePicker({
		multiple: Boolean(options.multiple),
		onPick: (files) => upload.mutate({ files: Array.from(files) }),
	});

	const toggle = (item: Attachment) =>
		setChosen((current) => {
			if (current.some((entry) => entry.id === item.id)) {
				return current.filter((entry) => entry.id !== item.id);
			}

			return options.multiple ? [...current, item] : [item];
		});

	return (
		<Modal
			open
			onOpenChange={(next) => (next ? undefined : onCancel())}
			size="xl"
			title={options.title || __('Media library')}
			footer={
				<>
					<Button variant="outline" onClick={onCancel}>
						{__('Cancel')}
					</Button>
					<Button disabled={!chosen.length} onClick={() => onChoose(chosen)}>
						{options.button || __('Use this file')}
					</Button>
				</>
			}
		>
			<div className="mb-4 flex flex-wrap items-center gap-3">
				<SearchInput value={search} onChange={setSearch} placeholder={__('Search the library')} aria-label={__('Search the library')} className="min-w-0 flex-1" />
				<Select value={type} onChange={setType} options={TYPES} aria-label={__('File type')} selectClassName="w-auto" />
				<Button variant="outline" icon="upload" loading={upload.isPending} onClick={picker.open}>
					{__('Upload')}
				</Button>
				{picker.picker}
			</div>

			{library.isLoading ? (
				<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
					{Array.from({ length: PER_PAGE / 3 }, (_, index) => (
						<Skeleton key={index} className="aspect-square w-full rounded-xl" />
					))}
				</div>
			) : items.length === 0 ? (
				<EmptyState icon="photo_library" title={__('Nothing here')} description={__('Upload a file or change the search.')} />
			) : (
				<>
					<ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
						{items.map((item) => {
							const selected = chosen.some((entry) => entry.id === item.id);

							return (
								<li key={item.id}>
									<button
										type="button"
										aria-pressed={selected}
										onClick={() => toggle(item)}
										className={cn(
											'group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border bg-gray-50 transition-colors dark:bg-white/[0.03]',
											selected ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
										)}
									>
										{item.mime_type.startsWith('image/') ? (
											<img src={thumbnailOf(item)} alt={item.alt_text || ''} className="h-full w-full object-cover" loading="lazy" />
										) : (
											<span className="flex flex-col items-center gap-1 p-2 text-center">
												<Icon name="description" className="text-title-xs text-gray-400" />
												<span className="line-clamp-2 text-theme-2xs text-gray-500">{fileNameOf(item)}</span>
											</span>
										)}
										{selected ? (
											<span className="absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
												<Icon name="check" className="text-theme-xs" />
											</span>
										) : null}
									</button>
								</li>
							);
						})}
					</ul>

					{library.hasNextPage ? (
						<div className="mt-4 flex justify-center">
							<Button variant="outline" size="sm" loading={library.isFetchingNextPage} onClick={() => library.fetchNextPage()}>
								{__('Load more')}
							</Button>
						</div>
					) : null}
				</>
			)}
		</Modal>
	);
};

export const MediaPickerProvider = ({ children }: { children: ReactNode }) => {
	const [options, setOptions] = useState<MediaPickerOptions | null>(null);
	const resolver = useRef<((value: PickedMedia[]) => void) | null>(null);

	const pick = useCallback<PickFn>((next = {}) => {
		setOptions(next);

		return new Promise<PickedMedia[]>((resolve) => {
			resolver.current = resolve;
		});
	}, []);

	const settle = (items: PickedMedia[]) => {
		resolver.current?.(items);
		resolver.current = null;
		setOptions(null);
	};

	const value = useMemo(() => pick, [pick]);

	return (
		<MediaPickerContext.Provider value={value}>
			{children}
			{options ? <Picker options={options} onCancel={() => settle([])} onChoose={(items) => settle(items.map(toPicked))} /> : null}
		</MediaPickerContext.Provider>
	);
};

/**
 * Without a provider the picker resolves with nothing, so a screen that is rendered outside
 * the app — a test, the login page — does not crash on a button nobody pressed.
 */
export const useMediaPicker = (): PickFn => useContext(MediaPickerContext) ?? (async () => []);
