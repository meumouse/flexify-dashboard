import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@/apps/css/settings.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/pages/settings/index.vue';

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

app.mount('#fd-settings-app');
