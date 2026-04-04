import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import '@/apps/css/flexify-dashboard.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';

// Import comps
import AppWrapperMenu from '@/components/app/wrapper/index.vue';

const __ = window.wp?.i18n?.__ ?? ((s) => s);

// Build app
const app = createApp(AppWrapperMenu);

// Use pinia
const pinia = createPinia();
app.use(pinia);

// Update app store
const appStore = useAppStore();
setGlobalProperties(appStore);

// Initialize an empty Map for replacements
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

const mountPointMenu = document.querySelector('#adminmenumain');

if (mountPointMenu) {
  const newDiv = document.createElement('div');
  newDiv.id = 'flexify-dashboard-app-wrapper';

  //const wrap = document.querySelector('#wpwrap');
  document.body.prepend(newDiv);
  app.mount(newDiv);
}

const temporaryStyles = document.querySelector('#fd-temporary-body-hider');
if (temporaryStyles) {
  nextTick(() => {
    temporaryStyles.remove();
  });
}
