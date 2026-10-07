/**
 * Canvas drawing utility functions
 * Functions for drawing overlays and effects on canvas
 */

/**
 * Draw vignette effect on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} vignetteValue - Vignette intensity (0-100)
 * @returns {void}
 */
export const drawVignette = (ctx, canvas, vignetteValue) => {
  if (!canvas || vignetteValue <= 0) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
  const intensity = vignetteValue / 100;

  // Create radial gradient
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
};

/**
 * Draw crop overlay on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} cropStartX - Crop start X coordinate
 * @param {number} cropStartY - Crop start Y coordinate
 * @param {number} cropEndX - Crop end X coordinate
 * @param {number} cropEndY - Crop end Y coordinate
 * @returns {void}
 */
export const drawCropOverlay = (
  ctx,
  canvas,
  cropStartX,
  cropStartY,
  cropEndX,
  cropEndY
) => {
  if (!canvas) return;

  const x1 = Math.min(cropStartX, cropEndX);
  const y1 = Math.min(cropStartY, cropEndY);
  const x2 = Math.max(cropStartX, cropEndX);
  const y2 = Math.max(cropStartY, cropEndY);

  const width = x2 - x1;
  const height = y2 - y1;

  // Only draw if there's a valid selection
  if (width <= 0 || height <= 0) return;

  // Draw dark overlay over entire canvas first
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clear the crop area (make it bright/visible) - this is what we keep
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(x1, y1, width, height);
  ctx.globalCompositeOperation = 'source-over';

  // Draw crop border
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.strokeRect(x1, y1, width, height);

  // Draw corner handles
  const handleSize = 12;
  ctx.fillStyle = '#3b82f6';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  // Top-left
  ctx.fillRect(
    x1 - handleSize / 2,
    y1 - handleSize / 2,
    handleSize,
    handleSize
  );
  ctx.strokeRect(
    x1 - handleSize / 2,
    y1 - handleSize / 2,
    handleSize,
    handleSize
  );

  // Top-right
  ctx.fillRect(
    x2 - handleSize / 2,
    y1 - handleSize / 2,
    handleSize,
    handleSize
  );
  ctx.strokeRect(
    x2 - handleSize / 2,
    y1 - handleSize / 2,
    handleSize,
    handleSize
  );

  // Bottom-left
  ctx.fillRect(
    x1 - handleSize / 2,
    y2 - handleSize / 2,
    handleSize,
    handleSize
  );
  ctx.strokeRect(
    x1 - handleSize / 2,
    y2 - handleSize / 2,
    handleSize,
    handleSize
  );

  // Bottom-right
  ctx.fillRect(
    x2 - handleSize / 2,
    y2 - handleSize / 2,
    handleSize,
    handleSize
  );
  ctx.strokeRect(
    x2 - handleSize / 2,
    y2 - handleSize / 2,
    handleSize,
    handleSize
  );
};

