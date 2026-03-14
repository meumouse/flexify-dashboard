import { COMMAND_PATTERNS } from '../state/constants.js';

/**
 * Parses command syntax from search query
 * Supports: >post, >page, @user, #category, !action, ?help
 * @param {string} query - The search query
 * @returns {Object} Parsed query with filter and cleaned query
 */
export const parseCommandSyntax = (query) => {
  if (!query) return { filter: null, cleanQuery: '' };

  const trimmed = query.trim();

  // Check for command prefix
  for (const [prefix, filter] of Object.entries(COMMAND_PATTERNS)) {
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      return {
        filter,
        cleanQuery: trimmed.substring(prefix.length).trim(),
      };
    }
  }

  // Check for custom post type filters (>custom-type)
  const customTypeMatch = trimmed.match(/^>(\w+)\s+(.+)$/i);
  if (customTypeMatch) {
    return {
      filter: customTypeMatch[1],
      cleanQuery: customTypeMatch[2],
    };
  }

  return { filter: null, cleanQuery: trimmed };
};
