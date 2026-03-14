/**
 * Formats a URL by decoding it if it contains encoded characters
 * This prevents double-encoding issues where URLs like
 * admin.php?page=wc-admin&path=/analytics/overview
 * get rendered as admin.php?page=wc-admin&path=%2Fanalytics%2Foverview
 *
 * @param {string} url - The URL to format
 * @returns {string} The properly formatted URL
 */
export const formatUrl = (url) => {
  if (!url) return '';

  // Check if URL contains encoded characters that shouldn't be encoded
  // (e.g., %2F for / in query parameters)
  // Only decode if we detect encoded characters
  if (url.includes('%')) {
    try {
      // Decode the URL to ensure it's in raw format
      const decoded = decodeURIComponent(url);
      // Only use decoded version if it's different and valid
      return decoded;
    } catch (e) {
      // If decoding fails (invalid encoding), return original
      return url;
    }
  }

  // No encoded characters detected, return as-is
  return url;
};
