<script setup>
import { ref, onMounted, watchEffect, computed, useAttrs, defineModel, defineProps, defineEmits } from "vue";

// Emits and props
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { inSearch } from "@/assets/js/functions/inSearch.js";

import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();

// Import comps
import ContextMenu from "@/components/utility/context-menu/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";
import AppCheckBox from "@/components/utility/checkbox-basic/index.vue";
import AppToggle from "@/components/utility/toggle/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";

// Setup refs
const attrs = useAttrs();
const model = defineModel();
const emit = defineEmits(["updated"]);
const search = ref("");
const parent = ref(null);
const contextmenu = ref(null);
const props = defineProps(["post"]);

const showOptions = async (evt) => {
  // Only allow editing if user has access
  if (!props.post.is_editable) return;

  contextmenu.value.show(evt, returnThisPos());
};

/**
 * Returns postition of current target
 *
 * @since 0.0.1
 */
const returnThisPos = (evt) => {
  const target = parent.value;
  const rect = target.getBoundingClientRect();
  return { clientY: rect.bottom + 10, clientX: rect.left };
};

const updatePostStatus = (postType) => {
  model.value = postType;
  emit("updated", postType);
};
</script>

<template>
  <div
    @click.stop="showOptions"
    v-bind="attrs"
    ref="parent"
    class="flex flex-row items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
  >
    <div class="fd-status whitespace-nowrap" :class="`fd-status-${model.value}`" v-html="model.label"></div>
  </div>

  <ContextMenu ref="contextmenu">
    <div class="flex flex-col gap-3 w-[260px]">
      <div class="font-semibold mb-1">{{ __("Update status", "flexify-dashboard") }}</div>
      <!-- Search -->
      <div class="relative flex">
        <input
          v-model="search"
          class="px-2 py-2 pl-8 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-indigo-300 dark:focus:outline-indigo-700 focus:shadow-xs text-sm dark:bg-transparent"
          :placeholder="__('Search', 'flexify-dashboard')"
        />

        <!-- Icon-->
        <div class="absolute top-0 left-0 h-full flex flex-col place-content-center px-2 py-1">
          <AppIcon icon="search" class="text-lg text-zinc-400" />
        </div>
      </div>

      <!-- Loop postTypes -->
      <div class="flex flex-col max-h-80 overflow-auto">
        <template v-for="postType in appStore.state.postStatuses">
          <div
            v-if="inSearch(search, postType.label, postType.value)"
            class="flex flex-row items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-lg cursor-pointer"
            @click="updatePostStatus(postType)"
          >
            <AppCheckBox :checked="postType.value == model.value ? true : false" />
            <div v-html="postType.label"></div>
          </div>
        </template>
      </div>
    </div>
  </ContextMenu>
</template>

<style lang="postcss">
@reference "@/assets/css/tailwind.css";

.fd-status {
  @apply flex gap-2 flex-row relative items-center rounded-md text-xs py-1 px-2 inline-flex border transition-all text-zinc-800/80 dark:text-zinc-200/80 bg-indigo-300/20 border-indigo-300/80;
}
.fd-status::before {
  @apply relative w-2 h-2 rounded-full bg-indigo-500 content-[''] animate-pulse;
}
.fd-status-publish {
  @apply bg-green-300/20 border-green-300/80 dark:border-green-700/80;
}
.fd-status-publish::before {
  @apply bg-green-500;
}
.fd-status-draft {
  @apply bg-orange-300/20 dark:bg-orange-600/20 border-orange-300/80 dark:border-orange-700/50;
}
.fd-status-draft::before {
  @apply bg-orange-500;
}
.fd-status-trash {
  @apply bg-rose-300/20 dark:bg-rose-600/20 border-rose-300/80 dark:border-rose-700/50;
}
.fd-status-trash::before {
  @apply bg-rose-500;
}
</style>
