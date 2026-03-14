import { ref } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { updatePluginData } from './updatePluginData.js';

export const activating = ref(false);

/**
 * Activates a given plugin
 *
 * @param {Object} plugin - The plugin object to activate
 * @param {Function} emit - Emit function for component updates
 * @returns {Promise<boolean>} - Success status
 */
export const activatePlugin = async (plugin, emit) => {
  if (!plugin || !plugin.slug) {
    notify({
      title: 'Error',
      message: 'Invalid plugin data',
      type: 'error',
    });
    return false;
  }

  activating.value = true;

  try {
    const slug = plugin.slug.split('/')[0];

    const args = {
      endpoint: `flexify-dashboard/v1/plugin/activate/${slug}`,
      params: {},
      type: 'POST',
    };

    const response = await lmnFetch(args);

    if (!response) {
      notify({
        title: 'Activation Failed',
        message: 'Unable to activate plugin. Please try again.',
        type: 'error',
      });
      return false;
    }

    // Check if activation was successful
    if (response.data && response.data.success === false) {
      notify({
        title: 'Activation Failed',
        message: response.data.message || 'Plugin activation failed',
        type: 'error',
      });
      return false;
    }

    notify({
      title: 'Plugin activated',
      message: plugin.Title || plugin.Name || 'Plugin activated successfully',
      type: 'success',
    });

    // Update plugin data in store
    const updateSuccess = updatePluginData(plugin, {
      active: true,
      action_links: response.data?.action_links || [],
    });

    if (!updateSuccess) {
      console.warn('Failed to update plugin data in store');
    }

    // Dispatch event to allow other Flexify Dashboard components update correctly
    const pluginEvent = new CustomEvent('flexify-dashboard-plugin-activated', {
      detail: slug,
    });
    document.dispatchEvent(pluginEvent);

    return true;
  } catch (error) {
    console.error('Plugin activation error:', error);
    notify({
      title: 'Activation Failed',
      message: 'An unexpected error occurred during activation',
      type: 'error',
    });
    return false;
  } finally {
    activating.value = false;
  }
};
