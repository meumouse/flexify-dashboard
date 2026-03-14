import { ref } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { updatePluginData } from './updatePluginData.js';

export const updating = ref(false);

/**
 * Updates a given plugin
 *
 * @param {Object} plugin - The plugin object to update
 * @param {Function} emit - Emit function for component updates
 * @returns {Promise<boolean>} - Success status
 */
export const updatePlugin = async (plugin, emit) => {
  if (!plugin || !plugin.slug) {
    notify({
      title: 'Error',
      message: 'Invalid plugin data',
      type: 'error',
    });
    return false;
  }

  if (!plugin.has_update) {
    notify({
      title: 'No Update Available',
      message: 'This plugin is already up to date',
      type: 'info',
    });
    return false;
  }

  updating.value = true;

  try {
    const slug = plugin.slug.split('/')[0];

    const args = {
      endpoint: `flexify-dashboard/v1/plugin/update/${slug}`,
      params: {},
      type: 'POST',
    };

    const response = await lmnFetch(args);

    if (!response) {
      notify({
        title: 'Update Failed',
        message: 'Unable to update plugin. Please try again.',
        type: 'error',
      });
      return false;
    }

    // Check if update was successful
    if (response.data && response.data.success === false) {
      notify({
        title: 'Update Failed',
        message: response.data.message || 'Plugin update failed',
        type: 'error',
      });
      return false;
    }

    notify({
      title: 'Plugin updated',
      message: plugin.Title || plugin.Name || 'Plugin updated successfully',
      type: 'success',
    });

    // Update plugin data in store
    const updateSuccess = updatePluginData(plugin, {
      has_update: false,
      Version: plugin.new_version || plugin.Version,
    });

    if (!updateSuccess) {
      console.warn('Failed to update plugin data in store');
    }

    return true;
  } catch (error) {
    console.error('Plugin update error:', error);
    notify({
      title: 'Update Failed',
      message: 'An unexpected error occurred during update',
      type: 'error',
    });
    return false;
  } finally {
    updating.value = false;
  }
};
