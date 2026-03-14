import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/database.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/database/index.vue';
import DatabaseLayout from '@/pages/database/src/layout.vue';

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
const routes = [
  {
    path: '/',
    component: DatabaseLayout,
    name: 'database-explorer',
    meta: { name: __('Database Explorer', 'flexify-dashboard') },
    children: [
      {
        path: '/table/:tableName',
        component: () => import('@/pages/database/src/table-view.vue'),
        name: 'table-view',
        meta: { name: __('Table View', 'flexify-dashboard') },
      },
      {
        path: '/query',
        component: () => import('@/pages/database/src/query-editor.vue'),
        name: 'query-editor',
        meta: { name: __('SQL Query Editor', 'flexify-dashboard') },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-database-page');
