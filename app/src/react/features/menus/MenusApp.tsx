import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { PageSkeleton } from '@/react/ui';
import { MenusList } from '@/react/features/menus/MenusList';

/** Routes of the menu builder. The editor loads on demand. */

const MenuEditor = lazy(() => import('@/react/features/menus/MenuEditor').then((module) => ({ default: module.MenuEditor })));

export const MenusApp = () => (
	<HashRouter>
		<PageShell width="full">
			<Suspense
				fallback={<PageSkeleton />}
			>
				<Routes>
					<Route path="/" element={<MenusList />} />
					<Route path="/menu/:id" element={<MenuEditor />} />
					<Route path="*" element={<MenusList />} />
				</Routes>
			</Suspense>
		</PageShell>
	</HashRouter>
);
