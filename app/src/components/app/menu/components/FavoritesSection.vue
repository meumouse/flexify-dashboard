<script setup>
import { VueDraggableNext } from 'vue-draggable-next';
import MenuItemLink from './MenuItemLink.vue';
import MenuIcon from './MenuIcon.vue';
import MenuItemName from './MenuItemName.vue';
import SubMenu from './SubMenu.vue';
import SubMenuItem from './SubMenuItem.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import IconSelect from '@/components/utility/icon-select/index.vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Composables
import { useFavorites } from '../composables/useFavorites.js';
import { useShortcutEditing } from '../composables/useShortcutEditing.js';
import { useHoverStates } from '../composables/useHoverStates.js';
import { useMenuState } from '../composables/useMenuState.js';

const { favorites, removeFavorite, updateFavorite, isFavorite } = useFavorites();
const {
  editingShortcut,
  shortcutEditName,
  shortcutEditUrl,
  shortcutEditIcon,
  startEditShortcut,
  saveShortcutEdit,
  cancelShortcutEdit,
} = useShortcutEditing(updateFavorite);
const { setHoverState, isHovered } = useHoverStates();
const { isActive, shouldShowSubMenu, toggleMenuOpen } = useMenuState();

const props = defineProps({
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
  <TransitionGroup>
    <template v-if="favorites.length">
      <div
        v-if="favorites.length"
        class="text-sm py-3 font-medium mt-2 text-zinc-500 dark:text-zinc-400"
      >
        {{ __('Shortcuts', 'flexify-dashboard') }}
      </div>
      <div class="flex flex-col gap-1" v-if="favorites.length">
        <VueDraggableNext
          class="contents"
          :group="{
            name: 'menus',
            pull: true,
            put: true,
            revertClone: false,
          }"
          :list="favorites"
          animation="300"
          :sort="true"
          :disabled="!!editingShortcut"
        >
          <TransitionGroup>
            <template
              v-for="(link, index) in favorites"
              :key="link.url || index"
              :index="index"
            >
              <!-- Editing mode -->
              <div
                v-if="
                  link.type != 'separator' &&
                  editingShortcut?.url === link.url
                "
                class="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-1"
              >
                <div class="flex flex-col gap-3">
                  <!-- Name -->
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {{ __('Name', 'flexify-dashboard') }}
                    </label>
                    <AppInput
                      v-model="shortcutEditName"
                      type="text"
                      class="w-full"
                      :placeholder="__('Shortcut name', 'flexify-dashboard')"
                    />
                  </div>

                  <!-- URL -->
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {{ __('URL', 'flexify-dashboard') }}
                    </label>
                    <AppInput
                      v-model="shortcutEditUrl"
                      type="text"
                      class="w-full"
                      :placeholder="__('https://example.com', 'flexify-dashboard')"
                    />
                  </div>

                  <!-- Icon -->
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {{ __('Icon', 'flexify-dashboard') }}
                    </label>
                    <div class="flex flex-row gap-2">
                      <IconSelect
                        v-model="shortcutEditIcon"
                        type="text"
                        class="flex-shrink-0"
                      />
                      <AppInput
                        v-model="shortcutEditIcon"
                        type="text"
                        class="grow"
                        :placeholder="__('icon name', 'flexify-dashboard')"
                      />
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex flex-row gap-2 pt-1">
                    <AppButton
                      type="primary"
                      @click="saveShortcutEdit"
                      class="text-xs px-2 py-1"
                    >
                      {{ __('Save', 'flexify-dashboard') }}
                    </AppButton>
                    <AppButton
                      type="default"
                      @click="cancelShortcutEdit"
                      class="text-xs px-2 py-1"
                    >
                      {{ __('Cancel', 'flexify-dashboard') }}
                    </AppButton>
                    <AppButton
                      type="danger"
                      @click="
                        removeFavorite(link);
                        cancelShortcutEdit();
                      "
                      class="text-xs px-2 py-1 ml-auto"
                    >
                      {{ __('Delete', 'flexify-dashboard') }}
                    </AppButton>
                  </div>
                </div>
              </div>

              <!-- Display mode -->
              <div
                v-else-if="link.type != 'separator'"
                @mouseenter="setHoverState(link, true)"
                @mouseleave="setHoverState(link, false)"
                class="relative group-parent"
              >
                <MenuItemLink
                  :link="link"
                  :isActive="isActive(link)"
                  class="p-1 pr-4 pl-1 group"
                >
                  <!--Icon-->
                  <div class="absolute px-4 left-0">
                    <MenuIcon :link="link" />
                  </div>

                  <!-- Item name -->
                  <MenuItemName :link="link" />

                  <!-- Edit icon -->
                  <AppIcon
                    icon="edit"
                    class="opacity-0 max-md:opacity-100 group-hover:opacity-100 text-base transition-opacity"
                    @click.prevent.stop="startEditShortcut(link)"
                    v-if="!editingShortcut"
                  />

                  <!-- Remove icon -->
                  <AppIcon
                    icon="close"
                    class="opacity-0 max-md:opacity-100 group-hover:opacity-100 text-base transition-opacity"
                    @click.prevent.stop="removeFavorite(link)"
                    v-if="!editingShortcut"
                  />

                  <!-- Submenu icon -->
                  <AppIcon
                    v-if="
                      link.submenu &&
                      link.submenu.length &&
                      appStore.state.flexify_dashboard_settings?.submenu_style !=
                        'hover'
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
                  <div class="mt-2 mb-4 pl-1">
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
                    appStore.state.flexify_dashboard_settings?.submenu_style ==
                      'hover' &&
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
            </template>
          </TransitionGroup>
        </VueDraggableNext>
      </div>
    </template>
  </TransitionGroup>

  <div
    class="border-t border-zinc-200 dark:border-zinc-800 my-6"
    v-if="favorites.length"
  ></div>
</template>
