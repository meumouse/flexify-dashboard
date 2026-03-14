import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/role-editor.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/role-editor/index.vue';
import RoleEditorLayout from '@/pages/role-editor/src/layout.vue';

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
    component: RoleEditorLayout,
    name: 'role-editor',
    meta: { name: __('Role Editor', 'flexify-dashboard') },
    children: [
      {
        path: '/role/:roleSlug',
        component: () =>
          import('@/pages/role-editor/src/role-details-view.vue'),
        name: 'role-details',
        meta: { name: __('Role Details', 'flexify-dashboard') },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-role-editor-page');
