<script setup>
import { ref, defineModel } from "vue";

// Import function
import { inSearch } from "@/assets/js/functions/inSearch.js";

// Import comps
import AppIcon from "@/components/utility/icons/index.vue";
import ContextMenu from "@/components/utility/context-menu/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";

// Refs
const icon = defineModel();
const contextmenu = ref(null);
const trigger = ref(null);
const search = ref("");

const returnThisPos = (evt) => {
  const target = trigger.value;
  const rect = target.getBoundingClientRect();
  return { clientX: rect.left, clientY: rect.bottom };
};

const selectIcon = (iconoption) => {
  icon.value = iconoption;
  contextmenu.value.close();
};

const icons = [
  "grid",
  "search",
  "list",
  "information",
  "user",
  "person",
  "home",
  "logout",
  "pb-logo-fill",
  "github",
  "north_east",
  "sparkles",
  "pb-logo-lines",
  "lock",
  "link",
  "cloud_upload",
  "at",
  "return",
  "bolt",
  "layers",
  "arrow_up",
  "tif-svgrepo-com",
  "dashboard",
  "chevron_right",
  "tick",
  "chevron_left",
  "close-pane",
  "open-pane",
  "warning",
  "sites",
  "add",
  "close",
  "more_horiz",
  "pages",
  "copy",
  "refresh",
  "folder-open-2",
  "image",
  "save",
  "align-arrow-up",
  "sidebar",
  "arrow_down",
  "photos",
  "redo",
  "google",
  "trash",
  "gif-svgrepo-com",
  "edit",
  "credit-card",
  "delete",
  "command",
  "reorder",
  "gift",
  "png-file-type-svgrepo-com",
  "sort",
  "undo",
  "filter",
  "jpeg-svgrepo-com",
  "tune",
  "error",
  "logo",
  "pdf-svgrepo-com",
  "unfold",
  "bmp-file-format-symbol-svgrepo-com",
  "open_new",
  "users",
  "moon",
];
</script>

<template>
  <div
    ref="trigger"
    @click="contextmenu.show($event, returnThisPos($event))"
    class="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 focus:shadow-xs"
  >
    <AppIcon :icon="icon ? icon : 'home'" class="text-xl" :class="!icon ? 'opacity-50' : ''" />
  </div>

  <ContextMenu ref="contextmenu">
    <div class="w-[260px] grid grid-cols-5 gap-4 max-h-[400px] overflow-auto">
      <div class="col-span-5 text-sm p-2">
        <AppInput v-model="search" type="text" :placeholder="__('Search icons', 'flexify-dashboard')" />
      </div>
      <template v-for="iconoption in icons">
        <div class="w-full flex flex-col items-center" v-if="inSearch(search, iconoption)">
          <AppButton @click="selectIcon(iconoption)" type="transparent">
            <AppIcon :icon="iconoption" class="text-2xl" />
          </AppButton>
        </div>
      </template>
    </div>
  </ContextMenu>
</template>
