import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@/apps/css/design-system.css';

import { useAppStore } from '@/store/app/app.js';
import { setGlobalProperties, setVueGlobalProperties } from '@/setup/setGlobalProperties.js';

import DesignSystemPage from '@/pages/design-system/index.vue';

const app = createApp(DesignSystemPage);

const pinia = createPinia();
app.use(pinia);

const appStore = useAppStore();
setGlobalProperties(appStore);

setVueGlobalProperties(app);

app.mount('#fd-design-system-app');
