import { getCurrentInstance } from 'vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useAppStore } from '@/store/app/app.js';

/**
 * Gets the selected remote site configuration
 *
 * @returns {Object|null} Remote site configuration or null for local
 */
const getSelectedRemoteSite = () => {
  const selectedSiteId =
    localStorage.getItem('flexify_dashboard_selected_site') || 'local';

  if (selectedSiteId === 'local') {
    return null;
  }

  const appStore = useAppStore();
  const settings = appStore.state?.flexify_dashboard_settings;
  const remoteSites =
    settings && Array.isArray(settings.remote_sites)
      ? settings.remote_sites
      : [];

  return (
    remoteSites.find((site) => site && site.url === selectedSiteId) || null
  );
};

/**
 * Wrapper for fetch
 *
 * Handles errors and automatic fetch types
 * Supports both local and remote WordPress sites
 *
 * @param {string} endpoint
 * @param {string} type - POST | GET | DELETE
 * @param {object} data
 * @param {boolean} whether the data is formData
 * @param {object} Whether to use a specific site to query instead of current
 *
 */
export const lmnFetch = async ({
  endpoint = '',
  type = 'GET',
  data = {},
  params = {},
  isFormData = false,
}) => {
  const appStore = useAppStore();
  const remoteSite = getSelectedRemoteSite();

  let restBase;
  let restNonce;
  let authHeader = {};

  if (remoteSite) {
    // Use remote site configuration
    try {
      // Ensure URL has protocol
      let baseUrl = remoteSite.url;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`;
      }

      // Remove trailing slash
      baseUrl = baseUrl.replace(/\/$/, '');

      // Construct REST API base URL
      restBase = `${baseUrl}/wp-json/`;

      // Create Basic Auth header with username:application_password
      if (remoteSite.username && remoteSite.app_password) {
        const credentials = btoa(
          `${remoteSite.username}:${remoteSite.app_password}`
        );
        authHeader = {
          Authorization: `Basic ${credentials}`,
        };
      }

      // For remote sites, we don't use nonce (use Basic Auth instead)
      restNonce = '';
    } catch (error) {
      notify({
        type: 'error',
        title: __('Remote Site Error', 'flexify-dashboard'),
        message: __('Invalid remote site configuration', 'flexify-dashboard'),
      });
      return doError(
        'Remote Site Error',
        'Invalid remote site configuration',
        true
      );
    }
  } else {
    // Use local site configuration
    restNonce = appStore.state.restNonce;
    restBase = appStore.state.restBase;
  }

  const payload = { method: type, headers: { ...authHeader } };

  // Handle payload based on whether it's FormData or regular JSON
  if (type !== 'GET') {
    if (isFormData) {
      // For file uploads, don't set Content-Type - browser will set it with boundary
      payload.body = data;
      payload.headers = {
        ...payload.headers,
        ...(restNonce ? { 'X-WP-Nonce': restNonce } : {}),
      };
    } else {
      payload.body = JSON.stringify(data);
      payload.headers = {
        ...payload.headers,
        'Content-Type': 'application/json',
        ...(restNonce ? { 'X-WP-Nonce': restNonce } : {}),
      };
    }
  } else {
    payload.headers = {
      ...payload.headers,
      'Content-Type': 'application/json',
      ...(restNonce ? { 'X-WP-Nonce': restNonce } : {}),
    };
  }

  // Construct URL with query parameters
  const rest_url = new URL(`${restBase}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value != '') {
      // Handle array parameters for WordPress REST API
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item != null && item != '') {
            rest_url.searchParams.append(`${key}[]`, item);
          }
        });
      } else {
        rest_url.searchParams.append(key, value);
      }
    }
  });

  const response = await fetch(rest_url.toString(), payload);

  // Generic error
  if (!response.ok) {
    try {
      const errorResponse = await response.json();
      return doError(
        'Unable to connect',
        errorResponse.message || errorResponse.error,
        true
      );
    } catch (err) {
      return doError(
        'Unable to connect',
        'Unable to connect to remote services at this time',
        true
      );
    }
  }

  // Get response
  const result = await response.json();

  // Server error
  if (result.error)
    return doError(result.title || result.error, result.message);

  const totalItems = response.headers.get('X-WP-Total');
  const totalPages = response.headers.get('X-WP-TotalPages');

  return { data: result, totalItems, totalPages };
};

/**
 * Helper function for errors
 *
 * @param {String} - title
 * @param {String} - message
 *
 * @since 0.0.1
 */
const doError = (title, message, dontLog) => {
  notify({ type: 'error', title, message });
};

/**
 * Formats params into a URL query string, excluding null and undefined values
 *
 * @param {Object} params - The parameters to be formatted
 * @returns {string} The formatted query string, including the leading '?' if non-empty
 *
 * @since 4.0.0
 */
const getParams = (params) => {
  if (!params || typeof params !== 'object') return '';

  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value != null)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const queryParams = new URLSearchParams(filteredParams);
  const queryString = queryParams.toString();

  return queryString ? `?${queryString}` : '';
};
