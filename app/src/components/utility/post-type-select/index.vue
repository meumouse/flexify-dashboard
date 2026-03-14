<script setup>
import { ref, onMounted, watchEffect, computed, useAttrs, defineModel, defineProps } from "vue";

import { inSearch } from "@/assets/js/functions/inSearch.js";

// Emits and props
const attrs = useAttrs();
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";

// Import comps
import ContextMenu from "@/components/utility/context-menu/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";
import AppCheckBox from "@/components/utility/checkbox-basic/index.vue";
import AppToggle from "@/components/utility/toggle/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";

// Setup refs
const model = defineModel();
const search = ref("");
const loading = ref(false);
const parent = ref(null);
const contextmenu = ref(null);
const postTypes = ref([]);

const showOptions = async (evt) => {
  loading.value = true;
  await getPostTypes();
  loading.value = false;
  contextmenu.value.show(evt, returnThisPos());
};

const getPostTypes = async () => {
  const args = { endpoint: "wp/v2/types", params: { per_page: 100 } };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  postTypes.value = response.data;
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

const isPostTypeSelected = (item) => {
  return model.value.find((postType) => postType.slug == item.slug);
};

const togglePostTypeItem = (item) => {
  if (isPostTypeSelected(item)) {
    const index = model.value.findIndex((postType) => postType.slug == item.slug);
    model.value.splice(index, 1);
  } else {
    model.value.push({ slug: item.slug, name: item.name, rest_base: `${item.rest_namespace}/${item.rest_base}` });
  }
};

watchEffect(() => {
  if (!Array.isArray(model.value)) model.value = [];
});
</script>

<template>
  <div
    v-if="model"
    @click="showOptions"
    v-bind="attrs"
    ref="parent"
    class="px-2 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-indigo-300 dark:focus:outline-indigo-700 focus:shadow-xs text-sm col-span-2 flex flex-row gap-1 items-center"
  >
    <span v-if="model.length" class="grow">{{ `${model.length} ${__("Items selected", "flexify-dashboard")}` }}</span>
    <span v-else class="text-zinc-500 grow">{{ __("Select post types", "flexify-dashboard") }}</span>
    <svg v-if="loading" class="animate-spin text-indigo-500 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <AppButton type="transparent" v-if="model.length" @click.stop.prevent="model = []"><AppIcon icon="close" /></AppButton>
    <AppIcon icon="unfold" />
  </div>

  <ContextMenu ref="contextmenu">
    <div class="flex flex-col gap-3 w-[260px]">
      <!-- Loop postTypes -->
      <div class="flex flex-col max-h-80 overflow-auto">
        <template v-for="option in postTypes">
          <div class="flex flex-row items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-lg cursor-pointer" @click.stop.prevent="togglePostTypeItem(option)">
            <AppCheckBox :checked="isPostTypeSelected(option) ? true : false" />
            <div>{{ option.name }}</div>
          </div>
        </template>
      </div>
    </div>
  </ContextMenu>
</template>
