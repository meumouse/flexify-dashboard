/**
 * Transform functions for image editing
 * Functions for rotating and flipping images
 */

/**
 * Rotate image by specified degrees
 * @param {Object} state - State object containing rotation ref
 * @param {number} degrees - Degrees to rotate (positive = clockwise)
 * @param {Function} drawImage - Function to redraw the image after rotation
 * @returns {void}
 */
export const rotateImage = (state, degrees, drawImage) => {
  state.rotation.value = (state.rotation.value + degrees) % 360;
  drawImage();
};

/**
 * Flip image horizontally
 * @param {Object} state - State object containing flipHorizontal ref
 * @param {Function} drawImage - Function to redraw the image after flip
 * @returns {void}
 */
export const flipImageHorizontal = (state, drawImage) => {
  state.flipHorizontal.value = !state.flipHorizontal.value;
  drawImage();
};

/**
 * Flip image vertically
 * @param {Object} state - State object containing flipVertical ref
 * @param {Function} drawImage - Function to redraw the image after flip
 * @returns {void}
 */
export const flipImageVertical = (state, drawImage) => {
  state.flipVertical.value = !state.flipVertical.value;
  drawImage();
};

/**
 * Reset all transformations
 * @param {Object} state - State object containing transformation refs
 * @param {Function} drawImage - Function to redraw the image after reset
 * @returns {void}
 */
export const resetTransformations = (state, drawImage) => {
  state.rotation.value = 0;
  state.flipHorizontal.value = false;
  state.flipVertical.value = false;
  drawImage();
};

