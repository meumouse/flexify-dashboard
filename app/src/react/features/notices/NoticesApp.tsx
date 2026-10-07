import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { Spinner } from '@/react/ui';
import { NoticesList } from '@/react/features/notices/NoticesList';

/** Routes of the admin notices screen. The editor loads on demand; it carries Tiptap. */

const NoticeEditor = lazy(() => import('@/react/features/notices/NoticeEditor').then((module) => ({ default: module.NoticeEditor })));

export const NoticesApp = () => (
	<HashRouter>
		<PageShell>
			<Suspense
				fallback={
					<div className="flex items-center justify-center py-20">
						<Spinner className="h-8 w-8 text-brand-500" />
					</div>
				}
			>
				<Routes>
					<Route path="/" element={<NoticesList />} />
					<Route path="/notice/:id" element={<NoticeEditor />} />
					<Route path="*" element={<NoticesList />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
