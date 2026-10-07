import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { Spinner } from '@/react/ui';
import { CommentsList } from '@/react/features/comments/CommentsList';

/**
 * Routes of the comments screen. One comment opens on its own route, loaded on demand
 * because most visits only moderate from the list.
 */

const CommentDetails = lazy(() => import('@/react/features/comments/CommentDetails').then((module) => ({ default: module.CommentDetails })));

export const CommentsApp = () => (
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
					<Route path="/" element={<CommentsList />} />
					<Route path="/comment/:id" element={<CommentDetails />} />
					<Route path="*" element={<CommentsList />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
