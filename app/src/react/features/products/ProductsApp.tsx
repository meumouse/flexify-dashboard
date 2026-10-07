import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/react/app/PageShell';
import { Spinner } from '@/react/ui';
import { WooProvider } from '@/react/woo/WooProvider';
import { ProductsList } from '@/react/features/products/ProductsList';

/**
 * Routes of the products screen. The catalog views load on demand because most visits
 * only ever open the list.
 */

const CategoriesView = lazy(() => import('@/react/features/products/CategoriesView').then((module) => ({ default: module.CategoriesView })));
const TagsView = lazy(() => import('@/react/features/products/TagsView').then((module) => ({ default: module.TagsView })));
const AttributesView = lazy(() => import('@/react/features/products/AttributesView').then((module) => ({ default: module.AttributesView })));
const CouponsView = lazy(() => import('@/react/features/products/CouponsView').then((module) => ({ default: module.CouponsView })));

const Loading = () => (
	<div className="flex items-center justify-center py-20">
		<Spinner className="h-8 w-8 text-brand-500" />
	</div>
);

export const ProductsApp = () => (
	<WooProvider>
		<HashRouter>
			<PageShell>
				<Suspense fallback={<Loading />}>
					<Routes>
						<Route path="/" element={<ProductsList />} />
						<Route path="/categories" element={<CategoriesView />} />
						<Route path="/tags" element={<TagsView />} />
						<Route path="/attributes" element={<AttributesView />} />
						<Route path="/coupons" element={<CouponsView />} />
						<Route path="*" element={<ProductsList />} />
					</Routes>
				</Suspense>
			</PageShell>
		</HashRouter>
	</WooProvider>
);
