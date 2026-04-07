<script setup>
import { computed, defineProps, useAttrs } from 'vue';
import { applyReactInVue } from 'veaury';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  dateRange: {
    type: Array,
    required: false,
  },
});

const attrs = useAttrs();

/**
 * Checks if the user has the required capabilities
 * @param {Array} capabilities - The capabilities to check
 * @returns {Boolean}
 */
const userHasCapability = (capabilities) => {
  if (!Array.isArray(capabilities) || capabilities.length === 0) return true;
  if (!appStore.state.currentUser) return true;

  // Check if allcaps is available (may be loading asynchronously)
  if (!appStore.state.currentUser.allcaps) return true;

  for (let capability of capabilities) {
    const hasCap = appStore.state.currentUser.allcaps[capability];
    if (hasCap) return true;
  }
  return false;
};

/**
 * Checks if required plugins are active
 * @param {Array} requiredPlugins - Array of plugin slugs/paths to check
 * @returns {Boolean}
 */
const hasRequiredPlugins = (requiredPlugins) => {
  if (!requiredPlugins) return true;
  if (!Array.isArray(requiredPlugins)) return true;
  if (
    !appStore.state.activePlugins ||
    !Array.isArray(appStore.state.activePlugins)
  )
    return true;

  const activePlugins = appStore.state.activePlugins;

  // Create a set of active plugin paths and slugs for quick lookup
  const activePluginPaths = new Set();
  const activePluginSlugs = new Set();

  activePlugins.forEach((plugin) => {
    if (plugin.path) activePluginPaths.add(plugin.path);
    if (plugin.slug) activePluginSlugs.add(plugin.slug);
  });

  // Check if all required plugins are active
  for (let requiredPlugin of requiredPlugins) {
    const isActive =
      activePluginPaths.has(requiredPlugin) ||
      activePluginSlugs.has(requiredPlugin);

    if (!isActive) {
      return false;
    }
  }

  return true;
};

/**
 * Gets the component to render, wrapping React components with veaury if needed
 * @returns {Object} The component to render (Vue component or veaury-wrapped React component)
 */
const itemComponent = computed(() => {
  const language =
    props.item?.metadata?.framework || props.item?.metadata?.language || 'vue';

  // Don't process HTML items - they're handled separately
  if (language === 'html') {
    return null;
  }

  // If it's a React component, wrap it with veaury
  if (language === 'react' && props.item.component) {
    return applyReactInVue(props.item.component);
  }

  // Otherwise, return the Vue component as-is
  return props.item.component;
});

/**
 * Checks if the item is a React component
 * @returns {boolean}
 */
const isReactItem = computed(() => {
  const framework =
    props.item?.metadata?.framework || props.item?.metadata?.language;
  return framework === 'react';
});

/**
 * Checks if the item is an HTML string
 * @returns {boolean}
 */
const isHtmlItem = computed(() => {
  const framework =
    props.item?.metadata?.framework || props.item?.metadata?.language;
  return framework === 'html';
});

/**
 * Checks if height stretching should be applied (dashboard context)
 * @returns {boolean}
 */
const shouldStretchHeight = computed(() => {
  const classString = attrs.class || '';
  return typeof classString === 'string' && classString.includes('h-full');
});

const requiredCapabilities = computed(
  () =>
    props.item?.metadata?.requires_capabilities ??
    props.item?.metadata?.requiresCapabilities
);

const requiredPlugins = computed(
  () =>
    props.item?.metadata?.requires_plugins ??
    props.item?.metadata?.requiresPlugins
);
</script>

<template>
  <template
    v-if="
      userHasCapability(requiredCapabilities) &&
      hasRequiredPlugins(requiredPlugins)
    "
  >
    <!-- HTML Content -->
    <div
      v-if="isHtmlItem && item.component && !isReactItem"
      :id="item.metadata?.id"
      :class="[item.metadata?.className, shouldStretchHeight ? 'h-full' : '']"
      v-html="item.component"
    />
    <!-- Vue Component -->
    <component
      v-else-if="!isReactItem && !isHtmlItem && itemComponent"
      :is="itemComponent"
      :app-data="appStore"
      :date-range="dateRange"
      :id="item.metadata?.id"
      :class="item.metadata?.className"
      v-bind="{ ...attrs, class: undefined }"
    />
    <!-- React Component -->
    <component
      v-else-if="isReactItem && itemComponent"
      :is="itemComponent"
      :appData="appStore"
      :dateRange="dateRange"
      :id="item.metadata?.id"
      :className="item.metadata?.className"
      v-bind="{ ...attrs, class: undefined }"
    />
  </template>
</template>
