<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { returnOriginalLinkAttribute } from '../utils/returnOriginalLinkAttribute.js';
import MenuItemLink from './MenuItemLink.vue';
import MenuIcon from './MenuIcon.vue';
import SubMenu from './SubMenu.vue';
import SubMenuItem from './SubMenuItem.vue';

// Composables
import { useFavorites } from '../composables/useFavorites.js';
import { useMenuState } from '../composables/useMenuState.js';

const { favorites, isFavorite } = useFavorites();
const { isActive } = useMenuState();

const props = defineProps({
  menuItems: {
    type: Array,
    required: true,
  },
  menupanel: {
    type: Object,
    default: null,
  },
});

const scrollContainer = ref(null);
const hoveredItemId = ref(null);
const suppressHover = ref(false);
let hoverResetTimer = null;

const activeStateById = computed(() => {
  const states = new Map();

  for (const item of props.menuItems || []) {
    if (item?.id) {
      states.set(item.id, isActive(item));
    }

    if (Array.isArray(item?.submenu)) {
      for (const sublink of item.submenu) {
        if (sublink?.id) {
          states.set(sublink.id, isActive(sublink));
        }
      }
    }
  }

  return states;
});

const getIsActive = (link) => {
  if (!link?.id) return false;
  return activeStateById.value.get(link.id) || false;
};

const handleItemEnter = (link) => {
  if (suppressHover.value || !link?.id) return;
  hoveredItemId.value = link.id;
};

const handleItemLeave = (link) => {
  if (!link?.id || hoveredItemId.value !== link.id) return;
  hoveredItemId.value = null;
};

const isHovered = (link) => hoveredItemId.value === link?.id;

const handleScroll = () => {
  if (hoveredItemId.value !== null) {
    hoveredItemId.value = null;
  }

  if (!suppressHover.value) {
    suppressHover.value = true;
  }

  if (hoverResetTimer) {
    clearTimeout(hoverResetTimer);
  }

  hoverResetTimer = window.setTimeout(() => {
    suppressHover.value = false;
  }, 120);
};

const getNotificationCount = (link) => {
  return returnOriginalLinkAttribute(link, 'notifications', link.notifications);
};

onMounted(() => {
  scrollContainer.value?.addEventListener('scroll', handleScroll, { passive: true });
});

onBeforeUnmount(() => {
  scrollContainer.value?.removeEventListener('scroll', handleScroll);

  if (hoverResetTimer) {
    clearTimeout(hoverResetTimer);
  }
});
</script>

<template>
  <div class="relative grow flex overflow-hidden min-h-0">
    <div
      ref="scrollContainer"
      class="flex flex-col grow items-center gap-1 custom-scrollbar pb-16 min-h-0 overflow-auto"
      :class="!favorites.length ? 'mt-6' : ''"
    >
      <template v-for="(link, index) in menuItems" :key="link.id || index">
        <div
          v-if="link.type != 'separator'"
          class="relative group-parent"
          @mouseenter="handleItemEnter(link)"
          @mouseleave="handleItemLeave(link)"
        >
          <MenuItemLink :link="link" :isActive="getIsActive(link)" class="h-11 w-11 justify-center">
            <MenuIcon :link="link" />

            <div
              v-if="getNotificationCount(link)"
              class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-medium leading-none text-white"
            >
              {{ getNotificationCount(link) }}
            </div>
          </MenuItemLink>

          <div
            v-if="link.submenu && link.submenu.length && isHovered(link)"
            class="absolute right-0 top-0 translate-x-full"
            :target="link.settings?.open_new ? '_BLANK' : ''"
          >
            <Transition>
              <SubMenu
                :parent="menupanel"
                :mouseenter="() => handleItemEnter(link)"
                :mouseleave="() => handleItemLeave(link)"
              >
                <template v-for="sublink in link.submenu" :key="sublink.id">
                  <SubMenuItem
                    :isActive="getIsActive(sublink)"
                    :sublink="sublink"
                    :isFavorite="isFavorite(sublink.url)"
                    :hideFavorite="true"
                  />
                </template>
              </SubMenu>
            </Transition>
          </div>
        </div>

        <div v-else class="my-2 w-8 border-t border-gray-100 dark:border-gray-800"></div>
      </template>
    </div>
    <div
      class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-gray-900 pointer-events-none"
      id="fd-menu-overlay"
    ></div>
  </div>

</template>
