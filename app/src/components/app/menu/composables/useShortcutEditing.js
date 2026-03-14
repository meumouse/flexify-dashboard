import { ref } from 'vue';

/**
 * Composable for managing shortcut/favorite editing
 * 
 * @param {Function} updateFavorite - Function to update a favorite item
 * @returns {Object} Shortcut editing state and functions
 */
export function useShortcutEditing(updateFavorite) {
  // Editing state
  const editingShortcut = ref(null);
  const shortcutEditName = ref('');
  const shortcutEditUrl = ref('');
  const shortcutEditIcon = ref('');

  /**
   * Starts editing a shortcut
   * @param {Object} shortcut - The shortcut to edit
   */
  const startEditShortcut = (shortcut) => {
    editingShortcut.value = shortcut;
    shortcutEditName.value = shortcut.settings?.name || shortcut.name || '';
    shortcutEditUrl.value = shortcut.url || '';
    shortcutEditIcon.value = shortcut.settings?.icon || 'link';
  };

  /**
   * Saves shortcut edits
   */
  const saveShortcutEdit = () => {
    if (!editingShortcut.value) return;

    if (updateFavorite) {
      updateFavorite(editingShortcut.value, {
        url: shortcutEditUrl.value,
        name: shortcutEditName.value,
        settings: {
          ...editingShortcut.value.settings,
          name: shortcutEditName.value,
          icon: shortcutEditIcon.value,
        },
      });
    }

    cancelShortcutEdit();
  };

  /**
   * Cancels shortcut editing
   */
  const cancelShortcutEdit = () => {
    editingShortcut.value = null;
    shortcutEditName.value = '';
    shortcutEditUrl.value = '';
    shortcutEditIcon.value = '';
  };

  /**
   * Checks if a shortcut is currently being edited
   * @param {Object} shortcut - The shortcut to check
   * @returns {boolean} True if this shortcut is being edited
   */
  const isEditing = (shortcut) => {
    return editingShortcut.value?.url === shortcut?.url;
  };

  return {
    editingShortcut,
    shortcutEditName,
    shortcutEditUrl,
    shortcutEditIcon,
    startEditShortcut,
    saveShortcutEdit,
    cancelShortcutEdit,
    isEditing,
  };
}
