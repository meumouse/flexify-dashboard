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
  hoveredItemId.value = null;
  suppressHover.value = true;

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
      class="flex flex-col grow gap-1.5 custom-scrollbar pb-16 min-h-0 overflow-auto"
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
            class="p-1.5 pr-4 pl-1.5 text-[rgba(255,255,255,0.75)] hover:text-white"
          >
            <div class="absolute px-4 left-0">
              <MenuIcon :link="link" />
            </div>

            <MenuItemName :link="link" :active="getIsActive(link)" />

            <AppIcon
              v-if="!isFavorite(link.url)"
              icon="star"
              class="opacity-0 group-hover:opacity-100 text-base transition-opacity"
              @click.prevent.stop="addFavorite(link)"
            />

            <AppIcon
              v-if="
                link.submenu &&
                link.submenu.length &&
                appStore.state.flexify_dashboard_settings?.submenu_style != 'hover'
              "
              :icon="
                getIsActive(link) || link.active || link.open
                  ? 'expand_more'
                  : 'chevron_left'
              "
              :class="getIsActive(link) ? 'opacity-100' : ''"
              class="opacity-0 max-md:opacity-100 group-hover:opacity-100 text-base transition-opacity"
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
            <div class="mt-2 mb-4 pl-2 border-l border-zinc-200/80 dark:border-white/10 ml-5">
              <template v-for="sublink in link.submenu" :key="sublink.id">
                <SubMenuItem
                  :isActive="getIsActive(sublink)"
                  :sublink="sublink"
                  :isFavorite="isFavorite(sublink.url)"
                  class="pl-12"
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
          class="w-full my-2"
          :id="link.id || link.settings?.id"
        ></div>

        <div
          v-else-if="
            link.type == 'separator' &&
            !link.settings?.hidden &&
            link.settings?.name
          "
          class="text-[11px] py-2 px-2 font-semibold mt-3 rounded-md uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
          v-html="link.settings.name"
          :id="link.id"
        ></div>
      </template>
    </div>
    <div
      class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-100/95 to-transparent dark:from-[#061022] pointer-events-none"
      id="fd-menu-overlay"
    ></div>
  </div>
</template>
