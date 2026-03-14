<script setup>
import {
  ref,
  computed,
  defineAsyncComponent,
  watchEffect,
  watch,
  nextTick,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VueDraggableNext } from 'vue-draggable-next';
import { v4 as uuidv4 } from 'uuid';

// Comps
import AppButton from '@/components/utility/app-button/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import UserRoleSeelect from '@/components/utility/multiselect-roles-and-users/index.vue';
import IconSelect from '@/components/utility/icon-select/index.vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { isObject } from '@/assets/js/functions/isObject.js';
import { processMenu } from '@/components/app/menu/utils/processMenu.js';
import { returnIconOverrides } from '@/components/app/menu/utils/returnIconOverrides.js';

// Refs
const route = useRoute();
const confirm = ref(null);
const router = useRouter();
const OGmenu = ref([]);
const dashIconsList = ref([]);
const menuID = route.params.menuid;
const loading = ref(false);
const menu = ref(false);
const pagination = ref({ context: 'edit' });
const creating = ref(false);
const menuFetched = ref(false);
const menuChanged = ref(false);
const settingsChanged = ref(false);
const activeMenuItem = ref(false);
const menuUploader = ref(null);

const statusOptions = {
  draft: {
    value: 'draft',
    label: __('Draft', 'flexify-dashboard'),
  },
  publish: {
    value: 'publish',
    label: __('Active', 'flexify-dashboard'),
  },
};

/**
 * Fetches a specific product menu by ID.
 *
 * @since 1.0.9
 * @async
 * @function
 * @param {boolean} suppressLoading - If true, doesn't set the local loading state.
 * @returns {Promise<void>}
 */
const getMenu = async (suppressLoading) => {
  appStore.updateState('loading', true);
  menuFetched.value = false;
  if (!suppressLoading) loading.value = true;

  const args = {
    endpoint: `wp/v2/flexify-dashboard-menus/${menuID}`,
    params: pagination.value,
  };
  const response = await lmnFetch(args);

  appStore.updateState('loading', false);
  loading.value = false;

  if (!response) return;

  menu.value = response.data;

  filterMenu();

  nextTick(() => {
    menuFetched.value = true;
  });
};

/**
 * Removes items that no longer exist and adds new items
 *
 * @since 1.0.9
 */
const filterMenu = () => {
  // Remove items that no longer exist
  menu.value.meta.menu_items = menu.value.meta.menu_items
    .filter((item) => checkIfItemExists(item.id) || item.custom)
    .map((item) => ({ ...item, active: false, open: false }));

  // Remove sub items that no longer exist
  for (let toplevel of menu.value.meta.menu_items) {
    if (toplevel.type == 'separator') continue;
    if (!Array.isArray(toplevel.submenu)) {
      toplevel.submenu = [];
    }
    toplevel.submenu = toplevel.submenu
      .filter((item) => checkIfItemExists(item.id) || item.custom)
      .map((item) => ({ ...item, submenu: [], active: false, open: false }));
  }

  // Check for items that are new and push to the menu
  for (let [index, toplevel] of OGmenu.value.entries()) {
    // Push to the menu if it's new
    if (!isItemInCustomMenu(toplevel.id)) {
      menu.value.meta.menu_items.splice(index, 0, toplevel);
    }

    // Continue if there is no submenu
    if (!toplevel.submenu) continue;

    // Loop submenu items to check for new items
    for (let [subindex, sub] of toplevel.submenu.entries()) {
      // Item exists in the menu so continue
      if (isItemInCustomMenu(sub.id)) continue;

      // Find correct top level item to push it to
      const parent = menu.value.meta.menu_items.find(
        (item) => item.id == toplevel.id
      );

      if (parent) {
        parent.submenu.splice(subindex, 0, sub);
      } else {
        toplevel.submenu = [sub];
        menu.value.meta.menu_items.splice(index, 0, toplevel);
      }
    }
  }
};

const isItemInCustomMenu = (id) => {
  const existingTopLevel = menu.value.meta.menu_items.find(
    (item) => item.id == id
  );
  const existingSubLevel = flattenedCustomMenuSubItems.value.find(
    (item) => item.id == id
  );
  return existingTopLevel || existingSubLevel;
};

const checkIfItemExists = (id) => {
  const existingTopLevel = OGmenu.value.find((item) => item.id == id);
  const existingSubLevel = flattenedSubItems.value.find(
    (item) => item.id == id
  );
  return existingTopLevel || existingSubLevel;
};

/**
 * Updates the current product menu with the latest data.
 *
 * @since 1.0.9
 * @async
 * @function
 * @returns {Promise<void>}
 */
const updateMenu = async () => {
  creating.value = true;
  menuFetched.value = false;

  const meta = {};
  if (menuChanged.value) meta.menu_items = [...menu.value.meta.menu_items];
  if (settingsChanged.value)
    meta.menu_settings = { ...menu.value.meta.menu_settings };

  const args = {
    endpoint: `wp/v2/flexify-dashboard-menus/${menuID}`,
    params: { context: 'edit' },
    type: 'POST',
    data: { title: menu.value.title.raw, status: menu.value.status, meta },
  };
  const response = await lmnFetch(args);

  creating.value = false;

  if (!response) return;

  notify({ type: 'success', title: __('Menu updated', 'flexify-dashboard') });

  nextTick(() => {
    menuChanged.value = false;
    settingsChanged.value = false;
    menuFetched.value = true;
  });

  // Always clear cache and emit event to refresh menu on save
  await flushCache(true);
};

/**
 * Deletes the current product menu after user confirmation.
 *
 * @since 1.0.9
 * @async
 * @function
 * @returns {Promise<void>}
 */
const deleteMenu = async () => {
  // Confirm user intent
  const response = await confirm.value.show({
    title: __('Are you sure?', 'flexify-dashboard'),
    message: __('Deleted menus cannot be retrieved.', 'flexify-dashboard'),
    okButton: __('Yes delete it', 'flexify-dashboard'),
  });

  // Bailed by user
  if (!response) return;

  const args = {
    endpoint: `wp/v2/flexify-dashboard-menus/${menuID}`,
    params: { force: true },
    type: 'DELETE',
  };
  const data = await lmnFetch(args);

  // Something went wrong
  if (!data) return;

  // Clear cache and emit event to refresh menu on delete
  await flushCache(true);
  goBack();
  notify({ title: __('Menu deleted', 'flexify-dashboard'), type: 'success' });
};

/**
 * Gets the menu cache key combining user ID and cache key
 *
 * @returns {string} The cache key for localStorage
 */
const getMenuCacheKey = () => {
  const userID = appStore.state.userID || '';
  const cacheKey = appStore.state.menuCacheKey || '';
  return `flexify_dashboard_menu_${userID}_${cacheKey}`;
};

/**
 * Rotates the menu cache key on the server, invalidating all client caches
 *
 * @since 1.0.9
 * @async
 * @function
 * @param {boolean} emitEvent - Whether to emit a cache refresh event
 * @returns {Promise<void>}
 */
const rotateMenuCacheKey = async (emitEvent = false) => {
  const args = {
    endpoint: 'flexify-dashboard/v1/menu-cache/rotate',
    type: 'POST',
  };
  const response = await lmnFetch(args);

  if (response && response.data?.cache_key) {
    // Update the cache key in the store
    appStore.updateState('menuCacheKey', response.data.cache_key);

    // Emit custom event to notify menu component to refresh
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent('flexify-dashboard-menu-cache-rotated'));
    }
  }
};

const flushCache = async (emitEvent = false) => {
  // Rotate cache key to invalidate all client caches
  await rotateMenuCacheKey(emitEvent);
};

watchEffect(() => {
  if (menu.value.rating > 5) menu.value.rating = 5;
  if (menu.value.rating < 0) menu.value.rating = 0;
});

/**
 * Navigates back to the menus list page.
 *
 * @since 1.0.9
 * @async
 * @function
 * @returns {Promise<void>}
 */
const goBack = async () => {
  await router.push({ name: 'menu-creator' });
};

const showSettings = () => {
  activeMenuItem.value = false;
};

/**
 * Computed property that generates CSS classes for dashboard icons.
 * @returns {string} A string of CSS styles for dashboard icons.
 */
const returnDashIconClasses = computed(() => {
  return dashIconsList.value
    .map(
      (item) => `
	.${item.class}:before {
	  content: '${item.before}';
	  height: 1.2rem;
	  width: 1.2rem;
	  min-height: 1.2rem;
	  min-width: 1.2rem;
	  color: currentColor;
	  font-size: 1.2rem;
	  ${item.font ? `font-family: '${item.font}' !important;` : ''}
	}
  `
    )
    .join('\n');
});

/**
 * Sets the menu
 */
const setOGmenu = async () => {
  const menuNode = document.querySelector('#adminmenumain');
  const { processedMenu, dashIcons } = await processMenu(menuNode);
  OGmenu.value = processedMenu;
  dashIconsList.value = dashIcons;
};

const isActive = (link) => {
  if (!isObject(activeMenuItem.value)) return false;
  return activeMenuItem.value.id === link.id;
};

const setActiveItem = (item) => {
  if (!isObject(item.settings)) {
    item.settings = {};
  }

  activeMenuItem.value = item;
};

const flattenedCustomMenuSubItems = computed(() => {
  return menu.value.meta.menu_items.reduce((acc, item) => {
    if (Array.isArray(item.submenu)) {
      acc.push(...item.submenu);
    }
    return acc;
  }, []);
});

const flattenedSubItems = computed(() => {
  return OGmenu.value.reduce((acc, item) => {
    if (Array.isArray(item.submenu)) {
      acc.push(...item.submenu);
    }
    return acc;
  }, []);
});

const resetLink = () => {
  const id = activeMenuItem.value.id;

  activeMenuItem.value;

  const existingTopLevel = OGmenu.value.find((item) => item.id == id);
  if (existingTopLevel) {
    activeMenuItem.value.name = existingTopLevel.name;
    activeMenuItem.value.url = existingTopLevel.url;
    activeMenuItem.value.settings = {};
    return;
  }

  const existingSubLevel = flattenedSubItems.value.find(
    (item) => item.id == id
  );
  if (existingSubLevel) {
    activeMenuItem.value.name = existingSubLevel.name;
    activeMenuItem.value.url = existingSubLevel.url;
    activeMenuItem.value.settings = {};
  }
};

const deleteCustomItem = () => {
  const id = activeMenuItem.value.id;

  const itemIndex = menu.value.meta.menu_items.findIndex(
    (item) => item.id == id
  );
  if (itemIndex >= 0) {
    menu.value.meta.menu_items.splice(itemIndex, 1);
    activeMenuItem.value = false;
    return;
  }

  for (let item of menu.value.meta.menu_items) {
    if (!item.submenu) continue;

    for (let [index, sub] of item.submenu.entries()) {
      if (sub.id == id) {
        item.submenu.splice(index, 1);
        activeMenuItem.value = false;
        break;
      }
    }
  }
};

const newCustomLink = () => {
  menu.value?.meta?.menu_items.splice(0, 0, {
    name: '',
    url: '',
    custom: true,
    id: uuidv4(),
    submenu: [],
    settings: {
      icon: 'link',
      name: __('Custom menu item', 'flexify-dashboard'),
    },
  });
};

const newSeparator = () => {
  menu.value?.meta?.menu_items.splice(0, 0, {
    name: '',
    url: '',
    type: 'separator',
    custom: true,
    id: uuidv4(),
    settings: {
      name: __('Custom Separator', 'flexify-dashboard'),
    },
  });
};

const exportToMenuJSON = () => {
  const menu_meta = menu.value?.meta;
  const menu_title = menu.value?.title?.raw;

  // Bail if empty
  if (!menu_meta || !menu_title) return;

  // Convert the object to a JSON string with pretty formatting
  const jsonString = JSON.stringify({ menu_meta, menu_title }, null, 2);

  // Create a blob with the JSON data
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = `${menu_title}.json`;

  // Append the link to the body, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up by revoking the blob URL
  URL.revokeObjectURL(url);
};

const importFromMenuJSON = async (file) => {
  try {
    // Check if file is provided
    if (!file || !(file instanceof File)) {
      notify({
        type: 'error',
        title: __('Please provide a valid JSON file', 'flexify-dashboard'),
      });
      return;
    }

    // Read the file content
    const fileContent = await file.text();
    const jsonData = JSON.parse(fileContent);

    // Validate the required fields exist
    if (!jsonData.menu_title || !jsonData.menu_meta) {
      notify({
        type: 'error',
        title: __('Invalid menu_meta: must be an object', 'flexify-dashboard'),
      });
      return;
    }

    // Validate menu_meta is an object
    if (typeof jsonData.menu_meta !== 'object' || jsonData.menu_meta === null) {
      notify({
        type: 'error',
        title: __('Invalid menu_meta: must be an object', 'flexify-dashboard'),
      });
      return;
    }

    // Update the menu structure
    menu.value = {
      ...menu.value,
      title: {
        ...menu.value?.title,
        raw: jsonData.menu_title,
      },
      meta: jsonData.menu_meta,
    };

    return true;
  } catch (error) {
    notify({ type: 'error', title: __('Error uploading menu', 'flexify-dashboard') });
    throw error;
  }
};

// Example usage with file input:
const handleMenuFileUpload = async (event) => {
  const file = event.target.files[0];
  try {
    await importFromMenuJSON(file);
    notify({ type: 'success', title: __('Menu imported', 'flexify-dashboard') });
  } catch (error) {
    // Handle error appropriately
    //notify({ type: "error", title: __("Unable to upload menu", "flexify-dashboard") });
  }
};

watch(
  () => menu.value?.meta?.menu_items,
  (newVal, oldVal) => {
    if (!menuFetched.value || !oldVal) return;
    menuChanged.value = true;
  },
  { deep: true }
);
watch(
  () => menu.value?.meta?.menu_settings,
  () => {
    // Wp returns array object hybrid without this
    if (!isObject(menu.value.meta.menu_settings))
      menu.value.meta.menu_settings = {};
    if (!menuFetched.value) return;
    settingsChanged.value = true;
  },
  { deep: true }
);

getMenu();
setOGmenu();
</script>

<template>
  <div class="w-full max-w-full flex flex flex-col h-full">
    <div
      class="border-b border-zinc-200 dark:border-zinc-800 p-3 px-10 pr-6 w-full flex flex-row items-center place-content-between sticky top-0 bg-white dark:bg-zinc-900 z-[1]"
    >
      <div>
        <a
          class="flex flex-row gap-4 items-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
          @click="goBack"
        >
          <AppIcon icon="chevron_left" class="text-xl" />
          <span>{{ __('Back to list', 'flexify-dashboard') }}</span>
        </a>
      </div>

      <div class="flex flex-row items-center gap-2">
        <AppButton
          type="danger"
          class="text-sm"
          @click="deleteMenu"
          icon="delete"
          >{{ __('Delete', 'flexify-dashboard') }}</AppButton
        >
        <AppButton
          type="default"
          class="text-sm"
          @click="exportToMenuJSON"
          icon="download"
          >{{ __('Export', 'flexify-dashboard') }}</AppButton
        >
        <AppButton
          type="default"
          class="text-sm"
          @click="menuUploader.click()"
          icon="upload"
          ><span>
            {{ __('Import', 'flexify-dashboard') }}
            <input
              type="file"
              accept=".json"
              @change="handleMenuFileUpload"
              class="hidden"
              ref="menuUploader"
            /> </span
        ></AppButton>
        <AppButton
          type="default"
          class="text-sm"
          @click="showSettings"
          icon="tune"
          >{{ __('Settings', 'flexify-dashboard') }}</AppButton
        >
        <AppButton
          type="primary"
          class="text-sm"
          :loading="creating"
          @click="updateMenu"
          icon="save"
          >{{ __('Update', 'flexify-dashboard') }}</AppButton
        >
      </div>
    </div>
    <div class="grow flex flex-row">
      <template v-if="menu">
        <component is="style"> {{ returnIconOverrides }}</component>
        <component is="style"> {{ returnDashIconClasses }}</component>
        <!-- menu preview -->
        <div
          class="w-1/3 max-w-[300px] border-r border-zinc-200 dark:border-zinc-800 p-6 h-full shrink-0"
        >
          <!--standard links-->
          <div class="flex flex-col gap-3 mb-6">
            <AppButton type="default" @click="newSeparator">{{
              __('New Separator', 'flexify-dashboard')
            }}</AppButton>
            <AppButton type="default" @click="newCustomLink">{{
              __('New Link', 'flexify-dashboard')
            }}</AppButton>
          </div>
          <div class="relative grow overflow-hidden flex">
            <VueDraggableNext
              class="flex flex-col grow gap-1 grow overflow-auto pb-16"
              :group="{
                name: 'menus',
                pull: true,
                put: true,
                revertClone: false,
              }"
              :list="menu.meta.menu_items"
              animation="300"
              :sort="true"
            >
              <template
                v-for="(link, index) in menu.meta.menu_items"
                :key="index"
                :index="index"
              >
                <div
                  v-if="link.type != 'separator'"
                  :class="
                    link.settings?.hidden ? 'opacity-30 line-through' : ''
                  "
                >
                  <div
                    class="flex flex-row p-1 pr-4 pl-1 rounded-lg items-center cursor-pointer gap-1 group transition-all relative hover:bg-zinc-100 hover:dark:bg-zinc-800"
                    :class="
                      isActive(link)
                        ? 'text-zinc-900 dark:text-zinc-100 active bg-zinc-100 dark:bg-zinc-800 active'
                        : ' hover:bg-zinc-100 hover:dark:bg-zinc-800'
                    "
                    @click="setActiveItem(link)"
                  >
                    <!--Icon-->
                    <div class="absolute px-4 left-0">
                      <div
                        v-if="!link.settings?.icon"
                        class="icon text-2xl text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-[.active]:text-zinc-900 dark:group-[.active]:text-zinc-100 w-[1.2rem]"
                        :class="link.imageClasses"
                        :style="link.iconStyles"
                      ></div>

                      <AppIcon
                        v-else
                        :icon="link.settings.icon"
                        class="text-xl text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-[.active]:text-zinc-900 dark:group-[.active]:text-zinc-100"
                      />
                    </div>

                    <!-- Item name -->
                    <div
                      class="pl-12 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-color flex-grow text-base grow truncate flex flex-row items-center gap-4"
                    >
                      <div
                        v-html="link.settings?.name || link.name"
                        class="truncate"
                      ></div>
                    </div>

                    <!-- Submenu icon icon -->
                    <AppIcon
                      v-if="link.submenu"
                      :icon="link.open ? 'expand_more' : 'chevron_left'"
                      class="opacity-0 group-hover:opacity-100 text-base transition-opacity"
                      @click.prevent.stop="link.open = !link.open"
                    />

                    <AppIcon
                      v-if="link.settings?.open_new"
                      icon="open_new"
                      class="opacity-0 group-hover:opacity-100 text-base transition-opacity"
                    />
                  </div>

                  <!-- Sub menu -->
                  <Transition>
                    <VueDraggableNext
                      v-if="link.open"
                      class="mt-2 mb-4 pl-1"
                      :group="{
                        name: 'menus',
                        pull: true,
                        put: true,
                        revertClone: false,
                      }"
                      :list="link.submenu"
                      animation="300"
                      :sort="true"
                    >
                      <template
                        v-for="(sublink, index) in link.submenu"
                        :key="index"
                        :index="index"
                      >
                        <div
                          class="flex flex-row p-1 px-4 pl-12 rounded-lg items-center cursor-pointer gap-4 group transition-all hover:bg-zinc-100 hover:dark:bg-zinc-800"
                          :class="
                            isActive(sublink)
                              ? 'text-zinc-900 dark:text-zinc-100 active bg-zinc-100 dark:bg-zinc-800 active'
                              : ' hover:bg-zinc-100 hover:dark:bg-zinc-800'
                          "
                          @click="setActiveItem(sublink)"
                        >
                          <div
                            class="group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-color flex-grow text-base grow truncate flex flex-row items-center gap-4"
                            :class="
                              sublink.settings?.hidden
                                ? 'opacity-30 line-through'
                                : ''
                            "
                          >
                            <div
                              v-html="sublink.settings?.name || sublink.name"
                              class="truncate grow"
                            ></div>

                            <AppIcon
                              v-if="sublink.settings?.open_new"
                              icon="open_new"
                              class="opacity-0 group-hover:opacity-100 text-base transition-opacity"
                            />
                          </div>
                        </div>
                      </template>
                    </VueDraggableNext>
                  </Transition>
                </div>

                <div
                  v-else-if="!link.settings?.name"
                  @click="setActiveItem(link)"
                  class="w-full h-4 cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  :class="
                    isActive(link)
                      ? 'text-zinc-900 dark:text-zinc-100 active bg-zinc-100 dark:bg-zinc-800 active'
                      : 'hover:bg-zinc-100 hover:dark:bg-zinc-800'
                  "
                ></div>

                <div
                  @click="setActiveItem(link)"
                  v-else-if="link.settings?.name"
                  class="text-sm py-3 font-medium mt-2 rounded-lg"
                  :class="
                    isActive(link)
                      ? 'text-zinc-900 dark:text-zinc-100 active bg-zinc-100 dark:bg-zinc-800 active'
                      : 'hover:bg-zinc-100 hover:dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  "
                >
                  {{ link.settings.name }}
                </div>
              </template>
            </VueDraggableNext>
          </div>
        </div>

        <!-- settings -->
        <div class="grow p-6">
          <Transition mode="out-in">
            <div
              class="grid grid-cols-3 gap-12 p-6"
              v-if="menu && !activeMenuItem"
            >
              <div class="flex flex-row place-content-between col-span-3">
                <div
                  class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  {{ __('Menu Settings', 'flexify-dashboard') }}
                </div>
              </div>

              <div
                class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
              ></div>

              <!-- Status -->
              <div class="flex flex-col pt-2 gap-2">
                <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
                  __('Status', 'flexify-dashboard')
                }}</span>
                <span class="text-zinc-500 dark:text-zinc-400">{{
                  __('Whether this menu is active or not', 'flexify-dashboard')
                }}</span>
              </div>
              <div class="col-span-2 flex flex-col">
                <AppToggle
                  v-model="menu.status"
                  :options="statusOptions"
                  class="max-w-[300px]"
                />
              </div>

              <div
                class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
              ></div>

              <!-- Title -->
              <div class="flex flex-col pt-2 gap-2">
                <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
                  __('Menu name', 'flexify-dashboard')
                }}</span>
                <span class="text-zinc-500 dark:text-zinc-400">{{
                  __('Name of your custom menu.', 'flexify-dashboard')
                }}</span>
              </div>
              <div class="col-span-2 flex flex-col">
                <AppInput
                  v-model="menu.title.raw"
                  type="text"
                  class="max-w-[300px]"
                />
              </div>

              <div
                class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
              ></div>

              <!-- Apply to everyone -->
              <div class="flex flex-col pt-2 gap-2">
                <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
                  __('Apply menu to everyone', 'flexify-dashboard')
                }}</span>
                <span class="text-zinc-500 dark:text-zinc-400">{{
                  __(
                    'This menu will be applied to everyone if enabled.',
                    'flexify-dashboard'
                  )
                }}</span>
              </div>
              <div class="col-span-2 flex flex-col">
                <AppToggle
                  v-model="menu.meta.menu_settings.applies_to_everyone"
                  class="max-w-[300px]"
                />
              </div>

              <div
                class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
              ></div>

              <Transition>
                <div
                  class="grid grid-cols-3 gap-12 col-span-3"
                  v-show="menu.meta.menu_settings.applies_to_everyone != true"
                >
                  <!-- Apply to roles or users -->
                  <div class="flex flex-col pt-2 gap-2">
                    <span
                      class="text-zinc-900 dark:text-zinc-100 font-semibold"
                      >{{ __('Apply to roles or users', 'flexify-dashboard') }}</span
                    >
                    <span class="text-zinc-500 dark:text-zinc-400">{{
                      __(
                        'Set specific roles or users this menu applies to.',
                        'flexify-dashboard'
                      )
                    }}</span>
                  </div>
                  <div class="col-span-2 flex flex-col">
                    <UserRoleSeelect
                      v-model="menu.meta.menu_settings.includes"
                      class="max-w-[300px]"
                    />
                  </div>

                  <div
                    class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
                  ></div>

                  <!-- Exclude roles or users -->
                  <div class="flex flex-col pt-2 gap-2">
                    <span
                      class="text-zinc-900 dark:text-zinc-100 font-semibold"
                      >{{ __('Exclude roles or users', 'flexify-dashboard') }}</span
                    >
                    <span class="text-zinc-500 dark:text-zinc-400">{{
                      __(
                        "Set specific roles or users this menu won't apply to.",
                        'flexify-dashboard'
                      )
                    }}</span>
                  </div>
                  <div class="col-span-2 flex flex-col">
                    <UserRoleSeelect
                      v-model="menu.meta.menu_settings.excludes"
                      class="max-w-[300px]"
                    />
                  </div>

                  <div
                    class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
                  ></div>
                </div>
              </Transition>
            </div>

            <!-- 
			* Active menu item settings 
		    *
			*
			* -->
            <div class="grid grid-cols-3 gap-12 p-6" v-else-if="activeMenuItem">
              <div class="flex flex-row col-span-3 items-center gap-3">
                <div class="flex flex-col grow">
                  <div
                    class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
                    v-html="
                      activeMenuItem.name ||
                      activeMenuItem.settings?.name ||
                      __('Separator', 'flexify-dashboard')
                    "
                  ></div>
                  <div class="text-zinc-500 dark:text-zinc-400">
                    #{{ activeMenuItem.id }}
                  </div>
                </div>

                <AppButton
                  type="danger"
                  v-if="activeMenuItem.custom"
                  @click="deleteCustomItem"
                  >{{ __('Delete item', 'flexify-dashboard') }}</AppButton
                >
                <AppButton
                  type="default"
                  @click="resetLink"
                  :disabled="activeMenuItem.custom"
                  >{{ __('Reset item', 'flexify-dashboard') }}</AppButton
                >
              </div>

              <div
                class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
              ></div>

              <!-- Title -->
              <div class="flex flex-col pt-2 gap-2">
                <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
                  __('Name', 'flexify-dashboard')
                }}</span>
                <span class="text-zinc-500 dark:text-zinc-400">{{
                  __('Rename menu item', 'flexify-dashboard')
                }}</span>
              </div>
              <div class="col-span-2 flex flex-col">
                <AppInput
                  v-model="activeMenuItem.settings.name"
                  type="text"
                  class="max-w-[300px]"
                />
              </div>

              <div
                class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
              ></div>

              <!-- URL -->
              <template v-if="activeMenuItem.type != 'separator'">
                <div class="flex flex-col pt-2 gap-2">
                  <span
                    class="text-zinc-900 dark:text-zinc-100 font-semibold"
                    >{{ __('URL', 'flexify-dashboard') }}</span
                  >
                  <span class="text-zinc-500 dark:text-zinc-400">{{
                    __('Change the link of the URL', 'flexify-dashboard')
                  }}</span>
                </div>
                <div class="col-span-2 flex flex-col">
                  <AppInput
                    v-model="activeMenuItem.url"
                    type="text"
                    class="max-w-[300px]"
                  />
                </div>

                <div
                  class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
                ></div>

                <!-- Icon -->
                <div class="flex flex-col pt-2 gap-2">
                  <span
                    class="text-zinc-900 dark:text-zinc-100 font-semibold"
                    >{{ __('Icon', 'flexify-dashboard') }}</span
                  >
                  <span class="text-zinc-500 dark:text-zinc-400">{{
                    __(
                      'Choose custom icon from the list or add a Base64 encoded Data URI. Icons only show for top level items. ',
                      'flexify-dashboard'
                    )
                  }}</span>
                </div>
                <div class="col-span-2 flex flex-col">
                  <div class="max-w-[300px] flex flex-row gap-3">
                    <IconSelect
                      v-model="activeMenuItem.settings.icon"
                      type="text"
                    />
                    <AppInput
                      v-model="activeMenuItem.settings.icon"
                      type="text"
                      class="grow"
                    />
                  </div>
                </div>

                <div
                  class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
                ></div>

                <!-- URL -->
                <div class="flex flex-col pt-2 gap-2">
                  <span
                    class="text-zinc-900 dark:text-zinc-100 font-semibold"
                    >{{ __('Open in new tab', 'flexify-dashboard') }}</span
                  >
                  <span class="text-zinc-500 dark:text-zinc-400">{{
                    __('This link will open in a new tab', 'flexify-dashboard')
                  }}</span>
                </div>
                <div class="col-span-2 flex flex-col">
                  <AppToggle
                    v-model="activeMenuItem.settings.open_new"
                    class="max-w-[300px]"
                  />
                </div>

                <div
                  class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
                ></div>
              </template>

              <!-- URL -->
              <div class="flex flex-col pt-2 gap-2">
                <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
                  __('Hidden', 'flexify-dashboard')
                }}</span>
                <span class="text-zinc-500 dark:text-zinc-400">{{
                  __('The item will not be shown if hidden', 'flexify-dashboard')
                }}</span>
              </div>
              <div class="col-span-2 flex flex-col">
                <AppToggle
                  v-model="activeMenuItem.settings.hidden"
                  class="max-w-[300px]"
                />
              </div>

              <div
                class="border-t border-zinc-200 dark:border-zinc-700 col-span-3"
              ></div>
            </div>
          </Transition>
        </div>
      </template>
    </div>
  </div>

  <Confirm ref="confirm" />
</template>

<style scoped>
.dashicons-before:before {
  font-family: dashicons;
  display: block;
  line-height: 1;
  font-weight: 400;
  font-style: normal;
  speak: never;
  text-decoration: inherit;
  text-transform: none;
  text-rendering: auto;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  transition: color 0.1s ease-in;
}
.wp-menu-image.svg {
  background-repeat: no-repeat;
  background-position: center center;
  background-size: contain;
  width: 1.2rem;
  height: 1.2rem;
  filter: contrast(0.5);
}

.active .wp-menu-image.svg {
  filter: contrast(0);
}
</style>
