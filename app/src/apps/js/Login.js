import { createApp } from 'vue';
import '@/apps/css/login.css';
import LoginApp from '@/pages/login/index.vue';
import { setVueGlobalProperties } from '@/setup/setGlobalProperties.js';

const mountPoint = document.querySelector('#fd-login-app');
const fallback = document.querySelector('#flexify-dashboard-login-fallback');
const fallbackRevealTimeout = 3000;

const showFallback = () => {
  document.body.classList.remove('fd-modern-login-pending');
  document.body.classList.remove('fd-modern-login-mounted');

  if (fallback) {
    fallback.hidden = false;
  }
};

if (mountPoint) {
  const app = createApp(LoginApp);
  const revealFallbackTimer = window.setTimeout(showFallback, fallbackRevealTimeout);

  setVueGlobalProperties(app);

  try {
    app.mount(mountPoint);

    window.clearTimeout(revealFallbackTimer);
    document.body.classList.remove('fd-modern-login-pending');
    document.body.classList.add('fd-modern-login-mounted');

    if (fallback) {
      fallback.hidden = true;
    }
  } catch (error) {
    window.clearTimeout(revealFallbackTimer);
    showFallback();
    console.error('Flexify Dashboard login mount failed.', error);
  }
} else {
  showFallback();
}
