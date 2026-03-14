/**
 * UiXpress Analytics Tracking Script
 *
 * Lightweight frontend analytics tracking that logs page views and user interactions
 * with minimal performance impact.
 */

class UiXpressAnalytics {
  constructor() {
    this.config = {
      endpoint: '/wp-json/flexify-dashboard/v1/analytics/track',
      batchSize: 5,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000,
      alwaysUseKeepalive: true, // Use keepalive for all requests for better reliability
    };

    this.queue = [];
    this.isInitialized = false;
    this.sessionId = this.getOrCreateSessionId();
    this.lastTrackTime = 0;
    this.minTrackInterval = 1000; // Minimum 1 second between tracks for same page
    this.isProcessingUnload = false;

    // Store instance globally for unload handlers
    window.flexifyDashboardAnalytics = this;

    this.init();
  }

  /**
   * Initialize analytics tracking
   */
  init() {
    // Only initialize if analytics is enabled and we're on frontend
    if (!this.shouldTrack()) {
      return;
    }

    this.isInitialized = true;

    // Track initial page load
    this.trackPageView();

    // Set up event listeners for frontend interactions
    this.setupEventListeners();

    // Set up batch processing
    this.startBatchProcessor();

    // Track page visibility changes
    this.trackVisibilityChanges();

    // Track navigation changes (for SPAs)
    this.trackNavigationChanges();
  }

  /**
   * Check if analytics should be tracked
   */
  shouldTrack() {
    // Only track on frontend (not admin)
    if (window.location.href.includes('/wp-admin/')) {
      return false;
    }

    // Check if analytics is enabled in settings
    // We'll need to get this from a global variable or make an API call
    return this.isAnalyticsEnabled();
  }

  /**
   * Check if analytics is enabled (simplified check)
   */
  isAnalyticsEnabled() {
    // For now, we'll assume analytics is enabled if the script is loaded
    // In a real implementation, you might want to check this via an API call
    // or pass it as a data attribute on the script tag
    return true;
  }

  /**
   * Get or create session ID
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('fd_analytics_session');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('fd_analytics_session', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Track page view
   */
  trackPageView() {
    const now = Date.now();

    // Prevent duplicate tracking within minimum interval
    if (now - this.lastTrackTime < this.minTrackInterval) {
      return;
    }

    this.lastTrackTime = now;

    const data = {
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      timestamp: now,
    };

    this.queue.push(data);
  }

  /**
   * Set up event listeners for frontend interactions
   */
  setupEventListeners() {
    // Track clicks on external links
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a');
      if (target && this.isExternalLink(target.href)) {
        this.trackClick(target.href, 'external_link');
      }
    });

    // Track form submissions on frontend
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.tagName === 'FORM' && !form.action.includes('/wp-admin/')) {
        this.trackFormSubmission(form);
      }
    });

    // Track time on page
    this.trackTimeOnPage();
  }

  /**
   * Track click events
   */
  trackClick(url, type = 'click') {
    const data = {
      page_url: url,
      page_title: document.title,
      referrer: window.location.href,
      event_type: type,
      timestamp: Date.now(),
    };

    this.queue.push(data);
  }

  /**
   * Track form submissions
   */
  trackFormSubmission(form) {
    const action = form.action || 'unknown';
    const method = form.method || 'POST';

    const data = {
      page_url: action,
      page_title: document.title,
      referrer: window.location.href,
      event_type: 'form_submission',
      form_method: method,
      timestamp: Date.now(),
    };

    this.queue.push(data);
  }

  /**
   * Track time on page
   */
  trackTimeOnPage() {
    const startTime = Date.now();

    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - startTime;
      if (timeOnPage > 1000) {
        // Only track if user spent more than 1 second
        this.trackTimeOnPageEvent(timeOnPage);
      }
    });
  }

  /**
   * Track time on page event
   */
  trackTimeOnPageEvent(timeOnPage) {
    const data = {
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || null,
      event_type: 'time_on_page',
      time_on_page: timeOnPage,
      timestamp: Date.now(),
    };

    this.queue.push(data);
  }

  /**
   * Track navigation changes (for SPAs)
   */
  trackNavigationChanges() {
    // Track popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.trackPageView();
      }, 100);
    });

    // Track pushstate/replacestate (for SPAs that use history API)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(() => {
        this.trackPageView();
      }, 100);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        this.trackPageView();
      }, 100);
    };
  }

  /**
   * Check if link is external
   */
  isExternalLink(url) {
    try {
      const link = new URL(url);
      const current = new URL(window.location.href);
      return link.hostname !== current.hostname;
    } catch (e) {
      return false;
    }
  }

  /**
   * Throttle function for performance
   */
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;

    return function (...args) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Track page visibility changes
   */
  trackVisibilityChanges() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.trackPageView();
      }
    });
  }

  /**
   * Start batch processor to send queued events
   */
  startBatchProcessor() {
    // Process queue immediately
    this.processQueue();

    // Set up interval for batch processing
    setInterval(() => {
      this.processQueue();
    }, this.config.flushInterval);

    // Process queue before page unload - multiple event listeners for reliability
    this.setupUnloadHandlers();
  }

  /**
   * Set up multiple unload event handlers for maximum reliability
   */
  setupUnloadHandlers() {
    // Primary beforeunload handler
    window.addEventListener('beforeunload', () => {
      this.processQueue(true);
    });

    // Backup handlers for different scenarios
    window.addEventListener('pagehide', () => {
      this.processQueue(true);
    });

    // For browsers that support visibilitychange
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.processQueue(true);
      }
    });

    // For SPA navigation (if using history API)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      // Process queue before navigation
      if (window.flexifyDashboardAnalytics) {
        window.flexifyDashboardAnalytics.processQueue(true);
      }
      originalPushState.apply(history, args);
    };

    history.replaceState = function (...args) {
      // Process queue before navigation
      if (window.flexifyDashboardAnalytics) {
        window.flexifyDashboardAnalytics.processQueue(true);
      }
      originalReplaceState.apply(history, args);
    };
  }

  /**
   * Process the analytics queue
   */
  async processQueue(isUnload = false) {
    if (this.queue.length === 0) {
      return;
    }

    console.log('Processing queue', this.queue);

    // Prevent multiple unload processing
    if (isUnload && this.isProcessingUnload) {
      return;
    }

    if (isUnload) {
      this.isProcessingUnload = true;
    }

    // For unload, process all events immediately
    const batchSize = isUnload ? this.queue.length : this.config.batchSize;
    const events = this.queue.splice(0, batchSize);

    // For unload events, use Promise.allSettled for parallel processing
    if (isUnload) {
      const promises = events.map((event) => this.sendEvent(event, true));
      const results = await Promise.allSettled(promises);

      // Log any failures but don't re-queue for unload
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(
            'UiXpress Analytics: Failed to send unload event',
            result.reason
          );
        }
      });
    } else {
      // Normal batch processing
      for (const event of events) {
        try {
          await this.sendEvent(event);
        } catch (error) {
          console.warn('UiXpress Analytics: Failed to send event', error);
          // Re-queue failed events (up to max retries)
          if (event.retryCount < this.config.maxRetries) {
            event.retryCount = (event.retryCount || 0) + 1;
            this.queue.unshift(event);
          }
        }
      }
    }
  }

  /**
   * Send analytics event to server
   */
  async sendEvent(event, isUnload = false) {
    console.log('seesion sent');
    // Get REST configuration from WordPress
    const restBase = window.wpApiSettings?.root || '/wp-json/';
    const restNonce = window.wpApiSettings?.nonce || this.getNonceFromMeta();

    // Build payload, excluding null/undefined values to avoid REST API validation errors
    const payload = {
      page_url: event.page_url,
      session_id: this.sessionId, // Include session ID from client
    };

    // Only include optional fields if they have values
    if (event.page_title) {
      payload.page_title = event.page_title;
    }
    if (event.referrer) {
      payload.referrer = event.referrer;
    }
    if (event.user_agent) {
      payload.user_agent = event.user_agent;
    }

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    // Only add nonce if available (for logged-in users)
    // Unauthenticated users can still track analytics without nonce
    if (restNonce) {
      fetchOptions.headers['X-WP-Nonce'] = restNonce;
    }

    // Always use keepalive for unload events, and for normal events too for reliability
    if (isUnload || this.config.alwaysUseKeepalive) {
      fetchOptions.keepalive = true;
    }

    const response = await fetch(
      `${restBase}flexify-dashboard/v1/analytics/track`,
      fetchOptions
    );

    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.code) {
          errorMessage = `${errorData.code}: ${
            errorData.message || response.statusText
          }`;
        }
      } catch (e) {
        // If response is not JSON, use default error message
      }
      console.error(
        'UiXpress Analytics: Failed to send event',
        errorMessage,
        payload
      );
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get nonce from meta tag if wpApiSettings is not available
   */
  getNonceFromMeta() {
    const metaTag = document.querySelector('meta[name="wp-api-nonce"]');
    return metaTag ? metaTag.getAttribute('content') : null;
  }
}

// Initialize analytics when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new UiXpressAnalytics();
  });
} else {
  new UiXpressAnalytics();
}
