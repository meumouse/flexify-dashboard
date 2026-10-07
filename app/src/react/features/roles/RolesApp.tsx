import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { Spinner } from '@/react/ui';
import { RolesList } from '@/react/features/roles/RolesList';

/** Routes of the role editor. One role loads on demand. */

const RoleDetails = lazy(() => import('@/react/features/roles/RoleDetails').then((module) => ({ default: module.RoleDetails })));

export const RolesApp = () => (
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
					<Route path="/" element={<RolesList />} />
					<Route path="/role/:slug" element={<RoleDetails />} />
					<Route path="*" element={<RolesList />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
