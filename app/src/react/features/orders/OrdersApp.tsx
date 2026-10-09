import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { PageSkeleton } from '@/react/ui';
import { WooProvider } from '@/react/woo/WooProvider';
import { OrdersList } from '@/react/features/orders/OrdersList';

/**
 * Routes of the orders screen. The details view loads on demand because the list is what
 * opens first on almost every visit.
 */

const OrderDetails = lazy(() => import('@/react/features/orders/OrderDetails').then((module) => ({ default: module.OrderDetails })));
const OrderPrint = lazy(() => import('@/react/features/orders/OrderPrint').then((module) => ({ default: module.OrderPrint })));
const OrderEditor = lazy(() => import('@/react/features/orders/OrderEditor').then((module) => ({ default: module.OrderEditor })));

export const OrdersApp = () => (
	<WooProvider>
		<HashRouter>
			<PageShell>
				<Suspense fallback={<PageSkeleton />}>
					<Routes>
						<Route path="/" element={<OrdersList />} />
						<Route path="/new" element={<OrderEditor />} />
						<Route path="/order/:id" element={<OrderDetails />} />
						<Route path="/order/:id/edit" element={<OrderEditor />} />
						<Route path="/order/:id/print" element={<OrderPrint />} />
						<Route path="*" element={<OrdersList />} />
					</Routes>
				</Suspense>
			</PageShell>
		</HashRouter>
	</WooProvider>
);
