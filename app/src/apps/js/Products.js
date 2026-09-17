import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/products.css';

import { useAppStore } from '@/store/app/app.js';
import { setGlobalProperties, setVueGlobalProperties } from '@/setup/setGlobalProperties.js';

import AppWrapper from '@/pages/products/index.vue';

const app = createApp(AppWrapper);

const pinia = createPinia();
app.use(pinia);

const appStore = useAppStore();
setGlobalProperties(appStore, '#fd-script', '#fd-woocommerce-script');

setVueGlobalProperties(app);

const routes = [
  {
    path: '/',
    component: () => import('@/pages/products/src/ProductsList.vue'),
    name: 'products',
    meta: { name: __('Products', 'flexify-dashboard') },
  },
  {
    path: '/new',
    component: () => import('@/pages/products/src/editor/ProductEditor.vue'),
    name: 'product-new',
    meta: { name: __('Add product', 'flexify-dashboard') },
  },
  {
    path: '/product/:id(\\d+)',
    component: () => import('@/pages/products/src/editor/ProductEditor.vue'),
    name: 'product-edit',
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { name: __('Edit product', 'flexify-dashboard') },
  },
  {
    path: '/categories',
    component: () => import('@/pages/products/src/CategoriesView.vue'),
    name: 'product-categories',
    meta: { name: __('Categories', 'flexify-dashboard') },
  },
  {
    path: '/attributes',
    component: () => import('@/pages/products/src/AttributesView.vue'),
    name: 'product-attributes',
    meta: { name: __('Attributes', 'flexify-dashboard') },
  },
  {
    path: '/coupons',
    component: () => import('@/pages/products/src/CouponsView.vue'),
    name: 'coupons',
    meta: { name: __('Coupons', 'flexify-dashboard') },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

app.use(router);

app.mount('#fd-products-page');
