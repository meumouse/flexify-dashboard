import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/media.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/media/index.vue';
import MediaLayout from '@/pages/media/src/layout.vue';

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
    component: MediaLayout,
    name: 'media-library',
    meta: { name: __('Media Library', 'flexify-dashboard') },
    children: [
      {
        path: '/details/:mediaId',
        component: () => import('@/pages/media/src/media-details-view.vue'),
        name: 'media-details',
        meta: { name: __('Media Details', 'flexify-dashboard') },
      },
      {
        path: '/edit/:mediaId',
        component: () => import('@/pages/media/src/media-edit-view.vue'),
        name: 'media-edit',
        meta: { name: __('Edit Image', 'flexify-dashboard') },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-media-page');
