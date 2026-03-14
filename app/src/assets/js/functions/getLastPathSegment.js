/**
 * getLastPathSegment
 *
 * Returns the last segment of a URL/path.
 * Examples:
 * - "/wp-admin/edit.php" => "edit.php"
 * - "https://site.com/a/b/?q=1" => "b"
 *
 * @param {string} input URL or path
 * @return {string} last segment or empty string
 */
export function getLastPathSegment(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  try {
    // If it's a full URL, parse it.
    const url = input.startsWith('http://') || input.startsWith('https://')
      ? new URL(input)
      : null;

    const pathname = url ? url.pathname : input;

    const cleaned = String(pathname)
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '');

    const parts = cleaned.split('/').filter(Boolean);

    return parts.length ? parts[parts.length - 1] : '';
  } catch (e) {
    // Fallback for invalid URLs
    const cleaned = String(input)
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '');

    const parts = cleaned.split('/').filter(Boolean);

    return parts.length ? parts[parts.length - 1] : '';
  }
}

export default getLastPathSegment;
