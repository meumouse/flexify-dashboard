/**
 * Image filter functions
 * Pure functions for applying various image filters
 */

/**
 * Apply sharpening filter using unsharp mask algorithm
 * @param {ImageData} imageData - The image data to sharpen
 * @param {number} amount - Sharpening amount (0-100)
 * @returns {ImageData} Sharpened image data
 */
export const applySharpening = (imageData, amount) => {
  if (amount <= 0) return imageData;

  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outputData = output.data;

  // Unsharp mask: subtract blurred version from original
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  const strength = amount / 100;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const k = kernel[(ky + 1) * 3 + (kx + 1)];
          r += data[idx] * k;
          g += data[idx + 1] * k;
          b += data[idx + 2] * k;
        }
      }

      const idx = (y * width + x) * 4;
      outputData[idx] = Math.max(
        0,
        Math.min(255, data[idx] + (r - data[idx]) * strength)
      );
      outputData[idx + 1] = Math.max(
        0,
        Math.min(255, data[idx + 1] + (g - data[idx + 1]) * strength)
      );
      outputData[idx + 2] = Math.max(
        0,
        Math.min(255, data[idx + 2] + (b - data[idx + 2]) * strength)
      );
      outputData[idx + 3] = data[idx + 3];
    }
  }

  return output;
};

/**
 * Apply grain/noise effect
 * @param {ImageData} imageData - The image data to add grain to
 * @param {number} amount - Grain amount (0-100)
 * @returns {ImageData} Image data with grain applied
 */
export const applyGrain = (imageData, amount) => {
  if (amount <= 0) return imageData;

  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outputData = output.data;

  const intensity = amount / 100;
  const grainAmount = intensity * 30; // Max 30 pixel variation

  for (let i = 0; i < data.length; i += 4) {
    // Generate random grain value (-1 to 1)
    const grain = (Math.random() * 2 - 1) * grainAmount;

    outputData[i] = Math.max(0, Math.min(255, data[i] + grain));
    outputData[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    outputData[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    outputData[i + 3] = data[i + 3]; // Preserve alpha
  }

  return output;
};

/**
 * Apply blur filter using box blur
 * @param {ImageData} imageData - The image data to blur
 * @param {number} radius - Blur radius
 * @returns {ImageData} Blurred image data
 */
export const applyBlur = (imageData, radius) => {
  if (radius <= 0) return imageData;

  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outputData = output.data;

  const r = Math.ceil(radius);

  // Horizontal blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0,
        gSum = 0,
        bSum = 0,
        count = 0;

      for (let dx = -r; dx <= r; dx++) {
        const px = Math.max(0, Math.min(width - 1, x + dx));
        const idx = (y * width + px) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        count++;
      }

      const idx = (y * width + x) * 4;
      outputData[idx] = rSum / count;
      outputData[idx + 1] = gSum / count;
      outputData[idx + 2] = bSum / count;
    }
  }

  // Vertical blur
  const tempData = new Uint8ClampedArray(outputData);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0,
        gSum = 0,
        bSum = 0,
        count = 0;

      for (let dy = -r; dy <= r; dy++) {
        const py = Math.max(0, Math.min(height - 1, y + dy));
        const idx = (py * width + x) * 4;
        rSum += tempData[idx];
        gSum += tempData[idx + 1];
        bSum += tempData[idx + 2];
        count++;
      }

      const idx = (y * width + x) * 4;
      outputData[idx] = rSum / count;
      outputData[idx + 1] = gSum / count;
      outputData[idx + 2] = bSum / count;
    }
  }

  return output;
};

/**
 * Apply vibrance (saturation that preserves skin tones)
 * @param {number} r - Red channel value
 * @param {number} g - Green channel value
 * @param {number} b - Blue channel value
 * @param {number} vibranceVal - Vibrance amount (-100 to 100)
 * @returns {{r: number, g: number, b: number}} Adjusted RGB values
 */
export const applyVibrance = (r, g, b, vibranceVal) => {
  if (vibranceVal === 0) return { r, g, b };

  // Calculate saturation
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  // Detect skin tones (warm colors)
  const isSkinTone = r > 95 && g > 40 && b > 20 && r > g && r > b;

  // Apply less vibrance to skin tones
  const adjustment = isSkinTone ? vibranceVal * 0.3 : vibranceVal;

  if (saturation > 0) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const vibranceFactor = 1 + adjustment / 100;
    r = gray + vibranceFactor * (r - gray);
    g = gray + vibranceFactor * (g - gray);
    b = gray + vibranceFactor * (b - gray);
  }

  return { r, g, b };
};

/**
 * Apply all filters to canvas pixels (for export)
 * @param {HTMLCanvasElement} canvas - The canvas to apply filters to
 * @param {Object} filterValues - Object containing all filter values
 * @returns {void}
 */
export const applyFiltersToCanvas = (canvas, filterValues) => {
  const {
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
    blur,
    grain,
    vignette,
  } = filterValues;

  // Skip filter application if all values are at default (0)
  if (
    brightness === 0 &&
    contrast === 0 &&
    saturation === 0 &&
    hue === 0 &&
    exposure === 0 &&
    vibrance === 0 &&
    sharpness === 0 &&
    highlights === 0 &&
    shadows === 0 &&
    temperature === 0 &&
    tint === 0 &&
    blur === 0 &&
    grain === 0
  ) {
    return; // No filters to apply
  }

  const ctx = canvas.getContext('2d');
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply blur first if needed (before other filters)
  if (blur > 0) {
    imageData = applyBlur(imageData, blur / 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Apply sharpness blur if needed (negative sharpness = blur)
  if (sharpness < 0) {
    imageData = applyBlur(imageData, Math.abs(sharpness) / 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const data = imageData.data;

  const brightnessVal = brightness / 100;
  const exposureVal = exposure / 100;
  const contrastVal = contrast / 100;
  // Saturation: 0 = no change (normal), -100 = grayscale, 100 = oversaturated
  const saturationVal = 1 + saturation / 100;
  const vibranceVal = vibrance;
  const hueVal = (hue * Math.PI) / 180;
  const highlightsVal = highlights / 100;
  const shadowsVal = shadows / 100;
  const temperatureVal = temperature / 100; // -1 to 1 (cool to warm)
  const tintVal = tint / 100; // -1 to 1 (green to magenta)

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
  if (sharpness > 0) {
    const sharpenedData = applySharpening(imageData, sharpness);
    ctx.putImageData(sharpenedData, 0, 0);
  }

  // Apply grain last (after all other filters)
  if (grain > 0) {
    const grainedData = applyGrain(imageData, grain);
    ctx.putImageData(grainedData, 0, 0);
  }

  // Apply vignette overlay
  if (vignette > 0) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const intensity = vignette / 100;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.8})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

/**
 * Apply filters for preview (using pixel manipulation for accurate preview)
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {HTMLImageElement} currentImage - The current image element
 * @param {Object} filterValues - Object containing all filter values
 * @returns {void}
 */
export const applyCSSFilters = (canvas, currentImage, filterValues) => {
  if (!canvas || !currentImage) return;

  const {
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
    blur,
    grain,
  } = filterValues;

  // Skip if all filters are at default
  if (
    brightness === 0 &&
    contrast === 0 &&
    saturation === 0 &&
    hue === 0 &&
    exposure === 0 &&
    vibrance === 0 &&
    sharpness === 0 &&
    highlights === 0 &&
    shadows === 0 &&
    temperature === 0 &&
    tint === 0 &&
    blur === 0 &&
    grain === 0
  ) {
    return;
  }

  const ctx = canvas.getContext('2d');

  // Get current image data from canvas
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply blur first if needed (before other filters)
  if (blur > 0) {
    imageData = applyBlur(imageData, blur / 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Apply sharpness blur if needed (negative sharpness = blur)
  if (sharpness < 0) {
    imageData = applyBlur(imageData, Math.abs(sharpness) / 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const data = imageData.data;

  const brightnessVal = brightness / 100;
  const exposureVal = exposure / 100;
  const contrastVal = contrast / 100;
  const saturationVal = 1 + saturation / 100;
  const vibranceVal = vibrance;
  const hueVal = (hue * Math.PI) / 180;
  const highlightsVal = highlights / 100;
  const shadowsVal = shadows / 100;
  const temperatureVal = temperature / 100;
  const tintVal = tint / 100;

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
  if (sharpness > 0) {
    const sharpenedData = applySharpening(imageData, sharpness);
    ctx.putImageData(sharpenedData, 0, 0);
  }

  // Apply grain last (after all other filters)
  if (grain > 0) {
    const grainedData = applyGrain(imageData, grain);
    ctx.putImageData(grainedData, 0, 0);
  }
};

