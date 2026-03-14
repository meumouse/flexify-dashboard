import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/admin-notices.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/admin-notices/index.vue';
import NoticesTable from '@/pages/admin-notices/src/table.vue';
// We'll create edit.vue next, but import it here for router setup
import NoticeEdit from '@/pages/admin-notices/src/edit.vue';

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
    component: NoticesTable,
    name: 'admin-notices-table',
    meta: { name: __('Admin Notices', 'flexify-dashboard') },
    children: [
      {
        path: '/edit/:noticeid',
        component: NoticeEdit,
        name: 'notice-editor',
        meta: { name: __('Edit Notice', 'flexify-dashboard') },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#flexify-dashboard-admin-notices-app');
