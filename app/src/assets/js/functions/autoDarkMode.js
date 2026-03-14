/**
 * Auto dark mode helper.
 *
 * Adds/removes the "dark" class on <html> based on:
 * 1) user preference saved in localStorage (if any)
 * 2) OS preference via prefers-color-scheme
 *
 * @param {Object} args
 * @param {string} args.storageKey LocalStorage key for saved preference
 * @param {string} args.className  Class name to toggle on <html>
 * @returns {Object} Helpers (apply/toggle/destroy/getCurrent)
 */
export function autoDarkMode(args = {}) {
  const settings = Object.assign(
    {
      storageKey: 'flexify_dashboard_color_scheme',
      className: 'dark',
    },
    args
  );

  const docEl = document.documentElement;

  const getSaved = () => {
    try {
      return localStorage.getItem(settings.storageKey);
    } catch (e) {
      return null;
    }
  };

  const setSaved = (value) => {
    try {
      localStorage.setItem(settings.storageKey, value);
    } catch (e) {
      // Silent.
    }
  };

  const prefersDark = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const apply = (mode) => {
    // mode: 'dark' | 'light' | 'auto'
    const finalMode = mode || 'auto';
    const shouldBeDark = finalMode === 'dark' ? true : finalMode === 'light' ? false : prefersDark();

    docEl.classList.toggle(settings.className, shouldBeDark);

    return shouldBeDark ? 'dark' : 'light';
  };

  const getCurrent = () => {
    return docEl.classList.contains(settings.className) ? 'dark' : 'light';
  };

  const toggle = () => {
    const isDark = docEl.classList.contains(settings.className);
    docEl.classList.toggle(settings.className, !isDark);
    setSaved(!isDark ? 'dark' : 'light');
    return !isDark ? 'dark' : 'light';
  };

  // Init: saved preference wins, otherwise auto.
  const saved = getSaved();
  const initialMode = saved === 'dark' || saved === 'light' ? saved : 'auto';
  apply(initialMode);

  // Watch OS changes only when not explicitly set (auto mode).
  let media = null;
  const onChange = () => {
    const currentSaved = getSaved();
    if (currentSaved !== 'dark' && currentSaved !== 'light') {
      apply('auto');
    }
  };

  if (typeof window !== 'undefined' && window.matchMedia) {
    media = window.matchMedia('(prefers-color-scheme: dark)');

    if (media && typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
    } else if (media && typeof media.addListener === 'function') {
      media.addListener(onChange);
    }
  }

  const destroy = () => {
    if (!media) return;

    if (typeof media.removeEventListener === 'function') {
      media.removeEventListener('change', onChange);
    } else if (typeof media.removeListener === 'function') {
      media.removeListener(onChange);
    }
  };

  return {
    apply,
    toggle,
    destroy,
    getCurrent,
  };
}
