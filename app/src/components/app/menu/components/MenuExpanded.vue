<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import MenuItemLink from './MenuItemLink.vue';
import MenuIcon from './MenuIcon.vue';
import MenuItemName from './MenuItemName.vue';
import SubMenu from './SubMenu.vue';
import SubMenuItem from './SubMenuItem.vue';
import AppIcon from '@/components/utility/icons/index.vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Composables
import { useFavorites } from '../composables/useFavorites.js';
import { useMenuState } from '../composables/useMenuState.js';

const { favorites, addFavorite, isFavorite } = useFavorites();
const { isActive, toggleMenuOpen } = useMenuState();

const props = defineProps({
  menuItems: {
    type: Array,
    required: true,
  },
  menupanel: {
    type: Object,
    default: null,
  },
  mobile: {
    type: Boolean,
    default: false,
  },
});

const scrollContainer = ref(null);
const hoveredItemId = ref(null);
const suppressHover = ref(false);
let hoverResetTimer = null;

const activeStateById = computed(() => {
  const states = new Map();

  const collect = (items) => {
    for (const item of items || []) {
      if (item?.id) {
        states.set(item.id, isActive(item));
      }

      if (Array.isArray(item?.submenu)) {
        collect(item.submenu);
      }
    }
  };

  collect(props.menuItems);
  return states;
});

const getIsActive = (link) => {
  if (!link?.id) return false;
  return activeStateById.value.get(link.id) || false;
};

const getShouldShowSubMenu = (link) => {
  if (!Array.isArray(link?.submenu) || !link.submenu.length) return false;
  return link.open || link.active || getIsActive(link);
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
  <div class="relative grow overflow-hidden flex min-h-0">
    <div
      ref="scrollContainer"
      class="flex flex-col grow gap-1 custom-scrollbar pb-16 min-h-0 overflow-auto"
      :class="!favorites.length ? 'mt-6' : ''"
    >
      <template v-for="(link, index) in menuItems" :key="link.id || index">
        <div
          v-if="link.type != 'separator'"
          @mouseenter="handleItemEnter(link)"
          @mouseleave="handleItemLeave(link)"
          class="relative group-parent"
        >
          <MenuItemLink
            :link="link"
            :isActive="getIsActive(link)"
            class="py-2 pe-3"
          >
            <div class="absolute start-0 flex items-center px-3">
              <MenuIcon :link="link" />
            </div>

            <MenuItemName :link="link" :active="getIsActive(link)" />

            <AppIcon
              v-if="!isFavorite(link.url)"
              icon="star"
              class="shrink-0 text-base text-gray-400 opacity-0 transition-opacity hover:text-warning-500 group-hover:opacity-100"
              @click.prevent.stop="addFavorite(link)"
            />

            <AppIcon
              v-if="
                link.submenu &&
                link.submenu.length &&
                appStore.state.flexify_dashboard_settings?.submenu_style != 'hover'
              "
              icon="expand_more"
              :class="getIsActive(link) || link.active || link.open ? 'rotate-180 text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'"
              class="shrink-0 text-lg transition-transform duration-200"
              @click.prevent.stop="toggleMenuOpen(link)"
            />

            <AppIcon
              v-if="link.settings?.open_new"
              icon="open_new"
              :class="getIsActive(link) ? 'opacity-100' : ''"
              class="opacity-0 max-md:opacity-100 group-hover:opacity-100 text-base transition-opacity"
            />
          </MenuItemLink>

          <Transition v-if="getShouldShowSubMenu(link)">
            <div class="mt-1 mb-2 ms-9 flex flex-col gap-1">
              <template v-for="sublink in link.submenu" :key="sublink.id">
                <SubMenuItem
                  :isActive="getIsActive(sublink)"
                  :sublink="sublink"
                  :isFavorite="isFavorite(sublink.url)"
                />
              </template>
            </div>
          </Transition>

          <div
            v-else-if="
              link.submenu &&
              link.submenu.length &&
              isHovered(link) &&
              appStore.state.flexify_dashboard_settings?.submenu_style == 'hover' &&
              !mobile
            "
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

        <div
          v-else-if="
            link.type == 'separator' &&
            !link.settings?.hidden &&
            !link.settings?.name
          "
          class="my-2 w-full border-t border-gray-100 dark:border-gray-800"
          :id="link.id || link.settings?.id"
        ></div>

        <div
          v-else-if="
            link.type == 'separator' &&
            !link.settings?.hidden &&
            link.settings?.name
          "
          class="mt-4 mb-2 px-3 text-xs uppercase leading-5 text-gray-400"
          v-html="link.settings.name"
          :id="link.id"
        ></div>
      </template>
    </div>
    <div
      class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-gray-900 pointer-events-none"
      id="fd-menu-overlay"
    ></div>
  </div>
</template>
