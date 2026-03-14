/**
 * Formats a URL by decoding it if it contains encoded characters
 * @param {string} url - The URL to format
 * @returns {string} The formatted URL
 */
const formatUrl = (url) => {
  if (!url) return '';
  
  // Check if URL contains encoded characters
  if (url.includes('%')) {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      return url;
    }
  }
  
  return url;
};

/**
 * Checks if the current window location matches or ends with the given URL
 * Checks against both encoded and decoded versions of both the link URL and window.location
 * to handle cases where scripts (like WooCommerce) encode URLs in the address bar
 * @param {string} linkUrl - The menu item URL to check
 * @returns {boolean} True if the current location matches the link URL
 */
export const isCurrentLocationMatch = (linkUrl) => {
  if (!linkUrl) return false;
  
  // Get current location variations (both encoded and decoded)
  const currentLocationHref = window.location.href;
  const currentLocationDecoded = formatUrl(currentLocationHref);
  
  const currentPath = window.location.pathname + window.location.search;
  const currentPathDecoded = formatUrl(currentPath);
  
  const currentPathWithHash = window.location.pathname + window.location.search + window.location.hash;
  const currentPathWithHashDecoded = formatUrl(currentPathWithHash);
  
  // Create array of current location variations
  const currentLocationVariations = [
    currentLocationHref,
    currentLocationDecoded,
    currentPath,
    currentPathDecoded,
    currentPathWithHash,
    currentPathWithHashDecoded,
  ];
  
  // Remove duplicates
  const uniqueCurrentLocations = [...new Set(currentLocationVariations)];
  
  // Format the link URL
  const formattedLinkUrl = formatUrl(linkUrl);
  
  // Create array of URL variations to check (both encoded and decoded)
  const urlVariations = [
    linkUrl, // Original (potentially encoded)
    formattedLinkUrl, // Decoded version
    encodeURI(linkUrl), // Explicitly encoded version
    encodeURI(formattedLinkUrl), // Encoded version of decoded URL
  ];
  
  // Remove duplicates
  const uniqueUrlVariations = [...new Set(urlVariations)];
  
  // Check each URL variation against each current location variation
  for (const urlVariation of uniqueUrlVariations) {
    for (const currentLocation of uniqueCurrentLocations) {
      // Check if current location ends with the URL variation
      if (currentLocation.endsWith(urlVariation)) {
        return true;
      }
      
      // Check if the URL variation matches the current location exactly
      if (currentLocation === urlVariation) {
        return true;
      }
    }
  }
  
  return false;
};
