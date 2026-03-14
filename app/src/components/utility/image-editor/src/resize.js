/**
 * Resize functions for image editing
 * Functions for resizing images while maintaining aspect ratio
 */

/**
 * Handle resize width change
 * @param {Object} state - State object containing resize-related refs
 * @returns {void}
 */
export const handleResizeWidthChange = (state) => {
  if (state.lockAspectRatio.value && state.originalAspectRatio.value > 0) {
    state.resizeHeight.value = Math.round(
      state.resizeWidth.value / state.originalAspectRatio.value
    );
  }
};

/**
 * Handle resize height change
 * @param {Object} state - State object containing resize-related refs
 * @returns {void}
 */
export const handleResizeHeightChange = (state) => {
  if (state.lockAspectRatio.value && state.originalAspectRatio.value > 0) {
    state.resizeWidth.value = Math.round(
      state.resizeHeight.value * state.originalAspectRatio.value
    );
  }
};

/**
 * Apply resize to image
 * @param {Object} state - State object containing image and resize-related refs
 * @param {Function} nextTick - Vue's nextTick function
 * @param {Function} initializeCanvas - Function to reinitialize canvas
 * @param {Function} saveToHistory - Function to save state to history
 * @returns {Promise<void>}
 */
export const applyResize = async (
  state,
  nextTick,
  initializeCanvas,
  saveToHistory
) => {
  if (
    !state.currentImage.value ||
    state.resizeWidth.value <= 0 ||
    state.resizeHeight.value <= 0
  )
    return;

  const canvas = document.createElement('canvas');
  canvas.width = state.resizeWidth.value;
  canvas.height = state.resizeHeight.value;
  const ctx = canvas.getContext('2d');

  // Use high-quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    state.currentImage.value,
    0,
    0,
    state.resizeWidth.value,
    state.resizeHeight.value
  );

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = () => {
      state.currentImage.value = img;
      state.imageWidth.value = img.width;
      state.imageHeight.value = img.height;
      state.originalAspectRatio.value = img.width / img.height;
      resolve();
    };
    img.onerror = reject;
    img.src = canvas.toDataURL('image/png');
  });

  await nextTick();
  initializeCanvas();
  saveToHistory();
};

