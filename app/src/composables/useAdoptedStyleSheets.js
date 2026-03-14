import { inject, ref } from 'vue';

/**
 * Injection key for adoptedStyleSheets
 * @type {symbol}
 */
export const ADOPTED_STYLE_SHEETS_KEY = Symbol('adoptedStyleSheets');

/**
 * Composable to access the globally provided adoptedStyleSheets
 * @returns {import('vue').Ref<CSSStyleSheet>} The adoptedStyleSheets ref
 * @throws {Error} If adoptedStyleSheets is not provided in the component tree
 * @example
 * const adoptedStyleSheets = useAdoptedStyleSheets();
 * adoptedStyleSheets.value.insertRule('.my-class { color: red; }');
 */
export const useAdoptedStyleSheets = () => {
  const adoptedStyleSheets = inject(ADOPTED_STYLE_SHEETS_KEY);

  if (!adoptedStyleSheets) {
    throw new Error(
      'useAdoptedStyleSheets() must be used within a component that provides adoptedStyleSheets. ' +
        'Make sure menu-wrapper.vue is in the component tree.'
    );
  }

  return adoptedStyleSheets;
};
