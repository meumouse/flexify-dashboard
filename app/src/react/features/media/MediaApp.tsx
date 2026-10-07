import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { Spinner } from '@/react/ui';
import { MediaLibrary } from '@/react/features/media/MediaLibrary';

/**
 * Routes of the media screen. One file and the image editor load on demand; the editor in
 * particular carries the whole filter pipeline, which a visit that only browses never needs.
 */

const MediaDetails = lazy(() => import('@/react/features/media/MediaDetails').then((module) => ({ default: module.MediaDetails })));
const MediaEditScreen = lazy(() => import('@/react/features/media/MediaEditScreen').then((module) => ({ default: module.MediaEditScreen })));

export const MediaApp = () => (
	<HashRouter>
		<PageShell width="full">
			<Suspense
				fallback={
					<div className="flex items-center justify-center py-20">
						<Spinner className="h-8 w-8 text-brand-500" />
					</div>
				}
			>
				<Routes>
					<Route path="/" element={<MediaLibrary />} />
					<Route path="/file/:id" element={<MediaDetails />} />
					<Route path="/file/:id/edit" element={<MediaEditScreen />} />
					<Route path="*" element={<MediaLibrary />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
