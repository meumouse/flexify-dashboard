import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, Icon, Input, PageHeader, Select, Skeleton, Textarea } from '@/react/ui';
import { EntityPicker } from '@/react/data/EntityPicker';
import { iconFor } from '@/react/features/media/MediaGrid';
import { fileNameOf, formatBytes, useMediaItem, useMediaMutations, useMediaUsage, type MediaItem } from '@/react/features/media/queries';

/**
 * One file: what it is, where it is used, and everything about it that can be changed —
 * including the file itself.
 */

type Draft = { title: string; alt_text: string; caption: string; description: string };

const draftOf = (item: MediaItem): Draft => ({
	title: item.title.raw ?? decodeHtml(stripTags(item.title.rendered)),
	alt_text: item.alt_text ?? '',
	caption: item.caption?.raw ?? decodeHtml(stripTags(item.caption?.rendered ?? '')),
	description: item.description?.raw ?? decodeHtml(stripTags(item.description?.rendered ?? '')),
});

const Detail = ({ label, value }: { label: string; value: string }) => (
	<div className="flex justify-between gap-4 text-theme-sm">
		<dt className="text-gray-500 dark:text-gray-400">{label}</dt>
		<dd className="truncate font-medium text-gray-800 dark:text-white/90">{value}</dd>
	</div>
);

export const MediaDetails = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const media = useMediaItem(Number(id) || null);
	const usage = useMediaUsage(Number(id) || null);
	const { save, replace, bulk, remove, setTags } = useMediaMutations();
	const [draft, setDraft] = useState<Draft | null>(null);
	const [size, setSize] = useState('full');
	const fileInput = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (media.data) {
			setDraft(draftOf(media.data));
		}
	}, [media.data]);

	const original = media.data ? draftOf(media.data) : null;
	const dirty = Boolean(draft && original && JSON.stringify(draft) !== JSON.stringify(original));

	useUnsavedChanges(dirty);

	if (media.isLoading || !draft) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-80 w-full" />
			</div>
		);
	}

	if (media.isError || !media.data) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This file could not be loaded.')}</p>
			</Card>
		);
	}

	const item = media.data;
	const isImage = item.mime_type.startsWith('image/');
	const sizes = Object.entries(item.media_details?.sizes ?? {});
	const shown = size === 'full' ? item.source_url : (item.media_details?.sizes?.[size]?.source_url ?? item.source_url);

	const copy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			notify({ tone: 'success', title: __('Copied to the clipboard') });
		} catch {
			notify({ tone: 'error', title: __('The clipboard is not available here.') });
		}
	};

	const askThenDelete = async () => {
		const confirmed = await confirm({
			title: __('Delete this file?'),
			message: __('The file will be deleted for good. The media library has no trash.'),
			confirmLabel: __('Delete permanently'),
			variant: 'danger',
		});

		if (confirmed) {
			bulk.mutate({ ids: [item.id], action: remove, message: __('File deleted') }, { onSuccess: () => navigate('/') });
		}
	};

	return (
		<>
			<PageHeader
				title={decodeHtml(stripTags(item.title.rendered)) || fileNameOf(item)}
				breadcrumbs={[{ label: __('Media'), href: '#/' }, { label: __('File') }]}
				actions={
					<div className="flex items-center gap-3">
						{isImage ? (
							<Button variant="outline" icon="tune" href={`#/file/${item.id}/edit`}>
								{__('Edit image')}
							</Button>
						) : null}
						<Button variant="outline" icon="delete" className="text-error-600" onClick={askThenDelete}>
							{__('Delete')}
						</Button>
						<Button icon="save" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate({ id: item.id, data: { ...draft } })}>
							{__('Save changes')}
						</Button>
					</div>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="flex flex-col gap-6 lg:col-span-2">
					<Card className="p-0">
						<div className="flex min-h-80 items-center justify-center overflow-hidden rounded-t-2xl bg-gray-100 p-4 dark:bg-gray-800">
							{isImage ? (
								<img src={shown} alt={item.alt_text} className="max-h-[32rem] max-w-full object-contain" />
							) : item.mime_type.startsWith('video/') ? (
								<video src={item.source_url} controls className="max-h-[32rem] max-w-full" />
							) : item.mime_type.startsWith('audio/') ? (
								<audio src={item.source_url} controls className="w-full" />
							) : (
								<span className="text-center text-gray-400">
									<Icon name={iconFor(item.mime_type)} className="mb-2 text-title-lg" />
									<span className="block text-theme-sm">{fileNameOf(item)}</span>
								</span>
							)}
						</div>

						<div className="flex flex-wrap items-center gap-3 p-4">
							{sizes.length ? (
								<Select
									size="sm"
									value={size}
									options={[
										{ value: 'full', label: sprintf(__('Full (%1$s × %2$s)'), String(item.media_details?.width ?? '?'), String(item.media_details?.height ?? '?')) },
										...sizes.map(([name, data]) => ({ value: name, label: `${name} (${data.width} × ${data.height})` })),
									]}
									onChange={(event) => setSize(event.target.value)}
									aria-label={__('Size')}
								/>
							) : null}

							<Button variant="outline" size="sm" icon="link" onClick={() => copy(shown)}>
								{__('Copy URL')}
							</Button>
							<Button variant="outline" size="sm" icon="download" href={item.source_url} download target="_blank" rel="noopener noreferrer">
								{__('Download')}
							</Button>
							<Button variant="outline" size="sm" icon="swap_horiz" loading={replace.isPending} onClick={() => fileInput.current?.click()}>
								{__('Replace file')}
							</Button>

							<input
								ref={fileInput}
								type="file"
								className="hidden"
								aria-hidden
								tabIndex={-1}
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = '';

									if (file) {
										replace.mutate({ id: item.id, file });
									}
								}}
							/>
						</div>
					</Card>

					<Card title={__('Details')}>
						<div className="flex flex-col gap-4">
							<Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} label={__('Title')} />
							{isImage ? (
								<Input value={draft.alt_text} onChange={(event) => setDraft({ ...draft, alt_text: event.target.value })} label={__('Alternative text')} hint={__('What the image shows, for people who cannot see it.')} />
							) : null}
							<Input value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} label={__('Caption')} />
							<Textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} label={__('Description')} />
						</div>
					</Card>
				</div>

				<div className="flex flex-col gap-6">
					<Card title={__('File')}>
						<dl className="space-y-2">
							<Detail label={__('File name')} value={fileNameOf(item)} />
							<Detail label={__('Type')} value={item.mime_type} />
							<Detail label={__('Size')} value={formatBytes(item.media_details?.filesize ?? 0)} />
							{item.media_details?.width ? <Detail label={__('Dimensions')} value={`${item.media_details.width} × ${item.media_details.height}`} /> : null}
							<Detail label={__('Uploaded')} value={new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.date))} />
						</dl>
					</Card>

					<Card title={__('Tags')}>
						<EntityPicker
							endpoint="flexify-dashboard/v1/media/tags"
							toItem={(record) => ({ id: Number(record.id), label: String(record.name ?? '') })}
							value={(item.media_tags ?? []).map((tag) => tag.id)}
							chosen={(item.media_tags ?? []).map((tag) => ({ id: tag.id, label: tag.name }))}
							onChange={(tags) => setTags.mutate({ id: item.id, tags })}
							placeholder={__('Add tags')}
						/>
					</Card>

					<Card title={__('Used in')}>
						{usage.isLoading ? (
							<Skeleton className="h-16 w-full" />
						) : !usage.data?.length ? (
							<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing on the site uses this file.')}</p>
						) : (
							<ul className="space-y-2">
								{usage.data.map((place) => (
									<li key={place.id}>
										<a href={place.edit_link} className="text-theme-sm text-brand-600 hover:underline dark:text-brand-400">
											{decodeHtml(stripTags(place.title))}
										</a>
									</li>
								))}
							</ul>
						)}
					</Card>
				</div>
			</div>
		</>
	);
};
