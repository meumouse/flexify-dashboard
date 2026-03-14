import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/plugins.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import Root from '@/pages/plugins/root.vue';
import AppWrapper from '@/pages/plugins/index.vue';
import PluginRepo from '@/pages/plugins/src/plugin-repo.vue';
import PluginInspect from '@/pages/plugins/src/plugin-inspect.vue';
import PluginPerformance from '@/pages/plugins/src/plugin-performance.vue';
import PluginDetailsView from '@/pages/plugins/src/plugin-details-view.vue';

// Build app
const app = createApp(Root);

// Setup router
const routes = [
  {
    path: '/',
    component: AppWrapper,
    meta: { name: __('Plugins', 'flexify-dashboard') },
    children: [
      {
        name: 'plugin-details',
        path: ':slug',
        component: PluginDetailsView,
      },
      {
        name: 'plugin-search',
        path: 'plugin-search',
        component: PluginRepo,
        children: [
          {
            name: 'plugin-inspect',
            path: ':slug',
            component: PluginInspect,
          },
        ],
      },
      {
        name: 'plugin-performance',
        path: 'plugin-performance/:slug',
        component: PluginPerformance,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
app.use(router);

// Use pinia
const pinia = createPinia();
app.use(pinia);

// Update app store
const appStore = useAppStore();
setGlobalProperties(appStore);

// Declare translation functions
setVueGlobalProperties(app);

app.mount('#fd-plugins-page');
