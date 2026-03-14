import { ref, reactive } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

// Global queue state
const queue = reactive([]);
const isProcessing = ref(false);
const requestCache = reactive(new Map());

/**
 * Analytics Queue Composable
 *
 * Manages a queue of analytics requests to prevent simultaneous API calls
 * and provides caching for better performance
 */
export function useAnalyticsQueue() {
  /**
   * Create a cache key from request parameters
   */
  const createCacheKey = (endpoint, params) => {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  };

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = (cachedData, maxAge = 30000) => {
    // 30 seconds default
    if (!cachedData || !cachedData.timestamp) return false;
    return Date.now() - cachedData.timestamp < maxAge;
  };

  /**
   * Get cached data if available and valid
   */
  const getCachedData = (cacheKey, maxAge) => {
    const cached = requestCache.get(cacheKey);
    if (cached && isCacheValid(cached, maxAge)) {
      return cached.data;
    }
    return null;
  };

  /**
   * Set data in cache
   */
  const setCachedData = (cacheKey, data) => {
    requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  };

  /**
   * Process the next item in the queue
   */
  const processQueue = async () => {
    if (isProcessing.value || queue.length === 0) return;

    isProcessing.value = true;

    while (queue.length > 0) {
      const request = queue.shift();

      try {
        // Check cache first
        const cacheKey = createCacheKey(request.endpoint, request.params);
        const cachedData = getCachedData(cacheKey, request.cacheMaxAge);

        if (cachedData && !request.forceRefresh) {
          // Return cached data
          request.resolve(cachedData);
          continue;
        }
        
        // Make API request
        const response = await lmnFetch({
          endpoint: request.endpoint,
          type: request.method || 'GET',
          params: request.params,
        });

        if (response && response.data) {
          // Cache the response
          setCachedData(cacheKey, response.data);
          request.resolve(response.data);
        } else {
          request.reject(new Error('No data received from API'));
        }
      } catch (error) {
        request.reject(error);
      }

      // Add small delay between requests to prevent overwhelming the server
      if (queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    isProcessing.value = false;
  };

  /**
   * Add a request to the queue
   */
  const addToQueue = (endpoint, params, options = {}) => {
    return new Promise((resolve, reject) => {
      const request = {
        endpoint,
        params,
        method: options.method || 'GET',
        cacheMaxAge: options.cacheMaxAge || 30000, // 30 seconds default
        forceRefresh: options.forceRefresh || false,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      queue.push(request);

      // Start processing if not already running
      if (!isProcessing.value) {
        processQueue();
      }
    });
  };

  /**
   * Clear the cache
   */
  const clearCache = () => {
    requestCache.clear();
  };

  /**
   * Clear cache for specific endpoint
   */
  const clearCacheForEndpoint = (endpoint) => {
    for (const [key] of requestCache) {
      if (key.startsWith(endpoint)) {
        requestCache.delete(key);
      }
    }
  };

  /**
   * Get queue status
   */
  const getQueueStatus = () => {
    return {
      queueLength: queue.length,
      isProcessing: isProcessing.value,
      cacheSize: requestCache.size,
    };
  };

  /**
   * Analytics-specific helper methods
   */
  const analytics = {
    /**
     * Get overview stats
     */
    getOverview: (startDate, endDate, pageUrl = null, options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/stats',
        {
          start_date: startDate,
          end_date: endDate,
          page_url: pageUrl,
          stat_type: 'overview',
        },
        options
      );
    },

    /**
     * Get pages stats
     */
    getPages: (startDate, endDate, pageUrl = null, options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/stats',
        {
          start_date: startDate,
          end_date: endDate,
          page_url: pageUrl,
          stat_type: 'pages',
        },
        options
      );
    },

    /**
     * Get referrers stats
     */
    getReferrers: (startDate, endDate, options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/stats',
        {
          start_date: startDate,
          end_date: endDate,
          stat_type: 'referrers',
        },
        options
      );
    },

    /**
     * Get devices stats
     */
    getDevices: (startDate, endDate, options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/stats',
        {
          start_date: startDate,
          end_date: endDate,
          stat_type: 'devices',
        },
        options
      );
    },

    /**
     * Get geo stats
     */
    getGeo: (startDate, endDate, options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/stats',
        {
          start_date: startDate,
          end_date: endDate,
          stat_type: 'geo',
        },
        options
      );
    },

    /**
     * Get events stats
     */
    getEvents: (startDate, endDate, options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/stats',
        {
          start_date: startDate,
          end_date: endDate,
          stat_type: 'events',
        },
        options
      );
    },

    /**
     * Get chart data
     */
    getChart: (startDate, endDate, chartType = 'both', options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/chart',
        {
          start_date: startDate,
          end_date: endDate,
          chart_type: chartType,
        },
        options
      );
    },

    /**
     * Get active users
     */
    getActiveUsers: (timezone = null, browserTime = null, options = {}) => {
      return addToQueue(
        'flexify-dashboard/v1/analytics/active-users',
        {
          timezone,
          browser_time: browserTime,
        },
        options
      );
    },
  };

  return {
    // Core queue functions
    addToQueue,
    processQueue,
    clearCache,
    clearCacheForEndpoint,
    getQueueStatus,

    // Analytics-specific helpers
    analytics,

    // State
    queueLength: ref(queue.length),
    isProcessing: isProcessing,
    cacheSize: ref(requestCache.size),
  };
}
