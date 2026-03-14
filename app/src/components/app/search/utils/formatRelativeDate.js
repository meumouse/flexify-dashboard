/**
 * Formats a date to relative time (e.g., "2 days ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted relative date
 */
export const formatRelativeDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return __('Just now', 'flexify-dashboard');
  if (diffMins < 60)
    return `${diffMins} ${
      diffMins === 1 ? __('minute', 'flexify-dashboard') : __('minutes', 'flexify-dashboard')
    } ${__('ago', 'flexify-dashboard')}`;
  if (diffHours < 24)
    return `${diffHours} ${
      diffHours === 1 ? __('hour', 'flexify-dashboard') : __('hours', 'flexify-dashboard')
    } ${__('ago', 'flexify-dashboard')}`;
  if (diffDays < 7)
    return `${diffDays} ${
      diffDays === 1 ? __('day', 'flexify-dashboard') : __('days', 'flexify-dashboard')
    } ${__('ago', 'flexify-dashboard')}`;

  // Format as date if older than a week
  return date.toLocaleDateString();
};
