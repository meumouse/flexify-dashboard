import { STATUS_BADGE_CLASSES, getStatusLabelText } from '../state/constants.js';

/**
 * Gets post status badge color class
 * @param {string} status - Post status
 * @returns {string} CSS class for badge
 */
export const getStatusBadgeClass = (status) => {
  return STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.draft;
};

/**
 * Gets post status label
 * @param {string} status - Post status
 * @returns {string} Translated status label
 */
export const getStatusLabel = (status) => {
  return getStatusLabelText(status);
};
