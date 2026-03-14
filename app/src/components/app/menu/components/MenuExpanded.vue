<script setup>
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
import { useHoverStates } from '../composables/useHoverStates.js';
import { useMenuState } from '../composables/useMenuState.js';

const { favorites, addFavorite, isFavorite } = useFavorites();
const { setHoverState, isHovered } = useHoverStates();
const { isActive, shouldShowSubMenu, toggleMenuOpen } = useMenuState();

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
</script>

<template>
  <!-- Standard expanded menu
  --
  -- Menu template for non minimised menu
  -->
  <div class="relative grow overflow-hidden flex min-h-0">
    <div
      class="flex flex-col grow gap-1.5 custom-scrollbar pb-16 min-h-0 overflow-auto"
      :class="!favorites.length ? 'mt-6' : ''"
    >
      <template v-for="(link, index) in menuItems" :key="link.id || index">
        <div
          v-if="link.type != 'separator'"
          @mouseenter="setHoverState(link, true)"
          @mouseleave="setHoverState(link, false)"
          class="relative group-parent"
        >
          <MenuItemLink
            :link="link"
            :isActive="isActive(link)"
            class="p-1.5 pr-4 pl-1.5 text-[rgba(255,255,255,0.75)] hover:text-white"
          >
            <!--Icon-->
            <div class="absolute px-4 left-0">
              <MenuIcon :link="link" />
            </div>

            <!-- Item name -->
            <MenuItemName :link="link" :active="isActive(link)" />

            <!-- Favorite icon -->
            <AppIcon
              v-if="!isFavorite(link.url)"
              icon="star"
              class="opacity-0 group-hover:opacity-100 text-base transition-opacity"
              @click.prevent.stop="addFavorite(link)"
            />

            <!-- Submenu icon -->
            <AppIcon
              v-if="
                link.submenu &&
                link.submenu.length &&
                appStore.state.flexify_dashboard_settings?.submenu_style != 'hover'
              "
              :icon="
                isActive(link) || link.active || link.open
                  ? 'expand_more'
                  : 'chevron_left'
              "
              :class="isActive(link) ? 'opacity-100' : ''"
              class="opacity-0 max-md:opacity-100 group-hover:opacity-100 text-base transition-opacity"
              @click.prevent.stop="toggleMenuOpen(link)"
            />

            <!-- Open in new -->
            <AppIcon
              v-if="link.settings?.open_new"
              icon="open_new"
              :class="isActive(link) ? 'opacity-100' : ''"
              class="opacity-0 max-md:opacity-100 group-hover:opacity-100 text-base transition-opacity"
            />
          </MenuItemLink>

          <!-- Inline Sub menu -->
          <Transition v-if="shouldShowSubMenu(link)">
            <div class="mt-2 mb-4 pl-2 border-l border-zinc-200/80 dark:border-white/10 ml-5">
              <template v-for="sublink in link.submenu" :key="sublink.id">
                <SubMenuItem
                  :isActive="isActive(sublink)"
                  :sublink="sublink"
                  :isFavorite="isFavorite(sublink.url)"
                  class="pl-12"
                />
              </template>
            </div>
          </Transition>

          <!-- Hover submenu -->
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
                :mouseenter="() => setHoverState(link, true)"
                :mouseleave="() => setHoverState(link, false)"
              >
                <template v-for="sublink in link.submenu" :key="sublink.id">
                  <SubMenuItem
                    :isActive="isActive(sublink)"
                    :sublink="sublink"
                    :isFavorite="isFavorite(sublink.url)"
                    :hideFavorite="true"
                  />
                </template>
              </SubMenu>
            </Transition>
          </div>
        </div>

        <!-- Separator without name -->
        <div
          v-else-if="
            link.type == 'separator' &&
            !link.settings?.hidden &&
            !link.settings?.name
          "
          class="w-full my-2"
          :id="link.id || link.settings?.id"
        ></div>

        <!-- Separator with name (section header) -->
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
