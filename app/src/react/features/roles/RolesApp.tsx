import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { PageSkeleton } from '@/react/ui';
import { RolesList } from '@/react/features/roles/RolesList';

/** Routes of the role editor. One role loads on demand. */

const RoleDetails = lazy(() => import('@/react/features/roles/RoleDetails').then((module) => ({ default: module.RoleDetails })));

export const RolesApp = () => (
	<HashRouter>
		<PageShell width="full">
			<Suspense
				fallback={<PageSkeleton />}
			>
				<Routes>
					<Route path="/" element={<RolesList />} />
					<Route path="/role/:slug" element={<RoleDetails />} />
					<Route path="*" element={<RolesList />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
