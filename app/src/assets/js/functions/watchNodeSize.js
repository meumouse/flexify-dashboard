/**
 * Watch node size changes using ResizeObserver (with fallback).
 *
 * @param {HTMLElement} node
 * @param {Function} callback Receives: { width, height, entry }
 * @returns {Function} destroy function
 */
export function watchNodeSize(node, callback) {
  if (!node || typeof callback !== 'function') {
    return function () {};
  }

  let ro = null;
  let raf = null;
  let lastWidth = null;
  let lastHeight = null;

  const emit = (entry) => {
    const rect = entry && entry.contentRect ? entry.contentRect : node.getBoundingClientRect();
    const width = Math.round(rect.width || 0);
    const height = Math.round(rect.height || 0);

    if (width === lastWidth && height === lastHeight) {
      return;
    }

    lastWidth = width;
    lastHeight = height;

    callback({
      width: width,
      height: height,
      entry: entry || null,
    });
  };

  // Prefer ResizeObserver.
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      emit(entries[0]);
    });

    ro.observe(node);

    // Emit first time.
    raf = requestAnimationFrame(() => emit(null));

    return function destroy() {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }

  // Fallback: poll on resize + interval.
  const onResize = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => emit(null));
  };

  window.addEventListener('resize', onResize);

  const interval = setInterval(() => {
    emit(null);
  }, 250);

  // Emit first time.
  onResize();

  return function destroy() {
    if (raf) cancelAnimationFrame(raf);
    clearInterval(interval);
    window.removeEventListener('resize', onResize);
  };
}
