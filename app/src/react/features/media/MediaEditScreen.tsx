import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { __ } from '@/react/lib/i18n';
import { Card, PageHeader, Skeleton } from '@/react/ui';
import { ImageEditor } from '@/react/features/media/ImageEditor';
import { fileNameOf, useMediaItem, useMediaMutations } from '@/react/features/media/queries';

/**
 * The image editor on its own route, with the file loaded and the result put back in its place.
 */

export const MediaEditScreen = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const media = useMediaItem(Number(id) || null);
	const { replace } = useMediaMutations();
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [failed, setFailed] = useState(false);

	const source = media.data?.source_url;

	useEffect(() => {
		if (!source) {
			return;
		}

		const element = new Image();
		// The canvas refuses to give up its pixels once something from another origin has been
		// drawn on it, so the file is asked for in a way that keeps it readable.
		element.crossOrigin = 'anonymous';
		element.onload = () => setImage(element);
		element.onerror = () => setFailed(true);
		element.src = source;

		return () => {
			element.onload = null;
			element.onerror = null;
		};
	}, [source]);

	if (media.isLoading || (!image && !failed)) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (failed || media.isError || !media.data || !image) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This image could not be opened for editing.')}</p>
			</Card>
		);
	}

	const item = media.data;

	return (
		<>
			<PageHeader
				title={__('Edit image')}
				breadcrumbs={[{ label: __('Media'), href: '#/' }, { label: fileNameOf(item), href: `#/file/${item.id}` }, { label: __('Edit') }]}
			/>

			<ImageEditor
				image={image}
				saving={replace.isPending}
				onCancel={() => navigate(`/file/${item.id}`)}
				onSave={(blob) =>
					replace.mutate(
						{ id: item.id, file: new File([blob], fileNameOf(item), { type: blob.type }) },
						{ onSuccess: () => navigate(`/file/${item.id}`) }
					)
				}
			/>
		</>
	);
};
