<script setup>
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from 'reka-ui';
import AppIcon from '@/components/utility/icons/index.vue';
import { cn } from '@/lib/utils.js';
import { dropdownItemClass, dropdownPanelClass } from './recipes.js';
import { usePortalTarget } from './usePortalTarget.js';

/**
 * Dropdown menu.
 *
 * items: [{ label, icon?, onSelect?, danger?, disabled?, href?, target? } | { separator: true } | { heading: 'Label' }]
 * Use the `trigger` slot for the button and the default slot for custom content.
 */
const open = defineModel('open', { type: Boolean, default: false });

defineProps({
  items: { type: Array, default: () => [] },
  /** start | center | end */
  align: { type: String, default: 'end' },
  /** top | right | bottom | left */
  side: { type: String, default: 'bottom' },
  width: { type: String, default: 'w-48' },
  contentClass: { type: [String, Array, Object], default: '' },
});

const portalTarget = usePortalTarget();

const onSelect = (item) => {
  if (item.href) {
    window.open(item.href, item.target || '_self');
    return;
  }

  item.onSelect?.();
};
</script>

<template>
  <DropdownMenuRoot v-model:open="open" :modal="false">
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>

    <DropdownMenuPortal :to="portalTarget">
      <DropdownMenuContent
        :align="align"
        :side="side"
        :side-offset="6"
        :collision-padding="12"
        :class="cn(dropdownPanelClass, width, 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0', contentClass)"
      >
        <slot>
          <template v-for="(item, index) in items" :key="index">
            <DropdownMenuSeparator v-if="item.separator" class="my-1.5 h-px bg-gray-100 dark:bg-gray-800" />
            <DropdownMenuLabel v-else-if="item.heading" class="px-3 pb-1 pt-2 text-theme-xs font-medium uppercase text-gray-400">
              {{ item.heading }}
            </DropdownMenuLabel>
            <DropdownMenuItem
              v-else
              :disabled="item.disabled"
              :class="cn(dropdownItemClass, item.danger && 'text-error-500 hover:text-error-600 data-[highlighted]:text-error-600 dark:text-error-500')"
              @select="onSelect(item)"
            >
              <AppIcon v-if="item.icon" :icon="item.icon" class="text-lg" />
              <span class="truncate">{{ item.label }}</span>
            </DropdownMenuItem>
          </template>
        </slot>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
