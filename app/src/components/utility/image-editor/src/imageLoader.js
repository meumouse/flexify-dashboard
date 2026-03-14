/**
 * Image loader functions
 * Functions for loading and initializing images
 */

/**
 * Load image from URL
 * @param {string} src - Image source URL
 * @param {Object} state - State object containing image-related refs
 * @param {Function} nextTick - Vue's nextTick function
 * @param {Function} initializeCanvas - Function to initialize canvas after image loads
 * @param {Function} saveToHistory - Function to save initial state to history
 * @returns {Promise<void>}
 */
export const loadImage = async (
  src,
  state,
  nextTick,
  initializeCanvas,
  saveToHistory
) => {
  state.loading.value = true;
  state.imageLoaded.value = false;

  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise((resolve, reject) => {
    img.onload = () => {
      state.originalImage.value = img;
      state.currentImage.value = img;
      state.imageWidth.value = img.width;
      state.imageHeight.value = img.height;
      state.resizeWidth.value = img.width;
      state.resizeHeight.value = img.height;
      state.originalAspectRatio.value = img.width / img.height;
      state.imageLoaded.value = true;
      state.loading.value = false;
      resolve();
    };
    img.onerror = () => {
      state.loading.value = false;
      reject(new Error('Failed to load image'));
    };
    img.src = src;
  });

  await nextTick();
  initializeCanvas();
  saveToHistory();
};

/**
 * Initialize canvas with proper dimensions
 * @param {HTMLCanvasElement} canvasRef - Reference to canvas element
 * @param {HTMLElement} containerRef - Reference to container element
 * @param {Object} state - State object containing image dimensions and scale refs
 * @param {Function} drawImage - Function to draw the image
 * @returns {void}
 */
export const initializeCanvas = (
  canvasRef,
  containerRef,
  state,
  drawImage
) => {
  if (!canvasRef || !state.currentImage.value) return;

  const canvas = canvasRef;
  const container = containerRef;

  if (!container) return;

  // Calculate container dimensions
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Calculate scale to fit image in container
  const imageAspect = state.imageWidth.value / state.imageHeight.value;
  const containerAspect = containerWidth / containerHeight;

  let displayWidth, displayHeight;

  if (imageAspect > containerAspect) {
    displayWidth = Math.min(containerWidth - 40, state.imageWidth.value);
    displayHeight = displayWidth / imageAspect;
  } else {
    displayHeight = Math.min(containerHeight - 40, state.imageHeight.value);
    displayWidth = displayHeight * imageAspect;
  }

  // Set canvas size
  canvas.width = displayWidth;
  canvas.height = displayHeight;

  state.scale.value = displayWidth / state.imageWidth.value;

  drawImage();
};

