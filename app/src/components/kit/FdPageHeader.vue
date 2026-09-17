<script setup>
import AppIcon from '@/components/utility/icons/index.vue';

/**
 * Page title with breadcrumb and actions.
 *
 * breadcrumbs: [{ label, href?, to? , onClick? }]
 */
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  breadcrumbs: { type: Array, default: () => [] },
});
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div class="min-w-0">
      <nav v-if="breadcrumbs.length" class="mb-1.5" :aria-label="__('Breadcrumb', 'flexify-dashboard')">
        <ol class="flex flex-wrap items-center gap-1.5">
          <li v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center gap-1.5">
            <component
              :is="crumb.to ? 'router-link' : crumb.href || crumb.onClick ? 'a' : 'span'"
              :to="crumb.to"
              :href="crumb.href"
              class="text-sm"
              :class="
                index === breadcrumbs.length - 1
                  ? 'text-gray-800 dark:text-white/90'
                  : 'cursor-pointer text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400'
              "
              @click="crumb.onClick && crumb.onClick($event)"
            >
              {{ crumb.label }}
            </component>
            <AppIcon v-if="index < breadcrumbs.length - 1" icon="chevron_right" class="text-sm text-gray-400" />
          </li>
        </ol>
      </nav>
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">
        <slot name="title">{{ title }}</slot>
      </h2>
      <p v-if="description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
