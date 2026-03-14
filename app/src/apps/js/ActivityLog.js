import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/activity-log.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/activity-log/index.vue';
import ActivityLogLayout from '@/pages/activity-log/src/layout.vue';

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
    component: ActivityLogLayout,
    name: 'activity-log-library',
    meta: { name: __('Activity Log', 'flexify-dashboard') },
    children: [
      {
        path: 'details/:logId',
        component: () =>
          import('@/pages/activity-log/src/activity-details-view.vue'),
        name: 'activity-log-details',
        meta: { name: __('Activity Log Details', 'flexify-dashboard') },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-activity-log-page');
