<script setup>
import { ref, computed, watch } from 'vue';
import html2canvas from 'html2canvas';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppTextarea from '@/components/utility/text-area/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { useAppStore } from '@/store/app/app.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const appStore = useAppStore();

// Internal state
const status = ref('idle'); // idle, capturing, analyzing, success, error
const statusMessage = ref('');
const layoutFixMessage = ref('');
const isFixingLayout = ref(false);
const appliedCSSFix = ref('');
const remainingRequests = ref(0);
const isSavingCSS = ref(false);
const showCSS = ref(false);

/**
 * Captures a screenshot of the wpbody element using html2canvas
 * @returns {Promise<string>} Base64 encoded image data URL
 */
const captureScreenshot = async () => {
  const wpbody = document.body;
  if (!wpbody) {
    throw new Error(__('wpbody element not found', 'flexify-dashboard'));
  }

  // Hide the dialog temporarily during screenshot
  // Find dialog and all its parent elements (including Vue Transition wrapper)
  const dialog = document.getElementById('flexify-dashboard-layout-fix-dialog');
  const elementsToHide = [];
  const originalStyles = [];

  if (dialog) {
    // Collect dialog and all parent elements up to body
    let current = dialog;
    while (current && current !== document.body) {
      const styles = window.getComputedStyle(current);
      if (styles.display !== 'none' && styles.visibility !== 'hidden') {
        elementsToHide.push(current);
        originalStyles.push({
          display: current.style.display || '',
          visibility: current.style.visibility || '',
          opacity: current.style.opacity || '',
          zIndex: current.style.zIndex || '',
          pointerEvents: current.style.pointerEvents || '',
        });

        // Aggressively hide using multiple CSS properties
        current.style.setProperty('display', 'none', 'important');
        current.style.setProperty('visibility', 'hidden', 'important');
        current.style.setProperty('opacity', '0', 'important');
        current.style.setProperty('pointer-events', 'none', 'important');
        current.style.setProperty('z-index', '-9999', 'important');
      }
      current = current.parentElement;
    }
  }

  try {
    // Wait longer for Vue transitions and browser rendering to complete
    // Vue transitions can take up to 300ms based on CSS transitions
    await new Promise((resolve) => setTimeout(resolve, 400));

    const canvas = await html2canvas(wpbody, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      logging: false,
    });
    const dataUrl = canvas.toDataURL('image/png');

    // Always log screenshot info for debugging
    console.log('📸 Screenshot captured:', {
      width: canvas.width,
      height: canvas.height,
      size: `${(dataUrl.length / 1024).toFixed(2)} KB`,
    });

    // Log data URL - you can copy this and paste in browser address bar to view
    console.log('📋 Screenshot data URL (copy to view in browser):', dataUrl);

    // Create downloadable link
    const downloadScreenshot = () => {
      const link = document.createElement('a');
      link.download = `flexify-dashboard-screenshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    };

    // Store download function globally for easy access
    window.flexifyDashboardDownloadScreenshot = downloadScreenshot;
    console.log(
      '💾 Run window.flexifyDashboardDownloadScreenshot() to download the screenshot'
    );

    return dataUrl;
  } finally {
    // Restore all hidden elements
    elementsToHide.forEach((element, index) => {
      const original = originalStyles[index];
      if (original) {
        element.style.removeProperty('display');
        element.style.removeProperty('visibility');
        element.style.removeProperty('opacity');
        element.style.removeProperty('pointer-events');
        element.style.removeProperty('z-index');

        // Restore original values if they existed
        if (original.display) element.style.display = original.display;
        if (original.visibility) element.style.visibility = original.visibility;
        if (original.opacity) element.style.opacity = original.opacity;
        if (original.zIndex) element.style.zIndex = original.zIndex;
        if (original.pointerEvents)
          element.style.pointerEvents = original.pointerEvents;
      }
    });
  }
};

/**
 * Removes unnecessary attributes from HTML string while preserving layout-relevant ones
 * @param {string} html - HTML string to clean
 * @returns {string} Cleaned HTML string
 */
const cleanAttributes = (html) => {
  // Keep: id, class, style, role, aria-* (for structure), href, src, alt, title (truncated)
  // Remove: data-* (except data-id, data-class), event handlers, other non-layout attributes

  // Remove event handlers (onclick, onmouseover, etc.)
  html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove data attributes except structural ones (data-id, data-class)
  html = html.replace(/\s+data-(?!id|class)[\w-]+\s*=\s*["'][^"']*["']/gi, '');

  // Truncate long alt and title attributes (keep first 50 chars)
  html = html.replace(
    /\s+(alt|title)\s*=\s*["']([^"']{50,})["']/gi,
    (match, attr, value) => ` ${attr}="${value.substring(0, 50)}..."`
  );

  return html;
};

/**
 * Removes hidden or non-visible elements from a DOM element
 * @param {HTMLElement} element - DOM element to process (must be in actual DOM)
 * @returns {HTMLElement} Element with hidden children removed
 */
const removeHiddenElements = (element) => {
  // Mark hidden elements in the original DOM with a temporary attribute
  // We check computed styles on the original element (which is in the actual DOM)
  const allOriginalElements = element.querySelectorAll('*');
  const markedForRemoval = [];

  allOriginalElements.forEach((el, index) => {
    try {
      let shouldRemove = false;

      // Check attributes first (fastest)
      if (
        el.hasAttribute('aria-hidden') ||
        el.hasAttribute('hidden') ||
        el.style.display === 'none' ||
        el.style.visibility === 'hidden'
      ) {
        shouldRemove = true;
      } else {
        // Check computed styles (only works on elements in actual DOM)
        const styles = window.getComputedStyle(el);
        if (styles.display === 'none' || styles.visibility === 'hidden') {
          shouldRemove = true;
        }
      }

      if (shouldRemove) {
        // Mark with a temporary data attribute
        el.setAttribute('data-flexify-dashboard-remove', index.toString());
        markedForRemoval.push(index);
      }
    } catch (error) {
      // If we can't check, keep the element to be safe
    }
  });

  // Clone the element (will include the data attributes)
  const clone = element.cloneNode(true);

  // Remove marked elements from clone
  if (markedForRemoval.length > 0) {
    const markedElements = clone.querySelectorAll('[data-flexify-dashboard-remove]');
    markedElements.forEach((el) => {
      el.remove();
    });
  }

  // Clean up: remove temporary attributes from original elements
  allOriginalElements.forEach((el) => {
    if (el.hasAttribute('data-flexify-dashboard-remove')) {
      el.removeAttribute('data-flexify-dashboard-remove');
    }
  });

  return clone;
};

/**
 * Intelligently truncates HTML while preserving structure
 * @param {string} html - HTML string to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated HTML string
 */
const intelligentTruncate = (html, maxLength) => {
  if (html.length <= maxLength) {
    return html;
  }

  // Try to truncate at a safe point (end of a tag)
  let truncated = html.substring(0, maxLength);

  // Find the last complete tag
  const lastOpenTag = truncated.lastIndexOf('<');
  const lastCloseTag = truncated.lastIndexOf('>');

  // If we're in the middle of a tag, try to close it or remove it
  if (lastOpenTag > lastCloseTag) {
    // We're in the middle of a tag, remove it
    truncated = truncated.substring(0, lastOpenTag);
  }

  // Try to close any unclosed tags at the end
  const openTags = (truncated.match(/<[^/][^>]*>/g) || []).length;
  const closeTags = (truncated.match(/<\/[^>]+>/g) || []).length;
  const unclosedTags = openTags - closeTags;

  // Add closing tags for body/html if needed
  if (unclosedTags > 0 && truncated.includes('<body')) {
    truncated += '</body>';
  }
  if (truncated.includes('<html') && !truncated.includes('</html>')) {
    truncated += '</html>';
  }

  return truncated;
};

/**
 * Generates a unique selector for an element
 * @param {HTMLElement} element - Element to generate selector for
 * @param {HTMLElement} rootElement - Root element to stop at
 * @returns {string} Unique selector path
 */
const generateUniqueSelector = (element, rootElement) => {
  const path = [];
  let current = element;

  while (current && current !== rootElement && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, we can stop here
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter((c) => c.trim());
      if (classes.length > 0) {
        selector += `.${classes[0]}`;
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
};

/**
 * Extracts computed styles for all elements and creates a mapping
 * @param {HTMLElement} element - Root element to extract styles from
 * @returns {Object} Mapping of element selectors to computed styles
 */
const extractComputedStyles = (element) => {
  const stylesMap = {};
  const wpbody = document.getElementById('wpbody');
  const allElements = wpbody.querySelectorAll('*');
  let tester = false;

  allElements.forEach((el) => {
    try {
      // Generate unique selector
      const selector = generateUniqueSelector(el, element);

      // Get computed styles (only layout-relevant properties)
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      if (!tester) {
        tester = true;
        console.log(computed);
      }

      const styles = {
        display: computed.display,
        position: computed.position,
        width: computed.width,
        height: computed.height,
        margin: computed.margin,
        padding: computed.padding,
        justifyContent: computed.justifyContent,
        gridTemplateColumns: computed.gridTemplateColumns,
        gridTemplateRows: computed.gridTemplateRows,
        gap: computed.gap,
        border: computed.border,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        zIndex: computed.zIndex,
        overflow: computed.overflow,

        // Box model data
        boxModel: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
        },
      };

      stylesMap[selector] = styles;
    } catch (error) {
      // Skip elements that can't be processed
    }
  });

  return stylesMap;
};

/**
 * Gets HTML structure of the body element with compression
 * @returns {string} Compressed HTML string with computed styles embedded
 */
const getHTML = () => {
  const wpbody = document.body;
  if (!wpbody) {
    return '';
  }

  // Extract computed styles from original element before cloning
  let computedStylesMap = {};
  try {
    computedStylesMap = extractComputedStyles(wpbody);
  } catch (error) {
    console.warn('Failed to extract computed styles:', error);
  }

  // Clone and process the element to remove hidden elements first
  let processedElement;
  try {
    processedElement = removeHiddenElements(wpbody);
  } catch (error) {
    console.warn('Failed to remove hidden elements:', error);
    processedElement = wpbody.cloneNode(true);
  }

  // Get HTML from processed element
  let html = processedElement.outerHTML;
  const originalSize = html.length;

  // 1. Remove script tags and their content (in case any remain)
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Remove style tags (CSS is captured separately via screenshot)
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 3. Replace SVG elements with comments preserving classes and IDs for CSS targeting
  html = html.replace(/<svg([^>]*)>[\s\S]*?<\/svg>/gi, (match, attributes) => {
    // Extract relevant attributes (class, id, data-* for structure)
    const classMatch = attributes.match(/\s+class\s*=\s*["']([^"']*)["']/i);
    const idMatch = attributes.match(/\s+id\s*=\s*["']([^"']*)["']/i);
    const dataIdMatch = attributes.match(/\s+data-id\s*=\s*["']([^"']*)["']/i);
    const dataClassMatch = attributes.match(
      /\s+data-class\s*=\s*["']([^"']*)["']/i
    );

    const parts = [];
    if (idMatch) parts.push(`id="${idMatch[1]}"`);
    if (classMatch) parts.push(`class="${classMatch[1]}"`);
    if (dataIdMatch) parts.push(`data-id="${dataIdMatch[1]}"`);
    if (dataClassMatch) parts.push(`data-class="${dataClassMatch[1]}"`);

    const info = parts.length > 0 ? ` ${parts.join(' ')}` : '';
    return `<!-- SVG${info} -->`;
  });

  // Handle self-closing SVG tags
  html = html.replace(/<svg([^>]*)\/>/gi, (match, attributes) => {
    const classMatch = attributes.match(/\s+class\s*=\s*["']([^"']*)["']/i);
    const idMatch = attributes.match(/\s+id\s*=\s*["']([^"']*)["']/i);
    const dataIdMatch = attributes.match(/\s+data-id\s*=\s*["']([^"']*)["']/i);
    const dataClassMatch = attributes.match(
      /\s+data-class\s*=\s*["']([^"']*)["']/i
    );

    const parts = [];
    if (idMatch) parts.push(`id="${idMatch[1]}"`);
    if (classMatch) parts.push(`class="${classMatch[1]}"`);
    if (dataIdMatch) parts.push(`data-id="${dataIdMatch[1]}"`);
    if (dataClassMatch) parts.push(`data-class="${dataClassMatch[1]}"`);

    const info = parts.length > 0 ? ` ${parts.join(' ')}` : '';
    return `<!-- SVG${info} -->`;
  });

  // 4. Remove HTML comments (but keep our SVG placeholders)
  // We'll remove other comments but preserve our SVG comments
  html = html.replace(/<!--(?!\s*SVG)[\s\S]*?-->/g, '');

  // 5. Clean unnecessary attributes
  html = cleanAttributes(html);

  // 6. Minify whitespace
  // Replace multiple spaces/tabs with single space, but preserve space around tags
  html = html.replace(/\s+/g, ' ');
  // Remove spaces between tags
  html = html.replace(/>\s+</g, '><');
  // Trim
  html = html.trim();

  // 7. Embed computed styles as JSON comment at the beginning
  if (Object.keys(computedStylesMap).length > 0) {
    try {
      // Compress the styles JSON
      const stylesJson = JSON.stringify(computedStylesMap);
      html = `<!-- COMPUTED_STYLES:${stylesJson} -->${html}`;
    } catch (error) {
      console.warn('Failed to embed computed styles:', error);
    }
  }

  // Calculate compression percentage
  const compressedSize = html.length;
  const sizeSaved = originalSize - compressedSize;
  const percentageSaved = ((sizeSaved / originalSize) * 100).toFixed(1);

  console.log(
    'Computed styles extracted:',
    Object.keys(computedStylesMap).length,
    'elements'
  );
  console.log(
    `HTML Compression: ${originalSize.toLocaleString()} → ${compressedSize.toLocaleString()} chars (${percentageSaved}% saved)`
  );

  return html;
};

/**
 * Applies CSS fix to the page
 * @param {string} css - CSS code to apply
 */
const applyCSSFix = (css) => {
  // Create or get a style element
  let styleElement = document.getElementById('flexify-dashboard-layout-fix');

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'flexify-dashboard-layout-fix';
    document.head.appendChild(styleElement);
  }

  // Append the CSS
  styleElement.textContent += '\n' + css;
};

/**
 * Removes the applied CSS fix from the page
 */
const removeCSSFix = () => {
  const styleElement = document.getElementById('flexify-dashboard-layout-fix');
  if (styleElement) {
    styleElement.remove();
  }
};

/**
 * Saves CSS fix to custom_css in flexify_dashboard_settings
 * @param {string} css - CSS code to save
 */
const saveCSSFix = async (css) => {
  isSavingCSS.value = true;

  try {
    // Get existing custom_css or use empty string
    const existingCSS = appStore.state.flexify_dashboard_settings?.custom_css || '';

    // Append new CSS to existing custom CSS
    const updatedCSS = existingCSS
      ? existingCSS +
        '\n\n/* Layout fix - ' +
        new Date().toLocaleString() +
        ' */\n' +
        css
      : css;

    const response = await lmnFetch({
      endpoint: 'wp/v2/settings',
      type: 'POST',
      data: {
        flexify_dashboard_settings: {
          ...appStore.state.flexify_dashboard_settings,
          custom_css: updatedCSS,
        },
      },
    });

    if (response && response.data) {
      appStore.updateState(
        'flexify_dashboard_settings',
        response.data.flexify_dashboard_settings
      );

      // Remove the temporary style element since it's now saved
      removeCSSFix();

      notify({
        message: __('CSS fix saved to custom CSS settings', 'flexify-dashboard'),
        type: 'success',
      });
    }
  } catch (error) {
    notify({
      message: __('Failed to save CSS fix', 'flexify-dashboard'),
      type: 'error',
    });
    console.error('Error saving CSS fix:', error);
  } finally {
    isSavingCSS.value = false;
  }
};

/**
 * Sends layout fix request to API using screenshot endpoint
 * @param {string} imageBase64 - Base64 encoded screenshot
 * @param {string} message - Description of the issue
 * @param {string} html - HTML structure
 * @returns {Promise<Object>} API response with CSS fix
 */
const requestLayoutFix = async (imageBase64, message, html) => {
  const apiUrl = 'https://accounts.uipress.co/api/v1/flexify-dashboard/fix-layout';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        message: message,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.statusMessage || `HTTP error! status: ${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error requesting layout fix:', error);
    throw error;
  }
};

/**
 * Processes the layout fix request
 */
const processLayoutFix = async () => {
  isFixingLayout.value = true;

  try {
    // Check if we have a message
    if (!layoutFixMessage.value.trim()) {
      throw new Error(__('Please describe the layout issue', 'flexify-dashboard'));
    }

    // 1. Capture screenshot
    status.value = 'capturing';
    statusMessage.value = __('Capturing screenshot...', 'flexify-dashboard');
    const screenshot = await captureScreenshot();

    // 2. Get HTML
    status.value = 'capturing';
    statusMessage.value = __('Extracting HTML...', 'flexify-dashboard');
    const html = getHTML();

    // 3. Request fix from API
    status.value = 'analyzing';
    statusMessage.value = __('Analyzing layout issues...', 'flexify-dashboard');
    const result = await requestLayoutFix(
      screenshot,
      layoutFixMessage.value,
      html
    );

    console.log(result);

    // 4. Apply the CSS fix
    applyCSSFix(result.css);

    // 5. Store the CSS and remaining requests
    appliedCSSFix.value = result.css;
    remainingRequests.value = result.remaining;

    // 6. Show success state
    status.value = 'success';
    statusMessage.value = '';
  } catch (error) {
    // Handle errors
    let errorMessage = __(
      'Failed to fix layout and styling. Please try again later.',
      'flexify-dashboard'
    );

    if (error.message.includes('429')) {
      errorMessage = __(
        'Daily limit exceeded. Please try again tomorrow.',
        'flexify-dashboard'
      );
    } else if (error.message.includes('400')) {
      errorMessage = __(
        'Invalid request. Please check your input.',
        'flexify-dashboard'
      );
    } else if (error.message.includes('wpbody')) {
      errorMessage = __(
        'Could not find wpbody element. Please ensure you are on a WordPress admin page.',
        'flexify-dashboard'
      );
    } else {
      errorMessage = error.message || errorMessage;
    }

    status.value = 'error';
    statusMessage.value = errorMessage;
    console.error('Layout fix error:', error);
  } finally {
    isFixingLayout.value = false;
  }
};

/**
 * Handles keeping the CSS fix (saves to custom_css)
 */
const keepCSSFix = async () => {
  if (appliedCSSFix.value) {
    await saveCSSFix(appliedCSSFix.value);
    // Close dialog after saving
    closeDialog();
  } else {
    closeDialog();
  }
};

/**
 * Handles removing the CSS fix
 */
const removeFix = () => {
  removeCSSFix();
  notify({
    message: __('Layout fix removed', 'flexify-dashboard'),
    type: 'success',
  });
  // Close dialog after removing
  closeDialog();
};

/**
 * Copies CSS to clipboard
 */
const copyCSS = async () => {
  if (!appliedCSSFix.value) return;

  try {
    await navigator.clipboard.writeText(appliedCSSFix.value);
    notify({
      title: __('CSS copied to clipboard', 'flexify-dashboard'),
      type: 'success',
    });
  } catch (err) {
    console.error('Failed to copy CSS:', err);
    notify({
      title: __('Failed to copy CSS', 'flexify-dashboard'),
      type: 'error',
    });
  }
};

/**
 * Closes the dialog
 */
const closeDialog = () => {
  // Reset all state
  layoutFixMessage.value = '';
  status.value = 'idle';
  statusMessage.value = '';
  appliedCSSFix.value = '';
  showCSS.value = false;

  emit('close');
};

/**
 * Handles form submission
 */
const handleSubmit = async () => {
  if (!layoutFixMessage.value.trim()) {
    notify({
      message: __('Please describe the layout issue', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  await processLayoutFix();
};

/**
 * Gets status icon based on current status
 */
const statusIcon = computed(() => {
  const icons = {
    idle: 'build',
    capturing: 'camera',
    analyzing: 'progress_activity',
    success: 'tick',
    error: 'error',
  };
  return icons[status.value] || 'build';
});

/**
 * Gets status color based on current status
 */
const statusColor = computed(() => {
  const colors = {
    idle: 'text-zinc-400',
    capturing: 'text-indigo-400',
    analyzing: 'text-indigo-400',
    success: 'text-green-400',
    error: 'text-red-400',
  };
  return colors[status.value] || 'text-zinc-400';
});

/**
 * Gets status background color
 */
const statusBgColor = computed(() => {
  const colors = {
    idle: 'bg-zinc-100 dark:bg-zinc-800',
    capturing: 'bg-indigo-100 dark:bg-indigo-900/30',
    analyzing: 'bg-indigo-100 dark:bg-indigo-900/30',
    success: 'bg-green-100 dark:bg-green-900/30',
    error: 'bg-red-100 dark:bg-red-900/30',
  };
  return colors[status.value] || 'bg-zinc-100 dark:bg-zinc-800';
});

/**
 * Checks if status is processing
 */
const isProcessingStatus = computed(() => {
  return ['capturing', 'analyzing'].includes(status.value);
});

/**
 * Resets the form when dialog closes
 */
watch(
  () => props.visible,
  (newVal) => {
    if (!newVal) {
      layoutFixMessage.value = '';
      showCSS.value = false;
    }
  }
);

/**
 * Resets CSS view when status changes to success
 */
watch(
  () => status.value,
  (newStatus) => {
    if (newStatus === 'success') {
      showCSS.value = false;
    }
  }
);
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="visible"
      id="flexify-dashboard-layout-fix-dialog"
      class="fixed top-6 right-6 z-[99999] w-[420px] max-w-[calc(100vw-3rem)]"
    >
      <div
        class="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex flex-row items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700"
        >
          <div class="flex flex-row items-center gap-3">
            <div
              :class="[
                'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                statusBgColor,
              ]"
            >
              <AppIcon
                :icon="statusIcon"
                :class="['text-lg transition-colors', statusColor]"
              />
            </div>
            <div>
              <h3
                class="text-base font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {{ __('Layout and Styling', 'flexify-dashboard') }}
              </h3>
              <p
                v-if="status === 'success' && remainingRequests > 0"
                class="text-xs text-zinc-500 dark:text-zinc-400"
              >
                {{ remainingRequests }}
                {{ __('requests remaining', 'flexify-dashboard') }}
              </p>
            </div>
          </div>
          <button
            @click="closeDialog"
            class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            :disabled="isFixingLayout || isSavingCSS"
          >
            <AppIcon icon="close" class="text-lg" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <!-- Input Form (shown when idle) -->
          <div v-if="status === 'idle'" class="flex flex-col gap-4">
            <div>
              <label
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                {{ __('Describe the layout or styling issue', 'flexify-dashboard') }}
              </label>
              <AppTextarea
                v-model="layoutFixMessage"
                :placeholder="
                  __(
                    'e.g., The header is overlapping with the content area',
                    'flexify-dashboard'
                  )
                "
                rows="3"
                @keydown.enter.exact.prevent="handleSubmit"
                @keydown.enter.shift.exact=""
              />
            </div>

            <div class="text-xs text-zinc-500 dark:text-zinc-400">
              {{
                __(
                  'A screenshot of the page will be captured and analyzed. The AI will provide CSS fixes based on your description.',
                  'flexify-dashboard'
                )
              }}
            </div>

            <div class="flex flex-row gap-2 items-center justify-end pt-2">
              <AppButton
                @click="closeDialog"
                type="default"
                :disabled="isFixingLayout"
              >
                {{ __('Cancel', 'flexify-dashboard') }}
              </AppButton>
              <AppButton
                @click="handleSubmit"
                type="primary"
                :disabled="isFixingLayout || !layoutFixMessage.trim()"
              >
                {{ __('Fix Layout', 'flexify-dashboard') }}
              </AppButton>
            </div>
          </div>

          <!-- Processing Status -->
          <div v-else-if="isProcessingStatus" class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-3">
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  statusBgColor,
                ]"
              >
                <AppIcon
                  :icon="statusIcon"
                  :class="[
                    'text-base transition-colors',
                    status === 'analyzing' ? 'animate-spin' : '',
                    statusColor,
                  ]"
                />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {{ statusMessage }}
                </p>
              </div>
            </div>
          </div>

          <!-- Success State -->
          <div v-else-if="status === 'success'" class="flex flex-col gap-4">
            <div class="flex flex-row items-start gap-3">
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  statusBgColor,
                ]"
              >
                <AppIcon
                  :icon="statusIcon"
                  :class="['text-base', statusColor]"
                />
              </div>
              <div class="flex-1">
                <p
                  class="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2"
                >
                  {{
                    __(
                      'Layout and styling fix applied successfully!',
                      'flexify-dashboard'
                    )
                  }}
                </p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  {{
                    __(
                      'Would you like to keep this fix permanently or remove it?',
                      'flexify-dashboard'
                    )
                  }}
                </p>

                <!-- View CSS Toggle -->
                <div class="mb-3">
                  <button
                    @click="showCSS = !showCSS"
                    class="flex flex-row items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    <AppIcon
                      icon="chevron_right"
                      :class="[
                        'text-sm transition-transform',
                        showCSS ? 'rotate-90' : '',
                      ]"
                    />
                    <span>
                      {{
                        showCSS
                          ? __('Hide Applied CSS', 'flexify-dashboard')
                          : __('View Applied CSS', 'flexify-dashboard')
                      }}
                    </span>
                  </button>

                  <!-- CSS Display -->
                  <Transition name="slide-down">
                    <div v-if="showCSS && appliedCSSFix" class="mt-2">
                      <div
                        class="relative bg-zinc-900 dark:bg-zinc-950 rounded-lg border border-zinc-700 dark:border-zinc-800 overflow-hidden"
                      >
                        <div
                          class="absolute top-2 right-2 z-10 flex flex-row gap-2"
                        >
                          <button
                            @click="copyCSS"
                            class="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            :title="__('Copy CSS', 'flexify-dashboard')"
                          >
                            <AppIcon icon="duplicate" class="text-sm" />
                          </button>
                        </div>
                        <pre
                          class="p-4 text-xs text-zinc-300 font-mono overflow-x-auto max-h-[200px] overflow-y-auto"
                        ><code>{{ appliedCSSFix }}</code></pre>
                      </div>
                    </div>
                  </Transition>
                </div>

                <div class="flex flex-col gap-2">
                  <div
                    class="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <p
                      class="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                    >
                      {{ __('Keep Fix', 'flexify-dashboard') }}
                    </p>
                    <p class="text-xs text-zinc-500 dark:text-zinc-500">
                      {{
                        __(
                          'Saves to custom CSS settings for persistence.',
                          'flexify-dashboard'
                        )
                      }}
                    </p>
                  </div>
                  <div
                    class="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <p
                      class="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                    >
                      {{ __('Remove Fix', 'flexify-dashboard') }}
                    </p>
                    <p class="text-xs text-zinc-500 dark:text-zinc-500">
                      {{ __('Removes the fix immediately.', 'flexify-dashboard') }}
                    </p>
                  </div>
                </div>

                <div class="flex flex-row gap-2 items-center justify-end pt-3">
                  <AppButton
                    @click="removeFix"
                    type="default"
                    :disabled="isSavingCSS"
                  >
                    {{ __('Remove', 'flexify-dashboard') }}
                  </AppButton>
                  <AppButton
                    @click="keepCSSFix"
                    type="primary"
                    :loading="isSavingCSS"
                    :disabled="isSavingCSS"
                  >
                    {{ __('Keep Fix', 'flexify-dashboard') }}
                  </AppButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="status === 'error'" class="flex flex-col gap-3">
            <div class="flex flex-row items-start gap-3">
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  statusBgColor,
                ]"
              >
                <AppIcon
                  :icon="statusIcon"
                  :class="['text-base', statusColor]"
                />
              </div>
              <div class="flex-1">
                <p
                  class="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1"
                >
                  {{ __('Failed to fix layout and styling', 'flexify-dashboard') }}
                </p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ statusMessage }}
                </p>
                <div class="flex flex-row gap-2 items-center justify-end pt-3">
                  <AppButton @click="closeDialog" type="default">
                    {{ __('Close', 'flexify-dashboard') }}
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.slide-down-enter-active {
  transition: all 0.2s ease-out;
}

.slide-down-leave-active {
  transition: all 0.15s ease-in;
}

.slide-down-enter-from {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 500px;
  opacity: 1;
  transform: translateY(0);
}
</style>
