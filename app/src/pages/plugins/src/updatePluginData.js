import { useAppStore } from '@/store/app/app.js';

/**
 * Updates plugin data in the app store
 *
 * @param {Object} plugin - The plugin object to update
 * @param {Object} data - The data to merge with the existing plugin
 * @returns {boolean} - Success status
 */
export const updatePluginData = (plugin, data) => {
  try {
    // Get fresh store instance each time to avoid reference issues
    const appStore = useAppStore();

    if (!appStore || !appStore.state || !appStore.state.pluginsList) {
      console.error('App store not available for plugin update');
      return false;
    }

    if (!plugin || !plugin.slug) {
      console.error('Invalid plugin object for update');
      return false;
    }

    // Ensure the plugin exists in the store before updating
    if (!appStore.state.pluginsList[plugin.slug]) {
      console.warn(`Plugin ${plugin.slug} not found in store, adding it`);
      appStore.state.pluginsList[plugin.slug] = { ...plugin };
    }

    // Merge the new data with existing plugin data
    appStore.state.pluginsList[plugin.slug] = {
      ...appStore.state.pluginsList[plugin.slug],
      ...data,
    };

    return true;
  } catch (error) {
    console.error('Error updating plugin data:', error);
    return false;
  }
};
