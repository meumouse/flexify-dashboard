import '@/apps/css/products.css';

import { mountApp } from '@/react/app/mount';
import { ProductsApp } from '@/react/features/products/ProductsApp';

mountApp('fd-products-page', <ProductsApp />, '#fd-woocommerce-script');
