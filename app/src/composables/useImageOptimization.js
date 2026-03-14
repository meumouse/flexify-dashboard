import { ref, computed } from 'vue';
import imageCompression from 'browser-image-compression';

/**
 * Composable for image optimization and WebP conversion
 * Provides functionality to compress and convert images to WebP format
 */
export const useImageOptimization = () => {
  const isOptimizing = ref(false);
  const optimizationProgress = ref(0);
  const optimizationError = ref(null);

  /**
   * Optimize image by compressing and converting to WebP
   * @param {File} file - The image file to optimize
   * @param {Object} options - Optimization options
   * @param {number} options.maxSizeMB - Maximum file size in MB (default: 1)
   * @param {number} options.maxWidthOrHeight - Maximum width or height (default: 1920)
   * @param {number} options.quality - Image quality 0-1 (default: 0.8)
   * @param {boolean} options.convertToWebP - Whether to convert to WebP (default: true)
   * @returns {Promise<File>} Optimized image file
   */
  const optimizeImage = async (file, options = {}) => {
    isOptimizing.value = true;
    optimizationError.value = null;
    optimizationProgress.value = 0;

    try {
      const defaultOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        quality: 0.8,
        convertToWebP: true,
        useWebWorker: true,
        onProgress: (progress) => {
          optimizationProgress.value = Math.round(progress * 100);

          if (optimizationProgress.value > 100) {
            optimizationProgress.value = 100;
          }
        },
      };

      const compressionOptions = { ...defaultOptions, ...options };

      // Compress the image
      const compressedFile = await imageCompression(file, compressionOptions);

      // If we need to convert to WebP and the file isn't already WebP
      if (compressionOptions.convertToWebP && !file.type.includes('webp')) {
        const webpFile = await convertToWebP(compressedFile);
        return webpFile;
      }

      return compressedFile;
    } catch (error) {
      console.error('Image optimization error:', error);
      optimizationError.value = error.message || 'Image optimization failed';
      throw error;
    } finally {
      isOptimizing.value = false;
      optimizationProgress.value = 0;
    }
  };

  /**
   * Convert image to WebP format using canvas
   * @param {File} file - The image file to convert
   * @returns {Promise<File>} WebP image file
   */
  const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create new file with WebP extension
              const webpFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.webp'),
                {
                  type: 'image/webp',
                  lastModified: Date.now(),
                }
              );
              resolve(webpFile);
            } else {
              reject(new Error('Failed to convert image to WebP'));
            }
          },
          'image/webp',
          0.9 // WebP quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for WebP conversion'));
      };

      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 10) / 10 + ' ' + sizes[i];
  };

  /**
   * Calculate compression ratio
   * @param {number} originalSize - Original file size in bytes
   * @param {number} compressedSize - Compressed file size in bytes
   * @returns {Object} Compression statistics
   */
  const getCompressionStats = (originalSize, compressedSize) => {
    const savedBytes = originalSize - compressedSize;
    const savedPercentage = Math.round((savedBytes / originalSize) * 100);

    return {
      originalSize: formatFileSize(originalSize),
      compressedSize: formatFileSize(compressedSize),
      savedBytes: formatFileSize(savedBytes),
      savedPercentage,
      compressionRatio: Math.round((compressedSize / originalSize) * 100),
    };
  };

  /**
   * Check if browser supports WebP
   * @returns {boolean} True if WebP is supported
   */
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  /**
   * Get optimization status
   */
  const status = computed(() => {
    if (isOptimizing.value) {
      return {
        type: 'optimizing',
        message: `Optimizing... ${optimizationProgress.value}%`,
        progress: optimizationProgress.value,
      };
    }

    if (optimizationError.value) {
      return {
        type: 'error',
        message: optimizationError.value,
        progress: 0,
      };
    }

    return {
      type: 'idle',
      message: 'Ready to optimize',
      progress: 0,
    };
  });

  return {
    // State
    isOptimizing,
    optimizationProgress,
    optimizationError,
    status,

    // Methods
    optimizeImage,
    convertToWebP,
    formatFileSize,
    getCompressionStats,
    supportsWebP,
  };
};
