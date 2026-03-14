/**
 * Returns a UI status type based on a WP post status.
 *
 * @param {string} status
 * @returns {string} One of: success, warning, info, neutral
 */
export function returnStatusType(status) {
  const value = (status || '').toString().toLowerCase();

  if (value === 'publish') return 'success';
  if (value === 'draft') return 'warning';
  if (value === 'pending') return 'info';
  if (value === 'private') return 'neutral';

  return 'neutral';
}
