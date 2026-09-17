import { notify } from '@/assets/js/functions/notify.js';

/**
 * Open the native WordPress media modal and resolve with the selected images.
 *
 * @param {Object} options
 * @param {string} options.title Modal title.
 * @param {string} options.button Button label.
 * @param {boolean} options.multiple Allow selecting several images.
 * @returns {Promise<Array<{id:number, src:string, alt:string}>>}
 */
export function openMediaFrame({ title, button, multiple = false } = {}) {
  return new Promise((resolve) => {
    if (!window.wp?.media) {
      notify({ title: __('The media library is not available on this screen.', 'flexify-dashboard'), type: 'error' });
      resolve([]);
      return;
    }

    const frame = window.wp.media({
      title: title || __('Select image', 'flexify-dashboard'),
      button: { text: button || __('Use image', 'flexify-dashboard') },
      library: { type: 'image' },
      multiple: multiple ? 'add' : false,
    });

    let selected = false;

    frame.on('select', () => {
      selected = true;
      const images = frame
        .state()
        .get('selection')
        .toJSON()
        .map((attachment) => ({
          id: attachment.id,
          src: attachment.sizes?.medium?.url || attachment.sizes?.thumbnail?.url || attachment.url,
          alt: attachment.alt || '',
        }));

      resolve(images);
    });

    frame.on('close', () => {
      // "select" fires before "close"; resolve empty only when the modal was dismissed.
      setTimeout(() => {
        if (!selected) resolve([]);
      }, 0);
    });

    frame.open();
  });
}
