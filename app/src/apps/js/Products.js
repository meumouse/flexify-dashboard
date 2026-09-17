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
    path: '/categories',
    component: () => import('@/pages/products/src/CategoriesView.vue'),
    name: 'product-categories',
    meta: { name: __('Categories', 'flexify-dashboard') },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-products-page');
