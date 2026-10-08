import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, Icon, Modal, PageHeader, SearchInput, Select, Spinner, Switch, Tabs, useFilePicker, type TabItem } from '@/react/ui';
import { EntityPicker } from '@/react/data/EntityPicker';
import { MediaGrid } from '@/react/features/media/MediaGrid';
import { MediaBulkEdit } from '@/react/features/media/MediaBulkEdit';
import { useMediaLibrary, useMediaMutations, type MediaFilters } from '@/react/features/media/queries';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';

/**
 * The media library: everything uploaded to the site, what can be filtered out of it, and what
 * can be done to a handful of files at once.
 */

const DEFAULTS = { search: '', type: 'all', since: 'all', unused: '', tags: '', orderby: 'date', order: 'desc', view: 'grid' };

const TYPES: TabItem[] = [
	{ value: 'all', label: __('All') },
	{ value: 'image', label: __('Images') },
	{ value: 'video', label: __('Video') },
	{ value: 'audio', label: __('Audio') },
	{ value: 'document', label: __('Documents') },
	{ value: 'font', label: __('Fonts') },
];

/** Turns "last 30 days" into the date the REST API wants. */
const sinceDate = (value: string): string => {
	const days: Record<string, number> = { today: 0, week: 7, month: 30, year: 365 };

	if (!(value in days)) {
		return '';
	}

	const date = new Date();
	date.setDate(date.getDate() - days[value]);
	date.setHours(0, 0, 0, 0);

	return date.toISOString();
};

export const MediaLibrary = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const rest = useRest();
	const { notify } = useNotify();
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const [selected, setSelected] = useState<number[]>([]);
	const [bulkEditOpen, setBulkEditOpen] = useState(false);
	const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null);
	const [dragging, setDragging] = useState(false);
	const sentinel = useRef<HTMLDivElement>(null);

	const query: MediaFilters = {
		search: String(filters.search),
		type: String(filters.type),
		after: sinceDate(String(filters.since)),
		unused: filters.unused === '1',
		tags: String(filters.tags).split(',').filter(Boolean).map(Number),
		orderby: String(filters.orderby),
		order: String(filters.order),
	};

	const library = useMediaLibrary(query);
	const { upload, bulk, remove, refresh } = useMediaMutations();

	const items = library.data?.pages.flatMap((page) => page.data ?? []) ?? [];
	const total = library.data?.pages[0]?.totalItems ?? 0;
	const view = filters.view === 'list' ? 'list' : 'grid';

	// The next page is asked for when the end of the list comes into sight, which is what
	// scrolling a library looks like from the browser's side.
	useEffect(() => {
		const target = sentinel.current;

		if (!target || !library.hasNextPage) {
			return;
		}

		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && !library.isFetchingNextPage) {
				library.fetchNextPage();
			}
		});

		observer.observe(target);

		return () => observer.disconnect();
	}, [library]);

	const apply = (patch: Partial<typeof DEFAULTS>) => {
		setSelected([]);
		setFilters(patch);
	};

	const sendFiles = (files: FileList | File[] | null) => {
		const list = Array.from(files ?? []);

		if (!list.length) {
			return;
		}

		upload.mutate(
			{ files: list, onProgress: (done, count, name) => setProgress({ done, total: count, name }) },
			{ onSettled: () => setProgress(null) }
		);
	};

	const filePicker = useFilePicker({ multiple: true, onPick: sendFiles });

	const askThenDelete = async () => {
		const confirmed = await confirm({
			title: __('Delete these files?'),
			message: sprintf(__('%d file(s) will be deleted for good. The media library has no trash.'), selected.length),
			confirmLabel: __('Delete permanently'),
			variant: 'danger',
		});

		if (confirmed) {
			bulk.mutate({ ids: selected, action: remove, message: __('Files deleted') }, { onSuccess: () => setSelected([]) });
		}
	};

	const download = async () => {
		try {
			const result = await rest.post<{ download_url?: string }>('flexify-dashboard/v1/media/bulk-download', { media_ids: selected });

			if (!result?.download_url) {
				throw new Error(__('The download could not be prepared.'));
			}

			// The browser downloads it; nothing of the file passes through the screen.
			const link = document.createElement('a');
			link.href = result.download_url;
			link.download = '';
			document.body.appendChild(link);
			link.click();
			link.remove();

			notify({ tone: 'success', title: __('Download started') });
		} catch (error) {
			notify({ tone: 'error', title: (error as Error).message });
		}
	};

	const activeFilters = [query.type !== 'all', Boolean(query.after), query.unused, query.tags.length > 0].filter(Boolean).length;

	return (
		<div
			onDragOver={(event) => {
				event.preventDefault();
				setDragging(true);
			}}
			onDragLeave={(event) => {
				if (event.currentTarget === event.target) {
					setDragging(false);
				}
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDragging(false);
				sendFiles(event.dataTransfer.files);
			}}
			className="relative"
		>
			<PageHeader
				title={__('Media')}
				description={sprintf(__('%s file(s)'), String(total))}
				actions={
					<>
						<Button
							variant="outline"
							size="sm"
							iconOnly
							icon={view === 'grid' ? 'view_list' : 'grid_view'}
							onClick={() => setFilters({ view: view === 'grid' ? 'list' : 'grid' })}
							aria-label={view === 'grid' ? __('List view') : __('Grid view')}
						/>
						<Button icon="upload" loading={upload.isPending} onClick={filePicker.open}>
							{__('Upload')}
						</Button>
					</>
				}
			/>

			{filePicker.picker}

			<Tabs items={TYPES} value={query.type} onChange={(type) => apply({ type })} className="mb-5" />

			<Card className="mb-5 p-4">
				<div className="flex flex-wrap items-center gap-3">
					<SearchInput
						value={String(filters.search)}
						onChange={(search) => apply({ search })}
						placeholder={__('Search the library')}
						aria-label={__('Search the library')}
						className="w-full sm:w-64"
					/>

					<Select
						size="sm"
						value={String(filters.since)}
						options={[
							{ value: 'all', label: __('Any date') },
							{ value: 'today', label: __('Today') },
							{ value: 'week', label: __('Last 7 days') },
							{ value: 'month', label: __('Last 30 days') },
							{ value: 'year', label: __('Last year') },
						]}
						onChange={(next) => apply({ since: next })}
						aria-label={__('Date')}
					/>

					<Select
						size="sm"
						value={`${filters.orderby}:${filters.order}`}
						options={[
							{ value: 'date:desc', label: __('Newest first') },
							{ value: 'date:asc', label: __('Oldest first') },
							{ value: 'title:asc', label: __('Name A–Z') },
							{ value: 'title:desc', label: __('Name Z–A') },
						]}
						onChange={(next) => {
							const [orderby, order] = next.split(':');
							apply({ orderby, order });
						}}
						aria-label={__('Sort')}
					/>

					<div className="w-full sm:w-56">
						<EntityPicker
							endpoint="flexify-dashboard/v1/media/tags"
							toItem={(record) => ({ id: Number(record.id), label: String(record.name ?? '') })}
							value={query.tags}
							onChange={(tags) => apply({ tags: tags.join(',') })}
							placeholder={__('Any tag')}
						/>
					</div>

					<Switch checked={query.unused} onCheckedChange={(unused) => apply({ unused: unused ? '1' : '' })} label={__('Unused only')} size="sm" />

					{activeFilters ? (
						<Button variant="ghost" size="sm" icon="close" onClick={() => apply({ type: 'all', since: 'all', unused: '', tags: '' })}>
							{__('Clear filters')}
						</Button>
					) : null}

					{library.isFetching ? <Icon name="progress_activity" className="ms-auto animate-spin text-theme-md text-gray-400" /> : null}
				</div>
			</Card>

			<MediaGrid
				items={items}
				view={view}
				selected={selected}
				onSelect={(id, checked) => setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))}
				onOpen={(item) => navigate(`/file/${item.id}`)}
				loading={library.isLoading}
			/>

			<div ref={sentinel} className="h-10" />

			{library.isFetchingNextPage ? (
				<div className="flex justify-center py-4">
					<Spinner className="h-6 w-6 text-brand-500" />
				</div>
			) : null}

			{selected.length ? (
				<div className="fixed bottom-6 left-1/2 z-99998 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
					<span className="whitespace-nowrap text-theme-sm font-medium text-gray-700 dark:text-gray-300">{sprintf(__('%s selected'), String(selected.length))}</span>
					<span className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
					<Button variant="outline" size="sm" icon="edit" onClick={() => setBulkEditOpen(true)}>
						{__('Edit')}
					</Button>
					<Button variant="outline" size="sm" icon="download" onClick={download}>
						{__('Download')}
					</Button>
					<Button variant="outline" size="sm" icon="delete" className="text-error-600" onClick={askThenDelete}>
						{__('Delete')}
					</Button>
					<Button variant="ghost" size="sm" iconOnly icon="close" onClick={() => setSelected([])} aria-label={__('Clear selection')} />
				</div>
			) : null}

			{dragging ? (
				<div className="pointer-events-none fixed inset-0 z-99999 flex items-center justify-center bg-brand-500/10 backdrop-blur-sm">
					<div className="rounded-2xl border-2 border-dashed border-brand-500 bg-white px-10 py-8 text-center dark:bg-gray-900">
						<Icon name="upload" className="mb-2 text-title-md text-brand-500" />
						<p className="text-theme-sm font-medium text-gray-900 dark:text-gray-100">{__('Drop the files to upload them')}</p>
					</div>
				</div>
			) : null}

			<Modal open={Boolean(progress)} onOpenChange={() => undefined} persistent hideClose title={__('Uploading')} size="sm">
				<p className="mb-3 truncate text-theme-sm text-gray-600 dark:text-gray-400">{progress?.name}</p>
				<div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
					<div
						className={cn('h-full rounded-full bg-brand-500 transition-[width]')}
						style={{ width: `${progress?.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
					/>
				</div>
				<p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
					{sprintf(__('%1$s of %2$s'), String(progress?.done ?? 0), String(progress?.total ?? 0))}
				</p>
			</Modal>

			<MediaBulkEdit
				open={bulkEditOpen}
				onClose={() => setBulkEditOpen(false)}
				ids={selected}
				onDone={() => {
					setSelected([]);
					refresh();
				}}
			/>
		</div>
	);
};
