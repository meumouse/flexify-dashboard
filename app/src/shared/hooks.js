/**
 * JavaScript Hooks and Filters System
 * Similar to WordPress hooks - supports actions and filters with async/await
 */

class HooksSystem {
  constructor() {
    this.actions = {};
    this.filters = {};
  }

  /**
   * Add an action hook
   * @param {string} tag - The name of the action
   * @param {Function} callback - The function to execute
   * @param {number} priority - Priority (lower runs first, default 10)
   */
  addAction(tag, callback, priority = 10) {
    if (!this.actions[tag]) {
      this.actions[tag] = [];
    }

    this.actions[tag].push({ callback, priority });
    this.actions[tag].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove an action hook
   * @param {string} tag - The name of the action
   * @param {Function} callback - The function to remove
   */
  removeAction(tag, callback) {
    if (!this.actions[tag]) return;

    this.actions[tag] = this.actions[tag].filter(
      (hook) => hook.callback !== callback
    );
  }

  /**
   * Execute an action hook (awaits all async callbacks)
   * @param {string} tag - The name of the action
   * @param {...any} args - Arguments to pass to callbacks
   */
  async doAction(tag, ...args) {
    if (!this.actions[tag]) return;

    for (const hook of this.actions[tag]) {
      await hook.callback(...args);
    }
  }

  /**
   * Add a filter hook
   * @param {string} tag - The name of the filter
   * @param {Function} callback - The function to execute
   * @param {number} priority - Priority (lower runs first, default 10)
   */
  addFilter(tag, callback, priority = 10) {
    if (!this.filters[tag]) {
      this.filters[tag] = [];
    }

    this.filters[tag].push({ callback, priority });
    this.filters[tag].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a filter hook
   * @param {string} tag - The name of the filter
   * @param {Function} callback - The function to remove
   */
  removeFilter(tag, callback) {
    if (!this.filters[tag]) return;

    this.filters[tag] = this.filters[tag].filter(
      (hook) => hook.callback !== callback
    );
  }

  /**
   * Apply filters to a value (awaits all async callbacks)
   * @param {string} tag - The name of the filter
   * @param {any} value - The value to filter
   * @param {...any} args - Additional arguments to pass to callbacks
   * @returns {Promise<any>} The filtered value
   */
  async applyFilters(tag, value, ...args) {
    if (!this.filters[tag]) return value;

    let filtered = value;

    for (const hook of this.filters[tag]) {
      filtered = await hook.callback(filtered, ...args);
    }

    return filtered;
  }

  /**
   * Check if a specific action has been registered
   * @param {string} tag - The name of the action
   * @returns {boolean}
   */
  hasAction(tag) {
    return this.actions[tag] && this.actions[tag].length > 0;
  }

  /**
   * Check if a specific filter has been registered
   * @param {string} tag - The name of the filter
   * @returns {boolean}
   */
  hasFilter(tag) {
    return this.filters[tag] && this.filters[tag].length > 0;
  }

  /**
   * Remove all hooks for a specific action
   * @param {string} tag - The name of the action
   */
  removeAllActions(tag) {
    delete this.actions[tag];
  }

  /**
   * Remove all hooks for a specific filter
   * @param {string} tag - The name of the filter
   */
  removeAllFilters(tag) {
    delete this.filters[tag];
  }
}

// Create singleton instance
const hooks = new HooksSystem();

// Export both the instance and the class
export default hooks;
export { HooksSystem };

// Also export individual methods for convenience
export const addAction = hooks.addAction.bind(hooks);
export const removeAction = hooks.removeAction.bind(hooks);
export const doAction = hooks.doAction.bind(hooks);
export const hasAction = hooks.hasAction.bind(hooks);
export const removeAllActions = hooks.removeAllActions.bind(hooks);

export const addFilter = hooks.addFilter.bind(hooks);
export const removeFilter = hooks.removeFilter.bind(hooks);
export const applyFilters = hooks.applyFilters.bind(hooks);
export const hasFilter = hooks.hasFilter.bind(hooks);
export const removeAllFilters = hooks.removeAllFilters.bind(hooks);

// Make globally available on window.flexifyDashboard object for cross-app usage
if (typeof window !== 'undefined') {
  // Create flexify-dashboard namespace if it doesn't exist
  window.flexifyDashboard = window.flexifyDashboard || {};

  // Attach hooks instance
  window.flexifyDashboard.hooks = hooks;

  // Also expose individual functions on window.flexifyDashboard for convenience
  window.flexifyDashboard.addAction = addAction;
  window.flexifyDashboard.removeAction = removeAction;
  window.flexifyDashboard.doAction = doAction;
  window.flexifyDashboard.hasAction = hasAction;
  window.flexifyDashboard.removeAllActions = removeAllActions;

  window.flexifyDashboard.addFilter = addFilter;
  window.flexifyDashboard.removeFilter = removeFilter;
  window.flexifyDashboard.applyFilters = applyFilters;
  window.flexifyDashboard.hasFilter = hasFilter;
  window.flexifyDashboard.removeAllFilters = removeAllFilters;
}
