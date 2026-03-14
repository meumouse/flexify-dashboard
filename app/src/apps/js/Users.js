import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/users.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/users/index.vue';
import UsersLayout from '@/pages/users/src/layout.vue';

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
    component: UsersLayout,
    name: 'users-library',
    meta: { name: __('Users', 'flexify-dashboard') },
    children: [
      {
        path: '/details/:userId',
        component: () => import('@/pages/users/src/user-details-view.vue'),
        name: 'user-details',
        meta: { name: __('User Details', 'flexify-dashboard') },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-users-page');
