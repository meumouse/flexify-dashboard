import { ref } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { updatePluginData } from './updatePluginData.js';

export const deleting = ref(false);

/**
 * Deletes a given plugin
 *
 * @param {Object} plugin - The plugin object to delete
 * @param {Function} emit - Emit function for component updates
 * @returns {Promise<boolean>} - Success status
 */
export const deletePlugin = async (plugin, emit) => {
  if (!plugin || !plugin.slug) {
    notify({
      title: 'Error',
      message: 'Invalid plugin data',
      type: 'error',
    });
    return false;
  }

  deleting.value = true;

  try {
    const slug = plugin.slug.split('/')[0];

    const args = {
      endpoint: `flexify-dashboard/v1/plugin/delete/${slug}`,
      params: {},
      type: 'DELETE',
    };

    const response = await lmnFetch(args);

    if (!response) {
      notify({
        title: 'Deletion Failed',
        message: 'Unable to delete plugin. Please try again.',
        type: 'error',
      });
      return false;
    }

    // Check if deletion was successful
    if (response.data && response.data.success === false) {
      notify({
        title: 'Deletion Failed',
        message: response.data.message || 'Plugin deletion failed',
        type: 'error',
      });
      return false;
    }

    notify({
      title: 'Plugin deleted',
      message: plugin.Title || plugin.Name || 'Plugin deleted successfully',
      type: 'success',
    });

    // Update plugin data in store
    const updateSuccess = updatePluginData(plugin, { deleted: true });

    if (!updateSuccess) {
      console.warn('Failed to update plugin data in store');
    }

    return true;
  } catch (error) {
    console.error('Plugin deletion error:', error);
    notify({
      title: 'Deletion Failed',
      message: 'An unexpected error occurred during deletion',
      type: 'error',
    });
    return false;
  } finally {
    deleting.value = false;
  }
};
