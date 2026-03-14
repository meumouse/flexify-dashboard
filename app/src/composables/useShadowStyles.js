import { ref } from 'vue';
import { useAppStore } from '@/store/app/app.js';
import { hexToRgb } from '@/assets/js/functions/hexToRgb.js';

/**
 * WeakSet to track which stylesheets have already been processed
 * Uses WeakSet so stylesheets can be garbage collected if no longer referenced
 */
const processedStyleSheets = new WeakSet();

/**
 * Composable for managing shadow root styles and custom CSS properties
 * @param {import('vue').Ref<CSSStyleSheet>} adoptedStyleSheets - The adopted stylesheets ref for shadow root
 * @returns {Object} Object containing style management functions
 * @example
 * const adoptedStyleSheets = ref(new CSSStyleSheet());
 * const { setStyles, setCustomProperties } = useShadowStyles(adoptedStyleSheets);
 * setStyles();
 */
export const useShadowStyles = (adoptedStyleSheets) => {
  const appStore = useAppStore();

  /**
   * Manually adds the stylesheet link to the document head
   * @returns {HTMLLinkElement} The created link element
   */
  const manuallyAddStyleSheet = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${appStore.state.pluginBase}app/dist/assets/styles/app.css`;
    document.head.appendChild(link);

    return link;
  };

  /**
   * Sets custom CSS properties for base and accent theme colors
   */
  const setCustomProperties = () => {
    // Base colors
    if (Array.isArray(appStore.state.flexify_dashboard_settings.base_theme_scale)) {
      const baseCssValues = appStore.state.flexify_dashboard_settings.base_theme_scale;
      for (let color of baseCssValues) {
        const hexArray = hexToRgb(color.color);
        const variableName = `--fd-base-${color.step}`;
        document.documentElement.style.setProperty(
          variableName,
          hexArray.join(' ')
        );
      }
    }

    // Accent colors
    if (Array.isArray(appStore.state.flexify_dashboard_settings.accent_theme_scale)) {
      const baseCssValues = appStore.state.flexify_dashboard_settings.accent_theme_scale;

      for (let color of baseCssValues) {
        const hexArray = hexToRgb(color.color);
        const variableName = `--fd-accent-${color.step}`;
        document.documentElement.style.setProperty(
          variableName,
          hexArray.join(' ')
        );
      }
    }
  };

  /**
   * Injects styles into shadow root
   * Caches the result to prevent duplicate rule insertion on subsequent calls
   * Uses WeakSet to track processed stylesheets across component instances
   */
  const setStyles = () => {
    // Return early if styles have already been processed for this stylesheet
    if (processedStyleSheets.has(adoptedStyleSheets.value)) {
      return;
    }

    let appStyleNode = document.querySelector('#flexify-dashboard-css');
    if (!appStyleNode) {
      appStyleNode = manuallyAddStyleSheet();
      // Wait for stylesheet to load
      appStyleNode.onload = () => {
        const appStyles = appStyleNode.sheet;
        for (const rule of [...appStyles.cssRules].reverse()) {
          adoptedStyleSheets.value.insertRule(rule.cssText);
        }
        setCustomProperties();
        processedStyleSheets.add(adoptedStyleSheets.value);
      };
    } else {
      const appStyles = appStyleNode.sheet;
      for (const rule of [...appStyles.cssRules].reverse()) {
        adoptedStyleSheets.value.insertRule(rule.cssText);
      }
      setCustomProperties();
      processedStyleSheets.add(adoptedStyleSheets.value);
    }

    //appStyleNode.remove();
  };

  return {
    setStyles,
    setCustomProperties,
  };
};

