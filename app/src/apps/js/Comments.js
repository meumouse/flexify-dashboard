import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/comments.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/comments/index.vue';
import CommentsLayout from '@/pages/comments/src/layout.vue';

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
    component: CommentsLayout,
    name: 'comments-library',
    meta: { name: __('Comments', 'flexify-dashboard') },
  },
  {
    path: '/details/:commentId',
    component: CommentsLayout,
    name: 'comment-details',
    meta: { name: __('Comment Details', 'flexify-dashboard') },
    props: true,
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

app.use(router);

app.mount('#fd-comments-page');
