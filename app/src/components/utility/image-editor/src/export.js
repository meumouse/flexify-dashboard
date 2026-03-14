/**
 * Export functions for image editing
 * Functions for exporting edited images
 */

import { applyFiltersToCanvas } from './filters.js';

/**
 * Export edited image
 * @param {Object} state - State object containing all editor state refs
 * @param {HTMLCanvasElement} canvasRef - Reference to the canvas element
 * @returns {string|null} Data URL of the exported image, or null if export fails
 */
export const exportImage = (state, canvasRef) => {
  if (!canvasRef || !state.currentImage.value) return null;

  // Use resize dimensions if they differ from current image dimensions
  const exportWidth =
    state.resizeWidth.value > 0 &&
    state.resizeWidth.value !== state.imageWidth.value
      ? state.resizeWidth.value
      : state.imageWidth.value;
  const exportHeight =
    state.resizeHeight.value > 0 &&
    state.resizeHeight.value !== state.imageHeight.value
      ? state.resizeHeight.value
      : state.imageHeight.value;

  // Create a new canvas with the export dimensions
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const exportCtx = exportCanvas.getContext('2d');

  // Use high-quality scaling
  exportCtx.imageSmoothingEnabled = true;
  exportCtx.imageSmoothingQuality = 'high';

  // Apply transformations
  exportCtx.save();
  exportCtx.translate(exportCanvas.width / 2, exportCanvas.height / 2);
  exportCtx.rotate((state.rotation.value * Math.PI) / 180);

  if (state.flipHorizontal.value) {
    exportCtx.scale(-1, 1);
  }
  if (state.flipVertical.value) {
    exportCtx.scale(1, -1);
  }

  // Draw image
  exportCtx.drawImage(
    state.currentImage.value,
    -exportCanvas.width / 2,
    -exportCanvas.height / 2,
    exportCanvas.width,
    exportCanvas.height
  );

  exportCtx.restore();

  // Apply color filters
  const filterValues = {
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
  };

  applyFiltersToCanvas(exportCanvas, filterValues);

  return exportCanvas.toDataURL('image/jpeg', 0.92);
};

