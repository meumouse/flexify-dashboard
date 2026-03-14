<script setup>
import { ref, watch, useSlots } from 'vue';
import { ShadowRoot } from 'vue-shadow-dom';
import { useShadowStyles } from '@/composables/useShadowStyles.js';
import { useColorScheme } from '@/assets/js/functions/useColorScheme.js';

const props = defineProps({
  /**
   * Whether to teleport the shadow container to a different element
   */
  teleport: {
    type: [Boolean, String],
    default: true,
  },
  /**
   * The HTML tag to use for the shadow root wrapper
   */
  tag: {
    type: String,
    default: 'div',
  },
  /**
   * Whether to apply the normalizing wrapper class
   */
  normalize: {
    type: Boolean,
    default: true,
  },
  /**
   * Additional classes to apply to the inner wrapper
   */
  wrapperClass: {
    type: String,
    default: '',
  },
  /**
   * Whether to lazy load styles (only when content is shown)
   * If false, styles are loaded immediately on mount
   */
  lazyStyles: {
    type: Boolean,
    default: true,
  },
});

const { prefersDark } = useColorScheme();

// Create adopted stylesheet for shadow DOM
const adoptedStyleSheets = ref(new CSSStyleSheet());

// Use shadow styles composable
const { setStyles } = useShadowStyles(adoptedStyleSheets);
const stylesSet = ref(false);

/**
 * Initialize styles - can be called manually or automatically
 */
const initStyles = () => {
  if (!stylesSet.value) {
    setStyles();
    stylesSet.value = true;
  }
};

// If not lazy loading, set styles immediately
if (!props.lazyStyles) {
  initStyles();
}

/**
 * Computed teleport target
 */
const teleportTarget = () => {
  if (props.teleport === true) return 'body';
  if (typeof props.teleport === 'string') return props.teleport;
  return null;
};

/**
 * Computed wrapper classes
 */
const computedWrapperClass = () => {
  const classes = [];
  if (props.normalize) classes.push('flexify-dashboard-normalize');
  if (prefersDark.value) classes.push('dark');
  if (props.wrapperClass) classes.push(props.wrapperClass);
  return classes.join(' ');
};

// Expose methods for parent components
defineExpose({
  initStyles,
  stylesSet,
  adoptedStyleSheets,
});
</script>

<template>
  <!-- With teleport -->
  <Teleport :to="teleportTarget()" v-if="teleport">
    <ShadowRoot
      :tag="tag"
      :adopted-style-sheets="[adoptedStyleSheets]"
      @vue:mounted="lazyStyles ? initStyles() : null"
    >
      <div :class="computedWrapperClass()">
        <slot></slot>
      </div>
    </ShadowRoot>
  </Teleport>

  <!-- Without teleport -->
  <ShadowRoot
    v-else
    :tag="tag"
    :adopted-style-sheets="[adoptedStyleSheets]"
    @vue:mounted="lazyStyles ? initStyles() : null"
  >
    <div :class="computedWrapperClass()">
      <slot></slot>
    </div>
  </ShadowRoot>
</template>
