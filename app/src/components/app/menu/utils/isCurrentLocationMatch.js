/**
 * Formats a URL by decoding it if it contains encoded characters
 * @param {string} url - The URL to format
 * @returns {string} The formatted URL
 */
const formatUrl = (url) => {
  if (!url) return '';

  if (url.includes('%')) {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      return url;
    }
  }

  return url;
};

let cachedLocationKey = '';
let cachedCurrentLocations = [];

const getCurrentLocationVariations = () => {
  const key = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (key === cachedLocationKey && cachedCurrentLocations.length) {
    return cachedCurrentLocations;
  }

  const currentLocationHref = window.location.href;
  const currentLocationDecoded = formatUrl(currentLocationHref);
  const currentPath = window.location.pathname + window.location.search;
  const currentPathDecoded = formatUrl(currentPath);
  const currentPathWithHash =
    window.location.pathname + window.location.search + window.location.hash;
  const currentPathWithHashDecoded = formatUrl(currentPathWithHash);

  cachedLocationKey = key;
  cachedCurrentLocations = [...new Set([
    currentLocationHref,
    currentLocationDecoded,
    currentPath,
    currentPathDecoded,
    currentPathWithHash,
    currentPathWithHashDecoded,
  ])];

  return cachedCurrentLocations;
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

  const uniqueCurrentLocations = getCurrentLocationVariations();
  const formattedLinkUrl = formatUrl(linkUrl);
  const uniqueUrlVariations = [...new Set([
    linkUrl,
    formattedLinkUrl,
    encodeURI(linkUrl),
    encodeURI(formattedLinkUrl),
  ])];

  for (const urlVariation of uniqueUrlVariations) {
    for (const currentLocation of uniqueCurrentLocations) {
      if (currentLocation.endsWith(urlVariation)) {
        return true;
      }

      if (currentLocation === urlVariation) {
        return true;
      }
    }
  }

  return false;
};
