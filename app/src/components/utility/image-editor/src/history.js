/**
 * History management functions for undo/redo
 * Functions for managing edit history and state restoration
 */

/**
 * Save current state to history
 * @param {Object} state - State object containing all editor state refs
 * @param {Object} history - History array ref
 * @param {Object} historyIndex - History index ref
 * @param {number} maxHistorySize - Maximum history size
 * @param {HTMLImageElement} currentImage - Current image element (for saving imageData)
 * @returns {void}
 */
export const saveToHistory = (
  state,
  history,
  historyIndex,
  maxHistorySize,
  currentImage
) => {
  const historyState = {
    brightness: state.brightness.value,
    contrast: state.contrast.value,
    saturation: state.saturation.value,
    hue: state.hue.value,
    exposure: state.exposure.value,
    vibrance: state.vibrance.value,
    sharpness: state.sharpness.value,
    highlights: state.highlights.value,
    shadows: state.shadows.value,
    temperature: state.temperature.value,
    tint: state.tint.value,
    vignette: state.vignette.value,
    blur: state.blur.value,
    grain: state.grain.value,
    rotation: state.rotation.value,
    flipHorizontal: state.flipHorizontal.value,
    flipVertical: state.flipVertical.value,
    imageWidth: state.imageWidth.value,
    imageHeight: state.imageHeight.value,
    imageData: currentImage ? currentImage.src : null,
  };

  // Remove any states after current index (when undoing then making new changes)
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1);
  }

  // Add new state
  history.value.push(historyState);
  historyIndex.value = history.value.length - 1;

  // Limit history size
  if (history.value.length > maxHistorySize) {
    history.value.shift();
    historyIndex.value--;
  }
};

/**
 * Restore state from history
 * @param {Object} state - State object containing all editor state refs
 * @param {Object} historyState - The state to restore
 * @param {Function} nextTick - Vue's nextTick function
 * @param {Function} initializeCanvas - Function to reinitialize canvas
 * @param {Object} currentImage - Current image ref (for image restoration)
 * @returns {Promise<void>}
 */
export const restoreState = async (
  state,
  historyState,
  nextTick,
  initializeCanvas,
  currentImage
) => {
  state.brightness.value = historyState.brightness;
  state.contrast.value = historyState.contrast;
  state.saturation.value = historyState.saturation;
  state.hue.value = historyState.hue;
  state.exposure.value = historyState.exposure;
  state.vibrance.value = historyState.vibrance;
  state.sharpness.value = historyState.sharpness;
  state.highlights.value = historyState.highlights || 0;
  state.shadows.value = historyState.shadows || 0;
  state.temperature.value = historyState.temperature || 0;
  state.tint.value = historyState.tint || 0;
  state.vignette.value = historyState.vignette || 0;
  state.blur.value = historyState.blur || 0;
  state.grain.value = historyState.grain || 0;
  state.rotation.value = historyState.rotation;
  state.flipHorizontal.value = historyState.flipHorizontal;
  state.flipVertical.value = historyState.flipVertical;
  state.imageWidth.value = historyState.imageWidth;
  state.imageHeight.value = historyState.imageHeight;

  // Restore image if imageData changed
  if (historyState.imageData && historyState.imageData !== currentImage.value?.src) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = () => {
        currentImage.value = img;
        resolve();
      };
      img.onerror = reject;
      img.src = historyState.imageData;
    });
  }

  await nextTick();
  initializeCanvas();
};

/**
 * Undo last action
 * @param {Object} history - History array ref
 * @param {Object} historyIndex - History index ref
 * @param {Object} state - State object containing all editor state refs
 * @param {Function} nextTick - Vue's nextTick function
 * @param {Function} initializeCanvas - Function to reinitialize canvas
 * @param {Object} currentImage - Current image ref
 * @returns {Promise<void>}
 */
export const undo = async (
  history,
  historyIndex,
  state,
  nextTick,
  initializeCanvas,
  currentImage
) => {
  if (historyIndex.value <= 0) return; // Can't undo past initial state

  historyIndex.value--;
  const previousState = history.value[historyIndex.value];
  await restoreState(state, previousState, nextTick, initializeCanvas, currentImage);
};

/**
 * Redo last undone action
 * @param {Object} history - History array ref
 * @param {Object} historyIndex - History index ref
 * @param {Object} state - State object containing all editor state refs
 * @param {Function} nextTick - Vue's nextTick function
 * @param {Function} initializeCanvas - Function to reinitialize canvas
 * @param {Object} currentImage - Current image ref
 * @returns {Promise<void>}
 */
export const redo = async (
  history,
  historyIndex,
  state,
  nextTick,
  initializeCanvas,
  currentImage
) => {
  if (historyIndex.value >= history.value.length - 1) return;

  historyIndex.value++;
  const nextState = history.value[historyIndex.value];
  await restoreState(state, nextState, nextTick, initializeCanvas, currentImage);
};

