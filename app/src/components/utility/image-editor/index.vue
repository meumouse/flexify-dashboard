<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import {
  applyFiltersToCanvas,
  applyBlur,
  applySharpening,
  applyGrain,
  applyVibrance,
} from './src/filters.js';
import {
  rotateImage,
  flipImageHorizontal,
  flipImageVertical,
  resetTransformations,
} from './src/transform.js';
import { saveToHistory, undo, redo, restoreState } from './src/history.js';
import {
  handleResizeWidthChange,
  handleResizeHeightChange,
  applyResize,
} from './src/resize.js';
import { loadImage, initializeCanvas } from './src/imageLoader.js';
import { exportImage } from './src/export.js';
import { drawVignette, drawCropOverlay } from './src/canvas.js';

/**
 * Custom Image Editor Component
 *
 * Provides image editing capabilities including:
 * - Cropping
 * - Flip (horizontal/vertical)
 * - Rotate
 * - Color adjustments (brightness, contrast, saturation, hue)
 */

const props = defineProps({
  /**
   * Source image URL
   */
  src: {
    type: String,
    required: true,
  },
  /**
   * Whether the editor is disabled
   */
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['save', 'cancel']);

// Canvas and image refs
const canvasRef = ref(null);
const imageRef = ref(null);
const containerRef = ref(null);
const imageLoaded = ref(false);
const loading = ref(true);

// Image state
const originalImage = ref(null);
const currentImage = ref(null);
const imageWidth = ref(0);
const imageHeight = ref(0);
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

// Transformations
const rotation = ref(0); // degrees
const flipHorizontal = ref(false);
const flipVertical = ref(false);

// Color adjustments
const brightness = ref(0); // -100 to 100
const contrast = ref(0); // -100 to 100
const saturation = ref(0); // -100 to 100
const hue = ref(0); // -180 to 180
const exposure = ref(0); // -100 to 100
const vibrance = ref(0); // -100 to 100
const sharpness = ref(0); // -100 to 100 (negative = blur, positive = sharpen)
const highlights = ref(0); // -100 to 100
const shadows = ref(0); // -100 to 100
const temperature = ref(0); // -100 to 100 (cool to warm)
const tint = ref(0); // -100 to 100 (green to magenta)
const vignette = ref(0); // 0 to 100 (0 = no vignette, 100 = maximum)
const blur = ref(0); // 0 to 100 (0 = no blur, 100 = maximum blur)
const grain = ref(0); // 0 to 100 (0 = no grain, 100 = maximum grain)

// Resize state
const resizeWidth = ref(0);
const resizeHeight = ref(0);
const lockAspectRatio = ref(true);
const originalAspectRatio = ref(1);

// Before/After toggle
const showOriginal = ref(false);

// History for undo/redo
const history = ref([]);
const historyIndex = ref(-1);
const maxHistorySize = 50;

// Crop state
const isCropping = ref(false);
const cropStartX = ref(0);
const cropStartY = ref(0);
const cropEndX = ref(0);
const cropEndY = ref(0);
const cropActive = ref(false);
const isMovingCrop = ref(false);
const cropMoveStartX = ref(0);
const cropMoveStartY = ref(0);
const cropOffsetX = ref(0);
const cropOffsetY = ref(0);
const buttonPosition = ref({ centerX: 0, centerY: 0 });
const showCropButtons = ref(false);
const cropAspectRatio = ref(null); // null = free, or a ratio like 1, 16/9, etc.
const cropAspectRatioPresets = [
  { label: __('Free', 'flexify-dashboard'), value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '21:9', value: 21 / 9 },
  { label: '5:4', value: 5 / 4 },
  { label: '4:5', value: 4 / 5 },
];

// UI state
const showControls = ref(true);
const expandedSections = ref({
  luminosity: true,
  color: false,
  effects: false,
  transform: false,
  resize: false,
  crop: false,
});

/**
 * Check if there's a valid crop selection
 */
const hasValidCropSelection = computed(() => {
  const x1 = Math.min(cropStartX.value, cropEndX.value);
  const y1 = Math.min(cropStartY.value, cropEndY.value);
  const x2 = Math.max(cropStartX.value, cropEndX.value);
  const y2 = Math.max(cropStartY.value, cropEndY.value);
  return x2 - x1 > 5 && y2 - y1 > 5;
});

/**
 * Update button position based on crop area
 */
const updateButtonPosition = () => {
  if (!hasValidCropSelection.value || !canvasRef.value || !containerRef.value) {
    buttonPosition.value = { centerX: 0, centerY: 0 };
    return;
  }

  const canvas = canvasRef.value;
  const container = containerRef.value;

  // Get bounding rects to calculate actual positions
  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // Calculate canvas position relative to container (accounting for scroll)
  const canvasOffsetX =
    canvasRect.left - containerRect.left + container.scrollLeft;
  const canvasOffsetY =
    canvasRect.top - containerRect.top + container.scrollTop;

  // Get crop area center in canvas coordinates
  const x1 = Math.min(cropStartX.value, cropEndX.value);
  const y1 = Math.min(cropStartY.value, cropEndY.value);
  const x2 = Math.max(cropStartX.value, cropEndX.value);
  const y2 = Math.max(cropStartY.value, cropEndY.value);

  // Calculate center position relative to container
  buttonPosition.value = {
    centerX: canvasOffsetX + x1 + (x2 - x1) / 2,
    centerY: canvasOffsetY + y1 + (y2 - y1) / 2,
  };
};

/**
 * Check if a point is inside the crop area
 */
const isPointInCropArea = (x, y) => {
  if (!hasValidCropSelection.value) return false;

  const x1 = Math.min(cropStartX.value, cropEndX.value);
  const y1 = Math.min(cropStartY.value, cropEndY.value);
  const x2 = Math.max(cropStartX.value, cropEndX.value);
  const y2 = Math.max(cropStartY.value, cropEndY.value);

  return x >= x1 && x <= x2 && y >= y1 && y <= y2;
};

/**
 * Check if cursor should be crosshair (when cropping)
 */
const showCropCursor = computed(() => {
  if (!isCropping.value) return false;
  if (cropActive.value) return true;
  if (isMovingCrop.value) return false; // Will use cursor-move instead
  return hasValidCropSelection.value;
});

/**
 * Save current state to history
 */
const saveToHistoryWrapper = () => {
  const state = {
    brightness,
    contrast,
    saturation,
    hue,
    exposure,
    vibrance,
    sharpness,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    blur,
    grain,
    rotation,
    flipHorizontal,
    flipVertical,
    imageWidth,
    imageHeight,
  };
  saveToHistory(
    state,
    history,
    historyIndex,
    maxHistorySize,
    currentImage.value
  );
};

/**
 * Undo last change
 */
const undoWrapper = async () => {
  const state = {
    brightness,
    contrast,
    saturation,
    hue,
    exposure,
    vibrance,
    sharpness,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    blur,
    grain,
    rotation,
    flipHorizontal,
    flipVertical,
    imageWidth,
    imageHeight,
  };
  await undo(
    history,
    historyIndex,
    state,
    nextTick,
    initializeCanvasWrapper,
    currentImage
  );
};

/**
 * Redo last undone change
 */
const redoWrapper = async () => {
  const state = {
    brightness,
    contrast,
    saturation,
    hue,
    exposure,
    vibrance,
    sharpness,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    blur,
    grain,
    rotation,
    flipHorizontal,
    flipVertical,
    imageWidth,
    imageHeight,
  };
  await redo(
    history,
    historyIndex,
    state,
    nextTick,
    initializeCanvasWrapper,
    currentImage
  );
};

/**
 * Check if undo is available
 */
const canUndo = computed(() => historyIndex.value > 0);

/**
 * Check if redo is available
 */
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

/**
 * Load image and initialize canvas
 */
const loadImageWrapper = async () => {
  try {
    const state = {
      loading,
      imageLoaded,
      originalImage,
      currentImage,
      imageWidth,
      imageHeight,
      resizeWidth,
      resizeHeight,
      originalAspectRatio,
    };
    await loadImage(
      props.src,
      state,
      nextTick,
      initializeCanvasWrapper,
      saveToHistoryWrapper
    );
  } catch (error) {
    console.error('Failed to load image:', error);
    loading.value = false;
  }
};

/**
 * Initialize canvas with proper dimensions
 */
const initializeCanvasWrapper = () => {
  const state = {
    currentImage,
    imageWidth,
    imageHeight,
    scale,
  };
  initializeCanvas(canvasRef.value, containerRef.value, state, drawImage);
};

/**
 * Draw image on canvas with all transformations and filters
 */
const drawImage = () => {
  if (!canvasRef.value || !currentImage.value) return;

  // If showing original, draw original image without filters
  const imageToDraw = showOriginal.value
    ? originalImage.value
    : currentImage.value;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Save context
  ctx.save();

  // Center image
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // Calculate image dimensions to fit canvas
  const imgAspect = imageToDraw.width / imageToDraw.height;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth, drawHeight;

  if (imgAspect > canvasAspect) {
    drawWidth = canvas.width;
    drawHeight = canvas.width / imgAspect;
  } else {
    drawHeight = canvas.height;
    drawWidth = canvas.height * imgAspect;
  }

  // Apply transformations (only if not showing original)
  if (!showOriginal.value) {
    ctx.rotate((rotation.value * Math.PI) / 180);

    // Apply flip
    let scaleX = 1;
    let scaleY = 1;
    if (flipHorizontal.value) scaleX = -1;
    if (flipVertical.value) scaleY = -1;
    ctx.scale(scaleX, scaleY);
  }

  // Draw image
  ctx.drawImage(
    imageToDraw,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();

  // Apply filters for preview (but not during crop mode or when showing original)
  if (!isCropping.value && !showOriginal.value) {
    // Create a temporary canvas to apply filters to just the image area
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the current canvas content to temp canvas
    tempCtx.drawImage(canvas, 0, 0);

    // Apply filters to temp canvas
    const filterValues = {
      brightness: brightness.value,
      contrast: contrast.value,
      saturation: saturation.value,
      hue: hue.value,
      exposure: exposure.value,
      vibrance: vibrance.value,
      sharpness: sharpness.value,
      highlights: highlights.value,
      shadows: shadows.value,
      temperature: temperature.value,
      tint: tint.value,
      vignette: vignette.value,
      blur: blur.value,
      grain: grain.value,
    };
    applyFiltersToCanvas(tempCanvas, filterValues);

    // Clear main canvas and draw filtered result
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
  }

  // Apply vignette overlay if needed
  if (!showOriginal.value && vignette.value > 0) {
    drawVignette(ctx, canvas, vignette.value);
  }

  // Show crop overlay if there's an active crop or a valid selection
  if (isCropping.value && (cropActive.value || hasValidCropSelection.value)) {
    drawCropOverlay(
      ctx,
      canvas,
      cropStartX.value,
      cropStartY.value,
      cropEndX.value,
      cropEndY.value
    );
    // Don't update button position here - wait for mouse up
  } else {
    buttonPosition.value = { centerX: 0, centerY: 0 };
    showCropButtons.value = false;
  }
};

/**
 * Apply filters for preview (using pixel manipulation for accurate preview)
 */
const applyCSSFilters = () => {
  if (!canvasRef.value || !currentImage.value) return;

  // Skip if all filters are at default
  if (
    brightness.value === 0 &&
    contrast.value === 0 &&
    saturation.value === 0 &&
    hue.value === 0 &&
    exposure.value === 0 &&
    vibrance.value === 0 &&
    sharpness.value === 0 &&
    highlights.value === 0 &&
    shadows.value === 0 &&
    temperature.value === 0 &&
    tint.value === 0 &&
    blur.value === 0 &&
    grain.value === 0
  ) {
    return;
  }

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');

  // Get current image data from canvas
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply blur first if needed (before other filters)
  if (blur.value > 0) {
    imageData = applyBlur(imageData, blur.value / 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Apply sharpness blur if needed (negative sharpness = blur)
  if (sharpness.value < 0) {
    imageData = applyBlur(imageData, Math.abs(sharpness.value) / 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const data = imageData.data;

  const brightnessVal = brightness.value / 100;
  const exposureVal = exposure.value / 100;
  const contrastVal = contrast.value / 100;
  const saturationVal = 1 + saturation.value / 100;
  const vibranceVal = vibrance.value;
  const hueVal = (hue.value * Math.PI) / 180;
  const highlightsVal = highlights.value / 100;
  const shadowsVal = shadows.value / 100;
  const temperatureVal = temperature.value / 100;
  const tintVal = tint.value / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Calculate luminance for highlights/shadows
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Apply highlights (brighten bright areas)
    if (highlightsVal !== 0 && luminance > 128) {
      const highlightAmount = ((luminance - 128) / 127) * highlightsVal;
      r += highlightAmount * 255;
      g += highlightAmount * 255;
      b += highlightAmount * 255;
    }

    // Apply shadows (darken dark areas)
    if (shadowsVal !== 0 && luminance < 128) {
      const shadowAmount = (1 - luminance / 127) * shadowsVal;
      r -= shadowAmount * 255;
      g -= shadowAmount * 255;
      b -= shadowAmount * 255;
    }

    // Apply brightness and exposure (combined)
    const totalBrightness = brightnessVal + exposureVal;
    if (totalBrightness !== 0) {
      r += totalBrightness * 255;
      g += totalBrightness * 255;
      b += totalBrightness * 255;
    }

    // Apply contrast (with exposure influence)
    const totalContrast = contrastVal + exposureVal * 0.5;
    if (totalContrast !== 0) {
      const factor =
        (259 * (totalContrast * 255 + 255)) /
        (255 * (259 - totalContrast * 255));
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;
    }

    // Apply temperature (cool/warm)
    if (temperatureVal !== 0) {
      if (temperatureVal > 0) {
        // Warm (add red/yellow)
        r += temperatureVal * 20;
        g += temperatureVal * 10;
      } else {
        // Cool (add blue)
        b += Math.abs(temperatureVal) * 20;
        g += Math.abs(temperatureVal) * 5;
      }
    }

    // Apply tint (green/magenta)
    if (tintVal !== 0) {
      if (tintVal > 0) {
        // Magenta (add red and blue)
        r += tintVal * 15;
        b += tintVal * 15;
      } else {
        // Green (add green)
        g += Math.abs(tintVal) * 20;
      }
    }

    // Apply saturation (only if not 1, which means no change)
    if (saturationVal !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + saturationVal * (r - gray);
      g = gray + saturationVal * (g - gray);
      b = gray + saturationVal * (b - gray);
    }

    // Apply vibrance (preserves skin tones)
    if (vibranceVal !== 0) {
      const vibranced = applyVibrance(r, g, b, vibranceVal);
      r = vibranced.r;
      g = vibranced.g;
      b = vibranced.b;
    }

    // Apply hue rotation (only if non-zero)
    if (hueVal !== 0) {
      const cos = Math.cos(hueVal);
      const sin = Math.sin(hueVal);
      const newR =
        r * (cos + (1 - cos) / 3) +
        g * ((1 - cos) / 3 - (Math.sqrt(3) * sin) / 3) +
        b * ((1 - cos) / 3 + (Math.sqrt(3) * sin) / 3);
      const newG =
        r * ((1 - cos) / 3 + (Math.sqrt(3) * sin) / 3) +
        g * (cos + (1 - cos) / 3) +
        b * ((1 - cos) / 3 - (Math.sqrt(3) * sin) / 3);
      const newB =
        r * ((1 - cos) / 3 - (Math.sqrt(3) * sin) / 3) +
        g * ((1 - cos) / 3 + (Math.sqrt(3) * sin) / 3) +
        b * (cos + (1 - cos) / 3);
      r = newR;
      g = newG;
      b = newB;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);

  // Apply sharpening last (after all other filters)
  if (sharpness.value > 0) {
    const sharpenedData = applySharpening(imageData, sharpness.value);
    ctx.putImageData(sharpenedData, 0, 0);
  }

  // Apply grain last (after all other filters)
  if (grain.value > 0) {
    const grainedData = applyGrain(imageData, grain.value);
    ctx.putImageData(grainedData, 0, 0);
  }
};

/**
 * Handle mouse down for cropping
 */
const handleMouseDown = (event) => {
  if (!canvasRef.value) return;

  // Hide buttons immediately when starting a new interaction
  showCropButtons.value = false;

  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Check if clicking inside existing crop area - if so, move it
  if (hasValidCropSelection.value && isPointInCropArea(x, y)) {
    isMovingCrop.value = true;
    cropMoveStartX.value = x;
    cropMoveStartY.value = y;

    // Store the current crop bounds
    const x1 = Math.min(cropStartX.value, cropEndX.value);
    const y1 = Math.min(cropStartY.value, cropEndY.value);
    const x2 = Math.max(cropStartX.value, cropEndX.value);
    const y2 = Math.max(cropStartY.value, cropEndY.value);

    cropOffsetX.value = x - (x1 + x2) / 2;
    cropOffsetY.value = y - (y1 + y2) / 2;

    canvas.addEventListener('mousemove', handleCropMove);
    canvas.addEventListener('mouseup', handleCropMoveEnd);
    canvas.addEventListener('mouseleave', handleCropMoveEnd);
    return;
  }

  // Otherwise, start a new crop
  cropStartX.value = x;
  cropStartY.value = y;
  cropEndX.value = x;
  cropEndY.value = y;
  cropActive.value = true;
  isCropping.value = true;

  drawImage();

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
};

/**
 * Set crop aspect ratio preset
 */
const setCropAspectRatio = (ratio) => {
  cropAspectRatio.value = ratio;

  // If there's an existing crop, adjust it to the new aspect ratio
  if (hasValidCropSelection.value) {
    const x1 = Math.min(cropStartX.value, cropEndX.value);
    const y1 = Math.min(cropStartY.value, cropEndY.value);
    const x2 = Math.max(cropStartX.value, cropEndX.value);
    const y2 = Math.max(cropStartY.value, cropEndY.value);

    const width = x2 - x1;
    const height = y2 - y1;

    if (ratio !== null) {
      const currentRatio = width / height;
      if (currentRatio > ratio) {
        // Too wide, adjust height
        const newHeight = width / ratio;
        cropEndY.value = y1 + newHeight;
      } else {
        // Too tall, adjust width
        const newWidth = height * ratio;
        cropEndX.value = x1 + newWidth;
      }
    }

    drawImage();
  }
};

/**
 * Handle mouse move for cropping
 */
const handleMouseMove = (event) => {
  if (!cropActive.value || !canvasRef.value) return;

  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;

  // Apply aspect ratio constraint if set
  if (cropAspectRatio.value !== null) {
    const startX = cropStartX.value;
    const startY = cropStartY.value;
    const width = x - startX;
    const height = y - startY;
    const currentRatio = Math.abs(width / height);

    if (currentRatio > cropAspectRatio.value) {
      // Width is too large, adjust height
      y =
        startY +
        (Math.abs(width) / cropAspectRatio.value) * (height < 0 ? -1 : 1);
    } else {
      // Height is too large, adjust width
      x =
        startX +
        Math.abs(height) * cropAspectRatio.value * (width < 0 ? -1 : 1);
    }
  }

  cropEndX.value = x;
  cropEndY.value = y;

  drawImage();
};

/**
 * Handle crop area movement
 */
const handleCropMove = (event) => {
  if (!isMovingCrop.value || !canvasRef.value) return;

  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  // Calculate the movement delta
  const deltaX = currentX - cropMoveStartX.value;
  const deltaY = currentY - cropMoveStartY.value;

  // Get current crop bounds
  const x1 = Math.min(cropStartX.value, cropEndX.value);
  const y1 = Math.min(cropStartY.value, cropEndY.value);
  const x2 = Math.max(cropStartX.value, cropEndX.value);
  const y2 = Math.max(cropStartY.value, cropEndY.value);

  const width = x2 - x1;
  const height = y2 - y1;

  // Calculate new positions, keeping within canvas bounds
  const newX1 = Math.max(0, Math.min(canvas.width - width, x1 + deltaX));
  const newY1 = Math.max(0, Math.min(canvas.height - height, y1 + deltaY));
  const newX2 = newX1 + width;
  const newY2 = newY1 + height;

  // Update crop coordinates
  if (cropStartX.value < cropEndX.value) {
    cropStartX.value = newX1;
    cropEndX.value = newX2;
  } else {
    cropStartX.value = newX2;
    cropEndX.value = newX1;
  }

  if (cropStartY.value < cropEndY.value) {
    cropStartY.value = newY1;
    cropEndY.value = newY2;
  } else {
    cropStartY.value = newY2;
    cropEndY.value = newY1;
  }

  // Update move start position for next movement
  cropMoveStartX.value = currentX;
  cropMoveStartY.value = currentY;

  drawImage();
  // Update button position after moving crop
  nextTick(() => {
    updateButtonPosition();
  });
};

/**
 * Handle crop move end
 */
const handleCropMoveEnd = () => {
  isMovingCrop.value = false;

  if (canvasRef.value) {
    canvasRef.value.removeEventListener('mousemove', handleCropMove);
    canvasRef.value.removeEventListener('mouseup', handleCropMoveEnd);
    canvasRef.value.removeEventListener('mouseleave', handleCropMoveEnd);
  }

  drawImage();

  // Show buttons immediately after moving crop
  if (hasValidCropSelection.value) {
    showCropButtons.value = true;
    updateButtonPosition();
  }
};

/**
 * Handle mouse up for cropping
 */
const handleMouseUp = () => {
  // Remove event listeners
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('mousemove', handleMouseMove);
    canvasRef.value.removeEventListener('mouseup', handleMouseUp);
    canvasRef.value.removeEventListener('mouseleave', handleMouseUp);
  }

  // Mark crop as no longer active (selection is complete)
  cropActive.value = false;

  // Redraw to show final crop selection (it will stay visible)
  drawImage();

  // Show buttons immediately after mouse up if there's a valid selection
  if (hasValidCropSelection.value) {
    showCropButtons.value = true;
    updateButtonPosition();
  }
};

/**
 * Start crop mode
 */
const startCrop = () => {
  isCropping.value = true;
  expandedSections.value.crop = true;
  cropActive.value = false;
  drawImage();
};

// Watch for crop section expansion - just expand the section, don't control crop mode
watch(
  () => expandedSections.value.crop,
  (isExpanded) => {
    // Just ensure section is expanded, but don't control crop mode
    // Crop mode is controlled by user interaction
  }
);

/**
 * Apply crop
 */
const applyCrop = () => {
  if (!canvasRef.value || !currentImage.value) return;

  const canvas = canvasRef.value;
  const x1 = Math.min(cropStartX.value, cropEndX.value);
  const y1 = Math.min(cropStartY.value, cropEndY.value);
  const x2 = Math.max(cropStartX.value, cropEndX.value);
  const y2 = Math.max(cropStartY.value, cropEndY.value);

  const width = x2 - x1;
  const height = y2 - y1;

  if (width <= 0 || height <= 0) {
    cancelCrop();
    return;
  }

  // Calculate the actual image coordinates from canvas coordinates
  // Need to account for how the image is displayed on canvas
  const imgAspect = currentImage.value.width / currentImage.value.height;
  const canvasAspect = canvas.width / canvas.height;

  let displayWidth, displayHeight, offsetX, offsetY;

  if (imgAspect > canvasAspect) {
    displayWidth = canvas.width;
    displayHeight = canvas.width / imgAspect;
    offsetX = 0;
    offsetY = (canvas.height - displayHeight) / 2;
  } else {
    displayHeight = canvas.height;
    displayWidth = canvas.height * imgAspect;
    offsetX = (canvas.width - displayWidth) / 2;
    offsetY = 0;
  }

  // Convert canvas crop coordinates to image coordinates
  const scaleX = currentImage.value.width / displayWidth;
  const scaleY = currentImage.value.height / displayHeight;

  const imgX1 = Math.max(0, (x1 - offsetX) * scaleX);
  const imgY1 = Math.max(0, (y1 - offsetY) * scaleY);
  const imgX2 = Math.min(currentImage.value.width, (x2 - offsetX) * scaleX);
  const imgY2 = Math.min(currentImage.value.height, (y2 - offsetY) * scaleY);

  const cropWidth = imgX2 - imgX1;
  const cropHeight = imgY2 - imgY1;

  if (cropWidth <= 0 || cropHeight <= 0) {
    cancelCrop();
    return;
  }

  // Create new canvas for cropped image
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext('2d');

  // Draw cropped portion from original image
  cropCtx.drawImage(
    currentImage.value,
    imgX1,
    imgY1,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  // Create new image from cropped canvas
  const img = new Image();
  img.onload = async () => {
    currentImage.value = img;
    imageWidth.value = img.width;
    imageHeight.value = img.height;
    resizeWidth.value = img.width;
    resizeHeight.value = img.height;
    originalAspectRatio.value = img.width / img.height;
    isCropping.value = false;
    cropActive.value = false;
    rotation.value = 0;
    flipHorizontal.value = false;
    flipVertical.value = false;
    await nextTick();
    initializeCanvasWrapper();
    saveToHistoryWrapper();
  };
  img.src = cropCanvas.toDataURL('image/png');
};

/**
 * Cancel crop
 */
const cancelCrop = () => {
  isCropping.value = false;
  cropActive.value = false;
  cropStartX.value = 0;
  cropStartY.value = 0;
  cropEndX.value = 0;
  cropEndY.value = 0;
  showCropButtons.value = false;
  drawImage();
};

/**
 * Rotate image wrapper
 */
const rotateImageWrapper = (degrees) => {
  const state = { rotation };
  rotateImage(state, degrees, drawImage);
};

/**
 * Flip image horizontally wrapper
 */
const flipImageHorizontalWrapper = () => {
  const state = { flipHorizontal };
  flipImageHorizontal(state, drawImage);
};

/**
 * Flip image vertically wrapper
 */
const flipImageVerticalWrapper = () => {
  const state = { flipVertical };
  flipImageVertical(state, drawImage);
};

/**
 * Reset all adjustments
 */
const resetAdjustments = () => {
  brightness.value = 0;
  contrast.value = 0;
  saturation.value = 0;
  hue.value = 0;
  exposure.value = 0;
  vibrance.value = 0;
  sharpness.value = 0;
  highlights.value = 0;
  shadows.value = 0;
  temperature.value = 0;
  tint.value = 0;
  vignette.value = 0;
  blur.value = 0;
  grain.value = 0;
  drawImage();
};

/**
 * Reset all transformations wrapper
 */
const resetTransformationsWrapper = () => {
  const state = { rotation, flipHorizontal, flipVertical };
  resetTransformations(state, drawImage);
  saveToHistoryWrapper();
};

/**
 * Reset everything
 */
const resetAll = async () => {
  resetAdjustments();
  resetTransformationsWrapper();
  if (originalImage.value) {
    currentImage.value = originalImage.value;
    imageWidth.value = originalImage.value.width;
    imageHeight.value = originalImage.value.height;
    resizeWidth.value = originalImage.value.width;
    resizeHeight.value = originalImage.value.height;
    await nextTick();
    initializeCanvasWrapper();
  }
};

/**
 * Toggle section expansion
 */
const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section];
};

/**
 * Handle resize width change
 */
const handleResizeWidthChangeWrapper = () => {
  const state = {
    resizeWidth,
    resizeHeight,
    lockAspectRatio,
    originalAspectRatio,
  };
  handleResizeWidthChange(state);
};

/**
 * Handle resize height change
 */
const handleResizeHeightChangeWrapper = () => {
  const state = {
    resizeWidth,
    resizeHeight,
    lockAspectRatio,
    originalAspectRatio,
  };
  handleResizeHeightChange(state);
};

/**
 * Apply resize
 */
const applyResizeWrapper = async () => {
  const state = {
    currentImage,
    resizeWidth,
    resizeHeight,
    imageWidth,
    imageHeight,
    originalAspectRatio,
  };
  await applyResize(
    state,
    nextTick,
    initializeCanvasWrapper,
    saveToHistoryWrapper
  );
};

/**
 * Export edited image
 */
const exportImageWrapper = () => {
  const state = {
    canvasRef: canvasRef.value,
    currentImage,
    resizeWidth,
    resizeHeight,
    imageWidth,
    imageHeight,
    rotation,
    flipHorizontal,
    flipVertical,
    brightness,
    contrast,
    saturation,
    hue,
    exposure,
    vibrance,
    sharpness,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    blur,
    grain,
  };
  return exportImage(state, canvasRef.value);
};

/**
 * Handle save
 */
const handleSave = () => {
  const dataUrl = exportImageWrapper();
  if (dataUrl) {
    emit('save', dataUrl);
  }
};

/**
 * Handle cancel
 */
const handleCancel = () => {
  emit('cancel');
};

// Watch for adjustments and redraw
watch(
  [
    brightness,
    contrast,
    saturation,
    hue,
    exposure,
    vibrance,
    sharpness,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    blur,
    grain,
  ],
  () => {
    if (imageLoaded.value) {
      drawImage();
    }
  }
);

watch([rotation, flipHorizontal, flipVertical], () => {
  if (imageLoaded.value) {
    drawImage();
  }
});

watch(showOriginal, () => {
  if (imageLoaded.value) {
    drawImage();
  }
});

// Debounced save to history for adjustments (save after user stops adjusting)
let historyTimeout = null;
watch(
  [
    brightness,
    contrast,
    saturation,
    hue,
    exposure,
    vibrance,
    sharpness,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    blur,
    grain,
    rotation,
    flipHorizontal,
    flipVertical,
  ],
  () => {
    if (imageLoaded.value && historyIndex.value >= 0) {
      clearTimeout(historyTimeout);
      historyTimeout = setTimeout(() => {
        saveToHistoryWrapper();
      }, 500); // Save 500ms after user stops adjusting
    }
  }
);

// Watch for crop changes to update button position
watch([cropStartX, cropStartY, cropEndX, cropEndY], () => {
  if (hasValidCropSelection.value) {
    updateButtonPosition();
  }
});

// Watch for window resize
const handleResize = () => {
  if (imageLoaded.value) {
    initializeCanvasWrapper();
  }
};

// Watch for scroll to update button position
const handleScroll = () => {
  if (hasValidCropSelection.value) {
    updateButtonPosition();
  }
};

onMounted(async () => {
  await loadImageWrapper();
  window.addEventListener('resize', handleResize);
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', handleScroll);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3"
        >
          <AppIcon
            icon="image"
            class="text-xl text-zinc-400 dark:text-zinc-500 animate-pulse"
          />
        </div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading image...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Editor Interface -->
    <div v-else class="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      <!-- Canvas Area -->
      <div
        ref="containerRef"
        class="flex-1 flex items-center justify-center overflow-auto bg-white dark:bg-zinc-950 relative min-h-0"
      >
        <canvas
          ref="canvasRef"
          @mousedown="handleMouseDown"
          class="max-w-full max-h-full"
          :class="{
            'cursor-crosshair': showCropCursor,
            'cursor-move': isMovingCrop,
          }"
        ></canvas>

        <!-- Floating Crop Buttons -->
        <div
          v-if="hasValidCropSelection && showCropButtons"
          class="absolute flex items-center gap-2 z-10 pointer-events-auto"
          :style="{
            left: `${buttonPosition.centerX}px`,
            top: `${buttonPosition.centerY}px`,
            transform: 'translate(-50%, -50%)',
          }"
        >
          <AppButton @click="applyCrop" class="text-xs py-2 px-4 shadow-lg">
            {{ __('Apply', 'flexify-dashboard') }}
          </AppButton>
          <AppButton
            @click="cancelCrop"
            type="transparent"
            class="text-xs py-2 px-4 shadow-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm"
          >
            {{ __('Cancel', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>

      <!-- Controls Panel -->
      <div
        class="w-full lg:w-80 bg-white dark:bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 lg:max-h-full overflow-hidden"
      >
        <!-- Header -->
        <div
          class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
        >
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
            {{ __('Image Editor', 'flexify-dashboard') }}
          </h2>
          <div class="flex items-center gap-2">
            <!-- Before/After Toggle -->
            <AppButton
              @click="showOriginal = !showOriginal"
              type="transparent"
              :class="[
                'text-xs py-1.5 px-2',
                showOriginal
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-zinc-500 dark:text-zinc-400',
              ]"
            >
              <AppIcon icon="compare" class="text-sm" />
            </AppButton>

            <!-- Undo -->
            <AppButton
              @click="undoWrapper"
              type="transparent"
              class="text-xs py-1.5 px-2"
              :disabled="!canUndo"
            >
              <AppIcon icon="undo" class="text-sm" />
            </AppButton>

            <!-- Redo -->
            <AppButton
              @click="redoWrapper"
              type="transparent"
              class="text-xs py-1.5 px-2"
              :disabled="!canRedo"
            >
              <AppIcon icon="redo" class="text-sm" />
            </AppButton>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Luminosity Section -->
          <div class="border-b border-zinc-200 dark:border-zinc-800">
            <button
              @click="toggleSection('luminosity')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span
                class="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                >{{ __('Luminosity', 'flexify-dashboard') }}</span
              >
              <AppIcon
                :icon="
                  expandedSections.luminosity ? 'expand_less' : 'expand_more'
                "
                class="text-zinc-500 dark:text-zinc-400 text-base"
              />
            </button>

            <div v-if="expandedSections.luminosity" class="px-4 pb-4 space-y-4">
              <!-- Brightness -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Brightness', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    brightness
                  }}</span>
                </div>
                <input
                  v-model.number="brightness"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Exposure -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Exposure', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    exposure
                  }}</span>
                </div>
                <input
                  v-model.number="exposure"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Highlights -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Highlights', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    highlights
                  }}</span>
                </div>
                <input
                  v-model.number="highlights"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Shadows -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Shadows', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    shadows
                  }}</span>
                </div>
                <input
                  v-model.number="shadows"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Contrast -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Contrast', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    contrast
                  }}</span>
                </div>
                <input
                  v-model.number="contrast"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            </div>
          </div>

          <!-- Color Section -->
          <div class="border-b border-zinc-200 dark:border-zinc-800">
            <button
              @click="toggleSection('color')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span
                class="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                >{{ __('Color', 'flexify-dashboard') }}</span
              >
              <AppIcon
                :icon="expandedSections.color ? 'expand_less' : 'expand_more'"
                class="text-zinc-500 dark:text-zinc-400 text-base"
              />
            </button>

            <div v-if="expandedSections.color" class="px-4 pb-4 space-y-4">
              <!-- Saturation -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Saturation', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    saturation
                  }}</span>
                </div>
                <input
                  v-model.number="saturation"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Vibrance -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Vibrance', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    vibrance
                  }}</span>
                </div>
                <input
                  v-model.number="vibrance"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Hue -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Hue', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono"
                    >{{ hue }}°</span
                  >
                </div>
                <input
                  v-model.number="hue"
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Temperature -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Temperature', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    temperature
                  }}</span>
                </div>
                <input
                  v-model.number="temperature"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {{ __('Cool ← → Warm', 'flexify-dashboard') }}
                </p>
              </div>

              <!-- Tint -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Tint', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    tint
                  }}</span>
                </div>
                <input
                  v-model.number="tint"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {{ __('Green ← → Magenta', 'flexify-dashboard') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Effects Section -->
          <div class="border-b border-zinc-200 dark:border-zinc-800">
            <button
              @click="toggleSection('effects')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span
                class="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                >{{ __('Effects', 'flexify-dashboard') }}</span
              >
              <AppIcon
                :icon="expandedSections.effects ? 'expand_less' : 'expand_more'"
                class="text-zinc-500 dark:text-zinc-400 text-base"
              />
            </button>

            <div v-if="expandedSections.effects" class="px-4 pb-4 space-y-4">
              <!-- Sharpness -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Sharpness', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    sharpness
                  }}</span>
                </div>
                <input
                  v-model.number="sharpness"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {{ __('Negative = blur, positive = sharpen', 'flexify-dashboard') }}
                </p>
              </div>

              <!-- Blur -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Blur', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    blur
                  }}</span>
                </div>
                <input
                  v-model.number="blur"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Grain -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Grain', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    grain
                  }}</span>
                </div>
                <input
                  v-model.number="grain"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <!-- Vignette -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Vignette', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono">{{
                    vignette
                  }}</span>
                </div>
                <input
                  v-model.number="vignette"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            </div>
          </div>

          <!-- Crop Section -->
          <div class="border-b border-zinc-200 dark:border-zinc-800">
            <button
              @click="toggleSection('crop')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span
                class="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                >{{ __('Crop', 'flexify-dashboard') }}</span
              >
              <AppIcon
                :icon="expandedSections.crop ? 'expand_less' : 'expand_more'"
                class="text-zinc-500 dark:text-zinc-400 text-base"
              />
            </button>

            <div v-if="expandedSections.crop" class="px-4 pb-4 space-y-3">
              <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                {{
                  __(
                    'Click and drag on the image to select crop area',
                    'flexify-dashboard'
                  )
                }}
              </p>

              <!-- Aspect Ratio Presets -->
              <div>
                <label
                  class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block"
                >
                  {{ __('Aspect Ratio', 'flexify-dashboard') }}
                </label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button
                    v-for="preset in cropAspectRatioPresets"
                    :key="preset.value"
                    @click="setCropAspectRatio(preset.value)"
                    :class="[
                      'px-2 py-1.5 text-xs rounded-md transition-colors',
                      cropAspectRatio === preset.value
                        ? 'bg-brand-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                    ]"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>

              <AppButton
                @click="
                  isCropping = true;
                  expandedSections.crop = true;
                "
                type="transparent"
                class="w-full text-xs py-1.5"
              >
                {{ __('Start Crop', 'flexify-dashboard') }}
              </AppButton>
            </div>
          </div>

          <!-- Resize Section -->
          <div class="border-b border-zinc-200 dark:border-zinc-800">
            <button
              @click="toggleSection('resize')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span
                class="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                >{{ __('Resize', 'flexify-dashboard') }}</span
              >
              <AppIcon
                :icon="expandedSections.resize ? 'expand_less' : 'expand_more'"
                class="text-zinc-500 dark:text-zinc-400 text-base"
              />
            </button>

            <div v-if="expandedSections.resize" class="px-4 pb-4 space-y-3">
              <!-- Aspect Ratio Lock -->
              <div class="flex items-center gap-2">
                <input
                  v-model="lockAspectRatio"
                  type="checkbox"
                  id="lockAspectRatio"
                  class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-brand-500 focus:ring-brand-500"
                />
                <label
                  for="lockAspectRatio"
                  class="text-xs text-zinc-500 dark:text-zinc-400"
                >
                  {{ __('Lock aspect ratio', 'flexify-dashboard') }}
                </label>
              </div>

              <!-- Width -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Width', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono"
                    >{{ resizeWidth }}px</span
                  >
                </div>
                <input
                  v-model.number="resizeWidth"
                  @input="handleResizeWidthChangeWrapper"
                  type="number"
                  min="1"
                  class="w-full px-2 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <!-- Height -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label
                    class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {{ __('Height', 'flexify-dashboard') }}
                  </label>
                  <span class="text-xs text-zinc-500 font-mono"
                    >{{ resizeHeight }}px</span
                  >
                </div>
                <input
                  v-model.number="resizeHeight"
                  @input="handleResizeHeightChangeWrapper"
                  type="number"
                  min="1"
                  class="w-full px-2 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <!-- Apply Resize Button -->
              <AppButton
                @click="applyResizeWrapper"
                class="w-full text-xs py-1.5"
                :disabled="resizeWidth <= 0 || resizeHeight <= 0"
              >
                {{ __('Apply Resize', 'flexify-dashboard') }}
              </AppButton>
            </div>
          </div>

          <!-- Transform Section -->
          <div class="border-b border-zinc-200 dark:border-zinc-800">
            <button
              @click="toggleSection('transform')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span
                class="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                >{{ __('Transform', 'flexify-dashboard') }}</span
              >
              <AppIcon
                :icon="
                  expandedSections.transform ? 'expand_less' : 'expand_more'
                "
                class="text-zinc-500 dark:text-zinc-400 text-base"
              />
            </button>

            <div v-if="expandedSections.transform" class="px-4 pb-4 space-y-3">
              <div class="grid grid-cols-2 gap-2">
                <!-- Rotate Left -->
                <AppButton
                  @click="rotateImageWrapper(-90)"
                  type="transparent"
                  class="flex items-center justify-center gap-1.5 text-xs py-2"
                >
                  <AppIcon icon="rotate_left" class="text-sm" />
                  {{ __('Left', 'flexify-dashboard') }}
                </AppButton>

                <!-- Rotate Right -->
                <AppButton
                  @click="rotateImageWrapper(90)"
                  type="transparent"
                  class="flex items-center justify-center gap-1.5 text-xs py-2"
                >
                  <AppIcon icon="rotate_right" class="text-sm" />
                  {{ __('Right', 'flexify-dashboard') }}
                </AppButton>

                <!-- Flip Horizontal -->
                <AppButton
                  @click="flipImageHorizontalWrapper"
                  type="transparent"
                  :class="[
                    'flex items-center justify-center gap-1.5 text-xs py-2',
                    flipHorizontal ? 'bg-brand-500/20 text-brand-400' : '',
                  ]"
                >
                  <AppIcon icon="flip" class="text-sm" />
                  {{ __('Flip H', 'flexify-dashboard') }}
                </AppButton>

                <!-- Flip Vertical -->
                <AppButton
                  @click="flipImageVerticalWrapper"
                  type="transparent"
                  :class="[
                    'flex items-center justify-center gap-1.5 text-xs py-2',
                    flipVertical ? 'bg-brand-500/20 text-brand-400' : '',
                  ]"
                >
                  <AppIcon icon="flip_camera_android" class="text-sm" />
                  {{ __('Flip V', 'flexify-dashboard') }}
                </AppButton>
              </div>

              <!-- Reset Button -->
              <AppButton
                @click="resetTransformationsWrapper"
                type="transparent"
                class="w-full text-xs py-1.5"
              >
                {{ __('Reset', 'flexify-dashboard') }}
              </AppButton>
            </div>
          </div>
        </div>

        <!-- Panel Footer -->
        <div
          class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-white dark:bg-zinc-900"
        >
          <!-- Reset Button -->
          <AppButton
            @click="resetAdjustments"
            type="transparent"
            class="text-xs py-1.5 mr-auto"
          >
            {{ __('Reset changes', 'flexify-dashboard') }}
          </AppButton>

          <AppButton
            @click="handleCancel"
            type="transparent"
            class="text-xs py-2 px-3"
          >
            {{ __('Cancel', 'flexify-dashboard') }}
          </AppButton>
          <AppButton @click="handleSave" class="text-xs py-2 px-3">
            {{ __('Save', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
</style>
