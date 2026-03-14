import { computed } from 'vue';
import { useAppStore } from '@/store/app/app.js';
let appStore;
/**
 * Generates CSS styles for icon overrides.
 * @param {string} dashicon - The dashicon class (unused in the function body).
 * @param {string} icon - The icon name (unused in the function body).
 * @returns {string} A string of CSS styles for icon overrides.
 */
export const returnIconOverrides = computed(() => {
  if (!appStore) appStore = useAppStore();

  const overrides = [
    ['dashboard', 'dashboard'],
    ['admin-post', 'keep'],
    ['admin-media', 'photo_library'],
    ['admin-page', 'description'],
    ['admin-comments', 'forum'],
    ['admin-appearance', 'palette'],
    ['admin-plugins', 'extension'],
    ['admin-users', 'group'],
    ['admin-tools', 'build'],
    ['admin-settings', 'tune'],
    ['archive', 'inventory'],
    ['chart-bar', 'equalizer'],
  ];

  const base = appStore.state.pluginBase;

  return overrides
    .map(
      ([dashicon, icon]) => `
  .dashicons-${dashicon}:before {
	content: '';
	height: 1.2rem;
	width: 1.2rem;
	min-height: 1.2rem;
	min-width: 1.2rem;
  display: block;
	background-color: currentColor;
	-webkit-mask: url(${base}assets/icons/${icon}.svg) no-repeat center;
	-webkit-mask-size: contain;
	mask: url(${base}assets/icons/${icon}.svg) no-repeat center;
	mask-size: contain;
	font-size: 1.2rem;
  }
`
    )
    .join('');
});
