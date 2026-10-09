import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { PageSkeleton } from '@/react/ui';
import { UsersList } from '@/react/features/users/UsersList';

/**
 * Routes of the users screen. One user's page loads on demand, since most visits only look
 * at the list.
 */

const UserDetails = lazy(() => import('@/react/features/users/UserDetails').then((module) => ({ default: module.UserDetails })));

export const UsersApp = () => (
	<HashRouter>
		<PageShell width="full">
			<Suspense
				fallback={<PageSkeleton />}
			>
				<Routes>
					<Route path="/" element={<UsersList />} />
					<Route path="/user/:id" element={<UserDetails />} />
					<Route path="*" element={<UsersList />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
