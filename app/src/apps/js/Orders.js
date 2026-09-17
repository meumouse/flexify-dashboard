import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/orders.css';

import { useAppStore } from '@/store/app/app.js';
import { setGlobalProperties, setVueGlobalProperties } from '@/setup/setGlobalProperties.js';

import AppWrapper from '@/pages/orders/index.vue';

const app = createApp(AppWrapper);

const pinia = createPinia();
app.use(pinia);

const appStore = useAppStore();
setGlobalProperties(appStore, '#fd-script', '#fd-woocommerce-script');

setVueGlobalProperties(app);

const routes = [
  {
    path: '/',
    component: () => import('@/pages/orders/src/OrdersList.vue'),
    name: 'orders',
    meta: { name: __('Orders', 'flexify-dashboard') },
  },
  {
    path: '/new',
    component: () => import('@/pages/orders/src/OrderEditor.vue'),
    name: 'order-new',
    meta: { name: __('Add order', 'flexify-dashboard') },
  },
  {
    path: '/order/:id(\\d+)/edit',
    component: () => import('@/pages/orders/src/OrderEditor.vue'),
    name: 'order-edit',
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { name: __('Edit order items', 'flexify-dashboard') },
  },
  {
    path: '/order/:id(\\d+)',
    component: () => import('@/pages/orders/src/OrderDetails.vue'),
    name: 'order-details',
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { name: __('Order details', 'flexify-dashboard') },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

app.use(router);

app.mount('#fd-orders-page');
