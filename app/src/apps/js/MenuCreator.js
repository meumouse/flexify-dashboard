import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/menu-creator.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/menu-creator/index.vue';
import MenuLayout from '@/pages/menu-creator/src/layout.vue';

// Build app
const app = createApp(AppWrapper);

// Use pinia
const pinia = createPinia();
app.use(pinia);

// Update app store
const appStore = useAppStore();
setGlobalProperties(appStore);

// Declare translation functions
setVueGlobalProperties(app);

// Routes
// Setup router
const routes = [
  {
    path: '/',
    component: MenuLayout,
    name: 'menu-creator',
    meta: { name: __('Menu Creator', 'flexify-dashboard') },
    children: [
      {
        path: '/edit/:menuid',
        component: () => import('@/pages/menu-creator/src/edit.vue'),
        name: 'menu-editor',
        meta: { name: __('Menu editor', 'flexify-dashboard') },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-menu-creator-app');
