import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { Spinner } from '@/react/ui';
import { WooProvider } from '@/react/woo/WooProvider';
import { OrdersList } from '@/react/features/orders/OrdersList';

/**
 * Routes of the orders screen. The details view loads on demand because the list is what
 * opens first on almost every visit.
 */

const OrderDetails = lazy(() => import('@/react/features/orders/OrderDetails').then((module) => ({ default: module.OrderDetails })));
const OrderEditor = lazy(() => import('@/react/features/orders/OrderEditor').then((module) => ({ default: module.OrderEditor })));

const Loading = () => (
	<div className="flex items-center justify-center py-20">
		<Spinner className="h-8 w-8 text-brand-500" />
	</div>
);

export const OrdersApp = () => (
	<WooProvider>
		<HashRouter>
			<PageShell>
				<Suspense fallback={<Loading />}>
					<Routes>
						<Route path="/" element={<OrdersList />} />
						<Route path="/new" element={<OrderEditor />} />
						<Route path="/order/:id" element={<OrderDetails />} />
						<Route path="/order/:id/edit" element={<OrderEditor />} />
						<Route path="*" element={<OrdersList />} />
					</Routes>
				</Suspense>
			</PageShell>
		</HashRouter>
	</WooProvider>
);
