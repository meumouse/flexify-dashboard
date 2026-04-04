import { createApp } from 'vue';
import { createPinia } from 'pinia';

import '@/apps/css/frontend.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import { setGlobalProperties, setVueGlobalProperties } from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapper from '@/components/app/frontend-wrapper/index.vue';

// Build app
const app = createApp(AppWrapper);

// Use pinia
const pinia = createPinia();
app.use(pinia);

// Update app store
const appStore = useAppStore();
setGlobalProperties(appStore);

// Initialise an empty Map for replacements
let replacementMap = new Map();

// Safely create the replacement map if the data is available and valid
if (
  appStore &&
  appStore.state &&
  appStore.state.flexify_dashboard_settings &&
  Array.isArray(appStore.state.flexify_dashboard_settings.text_replacements)
) {
  replacementMap = new Map(
    appStore.state.flexify_dashboard_settings.text_replacements
      .filter(
        (pair) =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          typeof pair[0] === 'string' &&
          typeof pair[1] === 'string'
      )
      .map((pair) => [pair[0], pair[1]])
  );
}
// Store the original __() function
const originalGettext = __;

const translatorFunction = (text, domain) => {
  // First, apply our custom replacements
  let replacedText = replacementMap.get(text) || text;
  // Then, call the original __() function
  return originalGettext(replacedText, domain);
};

window.__ = translatorFunction;

// Declare translation functions
setVueGlobalProperties(app, { __: translatorFunction });

// Move favicon to head
const faviconLink = document.getElementById('flexify-dashboard-favicon');

// Check if the element exists
if (faviconLink) {
  // Get the head element
  const head = document.getElementsByTagName('head')[0];
  // Move the favicon link to the head
  head.appendChild(faviconLink);
}

const mountPoint = document.querySelector('#wpadminbar');
if (mountPoint) {
  // Create the div element
  const div = document.createElement('div');
  div.id = 'fd-classic-app';
  mountPoint.appendChild(div);
  app.mount(div);
}
