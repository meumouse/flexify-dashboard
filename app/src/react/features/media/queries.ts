import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import type { RestListResult } from '@/react/types/wordpress';

/**
 * The media library, through the core REST routes plus the few the plugin adds for what core
 * does not answer: where a file is used, replacing a file, tags and bulk download.
 */

export type MediaSize = { source_url: string; width: number; height: number; mime_type?: string };

export type MediaItem = {
	id: number;
	slug: string;
	title: { rendered: string; raw?: string };
	alt_text: string;
	caption: { rendered: string; raw?: string };
	description: { rendered: string; raw?: string };
	source_url: string;
	mime_type: string;
	date: string;
	modified: string;
	author: number;
	link: string;
	/** Added to the response by the plugin's media tag taxonomy */
	media_tags?: MediaTag[];
	media_details?: {
		file?: string;
		filesize?: number;
		width?: number;
		height?: number;
		sizes?: Record<string, MediaSize>;
	};
};

export type MediaTag = { id: number; name: string; count?: number };

export type MediaUsage = { id: number; title: string; edit_link: string; type?: string };

export type MediaFilters = {
	search: string;
	type: string;
	after: string;
	unused: boolean;
	tags: number[];
	orderby: string;
	order: string;
};

export const PER_PAGE = 30;

/** What the type filter means in terms of the mime types WordPress stores. */
export const MIME_GROUPS: Record<string, string> = {
	image: 'image',
	video: 'video',
	audio: 'audio',
	document: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel',
	font: 'font/woff2,font/woff,font/ttf,font/otf,application/vnd.ms-fontobject,application/x-font-ttf',
};

export const thumbnailOf = (item: MediaItem): string => item.media_details?.sizes?.thumbnail?.source_url ?? item.source_url;

export const fileNameOf = (item: MediaItem): string => (item.media_details?.file ?? item.source_url).split('/').pop() ?? item.slug;

export const formatBytes = (bytes: number): string => {
	if (!bytes) {
		return '—';
	}

	const units = ['B', 'KB', 'MB', 'GB'];
	const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));

	return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

/**
 * The library a page at a time, each page added to the ones before it.
 *
 * A library is long and mostly looked at by scrolling, so pages accumulate instead of
 * replacing each other the way a table's would.
 */
export const useMediaLibrary = (filters: MediaFilters) => {
	const rest = useRest();

	return useInfiniteQuery<RestListResult<MediaItem>, Error, { pages: RestListResult<MediaItem>[] }, unknown[], number>({
		queryKey: ['media', filters],
		initialPageParam: 1,
		getNextPageParam: (last, pages) => (pages.length < last.totalPages ? pages.length + 1 : undefined),
		queryFn: ({ pageParam, signal }) =>
			rest.list<MediaItem>(
				'wp/v2/media',
				{
					context: 'edit',
					page: pageParam,
					per_page: PER_PAGE,
					search: filters.search,
					order: filters.order,
					orderby: filters.orderby,
					media_type: filters.type === 'all' || !MIME_GROUPS[filters.type] ? undefined : ['image', 'video', 'audio'].includes(filters.type) ? filters.type : undefined,
					mime_type: ['document', 'font'].includes(filters.type) ? MIME_GROUPS[filters.type] : undefined,
					after: filters.after || undefined,
					unused: filters.unused ? true : undefined,
					unused_mode: filters.unused ? 'deep' : undefined,
					tag_ids: filters.tags.length ? filters.tags : undefined,
				},
				signal
			),
	});
};

/** What `flexify-dashboard/v1/media-analytics` answers: counts straight from the database. */
export type MediaAnalytics = {
	total_files?: number;
	/** Raw bytes of the uploads folder; `total_size_formatted` is the one meant to be read */
	total_size?: number;
	total_size_formatted?: string;
	average_file_size_formatted?: string;
	recent_uploads?: number;
	unused_media?: number;
	large_files_estimate?: number;
	/** Grouped by the part of the mime type before the slash; MySQL hands the count back as text */
	file_types?: { file_type: string; count: number | string }[];
};

export const useMediaAnalytics = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['media-analytics'],
		staleTime: 300_000,
		queryFn: ({ signal }) => rest.get<MediaAnalytics>('flexify-dashboard/v1/media-analytics', {}, signal),
	});
};

export type MediaTypeKey = 'image' | 'video' | 'audio' | 'document' | 'other';

/**
 * The counts by the kinds the library's tabs use.
 *
 * The route groups by the first half of the mime type, so a PDF and a Word file both arrive as
 * "application" and a plain text file as "text": those are the documents. Fonts are stored as
 * "application" or "font" depending on the server, so they are not told apart here.
 */
export const typeBreakdown = (fileTypes: MediaAnalytics['file_types'] = []): Record<MediaTypeKey, number> => {
	const counts: Record<MediaTypeKey, number> = { image: 0, video: 0, audio: 0, document: 0, other: 0 };

	fileTypes.forEach(({ file_type, count }) => {
		const key: MediaTypeKey = ['image', 'video', 'audio'].includes(file_type) ? (file_type as MediaTypeKey) : ['application', 'text'].includes(file_type) ? 'document' : 'other';

		counts[key] += Number(count) || 0;
	});

	return counts;
};

export const useMediaItem = (id: number | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['media-item', id],
		enabled: Boolean(id),
		queryFn: ({ signal }) => rest.get<MediaItem>(`wp/v2/media/${id}`, { context: 'edit' }, signal),
	});
};

export const useMediaTags = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['media-tags'],
		staleTime: 60_000,
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ tags?: MediaTag[] } | MediaTag[]>('flexify-dashboard/v1/media/tags', {}, signal);

			return Array.isArray(result) ? result : (result.tags ?? []);
		},
	});
};

export const useMediaUsage = (id: number | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['media-usage', id],
		enabled: Boolean(id),
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ usage?: MediaUsage[] } | MediaUsage[]>(`flexify-dashboard/v1/media/${id}/usage`, {}, signal);

			return Array.isArray(result) ? result : (result.usage ?? []);
		},
	});
};

export const useMediaMutations = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['media'] });
		queryClient.invalidateQueries({ queryKey: ['media-item'] });
	};

	const save = useMutation<MediaItem, Error, { id: number; data: Record<string, unknown>; message?: string }>({
		mutationFn: ({ id, data }) => rest.post<MediaItem>(`wp/v2/media/${id}`, data, { context: 'edit' }),
		onSuccess: (_result, { message }) => {
			notify({ tone: 'success', title: message ?? __('File updated') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	/**
	 * Uploads go one after another, with what is happening reported as they go: a dozen files
	 * at once is a dozen full-size bodies in flight, and the first thing to give way is the
	 * upload limit of the host.
	 */
	const upload = useMutation<number, Error, { files: File[]; onProgress?: (done: number, total: number, name: string) => void }>({
		mutationFn: async ({ files, onProgress }) => {
			let uploaded = 0;

			for (const [index, file] of files.entries()) {
				onProgress?.(index, files.length, file.name);

				const body = new FormData();
				body.append('file', file, file.name);

				try {
					await rest.post('wp/v2/media', body);
					uploaded += 1;
				} catch (error) {
					notify({ tone: 'error', title: __('Upload failed'), message: `${file.name}: ${(error as Error).message}` });
				}
			}

			onProgress?.(files.length, files.length, '');

			return uploaded;
		},
		onSuccess: (uploaded) => {
			if (uploaded) {
				notify({ tone: 'success', title: __('Files uploaded') });
			}

			refresh();
		},
	});

	const bulk = useMutation<number, Error, { ids: number[]; message: string; action: (id: number) => Promise<unknown> }>({
		mutationFn: async ({ ids, action }) => {
			let failed = 0;

			for (const id of ids) {
				try {
					await action(id);
				} catch {
					failed += 1;
				}
			}

			return failed;
		},
		onSuccess: (failed, { message }) => {
			notify(failed ? { tone: 'error', title: __('Some files could not be updated.') } : { tone: 'success', title: message });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const replace = useMutation<unknown, Error, { id: number; file: File }>({
		mutationFn: ({ id, file }) => {
			const body = new FormData();
			body.append('media_id', String(id));
			body.append('file', file, file.name);

			return rest.post('flexify-dashboard/v1/media/replace', body);
		},
		onSuccess: () => {
			notify({ tone: 'success', title: __('File replaced') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const setTags = useMutation<unknown, Error, { id: number; tags: number[] }>({
		mutationFn: ({ id, tags }) => rest.post(`flexify-dashboard/v1/media/${id}/tags`, { tag_ids: tags }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Tags updated') });
			queryClient.invalidateQueries({ queryKey: ['media-tags'] });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return {
		save,
		upload,
		bulk,
		replace,
		setTags,
		/** Attachments have no trash: deleting one asks for `force` or WordPress refuses. */
		remove: (id: number) => rest.remove(`wp/v2/media/${id}`, { force: true }),
		refresh,
	};
};
