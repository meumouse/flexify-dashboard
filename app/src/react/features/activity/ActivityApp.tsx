import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { PageSkeleton } from '@/react/ui';
import { ActivityList } from '@/react/features/activity/ActivityList';

/** Routes of the activity log. One entry loads on demand. */

const ActivityDetails = lazy(() => import('@/react/features/activity/ActivityDetails').then((module) => ({ default: module.ActivityDetails })));

export const ActivityApp = () => (
	<HashRouter>
		<PageShell width="full">
			<Suspense
				fallback={<PageSkeleton />}
			>
				<Routes>
					<Route path="/" element={<ActivityList />} />
					<Route path="/entry/:id" element={<ActivityDetails />} />
					<Route path="*" element={<ActivityList />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
