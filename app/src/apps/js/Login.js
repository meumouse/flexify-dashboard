import { createApp } from 'vue';
import '@/apps/css/login.css';
import LoginApp from '@/pages/login/index.vue';

const mountPoint = document.querySelector('#fd-login-app');

if (mountPoint) {
  createApp(LoginApp).mount(mountPoint);
}
