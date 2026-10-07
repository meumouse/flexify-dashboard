import '@/apps/css/orders.css';

import { mountApp } from '@/react/app/mount';
import { OrdersApp } from '@/react/features/orders/OrdersApp';

mountApp('fd-orders-page', <OrdersApp />, '#fd-woocommerce-script');
